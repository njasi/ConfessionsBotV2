/**
 * file to deal with the general messages the bot sees, ie anything that is not a callback or a query
 * basically just messages sent by a user
 */

const bot = require("../bot");
const { isDm } = require("../helpers");
const { MENUS, swapMenu } = require("../menus/index");
const {
  User,
  Confession,
  Chat,
  FellowsMessage,
  FellowsChat,
} = require("../../../db/models");
const { Op } = require("sequelize");
const { vMid } = require("./middleware");

/**
 * seperate .on message used to check if any confessions should be sent
 */
bot.on("message", async () => {
  Confession.send();
});

/**
 * checks if user is verified and sends confession menu/verify menu
 */
bot.on(
  "message",
  vMid(async (message, meta) => {
    if (isDm(message)) {
      const user = await User.findOne({
        where: { telegram_id: message.from.id },
      });

      const fake_query = {
        text: message.text,
        from: { id: user.telegram_id },
        message: {
          text: "filler text",
          chat: { id: user.telegram_id },
          message_id: user.misc.active_menu,
        },
      };

      if (user.locked) {
        return;
      } else if (user.state == "ignore") {
        // ignore user input
        return;
      } else if (user.state == "editing_pfp") {
        if (!message.photo) {
          swapMenu(fake_query, { menu: "edit_error", error: "3" }, bot);
        } else {
          user.misc = {
            ...user.misc,
            fellows_pic: message.photo[message.photo.length - 1].file_id,
          };
          user.state = "idle";
          await user.save();
          swapMenu(
            fake_query,
            { menu: "fellows_about", fellow_id: user.id, edit: "true" },
            bot
          );
        }
        return;
      } else if (user.state == "editing_bio") {
        if (!message.text) {
          swapMenu(fake_query, { menu: "edit_error", error: "2" }, bot);
        } else if (message.text.length > 300) {
          swapMenu(fake_query, { menu: "edit_error", error: "0" }, bot);
        } else {
          // TODO: do this the proper way, rn i have to make sequelize realise that there has been a change to the json by remaking it fully...
          user.misc = { ...user.misc, fellows_bio: message.text };
          user.state = "idle";
          await user.save();
          swapMenu(
            fake_query,
            { menu: "fellows_about", fellow_id: user.id, edit: "true" },
            bot
          );
        }
        return;
      } else if (user.state == "editing_contact") {
        if (!message.text) {
          swapMenu(fake_query, { menu: "edit_error", error: "2" }, bot);
        } else if (message.text.length > 300) {
          swapMenu(fake_query, { menu: "edit_error", error: "1" }, bot);
        } else {
          user.misc = { ...user.misc, fellows_contact: message.text };
          user.state = "idle";
          await user.save();
          swapMenu(
            fake_query,
            { menu: "fellows_about", fellow_id: user.id, edit: "true" },
            bot
          );
        }
        return;
      } else if (user.state == "w_fellows") {
        const chats = await FellowsChat.findAll({
          [Op.or]: [
            {
              where: {
                target: user.id,
              },
              include: {
                model: FellowsMessage,
                where:{
                  from_init:false
                }
              }
            },
            {
              where: {
                initiator: user.id,
              },
              include: {
                model: FellowsMessage,
                where:{
                  from_init: true
                }
              }
            },
          ],
          include: {
            model: FellowsMessage,
            required: true,
            where: {
              status: "in_progress",
              // from_init: true,
            },
          },
          raw: true,
        });


        if (chats.length > 1) {
          // must properly filter these out
          console.log(chats)
          bot.sendMessage(user.telegram_id, "You are already contacting someone...\n Use /cancel if you think this is in error.")
          return
        }

        const chat = chats[0];

        const mess = await FellowsMessage.findOne({
          where: {
            status: "in_progress",
            fellowschatId: chat.id,
            from_init: chat.initiator == user.id,
          },
        });

        if (meta.type != "text") {
          confs[wait_cw_index].swapMenu(MENUS.fellows_message_error, {
            error: 1,
          });
          user.state = "ignore";
          await user.save();
          return;
        } else if (message.text.length > 3000) {
          confs[wait_cw_index].swapMenu(MENUS.fellows_message_error, {
            error: 2,
          });
          user.state = "ignore";
          await user.save();
          return;
        }

        mess.text = message.text;
        mess.message_id = message.message_id;
        user.state = "idle";
        await mess.save();
        await user.save();
        swapMenu(
          fake_query,
          {
            menu: "fellows_send_options",
            fmess: mess,
            fchat: chat,
          },
          bot
        );
        return;
      } else if (user.state == "w_feedback") {
        swapMenu(fake_query, { menu: "feedback_done" }, bot); // TODO actually make the feedback done menu
        bot.sendMessage(
          process.env.ADMIN_ID,
          `Feedback from ${user.name}:\n\n${message.text}`
        );
      }

      const confs = await user.getConfessions({ include: { model: Chat } });
      const stages = confs.map((e) => e.stage);
      // detect setting a content warning vs confessing
      const wait_cw_index = stages.indexOf("wait_cw");
      if (wait_cw_index != -1) {
        bot.deleteMessage(message.from.id, message.message_id);
        confs[wait_cw_index].stage = "invaild_cw";
        await confs[wait_cw_index].save();
        if (meta.type != "text") {
          confs[wait_cw_index].swapMenu(MENUS.cw_error);
          return;
        } else if (message.text.length > 69) {
          confs[wait_cw_index].swapMenu(MENUS.cw_error, { error: 1 });
          return;
        }
        confs[wait_cw_index].content_warning = message.text;
        confs[wait_cw_index].stage = "confirm_cw";
        await confs[wait_cw_index].save();
        confs[wait_cw_index].swapMenu(MENUS.cw_confirm);
        return;
      }

      // detect setting a reply vs confessing
      const wait_reply_index = stages.indexOf("wait_reply");
      if (wait_reply_index != -1) {
        const conf = confs[wait_reply_index];
        const nums = message.text.replace("https://t.me/c/", "").split("/");
        // message does not fit the desired format
        const matched = message.text.match(/https:\/\/t.me\/c\/.*\/.*/);
        if (
          (matched && message.text != matched[0]) ||
          nums.map((e) => !isNaN(e)).reduce((p, c) => p && c)
        ) {
          const chat_id = nums[0]; // should be chat id
          const res_chats = await Chat.findAll({
            where: {
              [Op.or]: [
                { chat_id: `-${chat_id}` },
                { chat_id: `-100${chat_id}` },
              ],
            },
          });

          // chat is not found in the db
          if (res_chats.length == 0) {
            // check that its not sent to one of the main chats
            if (
              ![
                process.env.CONFESSIONS_CHAT_ID,
                process.env.CONFESSIONS_CHANNEL_ID,
              ].includes(`-100${chat_id}`)
            ) {
              // chat not linked to the bot (or bad message)
              conf.swapMenu(MENUS.set_reply_error, { error: 1 });
            } else {
              const forwarded = await bot.forwardMessage(
                message.from.id,
                `-100${chat_id}`,
                nums[1]
              );
              conf.message_info = forwarded;
              await conf.save();
              // ask them if it is the correct message (set reply menu will deal with telling them the chat is bad)
              conf.swapMenu(MENUS.set_reply_confirm, {
                rc_id:
                  `-100${chat_id}` == process.env.CONFESSIONS_CHAT_ID ? -1 : -2,
                cc_id: conf.chatId,
                message_id: nums[1],
                forwarded,
              });
            }
          } else {
            const forwarded = await bot.forwardMessage(
              message.from.id,
              res_chats[0].chat_id,
              nums[1]
            );

            // to check if it is a confession later
            conf.message_info = forwarded;
            await conf.save();
            // ask them if it is the correct message (set reply menu will deal with telling them the chat is bad)
            conf.swapMenu(MENUS.set_reply_confirm, {
              rc_id: res_chats[0].id,
              cc_id: conf.chatId,
              message_id: nums[1],
              forwarded,
            });
          }
        } else {
          bot.deleteMessage(message.from.id, message.message_id);
          conf.swapMenu(MENUS.set_reply_error, { error: 2 });
        }
        return;
      }

      // make the confession
      let confession;
      try {
        const general = {
          type: meta.type,
          text: message.caption == null ? message.text : message.caption,
          userId: user.id,
        };
        switch (meta.type) {
          case "text": {
            if (message.text.length > 4062) {
              bot.sendMessage(
                message.from.id,
                `Sorry, your confession was ${
                  message.text.length - 4062
                } characters long.`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "Ok", callback_data: "delete=true" }],
                    ],
                  },
                  reply_to_message_id: message.message_id,
                }
              );
            } else {
              // errors may occur if not restart seq use this to get ahead of the id
              // ALTER SEQUENCE confessions_id_seq RESTART WITH 1453
              confession = await Confession.create(general);
            }
            break;
          }
          case "animation":
          case "audio":
          case "document":
          case "sticker":
          case "video":
          case "voice": {
            confession = await Confession.create({
              ...general,
              file_id: message[meta.type].file_id,
            });
            break;
          }
          case "photo": {
            confession = await Confession.create({
              ...general,
              file_id: message.photo[message.photo.length - 1].file_id,
            });
            break;
          }
          case "poll": {
            // poll is a bit odd, we wil save the message_id as the
            // file_id and copy the message and forward it later
            confession = await Confession.create({
              ...general,
              text: message.poll.question,
              file_id: message.message_id,
            });
            break;
          }
          default: {
            bot.sendMessage(
              message.from.id,
              "Confessions bot does not currently support this type of message.",
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "Ok", callback_data: "delete=true" }],
                  ],
                },
                reply_to_message_id: message.message_id,
              }
            );
          }
        }
        const res = await MENUS.start.send( message.from, {
          fc: false,
          message,
        });
        confession.menu_id = res.message_id;
        await confession.save();
        // https://t.me/c/1159774540/115908
        // https://t.me/c/1159774540/115903
      } catch (error) {
        bot.sendMessage(
          process.env.ADMIN_ID,
          `${user.name} (${message.from.id}) attempted to send a ${meta.type} through confessions bot.\nError:\n:${error.stack}`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "Ok", callback_data: "delete=true" }]],
            },
            reply_to_message_id: message.message_id,
          }
        );
        bot.sendMessage(
          message.from.id,
          "Sorry, Confessions Bot does not currently support this type of message.",
          {
            reply_markup: {
              inline_keyboard: [[{ text: "Ok", callback_data: "delete=true" }]],
            },
            reply_to_message_id: message.message_id,
          }
        );
      }
    } else {
      // must be a message in a group chat
    }
  }, (skip_on_command = true))
);
