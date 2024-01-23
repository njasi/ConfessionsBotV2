const { butt, ik, getFullName } = require("../helpers");
const { User } = require("../../../db/models");
const { Menu } = require("./menu_class");
const { sendVerifyPoll } = require("../verify_poll");

const verify = new Menu(async (from, args) => {
  const user = args.user;
  let text =
      "You're currently not verified, would you like to request verification and approval for using the bot?",
    keyboard = [
      [butt("Verify Me", "menu=verify_request")],
      [butt("Cancel", "delete=true")],
    ];

  if (user !== null) {
    switch (user.verification_status) {
      case -2:
        text =
          "You are currently being verified. Note that verification may take up to a day. Please be patient.";
        keyboard = [[butt("Ok", "delete=true")]];
        break;
      case -1:
        text = "Sorry, you have been banned from using this bot.";
        keyboard = [[butt("Ok", "delete=true")]];
        break;
      case 0:
        break;
      case 1:
      case 2:
      case 3:
      case 4:
        text =
          "You have already been verified and are allowed to use the bot. If you want to update your information please use /verifyupdate or the button below";
        keyboard = [
          [
            butt("Cancel", "delete=true"),
            butt("Update Me", "menu=verify_update"),
          ],
        ];
    }
  }
  const options = { ...ik(keyboard) };
  return { text, options };
}, "verify");

const verify_request = new Menu(async (from, args) => {
  const [user, create] = await User.findOrCreate({
    where: {
      telegram_id: from.id,
    },
  });
  if (!create) {
    const until = 0;
    const now = new Date();
    now.getTime() -
      (verification_request_time.getTime() + user.verification_cool_down);
    if (until > 0) {
      const text = `You need to wait for ${
        until / 3600000
      } hours before attempting to verify again.`;
      const options = { ...ik([[butt("Ok", "delete=true")]]) };
      return { text, options };
    }
  }
  const res = await sendVerifyPoll(args.bot, from);
  user.poll_id = res.poll.id;
  user.verification_request_time = new Date();
  user.name = getFullName(from, (username = false));
  user.username = from.username;
  user.verification_status = -2;
  await user.save();

  const text =
    "Ok, I've sent your request to the verification chat! I'll let you know when your request has been resolved.";
  const options = { ...ik([[butt("Ok", "delete=true")]]) };
  return { text, options };
}, "verify_request");

const verify_accept = new Menu((from, args) => {
  return {
    text: "<b>Congratulations!</b>\nYou've been approved to use Confessions Bot! \nPlease join the <a href='https://t.me/joinchat/EKj6oJQp9l9aPD5O'>Verification Chat</a>\n",
    options: {
      parse_mode: "HTML",
      ...ik([
        [butt("Help", "menu=help"), butt("About Confessions", "menu=about")],
        [butt("Ok", "delete=true")],
      ]),
    },
  };
}, "verify_accept");

const verify_reject = new Menu((from, args) => {
  return {
    text: "We're sorry, it appears that you were denied access to Confessions Bot. You can reapply in a day.",
    options: {
      ...ik([[butt("Ok", "delete=true")]]),
    },
  };
}, "verify_reject");

const verify_ban = new Menu((from, args) => {
  return {
    text: "We're sorry, it appears that you were banned from Confessions Bot. If you think this is a mistake, please say so in some Dabney chat. If you're not in any Dabney chats, perhaps you shouldn't be using the bot...",
    options: {
      ...ik([[butt("Ok", "delete=true")]]),
    },
  };
}, "verify_ban");

module.exports = {
  verify, // asks you if you want to veriy
  verify_request, // tells you your request to verify was sent
  verify_accept, // shows that your verification was accepted
  verify_reject, // shows your verification has been rejected
  verify_ban, // shows that have been banned after attempting to verify
};
