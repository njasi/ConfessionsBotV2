// This is here to resolve a circular dep between fellows.js and fellows_message.js
const { Menu } = require("./menu_class");

const fellows_recieved = new Menu(async (from, args) => {
  let text = `You have been sent a message from ${args.name}:\n\n${args.ftext}`;
  let options = {
    ...ik([
      [
        butt(
          "Respond",
          `menu=fellows_say&fcid=${args.fchat.id}&fmid=${args.fmess.id}`
        ),
      ],
    ]),
  }; // TODO: respond callback
  return { text, options };
}, "fellows_recieved");

module.exports = fellows_recieved; // the menu you see when you recieve a message from a fellow
