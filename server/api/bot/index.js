const router = require("express").Router();
// const request = require("request");
const bot = require("./bot");
const { isDm, params_from_string } = require("./helpers");
const { verifyUser } = require("./verify_poll");
const { commandRegexDict } = require("./config/command_regexes");
const { MENUS, detectAndSwapMenu, swapMenu } = require("./menus/index");
const { User, Confession, Keyval, Chat, Message } = require("../../db/models");
const { Op } = require("sequelize");
const {
  cMid,
  vMid,
  cvMid,
  aMid,
  fool_blongus_absolute_utter_clampongus,
} = require("./middleware");
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
      // last of to default to lowest verification status
      const mapped = approve.map((e) => e.voter_count);
      const index = mapped.lastIndexOf(Math.max(...mapped));
      user.verification_status = index + 1;
      MENUS.verify_accept.send(bot, { id: user.telegram_id });
      bot.sendMessage(
        process.env.VERIFY_CHAT_ID,
        `<a href = "tg://user?id=${user.id}">${user.name}${
          user.username == null ? "" : ` (@${user.username})`
        }</a> was approved to use @DabneyConfessionsBot!\n\nIf you have an issue with this please contact the admins.`,
        { parse_mode: "HTML" }
      );
    } else if (d_c == active_voters && answer.total_voter_count !== 0) {
      // ban
      user.verification_status = -1;
      MENUS.verify_ban.send(bot, { id: user.telegram_id });
      bot.sendMessage(
        process.env.VERIFY_CHAT_ID,
        `<a href = "tg://user?id=${user.id}">${user.name}${
          user.username == null ? "" : ` (@${user.username})`
        }</a> was banned from @DabneyConfessionsBot.\n\nIf you have an issue with this please contact the admins.`,
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
        }</a> was not approved to use @DabneyConfessionsBot. \n\nIf you have an issue with this please contact the admins.`,
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

bot.on("polling_error", (err) => w(err));

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
        // detect if they are sending a message to someone
      } else if (user.state == "ignore") {
        return;
      } else if (user.state == "w_fellows") {
        const mess = await Message.findOne({
          where: {
            status: "in_progress",
            [Op.or]: [
              { target: user.id, from_init: false }, // target is responding
              { initiator: user.id, from_init: true }, // initator is sending
            ],
          },
        });

        if (meta.type != "text") {
          confs[wait_cw_index].swapMenu(MENUS.fellows_message_error, {
            error: 1,
          });
          user.state = "ignore";
          await user.save();
          return;
        } else if (message.text.length > 3000) {
          confs[wait_cw_index].swapMenu(MENUS.fellows_message_error, {
            error: 2,
          });
          user.state = "ignore";
          await user.save();
          return;
        }

        mess.text = message.text;
        return;
      } else if (user.state == "w_feedback") {
        // TODO: implement feedback
      } else if (user.state == "w_about") {
        // TODO: about profiles for fellowdarbs
      }

      const confs = await user.getConfessions({ include: { model: Chat } });
      const stages = confs.map((e) => e.stage);
      // detect setting a content warning vs confssing
      const wait_cw_index = stages.indexOf("wait_cw");
      if (wait_cw_index != -1) {
        bot.deleteMessage(message.from.id, message.message_id);
        confs[wait_cw_index].stage = "invaild_cw";
        await confs[wait_cw_index].save();
        if (meta.type != "text") {
          confs[wait_cw_index].swapMenu(MENUS.cw_error);
          return;
        } else if (message.text.length > 69) {
          confs[wait_cw_index].swapMenu(MENUS.cw_error, { error: 1 });
          return;
        }
        confs[wait_cw_index].content_warning = message.text;
        confs[wait_cw_index].stage = "confirm_cw";
        await confs[wait_cw_index].save();
        confs[wait_cw_index].swapMenu(MENUS.cw_confirm);
        return;
      }

      // detect setting a reply vs confessing
      const wait_reply_index = stages.indexOf("wait_reply");
      if (wait_reply_index != -1) {
        const conf = confs[wait_reply_index];
        const nums = message.text.replace("https://t.me/c/", "").split("/");
        // message does not fit the desired format
        const matched = message.text.match(/https:\/\/t.me\/c\/.*\/.*/);
        if (
          (matched && message.text != matched[0]) ||
          nums.map((e) => !isNaN(e)).reduce((p, c) => p && c)
        ) {
          const chat_id = nums[0]; // should be chat id
          const res_chats = await Chat.findAll({
            where: {
              [Op.or]: [
                { chat_id: `-${chat_id}` },
                { chat_id: `-100${chat_id}` },
              ],
            },
          });

          // chat is not found in the db
          if (res_chats.length == 0) {
            // check that its not sent to one of the main chats
            if (
              ![
                process.env.CONFESSIONS_CHAT_ID,
                process.env.CONFESSIONS_CHANNEL_ID,
              ].includes(`-100${chat_id}`)
            ) {
              // chat not linked to the bot (or bad message)
              conf.swapMenu(MENUS.set_reply_error, { error: 1 });
            } else {
              const forwarded = await bot.forwardMessage(
                message.from.id,
                `-100${chat_id}`,
                nums[1]
              );
              conf.message_info = forwarded;
              await conf.save();
              // ask them if it is the correct message (set reply menu will deal with telling them the chat is bad)
              conf.swapMenu(MENUS.set_reply_confirm, {
                rc_id:
                  `-100${chat_id}` == process.env.CONFESSIONS_CHAT_ID ? -1 : -2,
                cc_id: conf.chatId,
                message_id: nums[1],
                forwarded,
              });
            }
          } else {
            const forwarded = await bot.forwardMessage(
              message.from.id,
              res_chats[0].chat_id,
              nums[1]
            );

            // to check if it is a confession later
            conf.message_info = forwarded;
            await conf.save();
            // ask them if it is the correct message (set reply menu will deal with telling them the chat is bad)
            conf.swapMenu(MENUS.set_reply_confirm, {
              rc_id: res_chats[0].id,
              cc_id: conf.chatId,
              message_id: nums[1],
              forwarded,
            });
          }
        } else {
          bot.deleteMessage(message.from.id, message.message_id);
          conf.swapMenu(MENUS.set_reply_error, { error: 2 });
        }
        return;
      }

      // make the confession
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
      // must be a message in a group chat
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
bot.onText(commandRegexDict.start, (message, reg) => {
  // TODO detect rickroll param somehow and send them a vid
  cvMid((message, reg) => {
    MENUS.start.send(bot, message.from, { from_command: true });
  })(message, reg);
});

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

/**
 * Poll info command
 */
bot.onText(
  commandRegexDict.poll,
  cvMid((message, reg) => {
    MENUS.poll_info.send(bot, message.from, { from_command: true });
  })
);

/**
 * Help command
 */
bot.onText(
  commandRegexDict.help,
  cvMid((message, reg) => {
    MENUS.help.send(bot, message.from, { from_command: true });
  })
);

/**
 * about command
 */
bot.onText(
  commandRegexDict.about,
  cvMid((message, reg) => {
    MENUS.about.send(bot, message.from, { from_command: true });
  })
);

/**
 * fellows info command
 */
bot.onText(
  commandRegexDict.fellows_info,
  cvMid((message, reg) => {
    MENUS.fellows_info.send(bot, message.from, { from_command: true });
  })
);

/**
 * add chat to listed
 */
bot.onText(
  commandRegexDict.join_network,
  aMid(
    vMid(async (message, reg) => {
      // only (chat) admins

      const chat = await Chat.findOne({
        where: { chat_id: `${message.chat.id}` },
      });

      if (
        [
          process.env.CONFESSIONS_CHANNEL_ID,
          process.env.CONFESSIONS_CHAT_ID,
        ].includes(`${message.chat.id}`) ||
        chat.static
      ) {
        fool_blongus_absolute_utter_clampongus(message);
        return;
      }
      MENUS.chats_add.send(bot, message.chat, {
        from_command: true,
        chat_id: message.chat.id,
        message_id: message.message_id,
      });
    })
  )
);

/**
 * remove chat from listed
 */
bot.onText(
  commandRegexDict.leave_network,
  aMid(
    // only (chat) admins
    vMid(async (message, reg) => {
      if (
        [
          process.env.CONFESSIONS_CHANNEL_ID,
          process.env.CONFESSIONS_CHAT_ID,
        ].includes(`${message.chat.id}`)
      ) {
        fool_blongus_absolute_utter_clampongus(message);
        return;
      }
      MENUS.chats_add.send(bot, message.chat, {
        from_command: true,
        chat_id: message.chat.id,
        message_id: message.message_id,
        remove: true,
      });
    })
  )
);

bot.onText(
  commandRegexDict.fellows,
  cvMid(async (message, reg) => {
    MENUS.fellows_settings.send(bot, message.from, { from_command: "true" });
  })
);

bot.on("migrate_to_chat_id", async (message, meta) => {
  bot.sendMessage(
    process.env.ADMIN_ID,
    `Migrate To:\n${JSON.stringify(message)}`
  );

  const chat = await Chat.findOne({ where: { chat_id: `${message.chat.id}` } });
  chat.old_chat_id = chat.chat_id;
  chat.chat_id = message.migrate_to_chat_id;
  await chat.save();
});

/**
 * all the annoying callbacks
 */
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
      user.poll_id = null;
      await user.save();
      bot.deleteMessage(chat_id, message_id);
      MENUS.verify_accept.send(bot, { id: user.telegram_id });
    }
    return;
  }

  // commands that you need to be a chat admin for
  if (params["c_ad"]) {
    // c_ad for chat admin
    const chat_admins = await bot.getChatAdministrators(chat_id);
    if (
      [
        parseInt(process.env.ADMIN_ID),
        ...chat_admins.map((a) => a.id),
      ].includes(query.from.id)
    ) {
      // adding a chat to the supported list
      if (params["chat_add"]) {
        let chat = await Chat.findOne({
          where: {
            chat_id: params["chat_add"],
          },
        });
        if (chat) {
          bot.answerCallbackQuery(query.id, {
            text: "This chat is already in the network...",
          });
          bot.deleteMessage(chat.chat_id, message_id);
          return;
        }
        try {
          chat_info = await bot.getChat(params["chat_add"]);
          // test if the message is old and the group has since changed to a super group
          res = await bot.sendMessage(params["chat_add"], "/test", {
            disable_notification: true,
          });
          await bot.deleteMessage(params["chat_add"], res.message_id);
        } catch (err) {
          return; // chat is old (probably)
        }
        created_chat = await Chat.create({
          name: chat_info.title,
          chat_id: chat_info.id,
        });
        params["chat_num"] = await Chat.count();
      }
      if (params["chat_remove"]) {
        const chat = await Chat.findOne({
          where: { chat_id: params["chat_remove"] },
        });
        if (!chat.static) {
          await chat.destroy();
        }
      }
    } else {
      bot.answerCallbackQuery(query.id, {
        text: "You're not an admin. \nPerish.",
        show_alert: true,
        url: "t.me/test123420bot?start=rick",
      });
      return;
    }
  }

  // user tapped view content button on a cw confession, send them the message
  if (params.cw_confession_id) {
    const cw_id = parseInt(params["cw_confession_id"]);

    const from_user = await User.findOne({
      where: { telegram_id: query.from.id },
    });
    if (from_user == null || from_user.verification_status < 1) {
      bot.answerCallbackQuery(query.id, {
        text: "Please verify with the bot first.",
        show_alert: true,
      });
      return;
    }

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
    return;
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

  // deletes messages from the bot when a user taps the button
  if (params["delete"]) {
    bot.deleteMessage(
      chat_id,
      params["delete"] == "true" ? message_id : params["delete"]
    );
  }

  /**
   * register or retire as a fellowdarb
   */
  if (params["register"]) {
    const user = await User.findOne({ where: { telegram_id: query.from.id } });
    switch (params["register"]) {
      case "true":
        user.fellow_darb = true;
        break;
      case "false":
        user.fellow_darb = false;
        break;
    }
    await user.save();
  }

  if (params["user_state"]) {
    if (params["user_state"] == "w_fellows") {
      return;
    }
    const user = await User.findOne({ where: { telegram_id: query.from.id } });
    user.state = params["user_state"];
    await user.save();
  }

  if (params["remove_m"]) {
    const mess = await Message.findByPk(parseInt(params["remove_m"]));
    await mess.destroy();
  }

  // query up the confessioon info for all of the things below
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

  // contacting someone through fellow darbs / conf
  if (params["contact"]) {
    // TODO: implement this fully
    bot.answerCallbackQuery(query.id, {
      text: "This feature isnt fully implemented yet lol.",
      show_alert: true,
    });

    return;
    // check that the user is even verified
    const from_user = await User.findOne({
      where: { telegram_id: query.from.id },
    });
    if (from_user == null || from_user.verification_status < 1) {
      bot.answerCallbackQuery(query.id, {
        text: "Please verify with the bot first.",
        show_alert: true,
      });
      return;
    }

    // person is confessing, dont allow contact
    if (shared_confession != null) {
      bot.answerCallbackQuery(query.id, {
        text:
          "Please finish your current Confession before contacting someone.",
        show_alert: true,
      });
      return;
    }

    // person is already sending a message
    const messages = await Message.findAll({
      where: { initiator: from_user.id, status: "in_progress" },
    });
    if (messages.length > 0) {
      bot.answerCallbackQuery(query.id, {
        text:
          "It seems you are already contacing someone, please finish doing that first.",
        show_alert: true,
      });
      return;
    }

    // time for the actual message creation
    const common = {
      from_init: true,
      initiator: from_user.id,
      target: parseInt(params["contact"]),
      chat_id: params["fc"] ? parseInt(params["fc"]) : null,
    };
    // someone is contacting a confessor
    if (params["conf"]) {
      const mess = await Message.create({
        ...common,
        target_cnum: parseInt(params["conf"]),
      });

      await MENUS.fellows_say.send(bot, query.from, {
        ...params,
        m_id: mess.id,
      });

      return;
    } else {
      Message.create({ ...common, obscure_target: false });
      MENUS.fellows_say.send(bot, query.from, {});

      // TODO: swap into menu?
    }
  }

  // clear the content warning of a confession
  if ("clear_cw" in params) {
    shared_confession.content_warning = null;
    const conf_id = parseInt(params["clear_cw"]);
    const conf = await Confession.findByPk(conf_id);
    conf.content_warning = null;
    await conf.save();
  }

  // change allow response setting of a confession
  if ("allow_res" in params) {
    if (params.allow_res == "true") {
      bot.answerCallbackQuery(query.id, {
        text:
          "Note that ths feature will currently not do anything.\n\nHowever it will allow responses to your confession once I finish it.",
        show_alert: true,
      });
    }
    shared_confession.allow_responses = params.allow_res == "true";
    await shared_confession.save();
  }

  // set the stage of a confession
  if (params["set_stage"]) {
    shared_confession.stage = params["set_stage"];
    await shared_confession.save();
  }

  // sets that aux chat to the id provided in target_id
  if (params["target_id"]) {
    if (params["target_id"] == "-1") {
      await shared_confession.setChat(null);
    } else {
      const chat = await Chat.findByPk(parseInt(params["target_id"]));

      // chat has been removed while in the menu or some error happened
      if (chat == null) {
        bot.answerCallbackQuery(query.id, {
          text: "The selected chat could not be found, please try again.",
          show_alert: true,
        });
        swapMenu(query, { menu: "settings" }, bot);
        return;
      }

      const chat_member = await bot.getChatMember(chat.chat_id, query.from.id);
      if (!chat_member || chat_member.status == "left") {
        bot.answerCallbackQuery(query.id, {
          text:
            "You cannot send confessions to this chat as you are not in it.",
          show_alert: true,
        });
        return;
      }
      await shared_confession.setChat(chat);
    }
  }

  // setting the message the confession wil reply to
  if (params["c_id"] && params["m_id"]) {
    const num = parseInt(params["c_id"]);
    let chat_id = null;
    switch (num) {
      case -1:
        chat_id = process.env.CONFESSIONS_CHAT_ID;
        break;
      case -2:
        chat_id = process.env.CONFESSIONS_CHANNEL_ID;
        break;
      default:
        const chat = await Chat.findByPk(num);
        chat_id = chat.chat_id;
    }
    shared_confession.stage = "idle";
    shared_confession.reply_message = [[chat_id, params["m_id"]]];
    // TODO detect reply to a confession

    await shared_confession.save();
  }

  // clear reply info
  if (params["clear_ri"]) {
    shared_confession.reply_message = null;
    await shared_confession.save();
  }

  // swaps to a new menu if the menu key is in params
  detectAndSwapMenu(query, params, bot);

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
    // const user = await User.findOne({ where: { telegram_id: query.from.id } });
    // const confession = await Confession.findOne({
    //   where: { in_progress: true, userId: user.id },
    // });

    if (shared_confession == null) {
      // for some reason the confession does not exist
      // TODO tell the user something went wrong
      return;
    }
    shared_confession.send_by = send_time;
    shared_confession.in_progress = false;
    shared_confession.stage = null;
    shared_confession.menu_id = null;
    await shared_confession.save();
    Confession.send();
  }
});
