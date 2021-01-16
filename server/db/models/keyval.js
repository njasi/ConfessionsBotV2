const { json } = require("sequelize");
const Sequelize = require("sequelize");
const db = require("../db");

const Keyval = db.define("keyval", {
  key: {
    type: Sequelize.STRING,
  },
  value: {
    type: Sequelize.JSON,
    set(val) {
      try {
        JSON.parse(val);
        this.setDataValue("value");
      } catch (error) {
        this.setDataValue("value", JSON.stringify(val));
      }
    },
    get() {
      const storedValue = this.getDataValue("value");
      return JSON.parse(storedValue);
    },
  },
});

module.exports = Keyval;
