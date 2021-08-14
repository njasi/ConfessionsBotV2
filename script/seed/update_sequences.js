/**
 * if you import data back into the db after restarting you'll want to run this file
 * to ensure that the auto sequenced ids are set to the proper values...
 */
const db = require("../../server/db/db");

const tables = [
  "confessions",
  "users",
  "chats",
  "fellowschats",
  "fellowsmessages",
  "keyvals",
];

/**
 * update the id sequences of the above tables
 * if you want to run the queries yourself they will look like this:
 *    SELECT MAX(id) FROM confessions;
 *    ALTER SEQUENCE confessions_id_seq RESTART WITH 69;
 */
const update_sequences = async () => {
  console.log("Updating Sequences");
  const update_sequence = async (table) => {
    let max = await db.query(`SELECT MAX(id) FROM ${table}`);
    max = max[0][0].max; //cursed lol
    if (!max) {
      max = 1;
    }
    await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH ${max}`);
    console.log(`\t"${table}_id_seq" was updated.`);
  };
  for (let i = 0; i < tables.length; i++) {
    await update_sequence(tables[i]);
  }
};

// so you can just run this file from node
if (require.main === module) {
  if (process.env.NODE_ENV == "production") {
    // use these if you need to grab the config vars for some reason
    // require("dotenv").config({ path: ".env_deploy" });
    // process.env.DATABASE_URL = process.argv[2];
  } else {
    require("dotenv").config({ path: ".env_test" });
  }
  (async () => {
    console.log("Syncing db");
    await db.sync();
    await update_sequences();
    await db.close();
    console.log("Closed db");
  })();
}

module.exports = update_sequences;
