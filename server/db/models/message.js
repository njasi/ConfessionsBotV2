const Sequelize = require("sequelize");
const db = require("../db");

const Message = db.define("message", {
  chat_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  text: {
    type: Sequelize.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
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
  status: {
    type: Sequelize.ENUM("in_progress", "sent", "received"),
    default: "in_progress",
    allowNull: false,
  },
});

module.exports = Message;
