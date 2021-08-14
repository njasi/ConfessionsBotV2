/**
 * register the many api routes here lol
 */

const router = require("express").Router();
module.exports = router;

/**
 * subrouters
 */
router.use("/bot", require("./bot"));

/**
 * when requesting a route that does not exist
 */
router.use((req, res, next) => {
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});
