const router = require("express").Router();
// const request = require("request");
const bot =  require("./bot")

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

/**
 * Middleware to check if a user is verified
 */
async function v_mid(cb){
  function _wrap(message){
    // TODO: verify users middleware
    console.log(message)
    cb(...arguments)
  }
  return _wrap
}

/**
 * Menu to send upon /start
 */
bot.onText(/^\/start($|@froshio_bot$)/, v_mid((message, reg) => {
  sendMenuFromKey("start", message.from);
}));
