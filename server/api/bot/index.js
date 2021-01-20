const router = require("express").Router();
// const request = require("request");
const bot = require("./bot");
const { isDm, params_from_string } = require("./helpers");
const { verifyUser } = require("./verify");
const { commandRegexDict } = require("./config/command_regexes");
const { MENUS, detectAndSwapMenu } = require("./menus");
const { User, Confession, Keyval } = require("../../db/models");
const { Op } = require("sequelize");
const { cMid, vMid, cvMid } = require("./middleware");
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

bot.on("poll", (answer, meta) => {
  console.log(answer, meta);
});

bot.on("webhook_error", (error) => {
  bot.sendMessage(
    process.env.ADMIN_ID,
    `There was a webhook error:\n${error.trace}`
  );
});

bot.on("polling_error", (err) => console.log(err));

/**
 * remmoves people from the verification chat if they are not verified
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
  const to_send = await Confession.findAll({
    where: {
      send_by: { [Op.and]: { [Op.ne]: null, [Op.lt]: new Date() } },
    },
  });
  [...to_send].forEach((conf) => conf.send());
});

/**
 * checks if user is verified and sends confession menu/verify menu
 */
bot.on(
  "message",
  vMid(async (message, meta) => {
    if (isDm(message)) {
      MENUS.start.send(bot, message.from, { from_command: false, message });
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
 *
 */

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
  if (params["rad"] == "true" && query.from.id == process.env.ADMIN_ID) {
    if (params["approve_id"] !== null) {
      const user = await User.findOne({
        where: { poll_id: query.message.poll.id },
      });
      user.verification_status = 4;
      await user.save();
      bot.deleteMessage(chat_id, message_id);
      bot.sendMessage(
        user.telegram_id,
        "<b>Congratulations!</b>\nYou've been approved to use Confessions Bot! \nPlease join the <a href='https://t.me/joinchat/EKj6oJQp9l9aPD5O'>Verification Chat</a>\n",
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Help", callback_data: "menu=help" },
                { text: "About Confessions" },
              ],
              [{ text: "Ok", callback_data: "delete=true" }],
            ],
          },
        }
      );
    }
    return;
  }
  detectAndSwapMenu(query, params, bot);

  if (params["delete"] == "true") {
    bot.deleteMessage(chat_id, message_id);
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
