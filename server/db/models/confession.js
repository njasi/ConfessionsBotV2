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
  channel_message_id: {
    type: Sequelize.STRING,
  },
  reply_message: {
    type: Sequelize.JSON,
    set(val) {
      try {
        JSON.parse(val);
        this.setDataValue("reply_message", val);
      } catch (error) {
        this.setDataValue("reply_message", JSON.stringify(val));
      }
    },
    get() {
      const storedValue = this.getDataValue("reply_message");
      return JSON.parse(storedValue);
    },
  },
  // file_id for if something is attached
  file_id: {
    type: Sequelize.STRING,
  },
  in_progress: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
  },
  stage: {
    type: Sequelize.ENUM(
      "idle",
      "wait_cw",
      "confirm_cw",
      "wait_reply",
      "confirm_reply"
    ),
    defaultValue: "idle",
    allowNull: true,
  },
  send_by: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  menu_id: {
    type: Sequelize.STRING,
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
                    callback_data: `cw_confession_num=${num}`, // TODO: cw confession num in query stuff
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
