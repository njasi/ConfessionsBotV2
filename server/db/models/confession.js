const Sequelize = require("sequelize");
const db = require("../db");
const bot = require("../../api/bot/bot");
const Keyval = require("./keyval");
const Chat = require("./chat");
const { ik, butt } = require("../../api/bot/helpers");
const { generate_nct } = require("./nct_handling");

// const { swapMenu } = require("../../api/bot/menus");

const Confession = db.define("confession", {
  num: {
    type: Sequelize.INTEGER,
  },
  nct: {
    type: Sequelize.STRING,
    unique: true,
    defaultValue: null,
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
  archive_message_id: {
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

/**
 * Handle NCT shit
 */

Confession.prototype.send_nct = async function () {
  const user = await this.getUser();

  let message = await bot.sendMessage(
    user.telegram_id,
    "<b>Generating NCT...</b>",
    { parse_mode: "HTML" }
  );

  let confs = { length: 2 };
  let nct = "";
  while (confs.length > 0) {
    nct = await generate_nct(this, message.message_id);
    confs = await Confession.findAll({ where: { nct } });
  }

  this.nct = nct;
  await this.save();

  await bot.editMessageText(
    `<b>This NCT is proof of ownership of ${
      this.horny ? "Horny " : ""
    }Confession #${this.num}:</b>\nDo not delete this message.\n\n<code>${
      this.nct
    }</code>`,
    {
      message_id: message.message_id,
      chat_id: user.telegram_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            butt(
              "Assert Ownership",
              null,
              (options = { switch_inline_query: this.nct })
            ),
          ],
        ],
      },
    }
  );

  await bot.pinChatMessage(user.telegram_id, message.message_id);
};

const text_add_prefix = (
  text,
  num,
  cw = false,
  sticker = false,
  horny = false
) => {
  if (sticker) {
    return `<b>Content Warning Sticker...</b>\nCW:\t${text}`;
  }
  return `<b>${horny ? "Horny " : ""}Confession #${num}:</b>\n${
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
  cw_forward = false,
  poll_forward = false
) {
  let user = null;
  if (this.allow_responses) {
    user = await this.getUser();
  }
  const reply = this.reply_message
    ? this.reply_message.find((e) => e[0] == chat_id)
    : null;
  const text = text_add_prefix(this.text, this.num, false, false, this.horny);
  // console.log(`SEND_HELPER(${chat_id}, ${this.num}, ${cw_forward})`);
  // all cw messages will be text, unless the content is
  // actualy being sent somewhere ie cw_forward = true
  if (!cw_forward && this.content_warning !== null) {
    return await bot.sendMessage(
      chat_id,
      text_add_prefix(
        this.content_warning,
        this.num,
        (cw = true),
        (sticker = this.type == "sticker"),
        (horny = this.horny)
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
    ...(this.allow_responses // TODO change back when dealing with cw horny ones...
      ? {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Contact OP",
                  callback_data: `user_state=w_fellows&contact=${user.id}&conf=${this.num}`,
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

      await bot.sendMessage(
        chat_id,
        text_add_prefix(
          "See the poll below:",
          this.num,
          false,
          false,
          this.horny
        ),
        {
          parse_mode: "HTML",
        }
      );
      if (poll_forward) {
        return;
      }
      const message = await bot.copyMessage(
        chat_id,
        u.telegram_id,
        this.file_id,
        {
          caption: text,
          ...options,
        }
      );
      return message;
    }
    default: {
      return null;
    }
  }
};

Confession.prototype.send_helper_combined = async function (
  chat_id,
  archive = false
) {
  const message = await this.send_helper(chat_id, (cw_forward = archive));
  this.message_info = [...this.message_info, [chat_id, message.message_id]];
  if (chat_id == process.env.ARCHIVE_CHAT_ID || archive) {
    this.archive_message_id = message.message_id;
  }
  await this.save();
  return message;
};

Confession.prototype.send = async function () {
  let cNum = await Keyval.findOne({
    where: { key: "num" },
  });

  if (this.chatId) {
    let chat = await this.getChat();
    chat.num++;
    chat.save();

    if (chat.horny) {
      cNum = await Keyval.findOne({
        where: { key: "hnum" },
      });
      this.horny = true;
    }
  }

  const num = cNum.value;
  this.num = num;
  this.message_info = [];
  try {
    if (this.type == "poll") {
      let poll;
      let messages = [];

      poll = await this.send_helper_combined(
        this.horny
          ? process.env.HORNY_CHANNEL_ID
          : process.env.CONFESSIONS_CHAT_ID
      );

      if (this.horny) {
        const horny_chats = await Chat.findAll({ where: { horny: true } });
        for (let i = 0; i < horny_chats.length; i++) {
          await this.send_helper(horny_chats[i].chat_id, false, true);
          messages.push(
            bot.forwardMessage(
              horny_chats[i].chat_id,
              process.env.HORNY_CHANNEL_ID,
              poll.message_id
            )
          );
        }
      } else {
        await this.send_helper(process.env.CONFESSIONS_CHANNEL_ID, false, true);
        await this.send_helper(process.env.POLL_CHAT_ID, false, true);
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

        messages.push(
          bot.forwardMessage(
            process.env.POLL_CHAT_ID,
            process.env.ARCHIVE_CHAT_ID,
            poll.message_id
          )
        );

        if (this.chat_id) {
          let chat = await this.getChat();
          await this.send_helper(chat.chat_id, false, true);

          messages.push(
            bot.forwardMessage(
              chat.chat_id,
              process.env.CONFESSIONS_CHAT_ID,
              poll.message_id
            )
          );
        }
      }
      const m_info = [];
      const all_sent = await Promise.all(messages);
      for (let i = 0; i < all_sent.length; i++) {
        m_info.push([all_sent[i].chat.id, all_sent[i].message_id]);
        if (all_sent[i].chat.id == process.env.ARCHIVE_CHAT_ID) {
          this.archive_message_id = all_sent[i].message_id;
        }
      }
      this.message_info = [...this.message_info, ...m_info];
      await this.save();
    } else {
      let chat;
      if (this.chatId) {
        chat = await this.getChat();

        if (chat.horny) {
          this.send_helper_combined(process.env.HORNY_CHANNEL_ID);
          this.send_helper_combined(
            process.env.ARCHIVE_CHAT_ID,
            (archive = true)
          );
          const horny_chats = await Chat.findAll({ where: { horny: true } });
          for (let i = 0; i < horny_chats.length; i++) {
            this.send_helper_combined(horny_chats[i].chat_id);
          }
        } else {
          // chat may have left the network while this person was confessing
          try {
            this.send_helper_combined(process.env.CONFESSIONS_CHAT_ID);
            this.send_helper_combined(process.env.CONFESSIONS_CHANNEL_ID);
            this.send_helper_combined(
              process.env.ARCHIVE_CHAT_ID,
              (archive = true)
            );

            this.send_helper_combined(chat.chat_id);
          } catch (error) {}
        }
      } else {
        this.send_helper_combined(process.env.CONFESSIONS_CHAT_ID);
        this.send_helper_combined(process.env.CONFESSIONS_CHANNEL_ID);
        this.send_helper_combined(
          process.env.ARCHIVE_CHAT_ID,
          (archive = true)
        );
      }
    }
    // stickers are not counted as confessions, just spam lol
    if (this.type != "sticker") {
      cNum.value++;
      await cNum.save();
      this.num = num;
    } else {
      // for now im just gonna remove the ones without content warning buttons
      if (this.content_warning == null) {
        await this.destroy();
        return;
      }
    }
    this.send_by = null;
    await this.send_nct();
    await this.save();
  } catch (error) {
    bot.sendMessage(
      process.env.ADMIN_ID,
      `There was an error sending confession #${num}:\n${error.stack}`
    );
    this.send_by = null;
    await this.save();
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
