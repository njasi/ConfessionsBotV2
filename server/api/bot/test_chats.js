const bot = require("./bot");
const { Chat } = require("../../db/models");
async function test_chats(tab = false) {
  const removed = [];
  const chats = await Chat.findAll();
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
      const result = await bot.sendMessage(chats[i].chat_id, "/activitytest", {
        disable_notification: true,
      });
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
}

module.exports = test_chats;
