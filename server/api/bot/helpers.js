const TelegramBot = require("node-telegram-bot-api");

/**
 *  Checks if a message is a dm to the bot
 * @param {TelegramBot.message} message - message the bot will be checking
 * @returns {boolean}
 */
function isDm(message) {
  try {
    return (message.from.id =
      message.chat.id &&
      message.chat.type !== "group" &&
      message.chat.type !== "supergroup");
  } catch (error) {
    return false;
  }
}

module.exports = { isDm };
