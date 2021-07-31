const Sequelize = require("sequelize");
const db = require("../db");
const bot = require("../../api/bot/bot");
const User = require("./user");

const Message = db.define("fellowsmessage", {
  text: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  from_init: {
    type: Sequelize.BOOLEAN,
    default: true,
    allowNull: false,
  },
  status: {
    type: Sequelize.ENUM("in_progress", "sent", "received"),
    defaultValue: "in_progress",
    allowNull: false,
  },
  menu_id: {
    type: Sequelize.STRING,
    allowNull: true,
  },
});

Message.prototype.swapMenu = async function (new_menu, options = {}) {
  let user;
  fchat = await this.getFellowschat();
  if (this.from_init) {
    user = await fchat.getInitiator();
  } else {
    user = await fchat.getTarget();
  }


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

Message.prototype.send = async function () {
  const fchat = await this.getFellowschat();
  const init = await fchat.getInitiator();
  const targ = await fchat.getTarget();

  console.log(init, targ);


  let message_data;
  if (this.from_init) {
    message_data = {
      chat_id: targ.telegram_id,
      text: `${init.name} ${this.text}`,
      options: {},
    };
  } else {
    message_data = {
      chat_id: init.telegram_id,
      text: `${this.obscure_target ? targ.name : ""} ${this.text}`,
      options: {},
    };
  }
  bot.sendMessage(
    message_data.chat_id,
    message_data.text,
    message_data.options
  );
};

module.exports = Message;
