// This is here to resolve a circular dep between fellows.js and fellows_message.js
const { Menu } = require("./menu_class");
const { butt, ik } = require("../helpers");

const fellows_received = new Menu(async (from, args) => {
  console.log("\nFELLOWS RECEIVED ARGS:\n", args);
  let text = `You have been sent a message from ${args.name}:\n\n${args.ftext}`;
  let options = {
    ...ik([
      [butt("Respond", `frec=1&fcid=${args.fchat.id}&fmid=${args.fmess.id}`)], // type one frec => invert from_init
    ]),
    ...(args.reply_id ? { reply_to_message_id: args.reply_id } : {}),
    ForceReply: {
      force_reply: true,
      input_field_placeholder: "Type your reply...",
    },
  };
  const out = {
    text,
    options,
  };
  console.log("\nFELLOWS RECEIIVED OUT:\n", out);
  return out;
}, "fellows_received");

module.exports = fellows_received; // the menu you see when you recieve a message from a fellow
