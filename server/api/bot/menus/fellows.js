const { User, FellowsMessage } = require("../../../db/models");
const { ik, butt, getFullName } = require("../helpers");
const { Menu } = require("./menu_class");
const util = require("util");

const PAGE_LENGTH = 5;

const f_settings = new Menu(async (from, args) => {
  const thing = `menu=f_settings&fc=${
    args.fc
  }&register=${!args.user.fellow_darb}&fm=${args.fm}`;
  console.log(thing.length)
  console.log(thing)
  return {
    text: args.user.fellow_darb
      ? args.register
        ? "<b>Welcome to the fellowdarbs system!</b>\n\nIf you ever want to retire come back to this menu and select the 'Retire' button below.\n\nIf you want to set up your fellows profile right now select the button below."
        : "You are already registered in the fellow darbs system, would you like to retire?\n\nIf you want to edit your fellows profile select the 'Edit Profile Button' button below."
      : args.register
      ? "You are no longer registered in the fellow darbs system. \n\nIf you'd like to undo this just select the Register button below."
      : "You are not currently registered as a fellow darb. If you would like to register just use the button below.\n\nFor information on what this means see the /fellowsinfo help menu (or navigate there from the help menu).",
    options: {
      ...ik([
        [
          butt(args.user.fellow_darb ? "Retire" : "Register", thing),
          butt(
            args.fc == "true"
              ? args.register
                ? "Close"
                : "Cancel"
              : "Back",
            args.fc == "true"
              ? "delete=true"
              : args.fm
              ? `menu=start&fm=${args.fc}`
              : `menu=fellows_info&fm=${args.fc}`
          ),
        ],
        args.user.fellow_darb
          ? [
              butt(
                "Edit Fellows Profile",
                `menu=fellows_about&fellow_id=${args.user.id}&edit=true&fm=${args.fm}`
              ),
            ]
          : [],
      ]),
    },
  };
}, "f_settings");

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
}, "fellows_say");

const fellows_send_options = new Menu(async (from, args) => {
  if (args.message_id) {
    args.fmess = await FellowsMessage.findByPk(args.message_id);
    args.fchat = await args.fmess.getFellowschat();
  }
  const name = args.fmess.from_init
    ? args.fchat.name_target
    : args.fchat.name_initiator;
  let text = "Your message to {} says:\n\n{}".format(name, args.fmess.text);
  let options = {
    ...ik([
      [butt("Send anonymously", "menu=fellows_text&p=false")],
      [
        butt("Send", "menu=fellows_text&p=true"),
        butt(
          "Cancel Message",
          `user_state=idle&delete=true&remove_m=${args.fmess.id}`
        ),
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
      ? `Fellowdarbs messages can only be text right now.`
      : args.error == 2
      ? `Your message to ${name} was too long. (${args.extra_chars} charcters over).`
      : args.error == 3
      ? `There was an error sending your message to ${name}.`
      : "";
  const options = { ...ik([[butt("Ok", "delete=true")]]) };
  return { text, options };
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
  const text = `Are you sure that you want to reveal your name to ${t_name}? You are currently ${name}.`;
  const options = {
    ...ik([
      [
        butt("Yes", "menu=fellows_sent"),
        butt("No", `menu=fellows_send_options&message_id=${args.fmess.id}`),
      ],
    ]),
  };
  return { text, options };
}, "fellows_confirm_reveal");

const fellows_sent = new Menu(async (from, args) => {
  const name = args.fmess.from_init
    ? args.fchat.name_target
    : args.fchat.name_initiator;

  let text = "Your message to {} has been sent".format(name);
  let options = { ...ik([[butt("Ok", "menu=fellows_another")]]) };
  return { text, options };
}, "fellows_sent");

const fellows_another = new Menu(async (from, args) => {
  const name = args.fmess.from_init
    ? args.fchat.name_target
    : args.fchat.name_initiator;

  let text =
    "Would you like to send another message to {}?\n\n You can always send another message to anyone, but using this button or replying to what they send will keep the same anon nickname.\n\nIt's technically possible for two people to contact eachother at the same time so just make sure youre responding to the right thing.".format(
      name
    );
  let options = { ...ik([[butt("Send Another", "menu=")]]) };
  return { text, options };
}, "fellows_another");

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
  const { rows, count } = await User.findAndCountAll({
    attributes: ["id", "name", "username", "fellow_darb"],
    order: [
      ["name", "DESC"],
      ["username", "DESC"],
    ],
    where: {
      fellow_darb: true,
    },
    raw: true,
    limit: PAGE_LENGTH,
    offset: PAGE_LENGTH * parseInt(args.fellows_page),
  });

  let text =
    "<b>Use the arrows below to cycle through all of the darbs.</b>\n\nTapping on a name will bring up their about page where you can contact them.\n\nTo edit your own profile go into fellows settings with /fellowssettings or the navigate to the main menu with the back button.";

  // TODO: figure out the arrows
  let arrows = [
    ...(args.fellows_page != "0"
      ? [
          butt(
            "⬅️",
            `menu=fellows_list&fellows_page=${parseInt(args.fellows_page) - 1}`
          ),
        ]
      : []),
    butt("Back", "menu=start&active=false"),
    ...(parseInt(args.fellows_page) * PAGE_LENGTH + PAGE_LENGTH < count
      ? [
          butt(
            "➡️",
            `menu=fellows_list&fellows_page=${parseInt(args.fellows_page) + 1}`
          ),
        ]
      : []),
  ];
  // const people = [
  const people = [...rows].map((row) => {
    return [
      {
        text: `${row.name}${row.username ? ` (@${row.username})` : ""}`,
        callback_data: `menu=fellows_about&fellow_id=${row.id}&fellows_page=${args.fellows_page}`,
      },
    ];
  });
  const options = { ...ik([...people, arrows]) };
  return { text, options };
}, "fellows_list");

const fellows_about = new Menu(async (from, args) => {
  // TODO see a fellow's about page
  // if (args.user.id != args.fellow_id) {
  //   return; // not the same person so quit out of it.
  // }
  const { fellows_pic, fellows_bio, fellows_contact } = args.user.misc;

  const fellow = await User.findByPk(args.fellow_id);
  const title_txt = args.edit
    ? `<b>This is what your profile looks like:</b>\n<b>${fellow.name}${
        fellow.username ? ` (@${fellow.username})` : ""
      }</b>`
    : `<b>${fellow.name}${fellow.username ? ` (@${fellow.username})` : ""}</b>`;
  const text = `${title_txt}\n\n<b>About me:</b>\n${fellows_bio}\n\n<b>Contact me about</b>\n${fellows_contact}`;
  const options = {
    ...ik(
      args.edit
        ? [
            [
              butt("Edit Contact", "menu=fellows_edit&edit_item=contact"),
              butt("Edit Photo", "menu=fellows_edit&edit_item=pfp"),
            ],
            [
              butt("Edit About", "menu=fellows_edit&edit_item=bio"),
              butt("Back", `menu=f_settings&fm=${args.fm}`),
            ],
          ]
        : [
            [
              butt(
                "Contact",
                `menu=fellows_list&fellows_page=${args.fellows_page}`
              ),
            ],
            [
              butt(
                "Fellows List",
                `menu=fellows_list&fellows_page=${args.fellows_page}`
              ),
            ],
          ]
    ),
  };

  return { text, options, send_image: fellows_pic };
}, "fellows_about");

const fellows_edit = new Menu(async (from, args) => {
  const { fellows_pic, fellows_bio, fellows_contact } = args.user.misc;

  text =
    args.edit_item == "pfp"
      ? "<b>Please send a new profile picture.</b>\n\nProbably something welcoming idk... (2gb limit)"
      : args.edit_item == "bio"
      ? "<b>Please send a new 'About Me'</b>\n\nThis can be a short blurb so darbs know a bit about you before contacting you. (300 char limit)"
      : args.edit_item == "contact"
      ? "<b>Please send a new 'Contact me About'.</b>\n\nThis is so you can label what you can talk about or what you dont want to think about. (300 char limit)"
      : "I don't know how you managed to get here...";

  text = `${text}\n\n<b>You currently have:</b>\n\n${
    args.edit_item == "contact"
      ? fellows_contact
      : args.edit_item == "bio"
      ? fellows_bio
      : "(the image above)."
  }`;
  const options = {
    send_photo: fellows_pic,
    ...ik([
      [
        butt(
          "Cancel",
          `menu=fellows_about&fellow_id=${args.user.id}&edit=true`
        ),
      ],
    ]),
  };
  return { text, options };
}, "fellows_edit");

module.exports = {
  fellows_say, // asks what you want to send to someone
  fellows_recieved, // the menu you see when you recieve a message from a fellow
  fellows_message_error, // display errors, wrong type of message, too much text, etc
  fellows_send_options, // send options ie anon, non anon
  fellows_confirm_reveal, // confirmation that you want to reveal who you are
  fellows_sent, // confirmation that a message was sent
  fellows_another, // ask if you want to send another message to the person.
  fellows_sent, // notice that your message has been sent
  f_settings, // fellows settings
  fellows_list, // list of fellows
  fellows_about, // see the info about a fellow darb
  fellows_edit, // options to edit your about info
};
