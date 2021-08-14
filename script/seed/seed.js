// run this directly with node unless you need to provide the databaseurl and stuff ffor the seed

if (process.env.NODE_ENV == "production") {
  // require("dotenv").config({ path: ".env_deploy" });
  // process.env.DATABASE_URL = process.argv[2];
} else {
  require("dotenv").config({ path: ".env_test" });
}

const db = require("../../server/db");
const { Chat } = require("../../server/db/models");
const seed_admin = require("./seed_admins");
const seed_chats = require("./seed_chats");
const seed_keyvals = require("./seed_keyvals");
const update_sequences = require("./update_sequences");

async function seed() {
  try {
    console.log("Syncing db");
    await db.sync({ force: true });
    // await db.drop(); // sometimes need this to refresh the database cause heroku mean
    await update_sequences();
    await seed_admin();
    await seed_chats();
    await seed_keyvals();
    console.log("Updating seeded chats");
    await Chat.test_chats((tab = true));
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
