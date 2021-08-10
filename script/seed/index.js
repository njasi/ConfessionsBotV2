const prompt = require("prompt");

/**
 * only need to run this on heroku or special test cases to get the database url...
 *
 * normally you should just run the seed file (npm run seed) (or node script/seed/seed)
 */

if (module === require.main) {
  prompt.start();
  prompt.get(
    ["DATABASE_URL", "HORNY_CHATS_IDS", "Are you sure about this? (YES|NO)"],
    (err, result) => {
      if (result["Are you sure about this? (YES|NO)"] !== "YES") {
        console.log("Action aborted as you are not sure");
        return;
      } else {
        prompt.get(
          [
            ">>>>>DO NOT DO THIS ON HEROKU<<<<\nLast chance for you to stop. (CONTINUE|STOP)",
          ],
          (err, result2) => {
            if (
              result2[
                ">>>>>DO NOT DO THIS ON HEROKU<<<<\nLast chance for you to stop. (CONTINUE|STOP)"
              ] === "CONTINUE"
            ) {
              process.env.HORNY_CHATS_IDS = result.HORNY_CHATS_IDS;
              if (result.DATABASE_URL) {
                console.log(
                  `Running seed with database url...`
                );
                process.env.DATABASE_URL = result.DATABASE_URL;
                require("./seed");
              } else {
                console.log("Running seed without database url...");
                require("./seed");
              }
            } else {
              console.log("Aborting seed.");
            }
          }
        );
      }
    }
  );
}
