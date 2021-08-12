const router = require("express").Router();
module.exports = router;

router.use("/bot", require("./bot")); //TODO change back to ./bot

router.use((req, res, next) => {
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});

