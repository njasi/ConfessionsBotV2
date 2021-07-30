const axios = require("axios");
const Sequelize = require("sequelize");
const db = require("../db");

const FellowsChat = db.define("fellowschat", {
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
    defaultValue: null,
  },
  name_target: {
    type: Sequelize.STRING,
  },
  name_initiator: {
    type: Sequelize.STRING,
  },
});

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1);
  });
}

FellowsChat.beforeCreate(async (chat) => {
  const { data } = await axios.get(
    `https://sheets.googleapis.com/v4/spreadsheets/1w-MZ2IbQe6a0Fr4kftTKapj6FKkVzEtBueUySaJL9Vk/values/Things!A2%3AB?majorDimension=COLUMNS&key=${process.env.GOOGLE_API_KEY}`
  );
  chat.name_target = toTitleCase(
    `${data.values[0][Math.floor(Math.random() * data.values[0].length)]} ${
      data.values[1][Math.floor(Math.random() * data.values[1].length)]
    }`
  );
  chat.name_initiator = toTitleCase(
    `${data.values[0][Math.floor(Math.random() * data.values[0].length)]} ${
      data.values[1][Math.floor(Math.random() * data.values[1].length)]
    }`
  );
});

module.exports = FellowsChat;
