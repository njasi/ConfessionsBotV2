const router = require("express").Router();
// const request = require("request");
const bot = require("./bot");
const { isDm, params_from_string } = require("./helpers");
const { verifyUser } = require("./verify");
const { commandRegexDict } = require("./config/command_regexes");
const { MENUS, detectAndSwapMenu, swapMenu } = require("./menus");
const { User, Confession, Keyval } = require("../../db/models");
const { Op } = require("sequelize");
const { cMid, vMid, cvMid } = require("./middleware");
const { send } = require("../../db/models/confession");
module.exports = router;

/**
 * api/bot/token
 */
router.post(`/${process.env.BOT_TOKEN}`, (req, res, next) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
});

bot.on("poll", async (answer, meta) => {
  const num = await User.count({
    where: { verification_status: { [Op.gt]: 0 } },
  });
  const user = await User.findOne({ where: { poll_id: answer.id } });
  // this must not be a verification poll
  if (user == null) return;
  // take out sluts votes
  const active_voters =
    answer.total_voter_count - answer.options[3].voter_count;
  // poll voting needs have been met
  if (active_voters >= Math.floor(Math.sqrt(num))) {
    const { options } = answer;
    const approve = options.slice(0, 3);
    const disapprove = options.slice(4);
    const a_c = approve.reduce((a, b) => a + b.voter_count, 0);
    const d_c = disapprove.reduce((a, b) => a + b.voter_count, 0);
    if (a_c > d_c) {
      // lastiof to default to lowest verification status
      const mapped = approve.map((e) => e.voter_count);
      const index = mapped.lastIndexOf(Math.max(...mapped));
      user.verification_status = index + 1;
      MENUS.verify_accept.send(bot, { id: user.telegram_id });
      bot.sendMessage(
        process.env.VERIFY_CHAT_ID,
        `<a href = "tg://user?id=${user.id}">${user.name}${
          user.username == null ? "" : ` (@${user.username})`
        }
        </a>a was approved to use @DabneyConfessionsBot!\n\nIf you have an issue with this please contact the admins.`,
        { parse_mode: "HTML" }
      );
    } else if (d_c == active_voters && total_voter_count !== 0) {
      // ban
      user.verification_status = -1;
      MENUS.verify_ban.send(bot, { id: user.telegram_id });
      bot.sendMessage(
        process.env.VERIFY_CHAT_ID,
        `<a href = "tg://user?id=${user.id}">${user.name}${
          user.username == null ? "" : ` (@${user.username})`
        }
        </a> was banned from @DabneyConfessionsBot.\n\nIf you have an issue with this please contact the admins.`,
        { parse_mode: "HTML" }
      );
    } else {
      // set as disapprove
      user.verification_status = 0;
      MENUS.verify_reject.send(bot, { id: user.telegram_id });
      bot.sendMessage(
        process.env.VERIFY_CHAT_ID,
        `<a href = "tg://user?id=${user.id}">${user.name}${
          user.username == null ? "" : ` (@${user.username})`
        }
        </a> was not approved to use @DabneyConfessionsBot. \n\nIf you have an issue with this please contact the admins.`,
        { parse_mode: "HTML" }
      );
    }
    // so retracting votes and revoting does nothing
    user.poll_id = null;
    await user.save();
  }
});

bot.on("webhook_error", (error) => {
  bot.sendMessage(
    process.env.ADMIN_ID,
    `There was a webhook error:\n${error.trace}`
  );
});

bot.on("polling_error", (err) => console.log(err));

/**
 * removes people from the verification chat if they are not verified
 */
bot.on("new_chat_members", async (message, meta) => {
  for (user of message.new_chat_members) {
    const v = await verifyUser(user.id);
    if (!v) {
      if (message.chat.id == process.env.VERIFY_CHAT_ID) {
        await bot.kickChatMember(process.env.VERIFY_CHAT_ID, user.id);
        await bot.unbanChatMember(process.env.VERIFY_CHAT_ID, user.id);
      } else if (false) {
      }
    } else {
      const [v_chat_size, create] = await Keyval.findOrCreate({
        where: { key: "v_chat_size" },
      });
      if (create) {
        v_chat_size.value = 1;
      } else {
        v_chat_size.value++;
      }
      await v_chat_size.save();
    }
  }
});

bot.on("left_chat_member", async (message, meta) => {
  const v_chat_size = await Keyval.findOne({
    where: { key: "v_chat_size" },
  });
  v_chat_size.value--;
  await v_chat_size.save();
});

/**
 * seperate .on message used to check if any confessions should be sent
 */
bot.on("message", async () => {
  Confession.send();
});

/**
 * checks if user is verified and sends confession menu/verify menu
 */
bot.on(
  "message",
  vMid(async (message, meta) => {
    if (isDm(message)) {
      const user = await User.findOne({
        where: { telegram_id: message.from.id },
      });
      if (user.locked) {
        return;
      }
      const confs = await user.getConfessions();
      const stages = confs.map((e) => e.stage);
      const wait_cw_index = stages.indexOf("wait_cw");
      if (wait_cw_index != -1) {
        bot.deleteMessage(message.from.id, message.message_id);
        if (meta.type != "text") {
          confs[wait_cw_index].stage = "invaild_cw";
          confs[wait_cw_index].swapMenu(MENUS.cw_text_only);
          return;
        } else if (message.text.length > 69) {
          confs[wait_cw_index].swapMenu(MENUS.cw_too_long);
          return;
        }
        confs[wait_cw_index].content_warning = message.text;
        confs[wait_cw_index].stage = "confirm_cw";
        await confs[wait_cw_index].save();
        confs[wait_cw_index].swapMenu(MENUS.cw_confirm);
        return;
      }
      let confession;
      try {
        const general = {
          type: meta.type,
          text: message.caption == null ? message.text : message.caption,
          userId: user.id,
        };
        switch (meta.type) {
          case "text": {
            if (message.text.length > 4062) {
              bot.sendMessage(
                message.from.id,
                `Sorry, your confession was ${
                  message.text.length - 4062
                } characters long.`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "Ok", callback_data: "delete=true" }],
                    ],
                  },
                  reply_to_message_id: message.message_id,
                }
              );
            } else {
              confession = await Confession.create(general);
            }
            break;
          }
          case "animation":
          case "audio":
          case "document":
          case "sticker":
          case "video":
          case "voice": {
            confession = await Confession.create({
              ...general,
              file_id: message[meta.type].file_id,
            });
            break;
          }
          case "photo": {
            confession = await Confession.create({
              ...general,
              file_id: message.photo[message.photo.length - 1].file_id,
            });
            break;
          }
          case "poll": {
            // poll is a bit odd, we wil save the message_id as the
            // file_id and copy the message and forward it later
            confession = await Confession.create({
              ...general,
              file_id: message.message_id,
            });
            break;
          }
          default: {
            bot.sendMessage(
              message.from.id,
              "Confessions bot does not currently support this type of message.",
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "Ok", callback_data: "delete=true" }],
                  ],
                },
                reply_to_message_id: message.message_id,
              }
            );
          }
        }
        const res = await MENUS.start.send(bot, message.from, {
          from_command: false,
          message,
        });
        confession.menu_id = res.message_id;
        await confession.save();
        // https://t.me/c/1159774540/115908
        // https://t.me/c/1159774540/115903
      } catch (error) {
        bot.sendMessage(
          process.env.ADMIN_ID,
          `${user.name} (${message.from.id}) attempted to send a ${meta.type} through confessions bot.\nError:\n:${error.stack}`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "Ok", callback_data: "delete=true" }]],
            },
            reply_to_message_id: message.message_id,
          }
        );
        bot.sendMessage(
          message.from.id,
          "Sorry, Confessions Bot does not currently support this type of message.",
          {
            reply_markup: {
              inline_keyboard: [[{ text: "Ok", callback_data: "delete=true" }]],
            },
            reply_to_message_id: message.message_id,
          }
        );
      }
    } else {
      // must be a message in the chat
    }
  }, (skip_on_command = true))
);

/**
 * allows a user to request to verify. Ends in sending a ~poll so I dont have to deal with it
 */
bot.onText(
  commandRegexDict.verify,
  cMid((message, reg) => {
    MENUS.verify.send(bot, message.from, { from_command: true });
  })
);

/**
 * Menu to send upon /start
 */
bot.onText(
  commandRegexDict.start,
  cvMid((message, reg) => {
    MENUS.start.send(bot, message.from, { from_command: true });
  })
);

/**
 * Lock/Unlock commands
 */

bot.onText(
  commandRegexDict.lock,
  cvMid((message, reg) => {
    MENUS.toggle_lock.send(bot, message.from, {
      from_command: true,
      command: "lock",
    });
  })
);

bot.onText(
  commandRegexDict.unlock,
  cvMid((message, reg) => {
    MENUS.toggle_lock.send(bot, message.from, {
      from_command: true,
      command: "unlock",
    });
  })
);

bot.onText(
  commandRegexDict.poll,
  cvMid((message, reg) => {
    MENUS.poll_info.send(bot, message.from, { from_command: true });
  })
);

bot.onText(
  commandRegexDict.help,
  cvMid((message, reg) => {
    MENUS.help.send(bot, message.from, { from_command: true });
  })
);

bot.onText(
  commandRegexDict.about,
  cvMid((message, reg) => {
    MENUS.about.send(bot, message.from, { from_command: true });
  })
);

bot.onText(
  commandRegexDict.fellows_info,
  cvMid((message, reg) => {
    MENUS.fellows_info.send(bot, message.from, { from_command: true });
  })
);

bot.on("migrate_from_chat_id", (message, meta) => {
  bot.sendMessage(process.env.ADMIN_ID, JSON.stringify(message));
});

bot.on("migrate_to_chat_id", (message, meta) => {
  bot.sendMessage(process.env.ADMIN_ID, JSON.stringify(message));
});

bot.on("callback_query", async (query) => {
  const params = params_from_string(query.data);
  const chat_id = query.message.chat.id;
  const message_id = query.message.message_id;

  // admin only cb buttons
  if (params["rad"] == "true" && query.from.id == process.env.ADMIN_ID) {
    // admin force approval
    if (params["approve_id"] !== null) {
      const user = await User.findOne({
        where: { poll_id: query.message.poll.id },
      });
      user.verification_status = 4;
      await user.save();
      bot.deleteMessage(chat_id, message_id);
      MENUS.verify_accept.send(bot, { id: user.telegram_id });
    }
    return;
  }

  const shared_confession = await Confession.findOne({
    where: {
      in_progress: true,
    },
    include: {
      model: User,
      where: {
        telegram_id: query.from.id,
      },
    },
  });

  if ("clear_cw" in params) {
    shared_confession.content_warning = null;
    const conf_id = parseInt(params["clear_cw"]);
    const conf = await Confession.findByPk(conf_id);
    conf.content_warning = null;
    await conf.save();
  }

  if ("allow_res" in params) {
    shared_confession.allow_responses = params.allow_res == "true";
    await shared_confession.save();
  }

  if (params["set_stage"]) {
    shared_confession.stage = params["set_stage"];
    await shared_confession.save();
  }

  // removes confession of id params['remove_confession'], before the menu swap as some swaps remove confessions
  if (params["remove_confession"]) {
    const conf_id = parseInt(params["remove_confession"]);
    const conf = await Confession.findOne({
      where: { id: conf_id },
      include: { model: User, where: { telegram_id: query.from.id } },
    });
    if (conf == null) {
      bot.answerCallbackQuery(query.id, {
        text: `There was an error removing a Confession. The mod(s) have been notified`,
        show_alert: true,
      });
      bot.sendMessage(
        process.env.ADMIN_ID,
        `User ${
          query.from.id
        } failed to remove confession ${conf_id} (no relation)\nAdditional User info:\n${JSON.stringify(
          query.from,
          null,
          2
        )}`
      );
      return;
    } else {
      try {
        try {
          bot.deleteMessage(query.from.id, conf.menu_id);
        } catch (error) {
          // sometimes the message has already been deleted
        }
        await conf.destroy();
      } catch (error) {
        bot.answerCallbackQuery(query.id, {
          text: `There was an error removing a Confession. The mod(s) have been notified`,
          show_alert: true,
        });
        bot.sendMessage(
          process.env.ADMIN_ID,
          `User ${query.from.id} failed to remove confession ${conf.id} (conf.destroy() error)\n\n${error.stack}`
        );
      }
    }
  }

  // user tapped view content button on a cw confession, send them the message
  if (params.cw_confession_id) {
    const cw_id = parseInt(params["cw_confession_id"]);
    conf = await Confession.findByPk(cw_id);
    if (conf == null) {
      bot.answerCallbackQuery(query.id, {
        text:
          "It seems that this confession was removed... \n\n(or is realy old)",
        show_alert: true,
      });
      return;
    }
    await conf.send_helper(query.from.id, (cw_forward = true));
    bot.answerCallbackQuery(query.id, {
      text: `The confession has been sent to your dms with the bot.`,
      show_alert: true,
    });
  }

  // swaps to a new menu if the menu key is in params
  detectAndSwapMenu(query, params, bot);

  if (params["target_id"]) {
    // TODO: set chat here.
  }

  // select the delay time at which the confession will be sent
  if (params["send_time"]) {
    let send_time = Date.now();
    const rnd = Math.random();
    switch (params["send_time"]) {
      case "0":
        send_time -= 420 * 69;
        break;
      case "1":
        send_time += 1000 * 5 * rnd + 1000 * 60 * 10;
        break;
      case "2":
        send_time += 1000 * 15 * rnd + 1000 * 60 * 30;
        break;
      case "3":
        send_time += 1000 * 60 * rnd + 1000 * 60 * 60;
        break;
    }
    send_time = new Date(send_time);
    const user = await User.findOne({ where: { telegram_id: query.from.id } });
    const confession = await Confession.findOne({
      where: { in_progress: true, userId: user.id },
    });
    if (confession == null) {
      // for some reason the confession does not exist
      return;
    }
    confession.send_by = send_time;
    confession.in_progress = false;
    confession.stage = null;
    confession.menu_id = null;
    await confession.save();
    Confession.send();
  }

  // deletes messages from the bot when a user taps the button
  if (params["delete"] == "true") {
    bot.deleteMessage(chat_id, message_id);
  }

  if (params["message_from"]) {
    // someone is contacting a confessor
    if (params["conf"]) {
      MENUS.fellows_privacy.send();
      return;
    }
  }
});

bot.on("inline_query", async (query) => {
  const num = parseInt(query.query.replace("#", ""));
  let results = [];
  if (num) {
    results = await Confession.find({ where: { num } });
  }
  const text_match = await Confession.find({
    where: {
      text: {
        [Op.like]: "%" + query.query + "%",
      },
    },
  });
  results = [...results, ...text_match];
  // TODO : send the results for people to forward
});
