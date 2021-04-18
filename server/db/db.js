const Sequelize = require("sequelize");

const databaseName = "confessions_bot";

const db = new Sequelize(
  process.env.DATABASE_URL || `postgres://localhost:5432/${databaseName}`,
  {
    logging: false,
    // https://stackoverflow.com/questions/25000183/node-js-postgresql-error-no-pg-hba-conf-entry-for-host
    dialect: "postgres",
    dialectOptions: {
      ssl: true,
    },
    // https://stackoverflow.com/questions/58965011/sequelizeconnectionerror-self-signed-certificate
    rejectUnauthorized: false,
  }
);

module.exports = db;
