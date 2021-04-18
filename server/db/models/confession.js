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
      "confirm_re",
      "invaild_cw",
      "hidden"
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
    set(val) {
      try {
        JSON.parse(val);
        this.setDataValue("message_info", val);
      } catch (error) {
        this.setDataValue("message_info", JSON.stringify(val));
      }
    },
    get() {
      const storedValue = this.getDataValue("message_info");
      return JSON.parse(storedValue);
    },
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
  animation: bot.sendAnimation.bind(bot),
  audio: bot.sendAudio.bind(bot),
  document: bot.sendDocument.bind(bot),
  photo: bot.sendPhoto.bind(bot),
  video: bot.sendVideo.bind(bot),
  voice: bot.sendVoice.bind(bot),
};

Confession.prototype.send_helper = async function (
  chat_id,
  cw_forward = false
) {
  let user = null;
  if (this.allow_responses) {
    user = await this.getUser();
  }
  const reply = this.reply_message
    ? this.reply_message.find((e) => e[0] == chat_id)
    : null;
  const text = text_add_prefix(this.text, this.num);
  console.log(`SEND_HELPER(${chat_id}, ${this.num}, ${cw_forward})`);
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
                      callback_data: `user_state=w_fellows&contact=${user.id}&conf=${this.num}`,
                    },
                  ],
                ]
              : []),
          ],
        },
        ...(reply ? { reply_to_message_id: reply[1] } : {}),
      }
    );
  }
  // cw_forward = true or no cw
  let options = {
    parse_mode: "HTML",
    ...(this.allow_responses
      ? {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Contact OP",
                  callback_data: `contact=${user.id}&conf=${this.num}`,
                },
              ],
            ],
          },
        }
      : {}),
  };
  if (reply) {
    options = { ...options, reply_to_message_id: reply[1] };
  }

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

Confession.prototype.send_helper_combined = async function (chat_id) {
  const message = await this.send_helper(chat_id);
  this.message_info = [...this.message_info, [chat_id, message.message_id]];
  await this.save();
  return message;
};

Confession.prototype.send = async function () {
  const cNum = await Keyval.findOne({
    where: { key: "num" },
  });

  if (this.chatId) {
    this.getChat().then((chat) => {
      chat.num++;
      chat.save();
    });
  }

  const num = cNum.value;
  this.num = num;
  this.message_info = [];
  try {
    if (this.type == "poll") {
      const poll = await this.send_helper(process.env.CONFESSIONS_CHAT_ID);
      let messages = [];
      messages.push(
        bot.forwardMessage(
          process.env.CONFESSIONS_CHANNEL_ID,
          process.env.CONFESSIONS_CHAT_ID,
          poll.message_id
        )
      );
      messages.push(
        bot.forwardMessage(
          process.env.POLL_CHAT_ID,
          process.env.CONFESSIONS_CHAT_ID,
          poll.message_id
        )
      );
      if (this.chat_id) {
        chat = await this.getChat();
        messages.push(
          bot.forwardMessage(
            chat.chat_id,
            process.env.CONFESSIONS_CHAT_ID,
            poll.message_id
          )
        );
      }
      const m_info = [];
      const all_sent = await Promise.all(messages);
      for (let i = 0; i < all_sent.length; i++) {
        m_info.push([all_sent[i].chat.id, all_sent[i].message_id]);
      }
      this.message_info = m_info;
      await this.save();
    } else {
      this.send_helper_combined(process.env.CONFESSIONS_CHAT_ID);
      this.send_helper_combined(process.env.CONFESSIONS_CHANNEL_ID);
      if (this.chatId) {
        chat = await this.getChat();
        // chat may have left the network while this person was confessing
        try {
          this.send_helper_combined(chat.chat_id);
        } catch (error) {}
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

Confession.prototype.swapMenu = async function (new_menu, options = {}) {
  const user = await this.getUser();
  const data = await new_menu.load(
    { id: user.telegram_id },
    {
      bot,
      user,
      ...options,
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
  for (let i = 0; i < to_send.length; i++) {
    await to_send[i].send();
  }
};

module.exports = Confession;
