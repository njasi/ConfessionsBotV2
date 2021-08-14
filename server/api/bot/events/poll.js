const bot = require("../bot");
const { MENUS } = require("../menus/index");
const { User } = require("../../../db/models");
const { Op } = require("sequelize");

bot.on("poll", async (answer) => {
  const num = await User.count({
    where: { verification_status: { [Op.gt]: 0 } },
  });
  let user;
  try {
    user = await User.findOne({ where: { poll_id: answer.id } });
  } catch (e) {
    return;
  }
  // this must not be a verification poll
  if (user == null) return;
  // take out sluts votes
  const active_voters =
    answer.total_voter_count - answer.options[3].voter_count;
  // poll voting needs have been met
  if (active_voters >= Math.floor(Math.sqrt(num))) {
    const { options } = answer;
    const approve = options.slice(0, 3);
    const disapprove = options.slice(4);
    const a_c = approve.reduce((a, b) => a + b.voter_count, 0);
    const d_c = disapprove.reduce((a, b) => a + b.voter_count, 0);
    if (a_c > d_c) {
      // last of to default to lowest verification status
      const mapped = approve.map((e) => e.voter_count);
      const index = mapped.lastIndexOf(Math.max(...mapped));
      user.verification_status = index + 1;
      MENUS.verify_accept.send( { id: user.telegram_id });
      bot.sendMessage(
        process.env.VERIFY_CHAT_ID,
        `<a href = "tg://user?id=${user.id}">${user.name}${
          user.username == null ? "" : ` (@${user.username})`
        }</a> was approved to use @DabneyConfessionsBot!\n\nIf you have an issue with this please contact the admins.`,
        { parse_mode: "HTML" }
      );
    } else if (d_c == active_voters && answer.total_voter_count !== 0) {
      // ban
      user.verification_status = -1;
      MENUS.verify_ban.send( { id: user.telegram_id });
      bot.sendMessage(
        process.env.VERIFY_CHAT_ID,
        `<a href = "tg://user?id=${user.id}">${user.name}${
          user.username == null ? "" : ` (@${user.username})`
        }</a> was banned from @DabneyConfessionsBot.\n\nIf you have an issue with this please contact the admins.`,
        { parse_mode: "HTML" }
      );
    } else {
      // set as disapprove
      user.verification_status = 0;
      MENUS.verify_reject.send( { id: user.telegram_id });
      bot.sendMessage(
        process.env.VERIFY_CHAT_ID,
        `<a href = "tg://user?id=${user.id}">${user.name}${
          user.username == null ? "" : ` (@${user.username})`
        }</a> was not approved to use @DabneyConfessionsBot. \n\nIf you have an issue with this please contact the admins.`,
        { parse_mode: "HTML" }
      );
    }
    // so retracting votes and revoting does nothing
    user.poll_id = null;
    await user.save();
  }
});
