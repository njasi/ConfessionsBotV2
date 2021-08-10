const Sequelize = require("sequelize");

const databaseName = "confessions_bot";

let options = {
  logging: (thing) => {
    console.log("\n", thing, "\n");
  },
};

if (process.env.NODE_ENV == "production") {
  options = {
    ...options,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  };
}

console.log("\ndb URL:\n", process.env.DATABASE_URL);
const db = new Sequelize(
  process.env.DATABASE_URL || `postgres://localhost:5432/${databaseName}`,
  options
);

module.exports = db;
