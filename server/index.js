if (process.env.NODE_ENV == "production") {
  // require("dotenv").config({ path: ".env_test" });
  console.log("Deploy (test) mode");
} else {
  require("dotenv").config({ path: ".env_test" });
  console.log("Develop mode");
}

const path = require("path");
const express = require("express");
const morgan = require("morgan");
const compression = require("compression");

// const SequelizeStore = require("connect-session-sequelize")(session.Store);
const db = require("./db");
console.log("BOI 1");
const test_chats = require("./api/bot/test_chats");
// const e = require("express");
const PORT = process.env.PORT || 8080;
const app = express();

// load .env values
console.log("BOI 2");

module.exports = app;

const createApp = () => {
  // logging middleware
  app.use(morgan("dev"));

  // body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // compression middleware
  app.use(compression());
  console.log("BOI 3");

  // TODO: passport stuff
  // session middleware with passport
  // app.use(
  //   session({
  //     secret: process.env.SESSION_SECRET || "oof",
  //     store: sessionStore,
  //     resave: false,
  //     saveUninitialized: true,
  //   })
  // );
  // app.use(passport.initialize());
  // app.use(passport.session());

  // auth and api routes
  // TODO: add auth route
  // app.use("/auth", require("./auth"));
  app.use("/api", require("./api"));
  app.use("/", require("./static"));

  // any remaining requests with an extension (.js, .css, etc.) send 404
  app.use((req, res, next) => {
    if (path.extname(req.path).length) {
      const err = new Error("Not found");
      err.status = 404;
      next(err);
    } else {
      next();
    }
  });
  console.log("BOI 4");

  // TODO: serve index.html
  // app.use("*", (req, res) => {
  //   res.sendFile(path.join(__dirname, "..", "public/index.html"));
  // });

  // error handling endware
  app.use((err, req, res, next) => {
    if (!err.fake) {
      console.error(err.stack);
    }
    res.status(err.status || 500).send(err.message || "Internal server error.");
  });
};

const startListening = () => {
  console.log("BOI 5");

  // start listening (and create a 'server' object representing our server)
  const server = app.listen(PORT, () =>
    console.log(`Started listening on ${PORT}`)
  );

  // TODO: sockets?
  // const io = socketio(server);
  // require("./socket")(io);
};

const syncDb = () => db.sync().catch((e) => console.log(e));

async function bootApp() {
  // TODO: sessionstore sync
  // await sessionStore.sync();
  // await sequelize.drop();
  // db.sync({ force: true });
  console.log("BOI 6");

  await syncDb();
  console.log("BOI 7");
  await createApp();
  if (process.env.NODE_ENV == "deploy") {
    console.log("BOI 8");
    await test_chats();
  }
  console.log("BOI 9");

  await startListening();
}

// for if I ever write tests lol
if (require.main == module) {
  bootApp().catch((e) => console.log(e));
} else {
  createApp();
}
