if (process.env.NODE_ENV == "production") {
  // require("dotenv").config({ path: ".env_deploy" });
  // process.env.DATABASE_URL = process.argv[2];
} else {
  require("dotenv").config({ path: ".env_test" });
}

const db = require("../../server/db");
const seed_admin = require("./seed_admins");
const seed_chats = require("./seed_chats");
const seed_keyvals = require("./seed_keyvals");
const test_chats = require("../../server/api/bot/test_chats");

async function seed() {
  try {
    await db.sync({ force: true });
    // await db.drop(); // sometimes need this to refresh the database cause heroku mean
    console.log("Syncing db");
    await seed_admin();
    await seed_chats();
    await seed_keyvals();
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
