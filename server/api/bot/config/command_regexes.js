/**
 * generate regexes for commands so i can just import them instead of writing them all out in the commands file
 */

const commandRegexDict = {
  start: command("start", ["menu", "fellows"]),
  verify: command("verify"),
  lock: command("lock"),
  unlock: command("unlock"),
  poll: command("poll"),
  register: command("register"),
  help: command("help"),
  about: command("about"),
  fellow_darbs: command("fellowdarbs"),
  fellows_info: command("fellowsinfo"),
  f_settings: command("fellowssettings"),
  fellows_list: command("fellowslist"),
  join_network: command("joinnetwork"),
  leave_network: command("leavenetwork"),
  cancel: command("cancel"),
};

/**
 * generates a regular expression for botcommands from the name of the command (as well as aliases)
 * @param {string} name       : the string name of the command to be generated
 * @param {string array} extra: an array of other names which are aliases or server the same purpose as the main command name
 * @returns regexp            : regular expression that finds the commands (with or without @botusername)
 */
function command(name, extra = []) {
  let insert = extra.length == 0 ? name : `(${[name, ...extra].join("|")})`;
  let reg = new RegExp(`^\/${insert}($|@${process.env.BOT_USERNAME}$)`);
  return reg;
}

/**
 * An or regex containing all of the regex commands generated above.
 * not used rn but could be helpful
 */
const allCommands = Object.values(commandRegexDict).reduce((prev, current) => {
  const upper = new RegExp(prev);
  const lower = new RegExp(current);
  return new RegExp("(" + lower.source + ")|(" + upper.source + ")");
});

/**
 * Helper method used in the middleware function to decide if making a confession shoulf be skipped
 * @param {TelegramMessage} message: incoming message
 * @returns bool, true if the incoming message is a command. false otherwise
 */

function isCommand(message) {
  if (message.text) {
    for (regex of Object.values(commandRegexDict)) {
      const res = message.text.match(regex);
      if (res !== null) {
        return true;
      }
    }
  }
  return false;
}

module.exports = { commandRegexDict, isCommand, allCommands };
