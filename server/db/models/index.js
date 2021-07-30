const db = require("../db");

/***
 * I'm tracking row counts as free heroku postgres has row limits
 * and yes I'm now storing who has made what confession
 * Its a good safety net to have considering the suicidal nature of some confessions...
 *
 * I figured out another method to get who had confessed something when I was asked by
 * the healthads to identify someone who had been posting suicidal confessions. They only
 * asked after a few hundred confessions had passed and the code took over a day to run
 * and find the person (There were multiple suicidal confessions to check, and it's bruteforce
 * limited by telegram's bot message sending limit so)
 *
 * So just in case I need to find a person quickly due to a concerning confession we
 * are logging all users. We dont need any more dabney suicides...
 */

// ~max 100 rows
const Keyval = require("./keyval");
// ~max 400 rows = 500
const User = require("./user");
// ~max 5000 rows = 5500
const Confession = require("./confession");
// ~max 200 rows = 5700
const Chat = require("./chat");
// ~max 2000 rows = 7700
const FellowsMessage = require("./fellows_message");
// ~max something = 7700+
const FellowsChat = require("./fellows_chat");

// The extra chat the confession is sent to
Chat.hasMany(Confession);
Confession.belongsTo(Chat);

User.hasMany(Confession);
Confession.belongsTo(User);

// ik this is a bad setup, but im lazy so dont @ me

FellowsChat.hasMany(FellowsMessage);
FellowsMessage.belongsTo(Chat);

// strangly doing it this way puts the foriegn key on the chat relation...
User.hasOne(FellowsChat, { foreignKey: "target" });
User.hasOne(FellowsChat, { foreignKey: "initiator" });

module.exports = {
  Keyval,
  User,
  Confession,
  Chat,
  FellowsMessage,
  FellowsChat,
};
