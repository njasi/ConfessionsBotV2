function send_menu(menu, from, bot) {
  menu.send(bot);
}

function send_menu_from_key(menu_key, from, bot) {
  MENUS[menu_key].send(bot, from);
}

/**
 * haha butt
 * returns a formatted button for me so I can be lazy
 * @param {string} text - button text
 * @param {string} callback_data - button cb data
 * @param {object} options - options to use instead of cbdata
 */
function butt(text, callback_data, options = null) {
  if (options != null) {
    return { text, ...options };
  }
  return { text, callback_data };
}
/**
 * amother formatted thing to be lazy
 * @param {array of array of object} buttons - buttons
 */
function ik(buttons) {
  return { reply_markup: { inline_keyboard: buttons } };
}

async function detectAndSwapMenu(query) {
  if (query.data.match(/^menu/)) {
    const params = params_from_string(query.data);
    await swapMenu(query, params);
    return true;
  }
  return false;
}

class Menu {
  constructor(get_data, key) {
    this.get_data = get_data;
    this.key = key;
  }
  async load() {
    return await this.get_data(...arguments);
  }
  async send(bot, from, options) {
    try {
      const data = await this.load(
        from,
        options,
        ...Array.prototype.slice.call(arguments, [3])
      );
      bot.sendMessage(from.id, data.text, {
        parse_mode: "HTML",
        ...data.options,
      });
    } catch (error) {
      bot.sendMessage(
        process.env.ADMIN_ID,
        `There was an error in the ${this.key} menu:\n${error.stack}`
      );
    }
  }
}

const start = new Menu((from, args) => {
  const text = `Welcome ${
    from.first_name
  }! Please use the buttons below to navigate the menus${
    args.from_command
      ? ". If you want to send a confession just message me normally"
      : " and configure your confession"
  }.`;
  const options = {
    ...ik([
      ...(args.from_command
        ? []
        : [
            [
              butt("Send Confession", "menu=send"),
              butt("Add Content Warning", "menu=cw"),
            ],
            [
              butt("Reply to Message", "menu=reply"),
              butt("Select Auxillary Chat", "menu=chatlist"),
            ],
          ]),
      [butt("Help", "menu=help"), butt("Cancel", "menu=cancel")],
    ]),
    ...(args.from_command
      ? {}
      : { reply_to_message_id: args.message.message_id }),
  };
  return { text, options };
}, "start");

const MENUS = {
  start,
};

module.exports = { MENUS, detectAndSwapMenu };
