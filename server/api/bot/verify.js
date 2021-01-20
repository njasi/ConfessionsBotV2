const { User } = require("../../db/models");
const { getFullName } = require("./helpers");
/**
 *  Checks if a telegram user is verified to use the bot by their telegram id
 * @param {string|number} userId - ID to verify
 * @returns {boolean}
 */
async function verifyUser(userId) {
  const user = await User.findOne({ where: { telegram_id: userId } });
  return user != null && user.isAllowed();
}
// [inline mention of a user](tg://user?id=123456789)

async function sendVerifyPoll(bot, user) {
  const text = `Should ${getFullName(user)} be allowed to use Confessions Bot?`;
  const options = [
    "Approve, Darb",
    "Approve, Non Darb",
    "Approve, Non CalTech",
    "Disapprove, Darb (sluts)",
    "Disapprove, Non Darb",
    "Disapprove, Non CalTech",
    "Disapprove, rando",
  ];

  const res = await bot.sendPoll(process.env.VERIFY_CHAT_ID, text, options, {
    is_anonymous: true,
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Admin - Force Approval",
            callback_data: `approve_id=${user.id}&rad=true`,
          },
        ],
        [
          {
            text: "See their profile",
            url: `tg://user?id=${user.id}`,
          },
        ],
      ],
    },
  });
  return res;
}

module.exports = { verifyUser, sendVerifyPoll };
