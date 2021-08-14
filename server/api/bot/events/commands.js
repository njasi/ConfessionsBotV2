const bot = require("../bot");
const { commandRegexDict } = require("../config/command_regexes");
const { MENUS } = require("../menus/index");
const { Chat } = require("../../../db/models");
const {
  cMid,
  vMid,
  cvMid,
  aMid,
  fool_blongus_absolute_utter_clampongus,
} = require("./middleware");

// TODO update the menu.send method so i dont need to pass the bot
// might be pain sinces the menus are all made

/**
 * allows a user to request to verify. Ends in sending a ~poll so I dont have to deal with it
 */
bot.onText(
  commandRegexDict.verify,
  cMid((message) => {
    MENUS.verify.send(message.from, { fc: true });
  })
);

/**
 * send start menu
 */
bot.onText(commandRegexDict.start, (message, reg) => {
  // TODO detect rickroll param somehow and send them a vid
  cvMid((message) => {
    MENUS.start.send(message.from, { fc: true });
  })(message, reg);
});

/**
 * send toggle lock menu in lock state
 */
bot.onText(
  commandRegexDict.lock,
  cvMid((message) => {
    MENUS.toggle_lock.send(message.from, {
      fc: true,
      command: "lock",
    });
  })
);

/**
 * send toggle lock menu in unlock state
 */
bot.onText(
  commandRegexDict.unlock,
  cvMid((message) => {
    MENUS.toggle_lock.send(message.from, {
      fc: true,
      command: "unlock",
    });
  })
);

/**
 * Send cancel menu
 */
bot.onText(
  commandRegexDict.cancel,
  cvMid((message) => {
    MENUS.cancel.send(message.from, {
      fc: true,
      command: "cancel",
    });
  })
);

/**
 * send Poll info menu
 */
bot.onText(
  commandRegexDict.poll,
  cvMid((message) => {
    MENUS.poll_info.send(message.from, { fc: true });
  })
);

/**
 * send Help menu
 */
bot.onText(
  commandRegexDict.help,
  cvMid((message) => {
    MENUS.help.send(message.from, { fc: true });
  })
);

/**
 * send about menu
 */
bot.onText(
  commandRegexDict.about,
  cvMid((message) => {
    MENUS.about.send(message.from, { fc: true });
  })
);

/**
 * send fellows info menu
 */
bot.onText(
  commandRegexDict.fellows_info,
  cvMid((message) => {
    MENUS.fellows_info.send(message.from, { fc: true });
  })
);

/**
 * send 'Fellowdarbs' menu
 */
bot.onText(
  commandRegexDict.fellow_darbs,
  cvMid((message) => {
    MENUS.start.send(message.from, { fc: true });
  })
);

/**
 * send Fellows Settings menu
 */
bot.onText(
  commandRegexDict.f_settings,
  cvMid(async (message) => {
    MENUS.f_settings.send(message.from, { fc: "true" });
  })
);

/**
 * send Fellowdarbs list menu
 */
bot.onText(
  commandRegexDict.fellows_list,
  cvMid(async (message) => {
    MENUS.fellows_list.send(message.from, { fc: "true", fellows_page: 0 });
  })
);

/**
 * add chat to the confessions network
 */
bot.onText(
  commandRegexDict.join_network,
  aMid(
    vMid(async (message) => {
      // only (chat) admins

      const chat = await Chat.findOne({
        where: { chat_id: `${message.chat.id}` },
      });

      if (
        [
          process.env.CONFESSIONS_CHANNEL_ID,
          process.env.CONFESSIONS_CHAT_ID,
        ].includes(`${message.chat.id}`) ||
        (chat !== null && chat.static)
      ) {
        fool_blongus_absolute_utter_clampongus(message);
        return;
      }
      MENUS.chats_add.send(message.chat, {
        fc: true,
        chat_id: message.chat.id,
        message_id: message.message_id,
      });
    })
  )
);

/**
 * remove chat from the confessions network
 */
bot.onText(
  commandRegexDict.leave_network,
  aMid(
    // only (chat) admins
    vMid(async (message) => {
      if (
        [
          process.env.CONFESSIONS_CHANNEL_ID,
          process.env.CONFESSIONS_CHAT_ID,
        ].includes(`${message.chat.id}`)
      ) {
        fool_blongus_absolute_utter_clampongus(message);
        return;
      }
      MENUS.chats_add.send(message.chat, {
        fc: true,
        chat_id: message.chat.id,
        message_id: message.message_id,
        remove: true,
      });
    })
  )
);
