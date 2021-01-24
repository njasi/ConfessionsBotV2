const { User, Confession } = require("../../db/models");
const { getFullName } = require("./helpers");
const { sendVerifyPoll } = require("./verify");
const confession_responses = require("./config/confession_responses.json");
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
      // a lot of menus need the user so
      const user = await User.findOne({ where: { telegram_id: from.id } });
      if (user != null && user.verification_status == -1) {
        const options = { ...ik([[butt("Ok", "delete=true")]]) };
        const text = "You've been banned, begone from this place!";
        data = { options, text };
      } else {
        data = await this.load(
          from,
          { ...options, bot: bot, user: user },
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

const start = new Menu(async (from, args) => {
  let text = `Welcome ${
    from.first_name
  }! Please use the buttons below to navigate the menus${
    args.from_command
      ? ". If you want to send a confession just message me normally"
      : " and configure your confession"
  }.`;
  const confs = await Confession.findAll({
    where: { in_progress: true },
    include: {
      model: User,
      where: {
        telegram_id: from.id,
      },
    },
    order: [["updatedAt", "DESC"]],
  });
  if (confs.length == 2) {
    text =
      "It seems you already have an active confession. Would you like to discard the older confession and continue with this one?";
    const options = {
      ...ik([
        [
          butt("Continue", `menu=start&remove_confession=${confs[1].id}`),
          butt("Cancel This Confession", `remove_confession=${confs[0].id}`),
        ],
      ]),
      reply_to_message_id: args.message.message_id,
    };
    return { text, options };
  } else if (confs.length > 2) {
    text = `You already have ${
      confs.length - 1
    } other active confessions, please deal with them first.`;
    await confs[0].destroy();
    return {
      text,
      options: {
        ...ik([[butt("Ok", "delete=true")]]),
        reply_to_message_id: args.message.message_id,
      },
    };
  }
  const options = {
    ...ik([
      ...(args.from_command
        ? []
        : [
            [
              butt("Send Confession", "menu=send"),
              butt("Settings", "menu=settings"),
            ],
          ]),
      [
        butt("Help", "menu=help"),
        butt("Cancel", `remove_confession=${confs[0].id}`),
      ],
    ]),
    ...(args.from_command || args.from_swap
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
      [butt("Verify Me", "menu=verify_request")],
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

const verify_request = new Menu(async (from, args) => {
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
}, "verify_request");

const send = new Menu(async (from, args) => {
  const text = "How long from now would you like your message to be sent?";
  const options = {
    ...ik([
      [butt("Instant", "menu=ending_remark&send_time=0")],
      [
        butt("10 - 15 min", "menu=ending_remark&send_time=1"),
        butt("30 - 45 min", "menu=ending_remark&send_time=2"),
        butt("1 - 2 hrs", "menu=ending_remark&send_time=3"),
      ],
      [butt("Back", "menu=start"), butt("Settings", "menu=settings")],
    ]),
  };
  return { text, options };
}, "send");

const settings = new Menu(async (from, args) => {
  const conf = await Confession.findOne({
    where: { in_progress: true },
    include: { model: User, where: { telegram_id: from.id } },
  });
  const options = {
    ...ik([
      [
        butt(conf.content_warning==null?"Add Content Warning":"Edit Content Warning", "menu=cw&set_stage=wait_cw"),
        butt("Allow Responses", "menu=allow_res"),
      ],
      [
        butt("Reply to Message", "menu=reply"),
        butt("Select Auxillary Chat", "menu=chatlist"),
      ],
      [
        butt("Back", "menu=start"),
        butt("Cancel Confession", `remove_confession=${conf.id}`),
      ],
    ]),
    parse_mode: "HTML",
  };
  return {
    text: `Use the buttons below to change the settings for your confession.\n\n<b>CW:</b>\n${
      conf.content_warning != null ? conf.content_warning : "no content warning"
    }`,
    options,
  };
}, "settings");

const help = new Menu(() => {
  const text =
    "<b>NOTICE</b>\nThe bot has just been ported to node.js from python so many of the old features are missing. Ill probablly have them back within a week, but for now note that many features do not work.\n\n<b>To send a confession:</b>\nJust send a message here and then Confessions Bot wil give you time delay options (and a cancel option). Confessions Bot currently supports Text, . [other features to be restored soon] (Stickers, Images, Videos, Audio, Documents, Gifs, Voice, and Polls (/poll))";
  const options = {
    ...ik([
      [butt("Commands", "menu=commands"), butt("About", "menu=about")],
      [butt("Fellowdarbs info", "menu=fellowsinfo")],
      [butt("Main menu", "menu=start")],
    ]),
  };
  return { text, options };
});

const about = new Menu(() => {
  const text =
    "// TODO: put meaningful text here... just ask others what this is about for now";
  const options = {
    ...ik([[butt("Help Menu", "menu=help"), butt("Cancel", "delete=true")]]),
  };
  return { text, options };
});

const commands = new Menu(() => {
  const text =
    "<b>Commands:</b> \n/poll\nSend an anon poll to the confessions chats. [oof]\n/lock\nThe bot will no longer read your messages.[oof]\n/unlock\nThe bot will now read your messages.[oof]\n/cancel\nCancel current action.[oof]\n/feedback\nSend anon feedback to the creator (@njasi). Please be nice.[oof]\n/help\n...\n\n<b>Fellow Darbs Features:</b> \n/register\nYou will be registered to the list of fellows and people will be able to request to talk to you anonymously.[oof]\n/retire\nYou will be taken off of the fellows list.[oof]\n/fellowdarbs\nthis gives the list of darbs and the commands to contact them.[oof]\n/fellowsinfo\nGet more information on the fellow Darb feature\n\n";
  const options = {
    ...ik([[butt("Help Menu", "menu=help"), butt("Cancel", "delete=true")]]),
  };
  return { text, options };
});

const fellowsinfo = new Menu(() => {
  const text =
    "<b>NOTICE</b>\nThe Fellow darbs feature is currently being renovated none of the commands listed here will do anything right now!\n\n<b>Fellow Darbs Commands:</b>\n/register\nYou will be registered to the list of fellows and people will be able to request to talk to you anonymously.\n/retire\nYou will be taken off of the fellows list.\n/fellowdarbs\nthis gives the list of darbs and the commands to contact them\n\n<b>Purpose:</b>\nThis feature is for people who want support from others who are willing to listen, but are uncomfortable reaching out in person. <b>Do not ruin this for anyone who may need it</b>. I will obliterate all of your atoms if you do so.\n\n<b>Rules:</b>\nUse this for its intended purpose. If you are using it for another reason <b>please be kind</b>.\nThat is all.";
  const options = {
    ...ik([[butt("Help Menu", "menu=help"), butt("Cancel", "delete=true")]]),
  };
  return { text, options };
});

const ending_remark = new Menu((from, args) => {
  let choices = ["oof"];
  if (args.horny) {
    choices = confession_responses.horny;
  } else {
    choices = confession_responses.normal;
  }
  const text = choices[Math.floor(Math.random() * choices.length)];
  const options = { ...ik([[butt("Ok", "delete=true")]]) };
  return { text, options };
});

const verify_accept = new Menu((from, args) => {
  return {
    text:
      "<b>Congratulations!</b>\nYou've been approved to use Confessions Bot! \nPlease join the <a href='https://t.me/joinchat/EKj6oJQp9l9aPD5O'>Verification Chat</a>\n",
    options: {
      parse_mode: "HTML",
      ...ik([
        [butt("Help", "menu=help"), butt("About Confessions", "menu=about")],
        [butt("Ok", "delete=true")],
      ]),
    },
  };
}, "verify_accept");

const verify_reject = new Menu((from, args) => {
  return {
    text:
      "We're sorry, it appears that you were denied access to Confessions Bot. You can reapply in a day.",
    options: {
      ...ik([[butt("Ok", "delete=true")]]),
    },
  };
}, "verify_reject");

const verify_ban = new Menu((from, args) => {
  return {
    text:
      "We're sorry, it appears that you were banned from Confessions Bot. If you think this is a mistake, please say so in some Dabney chat. If you're not in any Dabney chats, perhaps you shouldn't be using the bot...",
    options: {
      ...ik([[butt("Ok", "delete=true")]]),
    },
  };
}, "verify_ban");

const toggle_lock = new Menu((from, args) => {
  const l = args.user.locked;
  if (args.from_command) {
    if (args.command == "lock") {
      return {
        text: l
          ? "You already have @DabneyConfessionsBot locked."
          : "Lock @DabneyConfessionsBot? (you can unlock with /unlock)",
        options: {
          ...ik([
            [
              ...(l
                ? [
                    butt("Unlock it", "menu=toggle_lock_confirm&lock=false"),
                    butt("Cancel", "delete=true"),
                  ]
                : [
                    butt("Lock it", "menu=toggle_lock_confirm&lock=true"),
                    butt("Cancel", "delete=true"),
                  ]),
            ],
          ]),
        },
      };
    } else {
      return {
        text: l
          ? "Unlock @DabneyConfessionsBot? (you can lock it again with /lock)"
          : "You already have @DabneyConfessionsBot unlocked.",
        options: {
          ...ik([
            [
              ...(l
                ? [
                    butt("Unlock it", "menu=toggle_lock_confirm&lock=false"),
                    butt("Cancel", "delete=true"),
                  ]
                : [
                    butt("Lock it", "menu=toggle_lock_confirm&lock=true"),
                    butt("Cancel", "delete=true"),
                  ]),
            ],
          ]),
        },
      };
    }
  } else {
    return {
      text: `You currently have @DabneyConfessionsBot ${
        l ? "locked" : "unlocked"
      }.`,
      options: {
        ...ik([
          [
            butt(l ? "Unlock" : "Lock", `menu=toggle_lock&lock=${l}`),
            butt("Cancel", "delete=true"),
          ],
        ]),
      },
    };
  }
});

const toggle_lock_confirm = new Menu(async (from, args) => {
  args.user.locked = args.lock == "true";
  await args.user.save();
  return {
    text: `@DabneyConfessionsBot is now ${
      args.lock == "true"
        ? "locked and will no longer read your messages."
        : "unlocked and will now be able to read your messages."
    }`,
    options: { ...ik([[butt("Ok", "delete=true")]]) },
  };
});

const cw = new Menu(async (from, args) => {
  const conf = await Confession.findOne({
    where: { userId: args.user.id, in_progress: true, stage: "wait_cw" },
  });
  let text =
    "What would you like the warning to say?\n\nSend me a message to tell me the warning, or select cancel to go back.\n\n(it will send it in this format 'CW: {your message}')";
  if (conf.content_warning !== null) {
    text = `The Content Warning for this confession is currently: \n\nCW: ${conf.content_warning}. \n\nSend me a message to give me a new warning, or select cancel to go back.\n\n(it will send it in this format 'CW: {your message}')`;
  }
  return {
    text,
    options: {
      ...ik([
        [
          butt("Cancel", "menu=settings&set_stage=idle"),
          ...(conf.content_warning != null
            ? [
                butt(
                  "Remove CW",
                  `menu=settings&set_stage=idle&clear_cw=${conf.id}`
                ),
              ]
            : []),
        ],
      ]),
    }, // TODO set stage
  };
}, "cw");

const cw_confirm = new Menu(async (from, args) => {
  const confession = await Confession.findOne({
    where: { userId: args.user.id, in_progress: true },
  });
  return {
    text: `Is this content warning ok?\n\nCW: ${confession.content_warning}`,
    options: {
      ...ik([
        [
          butt("Yes", "menu=settings&set_stage=idle"),
          butt(
            "No, retry",
            `menu=cw&set_stage=wait_cw&clear_cw=${confession.id}`
          ),
        ],
      ]),
    },
  };
});

// TODO menu -> reply
// TODO menu -> chatlist
// TODO menu -> allow_res
// TODO menu -> verify_update
// TODO menu -> settings

const MENUS = {
  start,
  settings,
  send,
  ending_remark,
  help,
  about,
  commands,
  fellowsinfo,
  verify,
  verify_request,
  verify_accept,
  verify_reject,
  verify_ban,
  toggle_lock,
  toggle_lock_confirm,
  cw,
  cw_confirm,
};

module.exports = { MENUS, detectAndSwapMenu, swapMenu };
