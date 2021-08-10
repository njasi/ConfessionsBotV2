const { Keyval } = require("../../server/db/models");

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

module.exports = seed_keyvals;
