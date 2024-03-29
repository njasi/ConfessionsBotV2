const bot = require("../bot");
const { isCommand } = require("../config/command_regexes");
const { verifyUser } = require("../verify_poll");
const { isDm } = require("../helpers");
const { MENUS } = require("../menus");

const bab_stickers = [
  "CAACAgEAAx0CVRt_vgADqWBdAAHBj_FsnMHUx6_p7RkinhNBTAACMwEAAuvl7SH9ZMAMGgEehh4E", // wrong
  "CAACAgEAAxkBAAIjRWAH7OW-GxTcoByQjKBAibfYL8eIAAIcAQAC6-XtIWB_jqrwG2cFHgQ", // fool
  "CAACAgEAAx0CVRt_vgADqGBdAAGoJbiO-yVcVveZTmnSlRmNHAACfQAD6-XtIfdMQMPQKhzBHgQ", // combat
  "CAACAgQAAx0CVRt_vgAD92BdAhpBhnwT2j5drpebo5HExqKwAAKDAAMVdukHSHli2_AQ0TEeBA", // cursed crush
];

/**
 * randomly send a bab_sticker to harass someone who has done something illegal™
 * @param {message} message : incoming message
 */
async function fool_blongus_absolute_utter_clampongus(message) {
  const num = Math.floor(Math.random() * bab_stickers.length);
  const sticker = await bot.sendSticker(message.chat.id, bab_stickers[num], {
    reply_to_message_id: message.message_id,
  });
  setTimeout(() => {
    try {
      bot.deleteMessage(message.chat.id, sticker.message_id);
      bot.deleteMessage(message.chat.id, message.message_id).catch((err) => {});
    } catch (error) {}
  }, 15000);
}

/**
 * crappy verification middleware,
 *    callback only happens if user is verified
 * @param {function} cb - callback function to execute after the verification
 * @param {boolean} skip_on_command - if true cb will be skipped if the message is a command
 */
function vMid(cb, skip_on_command = false) {
  async function _temp(message) {
    // console.log("\n\n MESSAGE DATA\n\n",message,"\n\n"); // if I just want to see message format
    if (skip_on_command && isCommand(message)) return;
    const v = await verifyUser(message.from.id);
    if (v) {
      cb(...arguments);
    } else if (isDm(message)) {
      const res = await MENUS.verify.send(message.from, {
        fc: false,
      });
    } else {
      // message in a group chat
      if (isCommand(message)) {
        const res = await MENUS.verify.send(message.from, {
          fc: true,
        });
      }
    }
  }
  return _temp;
}

/**
 * makes sure people are sending commands to the bot in dms,
 * if they are not, they get blongused.
 *      callback only happens if user is in dms with bot
 * @param {function} cb : callback function
 * @returns undefined
 */
function cMid(cb) {
  async function _temp(message) {
    if (!isDm(message)) {
      if (message.text.match(/@DabneyConfessionsBot/)) {
        fool_blongus_absolute_utter_clampongus(message);
      }
    } else {
      cb(message);
    }
  }
  return _temp;
}

/**
 * only admins of the chat can do this
 *     callback only happens if user is a chat admin or bot admin
 * @param {any} cb callback function
 */
function aMid(cb) {
  async function _temp(message) {
    if (isDm(message)) {
      return; // chat admin actions will not happen in dms.
    }
    const chat_admins = await bot.getChatAdministrators(message.chat.id);
    if (
      [
        process.env.ADMIN_ID,
        ...chat_admins.map((a) => `${a.user.id}`),
      ].includes(`${message.from.id}`)
    ) {
      cb(message);
    } else {
      fool_blongus_absolute_utter_clampongus(message);
    }
  }
  return _temp;
}

const cvMid = (cb) => {
  return cMid(vMid(cb));
};

module.exports = {
  vMid,
  cMid,
  cvMid,
  aMid,
  fool_blongus_absolute_utter_clampongus,
};
