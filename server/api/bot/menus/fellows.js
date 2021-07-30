const { User } = require("../../../db/models");
const { ik, butt, getFullName } = require("../helpers");
const { Menu } = require("./menu_class");

const fellows_settings = new Menu(async (from, args) => {
  const thing = `menu=fellows_settings&from_command=${
    args.from_command
  }&register=${!args.user.fellow_darb}`;
  return {
    text: args.user.fellow_darb
      ? args.register
        ? "<b>Welcome to the fellowdarbs system!</b>\n\nIf you ever want to retire come back to this menu and select the Retire button below."
        : "You are already registered in the fellow darbs system, would you like to Retire?"
      : args.register
      ? "You are no longer registered in the fellow darbs system. \n\nIf you'd like to undo this just select the Register button below."
      : "You are not currently registered as a fellow darb. If you would like to register just use the button below.\n\nFor information on what this means see the /fellowsinfo help menu.",
    options: {
      ...ik([
        [
          butt(args.user.fellow_darb ? "Retire" : "Register", thing),
          butt(
            args.from_command == "true"
              ? args.register
                ? "Close"
                : "Cancel"
              : "Back",
            args.from_command == "true" ? "delete=true" : "menu=fellows_info"
          ),
        ],
      ]),
    },
  };
}, "fellows_settings");

const fellows_say = new Menu(async (from, args) => {
  const name = args.conf
    ? `Confessor ${args.conf}`
    : args.name
    ? args.name
    : args.mess.from_init
    ? args.fchat.name_target
    : args.fchat.name_initiator;
  return {
    text: `What would you like to say to ${name} (text only)?\n\nAfter you tell me I will give you privacy options.\n\nIf you want to cancel just use the cancel button`,
    options: {
      ...ik([
        [
          butt(
            "Cancel",
            `user_state=idle&delete=true&remove_m=${args.fmess.id}`
          ),
        ],
      ]),
    },
  };
});

const fellows_send_options = new Menu(async (from, args) => {
  const name = args.fmess.from_init
    ? args.fchat.name_target
    : args.fchat.name_initiator;
  let text = "Your message to {} says:\n\n{}".format(name, args.fmess.text);
  let options = {
    ...ik([
      [butt("Send anonymously", "menu=fellows_text&p=false")],
      [
        butt("Send", "menu=fellows_text&p=true"),
        butt("Cancel", `user_state=idle&delete=true&remove_m=${args.fmess.id}`),
      ],
    ]),
  };
  return { text, options };
}, "fellows_send_options");

// TODO use this when error
const fellows_message_error = new Menu(async (from, args) => {
  const name = args.fmess.from_init
    ? args.fchat.name_target
    : args.fchat.name_initiator;
  let text =
    args.error == 1
      ? `There was an error sending your message to ${name}.`
      : args.error ==
        2`Your message to ${name} was too long. (${args.extra_chars} charcters over)`;
}, "fellows_message_error");

// const fellows_confirm_signed = new Menu(async (from, args) => {
//   let text = "Your message says:\n\n";
//   let options = {
//     ...ik([
//       [
//         butt("Yes", "menu=fellows_sent"),
//         butt("Cancel", "delete=true"),
//       ],
//     ]),
//   };
//   return { text, options };
// }, "fellows_confirm_signed");

const fellows_confirm_reveal = new Menu(async (from, args) => {
  const t_name = args.fmess.from_init
    ? args.fchat.name_target
    : args.fchat.name_initiator;
  const name = !args.fmess.from_init
    ? args.fchat.name_target
    : args.fchat.name_initiator;
  const text = `Are you sure that you want to reveal your name to ${t_name}? You are currently ${name}`;
});

const fellows_sent = new Menu(async (from, args) => {
  const name = args.fmess.from_init
    ? args.fchat.name_target
    : args.fchat.name_initiator;

  let text = "Your message to {} has been sent".format(name);
  let options = { ...ik([[butt("Ok", "delete=true")]]) }; // TODO: respond callback

  return { text, options };
}, "fellows_sent");

const fellows_recieved = new Menu(async (from, args) => {
  const name = !args.fmess.from_init
    ? args.fchat.name_target
    : args.fchat.name_initiator;
  let text = "You have been sent a message from {}:\n\n{}".format(
    name,
    args.message_text
  );
  let options = { ...ik([[butt("Respond", "")]]) }; // TODO: respond callback

  return { text, options };
}, "fellows_recieved");

const fellows_list = new Menu(async (from, args) => {
  // TODO menu to see all of the fellows
  const { rows, count } = await User.findAndCountAll({
    where: {
      attributes: ["id", "name", "username", "fellow_darb"],
      order: [
        ["name", "DESC"],
        ["username", "njasi"],
      ],
      fellow_darb: true,
      limit: PAGE_LENGTH,
      offset: PAGE_LENGTH * parseInt(args.fellows_page),
      raw: true,
    },
  });

  let arrows = [
    ...(args.fellows_page != "0"
      ? [
          butt(
            "⬅️",
            `menu=chatlist&fellows_page=${parseInt(args.fellows_page) - 1}`
          ),
        ]
      : []),
    butt("Back", "menu=fellows_main"),
    ...(parseInt(args.fellows_page) * PAGE_LENGTH + PAGE_LENGTH < count
      ? [
          butt(
            "➡️",
            `menu=chatlist&fellows_page=${parseInt(args.fellows_page) + 1}`
          ),
        ]
      : []),
  ];
}, "menu=fellows_list");

const fellows_about = new Menu(async (from, args) => {
  // TODO see a fellow's about page
  const user = await User.findByPk(args.fellow_id);
  const title_txt = args.edit
    ? "<b>This is what your profile looks like:</b>\n<b>${getFullName(user)}</b>"
    : `<b>${getFullName(user)}</b>`;
  const text = `${title_txt}\n\n<b>About me:</b>\t${user.misc.about}\n\n <b>Talk to me about</b>\t${user.misc.talk}`;
  const options = {
    ...ik([[butt("Contact", "")], [butt("Fellows List", "menu=fellows_list")]]),
  };
  return { text, options };
}, "fellows_about");

const fellows_edit = new Menu(async (from, args) => {
  // TODO edit your about info
}, "fellows_edit");

module.exports = {
  // fellows_privacy, // select if you want your name to be known when messaging someone
  fellows_send_options, //
  fellows_say,
  // fellows_confirm_signed,
  fellows_recieved, // the menu you see when you recieve a message from a fellow
  fellows_send_options,
  fellows_sent, // notice that your message has been sent
  fellows_settings,
};
