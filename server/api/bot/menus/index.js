const e = require("express");
const { User } = require("../../../db/models");

/*
 *  This whole setup can be improved a lot, so do that if you'd like.
 */

/**
 * The function that dynamicly swaps menus based on queries and the user
 */
async function swapMenu(query, params, bot) {
  const menu = MENUS[params.menu];
  const user = await User.findOne({ where: { telegram_id: query.from.id } });
  const data = await menu.load(query.from, {
    bot,
    user,
    ...params,
    query,
    from_swap: true,
  });
  // console.log("\n\nDATA:\n\n", query.message, "\n\nDATA:\n\n");

  if (data.send_image) {
    // switch into a menu with an image, note the text limit (1024 char) change somewhere (from 4096)
    await bot.deleteMessage(query.message.chat.id, query.message.message_id);
    await bot.sendPhoto(query.message.chat.id, data.send_image, {
      caption: data.text,
      parse_mode: "HTML",
      ...data.options,
    });
  } else if (!query.message.text) {
    // switching from a media menu
    await bot.deleteMessage(query.message.chat.id, query.message.message_id);
    await bot.sendMessage(query.message.chat.id, data.text, {
      parse_mode: "HTML",
      ...data.options,
    });
  } else {
    // normal menu swap
    await bot.editMessageText(data.text, {
      message_id: query.message.message_id,
      chat_id: query.message.chat.id,
      parse_mode: "HTML",
      ...data.options,
    });
  }
  // TODO: support for swapping menus that have media?
  // if (option.media) {
  //   await bot.editMessageMedia(option.media, {
  //     message_id: query.message.message_id,
  //     chat_id: query.message.chat.id,
  //   });
  // }
}

/**
 * detects if a query has a menu tag and sawps to it if there is
 *
 * returns true if a swap occurs, false otherwise
 */
async function detectAndSwapMenu(query, params, bot) {
  if (query.data.match(/^menu=/)) {
    swapMenu(query, params, bot);
    return true;
  }
  return false;
}

// TODO menu -> verify_update
// TODO menu -> settings (wip)

const MENUS = {
  ...require("./basic"),
  ...require("./help_menus"),
  ...require("./fellows"),
  ...require("./network"),
  ...require("./settings"),
  ...require("./verify"),
};

module.exports = { MENUS, detectAndSwapMenu, swapMenu };
