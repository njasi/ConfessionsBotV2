const Sequelize = require("sequelize");

const databaseName = "confessions_bot";

const db = new Sequelize(
  process.env.DATABASE_URL || `postgres://localhost:5432/${databaseName}`,
  {
    logging: false,
    dialect: "postgres",
    dialectOptions: {
      ssl: true,
    },
  }
);

module.exports = db;
