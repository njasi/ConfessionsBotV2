process.env.NTBA_FIX_319 = 1;

const Bot = require("node-telegram-bot-api");
const token = process.env.BOT_TOKEN;
const bot = new Bot(token, {
  polling: process.env.NODE_ENV !== "production",
});

if (process.env.NODE_ENV !== "production") {
  bot.setWebHook();
} else {
  // TODO: setup webhook
  // bot.setWebHook(`https://frosh-io.herokuapp.com/api/bot/${token}`);
}

module.exports = bot;
// oof