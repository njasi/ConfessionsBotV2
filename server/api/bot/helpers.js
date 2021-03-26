const TelegramBot = require("node-telegram-bot-api");

/**
 *  Checks if a message is a dm to the bot
 * @param {TelegramBot.message} message - message the bot will be checking
 * @returns {boolean}
 */
function isDm(message) {
  try {
    return (
      message.from.id == message.chat.id &&
      message.chat.type !== "group" &&
      message.chat.type !== "supergroup"
    );
  } catch (error) {
    return false;
  }
}
/**
 * returns the full name of a user plus their username if they have one
 * @param {Telegram.user} user
 */
function getFullName(user, username = true) {
  let first,
    last,
    un = "";
  if (user.first_name) {
    first = user.first_name;
  }
  if (user.last_name) {
    last = ` ${user.last_name}`;
  }
  if (username && user.username) {
    un = ` (@${user.username})`;
  }
  return first + last + un;
}

function params_from_string(str) {
  let splt = str.split("&");
  const params = {};
  for (let i = 0; i < splt.length; i++) {
    const p = splt[i].split("=");
    params[p[0]] = p[1];
  }
  return params;
}

function int_to_ordinal(num) {
  str_num = `${num}`;
  switch (str_num[str_num.length - 1]) {
    case "1":
      return `${num}st`;
    case "2":
      return `${num}nd`;
    case "3":
      return `${num}rd`;
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
    case "0":
      return `${num}th`;
  }
}

module.exports = { isDm, getFullName, params_from_string, int_to_ordinal };
