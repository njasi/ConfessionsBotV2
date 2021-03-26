const { User, Confession, Chat } = require("../../db/models");
const { getFullName, int_to_ordinal } = require("./helpers");
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

/**
 * the general Menu class so i dont have to replicate a lot of code.
 */
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
  let active = true;
  if (confs[0] == null) {
    active = false;
  }

  let text = `Welcome ${
    from.first_name
  }! Please use the buttons below to navigate the menus${
    args.from_command || !active
      ? ". \n\nIf you want to send a confession just message me normally"
      : " and configure your confession"
  }.`;
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
      ...(args.from_command || !active
        ? []
        : [
            [
              butt("Send Confession", "menu=send"),
              butt("Settings", "menu=settings"),
            ],
          ]),
      [
        butt("Help", "menu=help"),
        butt(
          "Cancel",
          args.from_command || !active
            ? `delete=true`
            : `remove_confession=${confs[0].id}`
        ),
      ],
    ]),
    ...(args.from_command || args.from_swap || !active
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
    include: [
      { model: User, where: { telegram_id: from.id } },
      { model: Chat },
    ],
  });
  const options = {
    ...ik([
      [
        butt(
          conf.content_warning == null
            ? "Add Content Warning"
            : "Edit Content Warning",
          "menu=cw&set_stage=wait_cw"
        ),
        ...(conf.type == "sticker"
          ? []
          : [
              butt(
                `${conf.allow_responses ? "Disable" : "Allow"} Responses`,
                `menu=settings&allow_res=${!conf.allow_responses}`
              ),
            ]),
      ],
      [
        butt("Reply to Message", "menu=reply"),
        butt("Select Auxillary Chat", "menu=chatlist"),
      ],
      [butt("Back", "menu=start"), butt("Send Confession", `menu=send`)],
    ]),
    parse_mode: "HTML",
  };
  return {
    text: `Use the buttons below to change the settings for your confession.\n\n<b>CW:</b>\n\t\t${
      conf.content_warning != null
        ? `✅ - ${conf.content_warning}`
        : "❌ - no content warning set"
    }${
      conf.type == "sticker"
        ? ""
        : `\n<b>Responses:</b> \n\t\t${
            conf.allow_responses ? "✅ - allowed" : "❌ - disabled"
          }`
    }\n<b>Target Message:</b>\n\t\t${
      conf.reply_message == null
        ? "❌ - no reply set"
        : `✅ - ${conf.reply_markup.text}`
    }\n<b>Target Chat:</b>\n\t\t${
      conf.chatId == null ? "❌ - no aux chat selected" : `✅ - ${conf.name}`
    }`,
    options,
  };
}, "settings");

const help = new Menu(() => {
  const text =
    "<b>To send a confession:</b>\nJust send a message here and then Confessions Bot will give you options to configure and send your confession (and a cancel option). Confessions Bot currently supports Text, Stickers, Images, Videos, Audio, Documents, Gifs, Voice, and Polls\n\n<b>Sending polls:</b>\nUsing the polls functionality of the bot is easier than ever before! Simply send a poll to the bot and it will replicate it when it sends.";
  const options = {
    ...ik([
      [butt("Commands", "menu=commands"), butt("About", "menu=about")],
      [butt("Fellowdarbs info", "menu=fellows_info")],
      [butt("Main menu", "menu=start")],
    ]),
  };
  return { text, options };
});

const about = new Menu(() => {
  const text =
    "// TODO: put meaningful text here... just ask others what this is about for now";
  const options = {
    ...ik([[butt("Help Menu", "menu=help"), butt("Cancel", "delete=true")]]), // TODO: thing
  };
  return { text, options };
});

const commands = new Menu(() => {
  const text =
    "<b>Commands:</b> \n/poll\nSend an anon poll to the confessions chats. \n/lock\nThe bot will no longer read your messages.\n/unlock\nThe bot will now read your messages.\n/cancel\nCancel current action.[oof]\n/feedback\nSend anon feedback to the creator (@njasi). Please be nice.[oof]\n/help,/about\n...\n\n<b>Fellow Darbs Features:</b> \n/register\nYou will be registered to the list of fellows and people will be able to request to talk to you anonymously.[oof]\n/retire\nYou will be taken off of the fellows list.[oof]\n/fellowdarbs\nthis gives the list of darbs and the commands to contact them.[oof]\n/fellowsinfo\nGet more information on the fellow Darb feature\n\n";
  const options = {
    ...ik([[butt("Help Menu", "menu=help"), butt("Cancel", "delete=true")]]),
  };
  return { text, options };
});

const fellows_info = new Menu(() => {
  const text =
    "<b>NOTICE</b>\nThe Fellow darbs feature is currently being renovated none of the commands listed here will do anything right now!\n\n<b>Fellow Darbs Commands:</b>\n/register\nYou will be registered to the list of fellows and people will be able to request to talk to you anonymously.\n/retire\nYou will be taken off of the fellows list.\n/fellowdarbs\nthis gives the list of darbs and the commands to contact them\n\n<b>Purpose:</b>\nThis feature is for people who want support from others who are willing to listen, but are uncomfortable reaching out in person. <b>Do not ruin this for anyone who may need it</b>. I will obliterate all of your atoms if you do so.\n\n<b>Rules:</b>\nUse this for its intended purpose. If you are using it for another reason <b>please be kind</b>.\nThat is all.";
  const options = {
    ...ik([[butt("Help Menu", "menu=help"), butt("Cancel", "delete=true")]]),
  };
  return { text, options };
});

const ending_remark = new Menu(async (from, args) => {
  let choices = ["oof"];
  if (args.horny) {
    choices = confession_responses.horny;
  } else {
    choices = confession_responses.normal;
  }
  const choice = choices[Math.floor(Math.random() * choices.length)];
  let formatted_btns = [];

  const btns =
    choice[1] != null
      ? choice[1].map((txt) => butt(txt, "delete=true"))
      : [butt("Ok", "delete=true")];
  for (let i = 0, j = btns.length / 3; i < btns.length; i += 3) {
    formatted_btns.push(btns.slice(i, i + 3));
  }
  const options = { ...ik(formatted_btns) };
  return { text: choice[0], options };
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
    },
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

const cw_too_long = new Menu(async (from, args) => {
  const confession = await Confession.findOne({
    where: { userId: args.user.id, in_progress: true },
  });
  return {
    text: `Your content warning was too long! The character limit is 69 characters.`,
    options: {
      ...ik([
        [
          butt("Retry", `menu=cw&set_stage=wait_cw&clear_cw=${confession.id}`),
          butt("Cancel", "menu=settings&set_stage=idle"),
        ],
      ]),
    },
  };
});

const cw_text_only = new Menu(async (from, args) => {
  const confession = await Confession.findOne({
    where: { userId: args.user.id, in_progress: true },
  });
  return {
    text: `Content warnings must be text only.\n\nWould you like to try again?`,
    options: {
      ...ik([
        [
          butt("Retry", `menu=cw&set_stage=wait_cw&clear_cw=${confession.id}`),
          butt("Cancel", "menu=settings&set_stage=idle"),
        ],
      ]),
    },
  };
});

const poll_info = new Menu(async (from, args) => {
  return {
    text: `Using the polls functionality of the bot is easier than ever before! Simply send a poll to the bot and it will replicate it when it sends.`,
    options: {
      ...ik([[butt("Ok", "delete=true")]]),
    },
  };
}, "poll_info");

// const fellows_privacy = new Menu(async (from, args) => {
//   let text = "Do you want to reveal your name to {}?";
//   if (args.to_confessor) {
//     text = text.format(`Confessor ${args.to_confessor}`);
//   }
//   let options = {
//     ...ik([
//       [
//         butt("Yes", "menu=fellows_text&p=false"),
//         butt("No", "menu=fellows_text&p=true"),
//       ],
//       [butt("Cancel", "delete=true")],
//     ]),
//   };
//   return { text, options };
// });

const fellows_send_options = new Menu(async (from, args) => {
  const name = args.name ? args.name : "anon";
  let text = "Your message to {} says:\n\n{}".format(name, args.message_text);
  let options = {
    ...ik([
      [butt("Send anonymously", "menu=fellows_text&p=false")],
      [butt("Send", "menu=fellows_text&p=true"), butt("Cancel", "delete=true")],
    ]),
  };
  return { text, options };
}, "fellows_send_options");

const fellows_confirm_signed = new Menu(async (from, args) => {
  let text = "Your message says:\n\n";
  let options = {
    ...ik([
      [
        butt("Yes", "menu=fellows_sent"), // TODO: send the message callback data
        butt("Cancel", "delete=true"),
      ],
    ]),
  };
  return { text, options };
}, "fellows_confirm_signed");

const fellows_sent = new Menu(async (from, args) => {
  let name = args.name ? args.name : "anon";
  let text = "Your message to {} has been sent".format(name);
  let options = { ...ik([[butt("Ok", "delete=true")]]) }; // TODO: respond callback

  return { text, options };
}, "fellows_sent");

const fellows_recieved = new Menu(async (from, args) => {
  let name = args.name ? args.name : "";
  let text = "You have been sent a message from {}:\n\n{}".format(
    name,
    args.message_text
  );
  let options = { ...ik([[butt("Respond", "")]]) }; // TODO: respond callback

  return { text, options };
}, "fellows_recieved");

// TODO menu -> reply
// TODO menu -> chatlist
// TODO menu -> verify_update
// TODO menu -> settings (wip)

const chats_add = new Menu(async (from, args) => {
  const chat = await Chat.findOne({ where: { chat_id: `${from.id}` } });
  let text;
  let action_btn;
  if (args.remove) {
    action_btn = chat
      ? butt("Leave", `menu=chats_added&c_ad=true&chat_remove=${args.chat_id}`)
      : butt("Connect", `menu=chats_added&c_ad=true&chat_add=${args.chat_id}`);
    text = chat
      ? "Are you sure you want to leave the <u>Confessions Network™</u>?"
      : "<b>This chat is not registered, so it cannot be removed.</b>\n\nWould you like to connect it to the <u>Confessions Network™</u> instead?";
  } else {
    action_btn = chat
      ? butt("Leave", `menu=chats_added&c_ad=true&chat_remove=${args.chat_id}`)
      : butt("Connect", `menu=chats_added&c_ad=true&chat_add=${args.chat_id}`);
    text = chat
      ? "<b>This chat is already in the <u>Confessions Network™</u></b>\n\n Would you like to leave the <u>Confessions Network™</u> instead?</b>"
      : "<b>Do you want to connect ths chat to the <u>Confessions Network™</u>?</b>\n\nThis means that people will be able to choose to send confessions here through the bot.";
  }

  return {
    text,
    options: {
      ...ik([[action_btn, butt("Cancel", "c_ad=true&delete=true")]]),
      reply_to_message_id: args.message_id,
    },
  };
}, "chats_add");

const chats_added = new Menu(async (from, args) => {
  return {
    text: args.chat_remove
      ? "<b>Goodbye forever</b>\n\nIf you wish rejoin the <u>Confessions Network™</u> use the command /joinnetwork (an admin of the chat must do this)"
      : `<b>Welcome to the <u>Confessions Network™</u></b>\n\nThis chat is the ${int_to_ordinal(
          args["chat_num"]
        )} chat to join the <u>Confessions Network™</u>\n\nSend the command /leavenetwork if you want to undo this. (an admin of the chat must do this)`,
  };
}, "chats_added");

const MENUS = {
  start, // the start menu
  settings, // settings menu
  send, // send confession / time delay options
  ending_remark, // menu that you see after confessing, random remark
  help, // main help menu
  about, // brings up abt text for the bot
  commands, // gives a list of commands
  verify, // asks you if you want to veriy
  verify_request, // tells you your request to verify was sent
  verify_accept, // shows that your verification was accepted
  verify_reject, // shows your verification has been rejected
  verify_ban, // shows that have been banned after attempting to verify
  toggle_lock, // menu that gives you the toggle lock btn
  toggle_lock_confirm, // menu to confirm the toggle lock
  cw, // asks if you want to set cw or cancel
  cw_confirm, // menu shows you your cw and asks if it is good
  cw_too_long, // error menu that says a cw is too long
  cw_text_only, // error menu that says cws can only be text
  poll_info, // info abt how to use the polls
  fellows_info, // help/about menu just for the fellows section
  // fellows_privacy, // select if you want your name to be known when messaging someone
  fellows_send_options, //
  fellows_confirm_signed, //
  fellows_sent, // notice that your message has been sent
  fellows_recieved, // the menu you see when you recieve a message from a fellow
  chats_add,
  chats_added,
};

module.exports = { MENUS, detectAndSwapMenu, swapMenu };
