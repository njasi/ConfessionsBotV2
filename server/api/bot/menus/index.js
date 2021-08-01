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
  // TODO: remove console.logs
  // console.log("\n\nDATA:\n\n", query.message, "\n\nDATA:\n\n");
  // console.log(util.inspect(query, (depth = null)));

  const wrap = async () => {
    if (data.send_image) {
      // switch into a menu with an image, note the text limit (1024 char) change somewhere (from 4096)
      await bot.deleteMessage(query.message.chat.id, query.message.message_id);
      const message = await bot.sendPhoto(
        query.message.chat.id,
        data.send_image,
        {
          caption: data.text,
          parse_mode: "HTML",
          ...data.options,
        }
      );
      return message;
    } else if (!query.message.text) {
      // switching from a media menu
      await bot.deleteMessage(query.message.chat.id, query.message.message_id);
      const message = await bot.sendMessage(query.message.chat.id, data.text, {
        parse_mode: "HTML",
        ...data.options,
      });
      return message;
    } else {
      // normal menu swap
      const message = await bot.editMessageText(data.text, {
        message_id: query.message.message_id,
        chat_id: query.message.chat.id,
        parse_mode: "HTML",
        ...data.options,
      });
      return message;
    }
  };
  const message = await wrap();
  user.misc = { ...user.misc, active_menu: message.message_id };
  await user.save();
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
