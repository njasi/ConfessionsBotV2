const Sequelize = require("sequelize");
const db = require("../db");

const Chat = db.define("chat", {
  name: {
    type: Sequelize.STRING,
  },
  num: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  chat_id: {
    type: Sequelize.STRING,
    unique: true,
  },
  old_chat_id: {
    type: Sequelize.STRING,
    unique: true,
  },
});

module.exports = Chat;
