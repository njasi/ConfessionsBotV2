const commandRegexDict = {
  start: command("start"),
  verify: command("verify"),
  lock: command("lock"),
  unlock: command("unlock"),
  poll: command("poll"),
  register: command("register"),
  help: command("help"),
  about: command("about"),
  fellows_info: command("fellowsinfo"),
  join_network: command("joinnetwork"),
  leave_network: command("leavenetwork"),
  fellows: command("fellows"),
};

function command(name) {
  let reg = new RegExp(`^\/${name}($|@${process.env.BOT_USERNAME}$)`);
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
