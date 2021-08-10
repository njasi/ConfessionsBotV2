const { Chat } = require("../../server/db/models");

async function seed_chats() {
  console.log("Seeding Chats");
  if (!process.env.HORNY_CHATS_IDS) {
    return;
  }
  await Promise.all(
    process.env.HORNY_CHATS_IDS.split(" ").map((e, i) => {
      console.log(`\tSeeding h chat ${i}`);
      return Chat.create({
        chat_id: e,
        name: `horny chat ${i}`,
        horny: true,
        static: true,
      });
    })
  );
  console.log("\tSeeded Chats");
}

module.exports = seed_chats;
