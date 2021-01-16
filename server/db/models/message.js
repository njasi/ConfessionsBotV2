const Sequelize = require("sequelize");
const db = require("../db");

const Message = db.define("message", {
  chat_id: {
    type: Sequelize.INTEGER,
    unique: true,
    allowNull: false,
  },
  text: {
    type: Sequelize.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  initiator: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  from: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  to: {
    type: Sequelize.INTEGER,
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
});

module.exports = Message;
