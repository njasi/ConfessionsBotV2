const bot = require("./bot");
const { isCommand } = require("./config/command_regexes");
const { verifyUser } = require("./verify");
const { isDm } = require("./helpers");
const { MENUS } = require("./menus");

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

function cMid(cb) {
  async function _temp(message) {
    console.log(message.chat.id);
    if (!isDm(message)) {
      if (message.text.match(/@DabneyConfessionsBot/)) {
        const sticker = await bot.sendSticker(
          message.chat.id,
          "CAACAgEAAxkBAAIjRWAH7OW-GxTcoByQjKBAibfYL8eIAAIcAQAC6-XtIWB_jqrwG2cFHgQ",
          { reply_to_message_id: message.message_id }
        );
        setTimeout(() => {
          try {
            bot.deleteMessage(message.chat.id, sticker.message_id);
            bot.deleteMessage(message.chat.id, message.message_id);
          } catch (error) {}
        }, 60000);
      }
    } else {
      cb(message);
    }
  }
  return _temp;
}

const cvMid = (cb) => {
  return cMid(vMid(cb));
};

module.exports = { vMid, cMid, cvMid };
