const Sequelize = require("sequelize");
const db = require("../db");
const bot = require("../../api/bot/bot");

const Message = db.define("message", {
  chat_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  text: {
    type: Sequelize.TEXT,
  },
  from_init: {
    type: Sequelize.BOOLEAN,
    default: true,
    allowNull: false,
  },
  obscure_initiator: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  obscure_target: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  target_cnum: {
    type: Sequelize.INTEGER,
    defaultValu: null,
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
  if(this.from_init){
    user = await this.getInitiator();
  }else{
    user = await this.getTarget();
  }

  console.log(user)

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

module.exports = Message;
