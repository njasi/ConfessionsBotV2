/**
 * setup the bot here so it can be imported elsewhere
 */
// 
process.env.NTBA_FIX_319 = 1;

const Bot = require("node-telegram-bot-api");
const token = process.env.BOT_TOKEN;
const bot = new Bot(token, {
  polling: process.env.NODE_ENV !== "production",
});

if (process.env.NODE_ENV == "production") {
  bot.setWebHook(`https://dabney-confessions.herokuapp.com/api/bot/${token}`);
} else {
  // nothing for now, polling instead
}

module.exports = bot;
