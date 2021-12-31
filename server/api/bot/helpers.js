/**
 *  Checks if a message is a dm to the bot
 * @param {TelegramBot.message} message - message the bot will be checking
 * @returns {boolean}
 */
function isDm(message) {
  try {
    return (
      message.from.id == message.chat.id &&
      message.chat.type !== "group" &&
      message.chat.type !== "supergroup"
    );
  } catch (error) {
    return false;
  }
}

/**
 * returns the full name of a user plus their username if they have one
 * @param {Telegram.user} user
 */
function getFullName(user, username = true) {
  let first,
    last = "",
    un = "";
  if (user.first_name) {
    first = user.first_name;
  }
  if (user.last_name) {
    last = ` ${user.last_name}`;
  }
  if (username && user.username) {
    un = ` (@${user.username})`;
  }
  return first + last + un;
}

/**
 * parses the paramaters i have stored in a callback query into an object. This is technically an unsafe operation...
 * datastring is in a format of key=value&key1=value1&...
 * limit 64 bytes
 * @param {string} str: callback query data
 * @returns an object with the keys and their values
 */
function params_from_string(str) {
  let splt = str.split("&");
  const params = {};
  for (let i = 0; i < splt.length; i++) {
    const p = splt[i].split("=");
    params[p[0]] = p[1];
  }
  return params;
}

/**
 * turn integers into their ordinal representations
 * @param {integer} num
 * @returns string which is the ordinal representation of the given int
 */
function int_to_ordinal(num) {
  let str_num = `${num}`;
  switch (str_num[str_num.length - 1]) {
    case "1":
      return `${num}st`;
    case "2":
      return `${num}nd`;
    case "3":
      return `${num}rd`;
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
    case "0":
      return `${num}th`;
  }
}

/**
 * haha butt
 * returns a formatted button for me so I can be lazy
 * @param {string} text - button text
 * @param {string} callback_data - button cb data
 * @param {object} options - options to use instead of cbdata
 */
function butt(text, callback_data, options = null) {
  if (options != null) {
    return { text, ...options };
  }
  return { text, callback_data };
}

/**
 * amother formatted thing to be lazy
 * @param {array of array of object} buttons - buttons
 */
function ik(buttons) {
  return { reply_markup: { inline_keyboard: buttons } };
}

/**
 *
 * @param {text of a telegram message} text
 * @param {MessageEntity array} entities
 * @returns
 */
function entities_to_string(text, entities) {
  text = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  if (!entities) {
    return text;
  }
  const tag_dict = {
    bold: (a) => (a ? "<" : "</") + "b>",
    strikethrough: (a) => (a ? "<" : "</") + "strike>",
    italic: (a) => (a ? "<" : "</") + "em>",
    underline: (a) => (a ? "<" : "</") + "u>",
    code: (a) => (a ? "<" : "</") + "code>",
    pre: (a) => (a ? "<" : "</") + "code>",
    bot_command: (a) => (a ? `<span style="color:#8774e1">` : "</span>"),
    spoiler: (a) => (a ? `<span class="tg-spoiler">` : "</span>"),
  };

  const tags = []; // offset:{start,end,offset,length}
  let ofs = 0;
  for (let i = 0; i < entities.length; i++) {
    const curr = ofs + i;
    tags[curr] = entities[i];
    if (
      curr > 0 &&
      tags[curr - 1].offset + tags[curr - 1].length > entities[i].offset
    ) {
      // left of split
      const full_len = tags[curr - 1].length;
      tags[curr - 1] = {
        ...tags[curr - 1],
        length: entities[i].offset - tags[curr - 1].offset,
      };
      // right of split
      tags[curr] = {
        ...tags[curr - 1],
        offset: entities[i].offset,
        length: full_len - tags[curr - 1].length,
      };
      // new
      tags[curr + 1] = entities[i];
      ofs++;
    }
  }

  let parsed = "";
  for (let i = 0; i < text.length; i++) {
    for (let j = 0; j < tags.length; j++) {
      if (tags[j].offset == i) {
        parsed += tag_dict[tags[j].type](true);
      }
      const span = tags[j].offset + tags[j].length;
      if (span == i) {
        parsed += tag_dict[tags[j].type](false);
      } else if (i + 1 == text.length && span >= text.length) {
        parsed += text[i] + tag_dict[tags[j].type](false);
        i = -1;
        break;
      }
    }
    if (i == -1) {
      break;
    }
    parsed += text[i];
  }
  return parsed;
}

module.exports = {
  isDm,
  getFullName,
  params_from_string,
  int_to_ordinal,
  butt,
  ik,
  entities_to_string,
};
