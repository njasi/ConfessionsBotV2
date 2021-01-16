const router = require("express").Router();
// const request = require("request");
const bot = require("./bot");
const { isDm } = require("./helpers");
const { verifyUser } = require("./verify");
const { commandRegexDict, isCommand } = require("./config/command_regexes");
const { MENUS } = require("./menus");
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
      // TODO: try to send the verify menu, and if that fails send them an alert to make them dm the bot
    }
  }
  return _temp;
}

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
  // TODO: send verify menu
  console.log("verify");
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
