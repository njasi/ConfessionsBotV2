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

function command(name, extra = []) {
  let insert = extra.length == 0 ? name : `(${[name, ...extra].join("|")})`;
  let reg = new RegExp(`^\/${insert}($|@${process.env.BOT_USERNAME}$)`);
  return reg;
}

const allCommands = Object.values(commandRegexDict).reduce((prev, current) => {
  const upper = new RegExp(prev);
  const lower = new RegExp(current);

  return new RegExp("(" + lower.source + ")|(" + upper.source + ")");
});

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
