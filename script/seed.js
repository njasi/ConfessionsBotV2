if (process.env.NODE_ENV == "deploy") {
  require("dotenv").config({ path: ".env_deploy" });
} else {
  require("dotenv").config({ path: ".env_test" });
}
const { User, Keyval } = require("../server/db/models");
const db = require("../server/db");

async function seed_admin() {
  await User.create({
    telegram_id: process.env.ADMIN_ID,
    name: process.env.ADMIN_NAME,
    username: process.env.ADMIN_USERNAME,
    verification_status: 1,
  });
  console.log("Seeded admins");
}

async function seed_keyvals() {
  await Keyval.create({ key: "v_chat_size", value: 1 });
  await Keyval.create({ key: "num", value: 10096 });
  await Keyval.create({ key: "hnum", value: 69 });
  console.log("Seeded keyvals");
}

async function seed() {
  console.log("Syncing db");
  await db.sync();
  await seed_admin();
  await seed_keyvals();
  await db.close();
  console.log("Closed db");
  process.exit();
}

seed();
