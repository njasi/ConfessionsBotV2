const Sequelize = require("sequelize");
const db = require("../db");

const Chat = db.define("chat", {
  num: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  chat_id: {
    type: Sequelize.STRING,
  },
});

module.exports = Chat;