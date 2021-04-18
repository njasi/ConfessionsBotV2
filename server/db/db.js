const Sequelize = require("sequelize");

const databaseName = "confessions_bot";

console.log("setup sequelize");

const db = new Sequelize(
  process.env.DATABASE_URL || `postgres://localhost:5432/${databaseName}`,
  {
    logging: false,
    dialect: "postgres",
    // native: true,
    ssl: true,
    dialectOptions: { ssl: true, rejectUnauthorized: false },
    // https://stackoverflow.com/questions/25000183/node-js-postgresql-error-no-pg-hba-conf-entry-for-host
    // dialect: "postgres",

    // dialectOptions: {
    //   ssl: true,
    //   //   // https://github.com/sequelize/sequelize/issues/12083#issuecomment-648870469
    //   require: true,
    //   //   // https://stackoverflow.com/questions/58965011/sequelizeconnectionerror-self-signed-certificate
    //   rejectUnauthorized: false,
    // },
  }
);

// const db = new Sequelize({
//   development: {
//     database: `postgres://localhost:5432/${databaseName}`,
//     host: "127.0.0.1",
//     dialect: "postgres",
//   },
//   production: {
//     use_env_variable: "DATABASE_URL",
//     dialect: "postgres",
//     dialectOptions: {
//       ssl: {
//         require: true,
//         rejectUnauthorized: false,
//       },
//     },
//   },
// });

module.exports = db;
