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
  message_info: {
    type: Sequelize.JSON,
    allowNull: true,
  },
});

const text_add_prefix = (text, num, cw = false, sticker = false) => {
  if (sticker) {
    return `<b>Content Warning Sticker...</b>\nCW:\t${text}`;
  }
  return `<b>Confession #${num}:</b>\n${
    cw ? `CW:\t${text}` : text == null ? "" : text
  }`;
};

const method_mappings = {
  animation: bot.sendAnimation,
  audio: bot.sendAudio,
  document: bot.sendDocument,
  photo: bot.sendPhoto,
  video: bot.sendVideo,
  voice: bot.sendVoice,
};

Confession.prototype.send_helper = async function (
  chat_id,
  cw_forward = false
) {
  let user = null;
  if (this.allow_responses) {
    user = await this.getUser();
  }
  const text = text_add_prefix(this.text, this.num);
  console.log(`SEND_HELPER(${chat_id}, ${this.num}, ${cw_forward}):\n`);
  // all cw messages will be text, unless the content is
  // actualy being sent somewhere ie cw_forward = true
  if (!cw_forward && this.content_warning !== null) {
    return await bot.sendMessage(
      chat_id,
      text_add_prefix(
        this.content_warning,
        this.num,
        (cw = true),
        (sticker = this.type == "sticker")
      ),
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "View Content",
                callback_data: `cw_confession_id=${this.id}`,
              },
            ],
            ...(this.allow_responses
              ? [
                  [
                    {
                      text: "Contact OP",
                      callback_data: `message_from=${user.telegram_id}&conf=${this.num}`,
                    },
                  ],
                ]
              : []),
          ],
        },
      }
    );
  }
  // cw_forward = true or no cw
  const options = {
    parse_mode: "HTML",
    ...(this.allow_responses
      ? {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Contact OP",
                  // url: "t.me/test123420bot",
                  callback_data: `message_from=${user.telegram_id}&conf=${this.num}`,
                },
              ],
            ],
          },
        }
      : {}),
  };
  switch (this.type) {
    case "text": {
      return await bot.sendMessage(chat_id, text, {
        ...options,
      });
    }
    case "sticker": {
      return await bot.sendSticker(chat_id, this.file_id);
    }
    case "animation":
    case "audio":
    case "document":
    case "photo":
    case "video":
    case "voice": {
      return await method_mappings[this.type](chat_id, this.file_id, {
        caption: text,
        ...options,
      });
    }
    case "poll": {
      const u = await this.getUser();
      return await bot.copyMessage(chat_id, u.telegram_id, this.file_id, {
        ...options,
      });
    }
    default: {
      return null;
    }
  }
};

Confession.prototype.send = async function () {
  const cNum = await Keyval.findOne({
    where: { key: "num" },
  });
  const num = cNum.value;
  this.num = num;
  try {
    if (this.type == "poll") {
      const poll = await this.send_helper(process.env.CONFESSIONS_CHAT_ID);
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
      if (this.chat_id) {
        chat = await this.getChat();
        bot.forwardMessage(
          chat.chat_id,
          process.env.CONFESSIONS_CHAT_ID,
          poll.message_id
        );
      }
    } else {
      this.send_helper(process.env.CONFESSIONS_CHAT_ID);
      this.send_helper(process.env.CONFESSIONS_CHANNEL_ID);
      if (this.chat_id) {
        chat = await this.getChat();
        this.send_helper(chat.chat_id);
      }
    }
    // stickers are not counted as confessions, just spam lol
    if (this.type != "sticker") {
      cNum.value++;
      await cNum.save();
      this.num = num;
    } else {
      // TODO: should stickers be saved or just removed?
      // for now im just gonna remove the ones without content warning buttons
      if (this.cw == null) {
        await this.destroy();
        return;
      }
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
