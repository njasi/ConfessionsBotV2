const commandRegexDict = {
  start: /^\/start($|@DabneyConfessionsBot$)/,
  verify: /^\/verify($|@DabneyConfessionsBot$)/,
  lock: /^\/lock($|@DabneyConfessionsBot$)/,
  unlock: /^\/unlock($|@DabneyConfessionsBot$)/,
  poll: /^\/poll($|@DabneyConfessionsBot$)/,
  register: /^\/register($|@DabneyConfessionsBot$)/,
  help: /^\/help($|@DabneyConfessionsBot$)/,
  about: /^\/about($|@DabneyConfessionsBot$)/,
  fellowsinfo: /^\/fellowsinfo($|@DabneyConfessionsBot$)/,
};

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
