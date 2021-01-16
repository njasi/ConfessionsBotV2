const Sequelize = require("sequelize");
const db = require("../db");

const Confession = db.define("confession", {
  num: {
    type: Sequelize.INTEGER,
  },
  horny: {
    // horny chat confessions have a seperate count
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  type: {
    type: Sequelize.ENUM(
      "text",
      "sticker",
      "photo",
      "audio",
      "document",
      "video",
      "animation",
      "voice",
      "poll",
      "spoiler"
    ),
  },
  content_warning: {
    type: Sequelize.STRING,
    defaultValue: null,
  },
  text: {
    type: Sequelize.TEXT,
  },
  message_id: {
    type: Sequelize.STRING,
  },
  // file_id for if something is attached
  file_id: {
    type: Sequelize.STRING,
  },
});

module.exports = Confession;