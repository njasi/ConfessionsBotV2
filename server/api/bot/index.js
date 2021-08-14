/**
 * all of the data flows into the bot from here
 */
const router = require("express").Router();
const bot = require("./bot");
const { Chat } = require("../../db/models");

require("./events"); //register all the events

/**
 * api/bot/{BOT_TOKEN}
 */
router.post(`/${process.env.BOT_TOKEN}`, (req, res, next) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
});

// TODO: make TIMER_TOKEN

/**
 * api/bot/{TIMER_TOKEN}
 */
router.get(`/${process.env.TIMER_TOKEN}`, async (req, res, next) => {
  try {
    results = await Chat.test_chats((tab = false), (logging = false));
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
