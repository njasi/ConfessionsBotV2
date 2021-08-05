const { User } = require("../../../db/models");

/*
 *  This whole setup can be improved a lot, so do that if you'd like.
 */

/**
 * The function that dynamicly swaps menus based on queries and the user
 */
async function swapMenu(query, params, bot) {
  try {
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
    console.log("\n\nMENU SWAP QUERY:\n\n", query.message, "\n\n");
    console.log("\n\nMENU SWAP DATA:\n\n", data, "\n\n");
    // console.log(util.inspect(query, (depth = null)));
    const wrap = async () => {
      if (data.send_image) {
        console.log("\nSwapping into photo menu\n");
        // switch into a menu with an image, note the text limit (1024 char) change somewhere (from 4096)
        await bot.deleteMessage(
          query.message.chat.id,
          query.message.message_id
        );
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
        console.log("\nSwapping away from photo menu\n");
        // switching away from a media menu
        try {
          await bot.deleteMessage(
            query.message.chat.id,
            query.message.message_id
          );
        } catch (error) {
          // do nothing, some menus delete themselves. I'm too lazy to make this clean srry
          // TODO: fix the media menus that delete themselves
        }
        const message = await bot.sendMessage(
          query.message.chat.id,
          data.text,
          {
            parse_mode: "HTML",
            ...data.options,
          }
        );
        console.log("\n\n OUT MESSAGE:\n\n", message, "\n\n");
        return message;
      } else {
        console.log("\nSwapping into normal menu\n");
        // normal menu swap
        console.log(
          "\nAAAAAAA\n",
          {
            message_id: query.message.message_id,
            chat_id: query.message.chat.id,
          },
          "\n\n"
        );
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
  } catch (error) {
    // TODO standard error handling
    console.error(`There was an error swapping into the ${params.menu} menu.`);
    console.error(`Previous Menu:\n${query.message}`);
    console.error(error.stack);
    bot.sendMessage(
      process.env.ADMIN_ID,
      `There was an error swapping into the ${params.menu} menu:`
    );
    bot.sendMessage(process.env.ADMIN_ID, `${error.stack}`); // seperate messages in case the stack is so long that it stops the warning.
  }
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
