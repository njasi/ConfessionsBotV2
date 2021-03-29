const { butt, ik } = require("../helpers");
const { Menu } = require("./menu_class");

// TODO: cancel, delete=true btns on this screen will remove the message but not a confession if there is one.

const help = new Menu(() => {
  const text =
    "<b>To send a confession:</b>\nJust send a message here and then Confessions Bot will give you options to configure and send your confession (and a cancel option). Confessions Bot currently supports Text, Stickers, Images, Videos, Audio, Documents, Gifs, Voice, and Polls\n\n<b>Sending polls:</b>\nUsing the polls functionality of the bot is easier than ever before! Simply send a poll to the bot and it will replicate it when it sends.";
  const options = {
    ...ik([
      [butt("Commands", "menu=commands"), butt("About", "menu=about")],
      [
        butt("Fellowdarbs info", "menu=fellows_info"),
        butt("Confessions Network™ info", "menu=network_info"),
      ],
      [butt("Main menu", "menu=start")],
    ]),
  };
  return { text, options };
});

const about = new Menu(() => {
  const text =
    "// TODO: put meaningful text here... just ask others what this is about for now";
  const options = {
    ...ik([[butt("Help Menu", "menu=help"), butt("Cancel", "delete=true")]]),
  };
  return { text, options };
});

const commands = new Menu(() => {
  const text =
    "<b>Commands:</b> \n/poll\nSend an anon poll to the confessions chats. \n/lock\nThe bot will no longer read your messages.\n/unlock\nThe bot will now read your messages.\n/cancel\nCancel current action.[oof]\n/feedback\nSend anon feedback to the creator (@njasi). Please be nice.[oof]\n/help,/about\n...\n\n<b>Fellow Darbs Features:</b> \n/register\nYou will be registered to the list of fellows and people will be able to request to talk to you anonymously.[oof]\n/retire\nYou will be taken off of the fellows list.[oof]\n/fellowdarbs\nthis gives the list of darbs and the commands to contact them.[oof]\n/fellowsinfo\nGet more information on the fellow Darb feature\n\n";
  const options = {
    ...ik([[butt("Help Menu", "menu=help"), butt("Cancel", "delete=true")]]),
  };
  return { text, options };
});

const network_info = new Menu(() => {
  const text = `<b><u>Confessions Network™</u> Commands:</b>
/joinnetwork
Send this in a chat and it will be added to the <u>Confessions Network™</u>
/leavenetwork
Send this in a chat to leave the <u>Confessions Network™</u>\n
<b>Notes:</b>
One must be an admin of the chat to use either of the above commands. To make a horny confession, select one of the horny chats in the aux chat select setting. If a horny chat is selected the confession will not be sent to the normal non-horny confession chats.\n
<b>About <u>Confessions Network™</u>:</b>
<u>Confessions Network™</u> is meant to be a way for users to send messages to chats other than the confessions chat. Users are not able to send confessions to chats that they ae not in. It also is what seperates the degenerates (horny confessions users) from the rest of us. Make sure to put content warnings on messages that may need them if you're sending to a more personal chat. Don't try to abuse this functionality or it will simply be taken away.
\n`;
  const options = {
    ...ik([[butt("Help Menu", "menu=help"), butt("Cancel", "delete=true")]]),
  };
  return { text, options };
}, "network_info");

const fellows_info = new Menu(() => {
  const text =
    "<b>NOTICE</b>\nThe Fellow darbs feature is still being remade. You are able to register as a fellow darb, but you cannot contact anyone yet\n\n<b>Fellow Darbs Commands:</b>\n/fellowssettings\n You will be given the choice to register/retire as a fellow darb here. \n/fellowdarbs\nthis gives the list of darbs and the commands to contact them\n\n<b>Notes:</b>\nWhen you are registered to the list of fellows, people will be able to request to talk to you anonymously. You must retire if you do not wish to recieve messages anymore.\n\n<b>Purpose:</b>\nThis feature is for people who want support from others who are willing to listen, but are uncomfortable reaching out in person. <b>Do not ruin this for anyone who may need it</b>. I will obliterate all of your atoms if you do so.\n\n<b>Rules:</b>\nUse this for its intended purpose. If you are using it for another reason <b>please be kind</b>.\nThat is all.";
  const options = {
    ...ik([
      [butt("Help Menu", "menu=help"), butt("Cancel", "delete=true")],
      [butt("Fellows Settings", "menu=fellows_settings")],
    ]),
  };
  return { text, options };
}, "fellows_info");

const poll_info = new Menu(async (from, args) => {
  return {
    text: `Using the polls functionality of the bot is easier than ever before! Simply send a poll to the bot and it will replicate it when it sends.`,
    options: {
      ...ik([[butt("Ok", "delete=true")]]),
    },
  };
}, "poll_info");

module.exports = {
  help, // main help menu
  about, // about
  commands, // list of commands
  network_info, // help/about menu just for the confessions network functionality
  fellows_info, // help/about menu just for the fellows section
  poll_info, // info abt how to use the polls
};
