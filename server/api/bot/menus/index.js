const { User } = require("../../../db/models");

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
  await bot.editMessageText(data.text, {
    message_id: query.message.message_id,
    chat_id: query.message.chat.id,
    parse_mode: "HTML",
    ...data.options,
  });
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
