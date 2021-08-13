const bot = require("../bot");
const { Keyval, Chat } = require("../../../db/models");
const { verifyUser } = require("../verify_poll");

bot.on("webhook_error", (error) => {
  bot.sendMessage(
    process.env.ADMIN_ID,
    `There was a webhook error:\n${error.trace}`
  );
  console.error(`There was a webhook error:\n${error.trace}`);
});

bot.on("polling_error", (err) => console.log(err));

/**
 * removes people from the verification chat if they are not verified
 */
bot.on("new_chat_members", async (message) => {
  for (user of message.new_chat_members) {
    const v = await verifyUser(user.id);
    if (!v) {
      if (message.chat.id == process.env.VERIFY_CHAT_ID) {
        await bot.kickChatMember(process.env.VERIFY_CHAT_ID, user.id);
        await bot.unbanChatMember(process.env.VERIFY_CHAT_ID, user.id);
      } else if (false) {
      }
    } else {
      const [v_chat_size, create] = await Keyval.findOrCreate({
        where: { key: "v_chat_size" },
      });
      if (create) {
        v_chat_size.value = 1;
      } else {
        v_chat_size.value++;
      }
      await v_chat_size.save();
    }
  }
});

bot.on("migrate_to_chat_id", async (message) => {
  bot.sendMessage(
    process.env.ADMIN_ID,
    `Migrate To:\n${JSON.stringify(message)}`
  );

  const chat = await Chat.findOne({ where: { chat_id: `${message.chat.id}` } });
  if (chat) {
    chat.old_chat_id = chat.chat_id;
    chat.chat_id = message.migrate_to_chat_id;
    await chat.save();
  } else {
    // not a chat tht is registered
  }
});

// TODO fix for only the v chat
// bot.on("left_chat_member", async (message, meta) => {
//   const v_chat_size = await Keyval.findOne({
//     where: { key: "v_chat_size" },
//   });
//   v_chat_size.value--;
//   await v_chat_size.save();
// });
