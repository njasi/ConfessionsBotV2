const { Confession, User, Chat } = require("../../../db/models");
const { ik, butt } = require("../helpers");
const { Menu } = require("./menu_class");

/**
 * main settings menu
 */
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
        butt("Reply to Message", "menu=set_reply&set_stage=wait_reply"),
        butt(
          conf.chatId ? "Change Auxillary Chat" : "Select Auxillary Chat",
          "menu=chatlist&chat_page=0"
        ),
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
        : `✅ - replying to <a href="https://t.me/c/${conf.reply_message[0][0].replace(
            "-100",
            ""
          )}/${conf.reply_message[0][1]}">this message</a>`
    }\n<b>Target Chat:</b>\n\t\t${
      conf.chatId == null
        ? "❌ - no aux chat selected"
        : `✅ - ${conf.chat.name}`
    }`,
    options,
  };
}, "settings");

/**
 * content warning settings
 */

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

const cw_error = new Menu(async (from, args) => {
  const confession = await Confession.findOne({
    where: { userId: args.user.id, in_progress: true },
  });
  return {
    text:
      args.error == 1
        ? `Your content warning was too long! The character limit is 69 characters.`
        : `Content warnings must be text only.\n\nWould you like to try again?`,
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

/**
 * Confession reply settings below
 */
const set_reply = new Menu(async (from, args) => {
  const confs = await args.user.getConfessions();
  const conf = confs[0];
  text = args.try_again
    ? "Send me the message link you'd like to try."
    : `To reply to a message select it and choose the "Copy message link" option and then send it to me.\n\nNote that non supergroup chats do not have this option.`;

  return {
    text: `${text}${
      conf.reply_message
        ? '\n\nIf you\'d like to remove the reply select the "Remove Reply" button below.'
        : ""
    }`,
    options: {
      ...ik([
        [
          butt("Cancel", "menu=settings&set_stage=idle"),
          ...(conf.reply_message
            ? [butt("Remove Reply", "menu=settings&clear_ri=true")]
            : []),
        ],
      ]),
    },
  };
}, "ret-reply");

const set_reply_confirm = new Menu(async (from, args) => {
  return {
    text: "Is this the message you want to respond to?",
    options: {
      ...ik([
        [
          butt(
            "Yes",
            args.rc_id == args.cc_id || args.rc_id < 0
              ? `menu=settings&c_id=${args.rc_id}&m_id=${args.message_id}&delete=${args.forwarded.message_id}`
              : `menu=set_reply_error&error=3&rc_id=${args.rc_id}&m_id=${args.message_id}&delete=${args.forwarded.message_id}`
          ),
          butt(
            "Try again",
            `menu=set_reply&try_again=true&delete=${args.forwarded.message_id}`
          ),
        ],
      ]),
    },
  };
}, "set_reply_confirm");

// message link doesnt go to a registered chat or doesnt match the aux chat.
const set_reply_error = new Menu(async (from, args) => {
  let text = "",
    options = {};
  if (args.error == 1) {
    text =
      "It appears that this message is in a chat that is not in the <u>Confessions Network™</u>";
    options = { ...ik([[butt("ok", "menu=settings&set_stage=idle")]]) };
  } else if (args.error == 2) {
    text = "The message link provided is not valid, please try again.";
    options = {
      ...ik([
        [
          butt("Try again", "menu=set_reply"),
          butt("Cancel", "menu=settings&set_stage=idle"),
        ],
      ]),
    };
  } else if ((args.error = "3")) {
    text = `The selected message is in a different chat than the confession's auxiliary chat.\n\nIf you'd like to change the auxiliary chat to the chat that has this message select "Change Aux Chat"`;
    options = {
      ...ik([
        [
          butt(
            "Change Aux Chat",
            `menu=settings&target_id=${args.rc_id}&c_id=${args.rc_id}&m_id=${args.m_id}`
          ),
        ],
        [
          butt("Retry", "menu=set_reply"),
          butt("Cancel", "menu=settings&set_stage=idle"),
        ],
      ]),
    };
  }
  return { text, options };
}, "set_reply_error");

/**
 * lock unlock settings below
 */
const toggle_lock = new Menu((from, args) => {
  const l = args.user.locked;
  if (args.fc) {
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

module.exports = {
  settings, // settings menu

  cw, // asks if you want to set cw or cancel
  cw_confirm, // menu shows you your cw and asks if it is good
  cw_error, // error menu that says a cw is too long / can only be text

  set_reply,
  set_reply_confirm,
  set_reply_error,

  toggle_lock, // menu that gives you the toggle lock btn
  toggle_lock_confirm, // menu to confirm the toggle lock
};
