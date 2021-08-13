const router = require("express").Router();
const bot = require("./bot");

require("./events"); //register all the events

/**
 * api/bot/token
 */
router.post(`/${process.env.BOT_TOKEN}`, (req, res, next) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
});

module.exports = router
