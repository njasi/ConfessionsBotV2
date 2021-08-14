const bot = require("../bot");
const { User, Confession } = require("../../../db/models");
const { decode_nct } = require("../../../db/models/nct_handling");

bot.on("inline_query", async (inline_query) => {
  // console.log("\nINLINE QUERY \n", inline_query);
  const usr = await User.findOne({
    where: { telegram_id: inline_query.from.id },
  });
  let buttons;
  let options = { cache_time: 0 };

  const conf = await Confession.findOne({ where: { nct: inline_query.query } });
  const data = await decode_nct(inline_query.query);

  if (usr.verification_status == -1) {
    buttons = [];
    // bot.sendMessage(inline_query.from.id);
    bot.ans;
  } else if (data && usr) {
    // yes there is a pretty simple way to fake all of this but no ones dumb enough to bother to figure it out
    // but this way the database does not need to have the confession in it anymore.
    if (data.userId != usr.id) {
      return; // user does not match
    }
    // console.log(process.env.FORWARD_CHAT_ID, usr.telegram_id, data.message_id);

    const verify_message = await bot.forwardMessage(
      process.env.FORWARD_CHAT_ID,
      usr.telegram_id,
      data.message_id
    );
    if (
      inline_query.query.length == 255 && // must be 255 chars
      !!conf &&
      verify_message.forward_from.username == process.env.BOT_USERNAME &&
      verify_message.text.indexOf(inline_query.query) != -1
    ) {
      buttons = [
        {
          type: "article",
          id: conf.num,
          title: `Claim ${conf.horny ? "Horny " : ""}Confession #${conf.num}`,
          description:
            "Selecting this will send a message via the bot to show you are the confessor.",
          input_message_content: {
            message_text: `<b>${usr.name} is ${
              conf.horny ? "Horny " : ""
            }Confessor #${conf.num}</b>`,
            parse_mode: "HTML",
          },
        },
      ];
    } else {
      // token is not to a confession
    }
  } else if (!conf & usr) {
    // see if they are searching for conf num
  }
  await bot.answerInlineQuery(inline_query.id, buttons, options);
});

function get_message_type(mess) {
  tests = [
    "text",
    "animation",
    "audio",
    "document",
    "sticker",
    "video",
    "voice",
    "photo",
    "poll",
  ];
  for (let i = 0; i < tests.length; i++) {
    if (!!mess[tests[i]]) {
      return tests[i];
    }
  }
  return undefined;
}

function forward_to_inline(forward) {
  const message = forward.message;
  const meta = get_message_type(message);
  console.log("\nMETA:\n", meta);
  const general = {
    type: meta.type,
    text: message.caption == null ? message.text : message.caption,
    userId: user.id,
  };
  switch (meta.type) {
    case "text": {
      info = general;
    }
    case "animation":
    case "audio":
    case "document":
    case "sticker":
    case "video":
    case "voice": {
      info = {
        ...general,
        file_id: message[meta.type].file_id,
      };
      break;
    }
    case "photo": {
      info = {
        ...general,
        file_id: message.photo[message.photo.length - 1].file_id,
      };
      break;
    }
    case "poll": {
      info = {
        ...general,
        text: message.poll.question,
        file_id: message.message_id,
      };
      break;
    }
    default: {
      // idk lol
    }
  }
}
