const Sequelize = require("sequelize");
const db = require("../db");

const User = db.define("user", {
  telegram_id: {
    type: Sequelize.STRING,
  },
  name: {
    type: Sequelize.STRING,
  },
  fellow_darb: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  verification_status: {
    type: Sequelize.INTEGER,
  },
  verification_request_time: {
    type: Sequelize.DATE,
  },
  locked: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = User;
