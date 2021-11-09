const User = require("../../../db/models/user");
const { ik, butt } = require("../helpers");
const bot = require("../bot");

/**
 * the general Menu class so i dont have to replicate a lot of code.
 */
class Menu {
  constructor(get_data, key) {
    this.get_data = get_data;
    this.key = key;
  }
  /**
   * run the get data function with whatever args are given to load
   * @returns promise, object with .text and .options needed to send a menu
   */
  async load() {
    return await this.get_data(...arguments);
  }

  async send(from, options) {
    try {
      let data;
      // a lot of menus need the user so
      const user = await User.findOne({ where: { telegram_id: from.id } });
      if (user != null && user.verification_status == -1) {
        const options = { ...ik([[butt("Ok", "delete=true")]]) };
        const text = "You've been banned, begone from this place!";
        data = { options, text };
      } else {
        data = await this.load(
          from,
          { ...options, bot: bot, user: user },
          ...Array.prototype.slice.call(arguments, [3])
        );
      }
      let res;
      try {
        res = await bot.sendMessage(from.id, data.text, {
          parse_mode: "HTML",
          ...data.options,
        });
      } catch (error) {
        if(`${error.response.body.description}`.indexOf("replied message not found") != -1){
          delete data.options["reply_to_message_id"]
          res = await bot.sendMessage(from.id, data.text, {
            parse_mode: "HTML",
            ...data.options,
          });
        }
      }
      return res;
    } catch (error) {
      bot.sendMessage(
        process.env.ADMIN_ID,
        `There was an error in the ${this.key} menu:\n${error.stack}`
      );
    }
  }
}

module.exports = { Menu };
