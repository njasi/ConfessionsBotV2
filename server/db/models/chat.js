const Sequelize = require("sequelize");
const bot = require("../../api/bot/bot");
const db = require("../db");

const Chat = db.define("chat", {
  name: {
    type: Sequelize.STRING,
  },
  num: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  chat_id: {
    type: Sequelize.STRING,
    unique: true,
  },
  old_chat_id: {
    type: Sequelize.STRING,
    unique: true,
  },
  horny: {
    type: Sequelize.BOOLEAN,
    default: false,
  },
  static: {
    type: Sequelize.BOOLEAN,
    default: false,
  },
});

/**
 * a function to test that chats in the network have not changed their names or been deleted
 * updates names and removes chats as needed.
 * Sends a message to the admin if chats have been deleted so they can verify it later
 * @param {bool} tab: insert tabs in output if true
 */
Chat.test_chats = async function (tab = false, logging = true) {
  const removed = [];
  const chats = await Chat.findAll();
  if (logging)
    console.log(
      "\x1b[32m%s\x1b[0m",
      `${tab ? "\t" : "\n"}Found ${chats.length} chats in the network`
    );
  for (let i = 0; i < chats.length; i++) {
    if (logging)
      console.log(
        (tab ? "\t" : "") + "\x1b[33m%s\x1b[0m",
        `{id: ${chats[i].id}\tname: "${chats[i].name}"\tchat_id: ${chats[i].chat_id}}`
      );
    try {
      const result = await bot.sendMessage(chats[i].chat_id, "/activitytest", {
        disable_notification: true,
      });
      await bot.deleteMessage(chats[i].chat_id, result.message_id);
      if (logging)
        console.log(
          (tab ? "\t" : "") + "\t\x1b[32m%s\x1b[0m",
          `==> Test passed, chat is still active!`
        );
      const chat = await bot.getChat(chats[i].chat_id);
      if (chats[i].name != chat.title) {
        chats[i].name = chat.title;
        await chats[i].save();
      }
    } catch (err) {
      if (logging)
        console.log(
          (tab ? "\t" : "") + "\t\x1b[31m%s\x1b[0m",
          `==> Test failed, chat ${chats[i].id} could not be found.`
        );
      removed.push(chats[i]);
      await chats[i].destroy();
    }
  }
  if (removed.length > 0) {
    const removed_text = `\nThe following chats were removed:\n${JSON.stringify(
      removed,
      null,
      "  "
    )}`;
    if (logging)
      console.log(
        (tab ? "\t" : "") + "\x1b[31m%s\x1b[0m" + (tab ? "" : "\n"),
        removed_text
      );
    bot.sendMessage(process.env.ADMIN_ID, removed_text);
  } else {
    if (logging)
      console.log(
        (tab ? "\t" : "") + "\x1b[32m%s\x1b[0m",
        "All chats are still active!" + (tab ? "" : "\n")
      );
  }
};

module.exports = Chat;
