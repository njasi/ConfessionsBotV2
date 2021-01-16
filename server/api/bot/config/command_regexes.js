const commandRegexDict = {
  start: /^\/start($|@DabneyConfessionsBot$)/,
  verify: /^\verify($|@DabneyConfessionsBot$)/,
};

function isCommand(message) {
  if (message.text) {
    for (regex of Object.values(commandRegexDict)) {
      const res = message.text.match(regex);
      if(res !== null){
        return true
      }
    }
  }
  return false;
}

module.exports = { commandRegexDict, isCommand };
