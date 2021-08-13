/**
 * all of the data flows into the bot from here
 */
const router = require("express").Router();
const bot = require("./bot");

require("./events"); //register all the events

/**
 * api/bot/[token]
 */
router.post(`/${process.env.BOT_TOKEN}`, (req, res, next) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
});

// TODO add a route to allow triggering the test chats function


module.exports = router;
