const Sequelize = require("sequelize");
const db = require("../db");
const bot = require("../../api/bot/bot");
const Keyval = require("./keyval");

// const { swapMenu } = require("../../api/bot/menus");

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
  allow_responses: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
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
      "confirm_reply",
      "invaild_cw"
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
          "tetst\n" + text_add_prefix(confession.content_warning, num),
          {
            parse_mode: "HTML",
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
        return await bot.sendMessage(chat_id, text, { parse_mode: "HTML" });
      }
    }
    default: {
      return null;
    }
  }
}

Confession.prototype.send = async function () {
  const cNum = await Keyval.findOne({
    where: { key: "num" },
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
    // stickers are not counted as confessions, just spam lol
    if (this.type != "sticker") {
      cNum.value++;
      await cNum.save();
      this.num = num;
    } else {
      // TODO: should stickers be saved or just removed?
    }
    this.send_by = null;
    await this.save();
  } catch (error) {
    bot.sendMessage(
      process.env.ADMIN_ID,
      `There was an error sending confession #${num}:\n${error.stack}`
    );
  }
};

Confession.prototype.swapMenu = async function (new_menu) {
  const user = await this.getUser();
  const data = await new_menu.load(
    { id: user.telegram_id },
    {
      bot,
      user,
    }
  );

  await bot.editMessageText(data.text, {
    message_id: this.menu_id,
    chat_id: user.telegram_id,
    parse_mode: "HTML",
    ...data.options,
  });
};

/**
 * sends all messages that are due to be sent
 */
Confession.send = async function () {
  const to_send = await this.findAll({
    where: {
      send_by: {
        [Sequelize.Op.and]: {
          [Sequelize.Op.ne]: null,
          [Sequelize.Op.lt]: new Date(),
        },
      },
    },
  });
  [...to_send].forEach((conf) => conf.send());
};

module.exports = Confession;
