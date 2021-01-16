const express = require("express");
const router = express.Router();
const path = require("path");

// TODO: serve static telegram assets
// router.use((req, res, next) => {

// });

// static file-serving middleware
router.use(express.static(path.join(__dirname, "..", "public")));

module.exports = router;
