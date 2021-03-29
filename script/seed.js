if (process.env.NODE_ENV == "deploy") {
  require("dotenv").config({ path: ".env_deploy" });
} else {
  require("dotenv").config({ path: ".env_test" });
}
const { User, Keyval, Chat } = require("../server/db/models");
const db = require("../server/db");
const test_chats = require("../server/api/bot/test_chats");

async function seed_admin() {
  console.log("Seeding admins");
  try {
    await User.create({
      telegram_id: process.env.ADMIN_ID,
      name: process.env.ADMIN_NAME,
      username: process.env.ADMIN_USERNAME,
      verification_status: 1,
    });
  } catch (error) {}
  console.log("\tSeeded admins");
}

async function try_seed_keyval(data) {
  try {
    await Keyval.create(data);
    console.log(`\t"${data.key}" was seeded.`);
  } catch (err) {
    console.log(`\tThere was an error seeding "${data.key}"`);
    console.error(err);
  }
}

async function seed_keyvals() {
  console.log("Seeding keyvals");
  await try_seed_keyval({ key: "v_chat_size", value: 1 });
  await try_seed_keyval({ key: "num", value: 10096 });
  await try_seed_keyval({ key: "hnum", value: 69 });
  console.log("\tSeeded keyvals");
}

async function seed_chats() {
  console.log("Seeding Chats");
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

async function seed() {
  try {
    console.log("Syncing db");
    await db.sync();
    await seed_admin();
    await seed_keyvals();
    await seed_chats();
    console.log("Updating seeded chats");
    await test_chats((tab = true));
    console.log("\tUpdated seeded chats");

    await db.close();
  } catch (error) {
    console.log("Error seeding db:");
    console.error(error);
  } finally {
    console.log("Closed db");
    process.exit();
  }
}

seed();
