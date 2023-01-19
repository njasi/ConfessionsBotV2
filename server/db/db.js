const Sequelize = require("sequelize");

const db = new Sequelize(
  process.env.DATABASE_NAME,
  process.env.POSTGRES_USERNAME,
  process.env.POSTGRES_PASSWORD,
  {
    dialect: "postgres",
    logging: false,
  }
);
module.exports = db;
