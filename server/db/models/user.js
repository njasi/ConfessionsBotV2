const Sequelize = require("sequelize");
const db = require("../db");

const User = db.define("user", {
  telegram_id: {
    type: Sequelize.INTEGER,
  },
  name: {
    type: Sequelize.STRING,
  },
  username: {
    type: Sequelize.STRING,
  },
  fellow_darb: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  locked: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  verification_status: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
  },
  verification_request_time: {
    type: Sequelize.DATE,
  },
  // cooldown before they can request verification again in ms
  verification_cool_down: {
    type: Sequelize.INTEGER,
    defaultValue: 86400000,
  },
  poll_id: {
    type: Sequelize.STRING,
  },
  state: {
    type: Sequelize.ENUM("idle", "confessing", "w_fellows", "w_feedback"),
    defaultValue: "idle",
    allowNull: false,
  },
  misc: {
    type: Sequelize.JSON,
  },
});

/**
 * status numbers:
 *
 * -2:
 *  waiting on poll sent to verification chat
 *
 * -1:
 *  banned, cannot reapply for verification
 *
 * 0:
 *  unverified, can apply for verification again, make sure to
 *  check the previous request time with canRequestValidation though
 *
 * 1:
 *  verified as a darb/social darb, can access and use bot. Cannot
 *  reverify, but can //TODO: /verifyupdate to update their info
 *  like if a name was changed or something
 *
 * 2:
 *  verified as a nondarb, and has been approved for the bot
 *
 * 3:
 *  verified as noncaltech and has been approved for the bot
 *
 * 4:
 *  verification was forced by admin
 *
 * */

User.prototype.isAllowed = function () {
  return this.verification_status > 0;
};

User.prototype.canRequestValidation = function () {};

module.exports = User;
