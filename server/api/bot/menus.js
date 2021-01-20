const { User } = require("../../db/models");
const { getFullName } = require("./helpers");
const { sendVerifyPoll } = require("./verify");

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

async function swapMenu(query, params, bot) {
  const menu = MENUS[params.menu];
  const data = await menu.load(query.from, { bot, ...params, query });
  await bot.editMessageText(data.text, {
    message_id: query.message.message_id,
    chat_id: query.message.chat.id,
    parse_mode: "HTML",
    ...data.options,
  });
  // if (option.media) {
  //   await bot.editMessageMedia(option.media, {
  //     message_id: query.message.message_id,
  //     chat_id: query.message.chat.id,
  //   });
  // }
}

async function detectAndSwapMenu(query, params, bot) {
  if (query.data.match(/^menu=/)) {
    swapMenu(query, params, bot);
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
      let data;
      const user = await User.findOne({ where: { telegram_id: from.id } });
      if (user != null && user.verification_status == -1) {
        const options = { ...ik([[butt("Ok", "delete=true")]]) };
        const text = "You've been banned, begone from this place!";
        data = { options, text };
      } else {
        data = await this.load(
          from,
          { ...options, bot: bot, user },
          ...Array.prototype.slice.call(arguments, [3])
        );
      }
      const res = await bot.sendMessage(from.id, data.text, {
        parse_mode: "HTML",
        ...data.options,
      });
      return res;
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
      [butt("Help", "menu=help"), butt("Cancel", "delete=true")],
    ]),
    ...(args.from_command
      ? {}
      : { reply_to_message_id: args.message.message_id }),
  };
  return { text, options };
}, "start");

const verify = new Menu(async (from, args) => {
  const user = args.user;
  let text =
      "You're currently not verified, would you like to request verification and approval for using the bot?",
    keyboard = [
      [butt("Verify Me", "menu=request_verify")],
      [butt("Cancel", "delete=true")],
    ];

  if (user !== null) {
    switch (user.verification_status) {
      case -2:
        text =
          "You are currently being verified. Note that verification may take up to a day. Please be patient.";
        keyboard = [[butt("Ok", "delete=true")]];
        break;
      case -1:
        text = "Sorry, you have been banned from using this bot.";
        keyboard = [[butt("Ok", "delete=true")]];
        break;
      case 0:
        break;
      case 1:
      case 2:
      case 3:
      case 4:
        text =
          "You have already been verified and are allowed to use the bot. If you want to update your information please use /verifyupdate or the button below";
        keyboard = [
          [
            butt("Cancel", "delete=true"),
            butt("Update Me", "menu=verify_update"),
          ],
        ];
    }
  }
  const options = { ...ik(keyboard) };
  return { text, options };
}, "verify");

const request_verify = new Menu(async (from, args) => {
  const [user, create] = await User.findOrCreate({
    where: {
      telegram_id: from.id,
    },
  });
  if (!create) {
    const until =
      Date().getTime() -
      (verification_request_time.getTime() + user.verification_cool_down);
    if (until > 0) {
      const text = `You need to wait for ${
        until / 3600000
      } hours before attempting to verify again.`;
      const options = { ...ik([[butt("Ok", "delete=true")]]) };
      return { text, options };
    }
  }
  const res = await sendVerifyPoll(args.bot, from);
  user.poll_id = res.poll.id;
  user.verification_request_time = new Date();
  user.name = getFullName(from, (username = false));
  user.username = from.username;
  user.verification_status = -2;
  await user.save();

  const text =
    "Ok, I've sent your request to the verification chat! I'll let you know when your request has been resolved.";
  const options = { ...ik([[butt("Ok", "delete=true")]]) };
  return { text, options };
}, "request_verify");

const MENUS = {
  start,
  verify,
  request_verify,
};

module.exports = { MENUS, detectAndSwapMenu };
