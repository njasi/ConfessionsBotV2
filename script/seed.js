if (process.env.NODE_ENV == "deploy") {
  require("dotenv").config({ path: ".env_deploy" });
} else {
  require("dotenv").config({ path: ".env_test" });
}
const { User, Keyval } = require("../server/db/models");
const db = require("../server/db");

async function seed_admin() {
  console.log("Seeding admins");
  await User.create({
    telegram_id: process.env.ADMIN_ID,
    name: process.env.ADMIN_NAME,
    username: process.env.ADMIN_USERNAME,
    verification_status: 1,
  });
  console.log("\tSeeded admins");
}

async function try_seed_keyval(data) {
  try {
    await Keyval.create(data);
  } catch (err) {
    console.log(`\t"${data.key}" was already seeded.`);
  }
}

async function seed_keyvals() {
  console.log("Seeding keyvals");
  await try_seed_keyval({ key: "v_chat_size", value: 1 });
  await try_seed_keyval({ key: "num", value: 10096 });
  await try_seed_keyval({ key: "hnum", value: 69 });
  console.log("\tSeeded keyvals");
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
