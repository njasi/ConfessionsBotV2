/**
 * make it dumb on purpose to see if anyone can figure it out lol...
 *
 * even if they get it it wont work so lol
 */

const crypto = require("crypto");
const fs = require("fs");
// lol really secret
const SECRET_PATH = "server/api/bot/config/secret.txt";

function readOneCharFromFile(position, fd) {
  // only need to store one byte (one character)
  const b = Buffer.alloc(1);

  return new Promise((res, rej) => {
    try {
      fs.read(fd, b, 0, 1, position, function (err, bytesRead, buffer) {
        if (bytesRead == 0) {
          res(undefined);
        }
        res(String(buffer));
      });
    } catch (error) {
      rej(error);
    }
  });
}

async function get_secret_string(offset, amount = 128) {
  const fd = fs.openSync(SECRET_PATH, "r");
  out = "";
  for (let i = 0; i < amount; i++) {
    out += await readOneCharFromFile(offset + i, fd);
  }
  return out;
}

async function in_secret_string(str, start = 0) {
  const fd = fs.openSync(SECRET_PATH, "r");
  i = start;
  j = str.length - 1;
  c = await readOneCharFromFile(i + 1, fd);

  try {
    while (true) {
      c = await readOneCharFromFile(i, fd);
      if (!c) {
        return -1;
      }
      if (c == str[j]) {
        j++;
      } else {
        j = 0;
      }
      if (j == str.length) {
        return i;
      }
      i++;
    }
  } catch (error) {}
  return -1;
}

/**
 * a cursed process to create ncts and have the token house 'obscured' data
 * its a dumb process, but the best way to hide from smart people is
 * to do something really stupid
 *
 * I promised a reward if anyone could make the bot send a confirmmation of confession
 * ownership message without owning the confession. (they would have to forage an
 * nct to do this, and trick the bot into sending a confession with their fake nct at a proper message_id
 * ... after 69 days no one figured it out lol)
 *
 * @param {object} confession : the token that this nct is for
 * @param {string} token_message_id : message id of the generating nct token message
 * @returns
 */
const generate_nct = async (confession, token_message_id) => {
  const token = crypto.randomBytes(64).toString("hex");
  const offset = Math.round(Math.random() * (36968 - 129)); // only the best magic numbers
  const secret_key = await get_secret_string(offset);
  const user_string = `${confession.userId}b${confession.num}c${token_message_id}d`; // lol
  const ins = Math.round(Math.random() * (100 - user_string.length)) + 8;

  let mixed = "";
  for (let i = 0; i < token.length; i++) {
    mixed += token[i];
    if (i >= ins && i < ins + user_string.length) {
      mixed += user_string[i - ins];
    } else {
      mixed += secret_key[i];
    }
  }
  return mixed.substring(0, 255);
};

const decode_nct = async (nct) => {
  let i = 1;
  let out = "";
  let in_s = 0;
  while (in_s != -1 && i < nct.length) {
    out += nct[i];
    in_s = await in_secret_string(out, (start = in_s + 1));
    i += 2;
  }
  i -= 2;
  let data = "";
  while (nct[i] != "d") {
    data += nct[i];
    i += 2;
  }
  data = data.replace("c", "b");
  const sp = data.split("b");
  if (sp.length != 3) {
    return undefined;
  }
  try {
    return { userId: parseInt(sp[0]), num: parseInt(sp[1]), message_id: sp[2] };
  } catch (error) {
    return undefined;
  }
};

// let gen = generate_nct({ num: 69, userId: 2 }, 3456744);

module.exports = { decode_nct, generate_nct };
