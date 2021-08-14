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
 * @param {bool} tab      : insert tabs in output if true
 * @param {bool} logging  : if i want to console.log, if false send message with output to admin instead
 */
Chat.test_chats = async function (tab = false, logging = true) {
  const removed = [];
  const chats = await Chat.findAll();
  const out = [];
  const holder = console.log;

  try {
    if (!logging) {
      // do a strange operation so i dont have to change code lol
      console.log = function () {
        [...arguments].forEach((element) => {
          console.log(element);
          let rep = element.replace(/\\x1b\[3.m%s\\x1b\[0m/g, ""); //TODO: make this regex axtually match
          console.log(rep);
          out.push(rep);
        });
      };
    }

    console.log(
      "\x1b[32m%s\x1b[0m",
      `${tab ? "\t" : "\n"}Found ${chats.length} chats in the network`
    );
    for (let i = 0; i < chats.length; i++) {
      console.log(
        (tab ? "\t" : "") + "\x1b[33m%s\x1b[0m",
        `{id: ${chats[i].id}\tname: "${chats[i].name}"\tchat_id: ${chats[i].chat_id}}`
      );
      try {
        const result = await bot.sendMessage(
          chats[i].chat_id,
          "/activitytest",
          {
            disable_notification: true,
          }
        );
        await bot.deleteMessage(chats[i].chat_id, result.message_id);
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
      console.log(
        (tab ? "\t" : "") + "\x1b[31m%s\x1b[0m" + (tab ? "" : "\n"),
        removed_text
      );
      bot.sendMessage(process.env.ADMIN_ID, removed_text);
    } else {
      console.log(
        (tab ? "\t" : "") + "\x1b[32m%s\x1b[0m",
        "All chats are still active!" + (tab ? "" : "\n")
      );
    }
    if (!logging) {
      console.log = holder;
      bot.sendMessage(process.env.ADMIN_ID, out.join("\n"));
    }
  } catch (error) {
    console.log = holder; // ensure that the weird logging is not saved lol
  }
};

module.exports = Chat;
