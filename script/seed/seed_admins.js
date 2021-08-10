const { User } = require("../../server/db/models");

async function seed_admin() {
  console.log("Seeding admins");
  try {
    await User.create({
      telegram_id: process.env.ADMIN_ID,
      name: process.env.ADMIN_NAME,
      username: process.env.ADMIN_USERNAME,
      verification_status: 1,
      fellow_darb: true,
    });

    // await User.create({
    //   telegram_id: 1026151975,
    //   name: "Jick Nasinski",
    //   username: "dabneyshadowpinhead",
    //   verification_status: 1,
    //   fellow_darb: true,
    // });
  } catch (error) {}
  console.log("\tSeeded admins");
}

module.exports = seed_admin;
