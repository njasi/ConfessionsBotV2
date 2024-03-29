const Sequelize = require("sequelize");
const db = require("../db");

const Keyval = db.define("keyval", {
  key: {
    type: Sequelize.STRING,
    unique: true,
  },
  value: {
    type: Sequelize.JSON,
    set(val) {
      try {
        JSON.parse(val);
        this.setDataValue("value", val);
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

/**
 * List of keys I will be storing here:
 *
 * num : int
 * current confession number (the next confession to be sent will be assigned this)
 *
 * h_num : int
 * current horny confession number (like num but horny confessions)
 *
 */
