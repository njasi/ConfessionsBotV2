const { Chat } = require("../../../db/models");
const { int_to_ordinal, ik, butt } = require("../helpers");
const { Menu } = require("./menu_class");

/**
 * how many chats are shown per page when choosing an aux chat
 */
const PAGE_LENGTH = 5;

const chats_add = new Menu(async (from, args) => {
  console.log("chats asddddd")
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

// TODO static chats cannot be changed
const chats_added = new Menu(async (from, args) => {
  return {
    text: args.chat_remove
      ? "<b>Goodbye forever</b>\n\nIf you wish rejoin the <u>Confessions Network™</u> use the command /joinnetwork (an admin of the chat must do this)"
      : `<b>Welcome to the <u>Confessions Network™</u></b>\n\nThis chat is the ${int_to_ordinal(
          args["chat_num"]
        )} chat to join the <u>Confessions Network™</u>\n\nSend the command /leavenetwork if you want to undo this. (an admin of the chat must do this)`,
  };
}, "chats_added");

// TODO label chats as horny?
const chatlist = new Menu(async (from, args) => {
  const chats = await Chat.findAndCountAll({
    attributes: ["id", "name"],
    order: [["num", "DESC"]],
    limit: PAGE_LENGTH,
    offset: PAGE_LENGTH * parseInt(args["chat_page"]),
    raw: true,
  });

  const confs = await args.user.getConfessions({
    attributes: ["chatId", "reply_message"],
    where: { in_progress: true },
    include: { model: Chat },
  });

  let arrows = [
    ...(args["chat_page"] != "0"
      ? [
          butt(
            "⬅️",
            `menu=chatlist&chat_page=${parseInt(args["chat_page"]) - 1}`
          ),
        ]
      : []),
    butt("Back", "menu=settings"),
    ...(parseInt(args["chat_page"]) * PAGE_LENGTH + PAGE_LENGTH < chats.count
      ? [
          butt(
            "➡️",
            `menu=chatlist&chat_page=${parseInt(args["chat_page"]) + 1}`
          ),
        ]
      : []),
  ];
  nconf = confs[0];

  const target = `<b>Current Target Chat:</b>\n\t\t${
    nconf.chatId == null ? "❌ - no chat selected" : `✅ - ${nconf.chat.name}`
  }`;
  return {
    text: `<b>${
      nconf.chatId
        ? "Change or cancel the target chat below"
        : "Select an target chat below"
    }:</b>\nYour confession will be sent to the target chat in addition to the normal chats
    \n${target}`,
    options: {
      ...ik([
        ...chats.rows.map((r) => [
          butt(
            nconf.chatId == r.id ? `${r.name} - ✅` : r.name,
            nconf.chatId == r.id
              ? "menu=settings"
              : nconf.reply_message &&
                ![
                  process.env.CONFESSIONS_CHAT_ID,
                  process.env.CONFESSIONS_CHANNEL_ID,
                ].includes(nconf.reply_message[0][0])
              ? `menu=chatlist_reply&tar=${r.id}`
              : `menu=settings&target_id=${r.id}`
          ),
        ]),
        arrows,
        ...(nconf.chatId == null
          ? []
          : [[butt("Remove Aux Chat", "menu=settings&target_id=-1")]]),
      ]),
    },
  };
}, "chatist");

const chatlist_reply = new Menu(async (from, args) => {
  const chat = Chat.findByPk(parseInt(args["tar"]));
  const confs = await args.user.getConfessions({
    attributes: ["chatId", "reply_message"],
    where: { in_progress: true },
    include: { model: Chat },
  });
  const conf = confs[0];

  return {
    text: `Are you sure you want to change your auxiliary chat to ${
      chat.name
    }?\nThis will clear <a href="https://t.me/c/${conf.reply_message[0][0].replace(
      "-100",
      ""
    )}/${
      conf.reply_message[0][1]
    }">the message</a> you want to reply to, as it is in a different chat`,
    options: {
      ...ik([
        [
          butt(
            "Change Aux Chat",
            `menu=settings&target_id=${args["tar"]}&clear_ri=true`
          ),
        ],
        [butt("Cancel Change", "menu=settings")],
      ]),
    },
  };
}, "chatlist_reply");



module.exports = {
  chats_added,
  chats_add,
  chatlist,
  chatlist_reply,
};
