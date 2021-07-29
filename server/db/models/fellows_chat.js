const Sequelize = require("sequelize");
const db = require("../db");

const FellowsChat = db.define("message", {
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
});

module.exports = FellowsChat;
