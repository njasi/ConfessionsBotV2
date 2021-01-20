const router = require("express").Router();
// const request = require("request");
const bot = require("./bot");
const { isDm, params_from_string } = require("./helpers");
const { verifyUser } = require("./verify");
const { commandRegexDict, isCommand } = require("./config/command_regexes");
const { MENUS, detectAndSwapMenu } = require("./menus");
const { User } = require("../../db/models");
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

/**
 *  crappy verification middleware
 * @param {function} cb - callback function to execute after the verification
 * @param {boolean} skip_on_command - if true cb will be skipped if the message is a command
 */
function vMid(cb, skip_on_command = false) {
  async function _temp(message) {
    if (skip_on_command && isCommand(message)) return;
    const v = await verifyUser(message.from.id);
    if (v) {
      cb(...arguments);
    } else if (isDm(message)) {
      const res = await MENUS.verify.send(bot, message.from, {
        from_command: false,
      });
    } else {
      // message in a group chat
      if (isCommand(message)) {
        const res = await MENUS.verify.send(bot, message.from, {
          from_command: true,
        });
      }
    }
  }
  return _temp;
}

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
      console.log("user is verified");
    }
  }
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
      // must be a reply to a confession
    }
  }, (skip_on_command = true))
);

/**
 * allows a user to request to verify. Ends in sending a ~poll so I dont have to deal with it
 */
bot.onText(commandRegexDict.verify, (message, reg) => {
  MENUS.verify.send(bot, message.from, { from_command: true });
});

/**
 * Menu to send upon /start
 */
bot.onText(
  commandRegexDict.start,
  vMid((message, reg) => {
    MENUS.start.send(bot, message.from, { from_command: true });
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
  if (params["rad"] == "true" && query.from.id == process.env.ADMIN_ID) {
    if (params["approve_id"] !== null) {
      const user = await User.findOne({
        where: { poll_id: query.message.poll.id },
      });
      user.verification_status = 4;
      user.save();
    }
    return;
  }
  detectAndSwapMenu(query, params, bot);

  if (params["delete"]) {
    bot.deleteMessage(chat_id, message_id);
  }
});

bot.on("inline_query", (query) => {
  console.log(query);
});
