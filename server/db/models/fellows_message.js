const Sequelize = require("sequelize");
const db = require("../db");
const bot = require("../../api/bot/bot");
const User = require("./user");

const Message = db.define("message", {
  text: {
    type: Sequelize.TEXT,
    allowNull: true
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

Message.beforeValidate(async (mess, options) => {
  if (!mess.chat_id) {
    const max = await Message.max("chat_id");
    mess.chat_id = isNaN(max) ? 0 : max + 1;
  }
});

Message.prototype.swapMenu = async function (new_menu, options = {}) {
  let user;
  if (this.from_init) {
    user = await this.getInitiator();
  } else {
    user = await this.getTarget();
  }

  // console.log(user)

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
  const init = await User.findByPk(this.initiator);
  const targ = await User.findByPk(this.target);
  console.log(init, targ);

  // bot.sendMessage()

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
