const { ik, butt } = require("../helpers");
const { Menu } = require("./menu_class");


const fellows_send_options = new Menu(async (from, args) => {
  const name = args.name ? args.name : "anon";
  let text = "Your message to {} says:\n\n{}".format(name, args.message_text);
  let options = {
    ...ik([
      [butt("Send anonymously", "menu=fellows_text&p=false")],
      [butt("Send", "menu=fellows_text&p=true"), butt("Cancel", "delete=true")],
    ]),
  };
  return { text, options };
}, "fellows_send_options");

const fellows_confirm_signed = new Menu(async (from, args) => {
  let text = "Your message says:\n\n";
  let options = {
    ...ik([
      [
        butt("Yes", "menu=fellows_sent"), // TODO: send the message callback data
        butt("Cancel", "delete=true"),
      ],
    ]),
  };
  return { text, options };
}, "fellows_confirm_signed");

const fellows_sent = new Menu(async (from, args) => {
  let name = args.name ? args.name : "anon";
  let text = "Your message to {} has been sent".format(name);
  let options = { ...ik([[butt("Ok", "delete=true")]]) }; // TODO: respond callback

  return { text, options };
}, "fellows_sent");

const fellows_recieved = new Menu(async (from, args) => {
  let name = args.name ? args.name : "anon";
  let text = "You have been sent a message from {}:\n\n{}".format(
    name,
    args.message_text
  );
  let options = { ...ik([[butt("Respond", "")]]) }; // TODO: respond callback

  return { text, options };
}, "fellows_recieved");

const fellows_settings = new Menu(async (from, args) => {
  const thing = `menu=fellows_settings&from_command=true&register=${!args.user
    .fellow_darb}`;
  return {
    text: args.user.fellow_darb ? "" : "",
    options: {
      ...ik([
        [
          butt(args.user.fellow_darb ? "Retire" : "Register", thing),
          butt(
            args.from_command ? "Cancel" : "Back",
            args.from_command ? "delete=true" : "menu=fellows_info"
          ),
        ],
      ]),
    },
  };
}, "fellows_settings");

module.exports = {
  // fellows_privacy, // select if you want your name to be known when messaging someone
  fellows_send_options, //
  fellows_confirm_signed,
  fellows_recieved, // the menu you see when you recieve a message from a fellow
  fellows_send_options,
  fellows_sent, // notice that your message has been sent
  fellows_settings,
};
