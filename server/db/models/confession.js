const Sequelize = require("sequelize");
const db = require("../db");
const bot = require("../../api/bot/bot");
const { Keyval } = require(".");

const Confession = db.define("confession", {
  num: {
    type: Sequelize.INTEGER,
  },
  horny: {
    // horny chat confessions have a seperate count
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  type: {
    type: Sequelize.ENUM(
      "text",
      "sticker",
      "photo",
      "audio",
      "document",
      "video",
      "animation",
      "voice",
      "poll",
      "spoiler"
    ),
  },
  content_warning: {
    type: Sequelize.STRING,
    defaultValue: null,
  },
  text: {
    type: Sequelize.TEXT,
  },
  message_id: {
    type: Sequelize.STRING,
  },
  // file_id for if something is attached
  file_id: {
    type: Sequelize.STRING,
  },
  send_by: {
    type: Sequelize.DATE,
    allowNull: true,
  },
});

const text_add_prefix = (text, num) => {
  return `<b>Confession #${num}:</b>\n${text}`;
};

async function send(confession, chat_id, num) {
  const text = text_add_prefix(confession.text, num);
  switch (confession.type) {
    case "text": {
      if (confession.content_warning !== null) {
        return await bot.sendMessage(
          chat_id,
          text_add_prefix(confession.content_warning, num),
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "View Content",
                    callback_data: `cw_confession_num=${num}`, // TODO: cw confession num
                  },
                ],
              ],
            },
          }
        );
      } else {
        return await bot.sendMessage(chat_id, text);
      }
    }
    default: {
      return null;
    }
  }
}

Confession.prototype.send = async function () {
  const cNum = await Keyval.findOne({
    where: { key: "next_confession_number" },
  });
  const num = cNum.value;
  try {
    if (this.type == "poll") {
      const poll = await send(this, process.env.CONFESSIONS_CHAT_ID, num);
      bot.forwardMessage(
        process.env.CONFESSIONS_CHANNEL_ID,
        process.env.CONFESSIONS_CHAT_ID,
        poll.message_id
      );
      bot.forwardMessage(
        process.env.POLL_CHAT_ID,
        process.env.CONFESSIONS_CHAT_ID,
        poll.message_id
      );
    } else {
      send(this, process.env.CONFESSIONS_CHAT_ID, num);
      send(this, process.env.CONFESSIONS_CHANNEL_ID, num);
    }
    if (this.type != "sticker") {
      cNum.value++;
      await cNum.save();
      confession.send_by = null;
      confession.num = num;
      await confession.save();
    }
  } catch (error) {
    bot.sendMessage(
      process.env.ADMIN_ID,
      `There was an error sending confession #${num}:\n${error.stack}`
    );
  }
};

module.exports = Confession;
