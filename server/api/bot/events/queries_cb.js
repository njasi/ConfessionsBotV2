const bot = require("../bot");
const { params_from_string } = require("../helpers");
const { MENUS, detectAndSwapMenu, swapMenu } = require("../menus/index");
const {
  User,
  Confession,
  Chat,
  FellowsMessage,
  FellowsChat,
} = require("../../../db/models");
const { Op } = require("sequelize");

/**
 * all the annoying callbacks
 */
bot.on("callback_query", async (query) => {
  const params = params_from_string(query.data);
  const chat_id = query.message.chat.id;
  const message_id = query.message.message_id;

  // admin only cb buttons
  if (params.rad == "true" && query.from.id == process.env.ADMIN_ID) {
    // admin force approval
    if (params.approve_id !== null) {
      const user = await User.findOne({
        where: { poll_id: query.message.poll.id },
      });
      user.verification_status = 4;
      user.poll_id = null;
      await user.save();
      bot.deleteMessage(chat_id, message_id);
      MENUS.verify_accept.send({ id: user.telegram_id });
    }
    return;
  }

  // commands that you need to be a chat admin for
  if (params.c_ad) {
    // c_ad for chat admin
    const chat_admins = await bot.getChatAdministrators(chat_id);
    let chat_info = await bot.getChat(params.chat_add);
    if (
      [
        parseInt(process.env.ADMIN_ID),
        ...chat_admins.map((a) => a.id),
      ].includes(query.from.id)
    ) {
      // adding a chat to the supported list
      if (params.chat_add) {
        let chat = await Chat.findOne({
          where: {
            chat_id: params.chat_add,
          },
        });
        if (chat) {
          bot.answerCallbackQuery(query.id, {
            text: "This chat is already in the network...",
          });
          bot.deleteMessage(chat.chat_id, message_id);
          return;
        }
        try {
          // test if the message is old and the group has since changed to a super group
          let res = await bot.sendMessage(params.chat_add, "/test", {
            disable_notification: true,
          });
          await bot.deleteMessage(params.chat_add, res.message_id);
        } catch (err) {
          return; // chat is old (probably)
        }
        await Chat.create({
          name: chat_info.title,
          chat_id: chat_info.id,
        });
        params.chat_num = await Chat.count();
      }
      if (params.chat_remove) {
        const chat = await Chat.findOne({
          where: { chat_id: params.chat_remove },
        });
        if (!chat.static) {
          await chat.destroy();
        }
      }
    } else {
      bot.answerCallbackQuery(query.id, {
        text: "You're not an admin. \nPerish.",
        show_alert: true,
        url: "t.me/test123420bot?start=rick",
      });
      return;
    }
  }

  // user tapped view content button on a cw confession, send them the message
  if (params.cw_confession_id) {
    const cw_id = parseInt(params.cw_confession_id);

    const from_user = await User.findOne({
      where: { telegram_id: query.from.id },
    });
    if (from_user == null || from_user.verification_status < 1) {
      bot.answerCallbackQuery(query.id, {
        text: "Please verify with the bot first.",
        show_alert: true,
      });
      return;
    }
    let conf = await Confession.findByPk(cw_id);
    if (conf == null) {
      bot.answerCallbackQuery(query.id, {
        text: "It seems that this confession was removed... \n\n(or is realy old)",
        show_alert: true,
      });
      return;
    }
    await conf.send_helper(query.from.id, (cw_forward = true));
    bot.answerCallbackQuery(query.id, {
      text: `The confession has been sent to your dms with the bot.`,
      show_alert: true,
    });
    return;
  }

  // removes confession of id params['remove_confession'], before the menu swap as some swaps remove confessions
  if (params.remove_confession) {
    const conf_id = parseInt(params.remove_confession);
    const conf = await Confession.findOne({
      where: { id: conf_id },
      include: { model: User, where: { telegram_id: query.from.id } },
    });
    if (conf == null) {
      bot.answerCallbackQuery(query.id, {
        text: `There was an error removing a Confession. The mod(s) have been notified`,
        show_alert: true,
      });
      bot.sendMessage(
        process.env.ADMIN_ID,
        `User ${
          query.from.id
        } failed to remove confession ${conf_id} (no relation)\nAdditional User info:\n${JSON.stringify(
          query.from,
          null,
          2
        )}`
      );
      return;
    } else {
      try {
        try {
          bot.deleteMessage(query.from.id, conf.menu_id);
        } catch (error) {
          // sometimes the message has already been deleted
        }
        await conf.destroy();
      } catch (error) {
        bot.answerCallbackQuery(query.id, {
          text: `There was an error removing a Confession. The mod(s) have been notified`,
          show_alert: true,
        });
        bot.sendMessage(
          process.env.ADMIN_ID,
          `User ${query.from.id} failed to remove confession ${conf.id} (conf.destroy() error)\n\n${error.stack}`
        );
      }
    }
  }

  // deletes messages from the bot when a user taps the button
  if (params.delete) {
    bot.deleteMessage(
      chat_id,
      params.delete == "true" ? message_id : params.delete
    );
  }

  /**
   * register or retire as a fellowdarb
   */
  if (params.register) {
    const user = await User.findOne({ where: { telegram_id: query.from.id } });
    switch (params.register) {
      case "true":
        user.fellow_darb = true;
        break;
      case "false":
        user.fellow_darb = false;
        break;
    }
    await user.save();
  }

  // update user status for reciving input
  if (params.edit_item) {
    const user = await User.findOne({ where: { telegram_id: query.from.id } });
    user.state = `editing_${params.edit_item}`;
    user.save();
  }
  if (params.user_state) {
    if (params.user_state == "w_fellows") {
      // TODO somthing here ig
    }
    const user = await User.findOne({ where: { telegram_id: query.from.id } });
    user.state = params.user_state;
    await user.save();
  }

  // remove fellows message, and chat if its empty
  if (params.remove_m) {
    const mess = await FellowsMessage.findByPk(parseInt(params.remove_m));
    const chat = await FellowsChat.findByPk(mess.fellowschatId);
    await mess.destroy();
    const amt = await FellowsMessage.count({
      where: { fellowschatId: chat.id },
    });
    if (amt == 0) {
      await chat.destroy();
    }
  }

  // send the message to the person
  if (params.menu == "fellows_sent" && !!params.fmid) {
    const fmess = await FellowsMessage.findByPk(params.fmid);
    await fmess.send();
  }

  // query up the confessioon info for all of the things below
  const shared_confession = await Confession.findOne({
    where: {
      in_progress: true,
    },
    include: {
      model: User,
      where: {
        telegram_id: query.from.id,
      },
    },
  });

  if (params.call == "true") {
    const user = await User.findOne({ where: { telegram_id: query.from.id } });
    user.state = "idle";
    await user.save();
    if (shared_confession) await shared_confession.destroy();
    const messs = await FellowsMessage.findAll({
      [Op.or]: [
        {
          where: {
            status: "in_progress",
            from_init: true,
            initiator: user.id,
          },
        },
        {
          where: { status: "in_progress", from_init: false, target: user.id },
        },
      ],
    });
    [...messs].forEach((m) => m.destroy());
    await bot.answerCallbackQuery(query.id, {
      text: "Your current actions were canceled!",
      show_alert: true,
    });
    await bot.deleteMessage(user.telegram_id, message_id);
  } else if (params.call == "false") {
    bot.answerCallbackQuery(query.id, {
      text: "Ok your actions were not canceled.",
      show_alert: true,
    });
  }

  // contacting someone through fellow darbs / conf
  if (params.contact) {
    // TODO: implement this fully
    // check that the user is even verified
    const from_user = await User.findOne({
      where: { telegram_id: query.from.id },
    });

    if (from_user == null || from_user.verification_status < 1) {
      bot.answerCallbackQuery(query.id, {
        text: "Please verify with the bot first.",
        show_alert: true,
      });
      return;
    }

    // person is confessing, dont allow contact
    if (shared_confession != null) {
      bot.answerCallbackQuery(query.id, {
        text: "Please finish your current Confession before contacting someone.",
        show_alert: true,
      });
      return;
    }

    // person is already sending a message
    const messages = await FellowsChat.findAll({
      include: {
        model: FellowsMessage,
        where: { status: "in_progress", from_init: true },
      },
      where: { initiator: from_user.id },
    });
    if (messages.length > 0) {
      bot.answerCallbackQuery(query.id, {
        text: "It seems you are already contacing someone, please finish doing that first.",
        show_alert: true,
      });
      return;
    }

    if (params.rfellow) {
      // TODO: select random person somehow
    }

    if(from_user.id == parseInt(params.contact)){
      bot.answerCallbackQuery(query.id, {
        text: "You cannot contact yourself...",
        show_alert: true,
      })
      return
    }

    // time for the actual message / chat creation
    const fchat = await FellowsChat.create({
      target: parseInt(params.contact),
      initiator: from_user.id,
      from_init: true,
      target_cnum: params.conf != null ? parseInt(params.conf) : null,
    });

    const mess = await FellowsMessage.create({
      from_init: true,
      fellowschatId: fchat.id,
    });

    // someone is contacting a confessor
    if (params.conf) {
      const from_user = await User.findOne({
        where: { telegram_id: query.from.id },
      });
      fchat.name_target = `Confessor ${params.conf}`;
      await fchat.save();
      const say_message = await MENUS.fellows_say.send(query.from, {
        ...params,
        fmess: mess,
        fchat,
      });
      from_user.misc = {
        ...from_user.misc,
        active_menu: say_message.message_id,
      };
      await from_user.save();
    } else {
      fchat.obscure_target = false;
      await fchat.save();
      const fake_params = {
        menu: "fellows_say",
        ...params,
        fmess: mess,
        fchat,
      };
      await swapMenu({ menu: "fellows_say", ...query }, fake_params, bot);
    }
    return;
  }

  if (params.reveal) {
    const rev_message = await FellowsMessage.findByPk(params.fmid);
    const rev_chat = await FellowsChat.findByPk(rev_message.fellowschatId);
    let revealed_user, other_user, rev_name;
    if (rev_message.from_init) {
      revealed_user = await User.findByPk(rev_chat.initiator);
      other_user = await User.findByPk(rev_chat.target);
      rev_name = rev_chat.name_initiator;
      rev_chat.obscure_initiator = false;
    } else {
      revealed_user = await User.findByPk(rev_chat.target);
      other_user = await User.findByPk(rev_chat.initiator);
      rev_name = rev_chat.name_target;
      rev_chat.obscure_target = false;
    }
    await rev_chat.save();
    bot.sendMessage(
      other_user.telegram_id,
      `${rev_name.trim()} has decided to tell you that they are ${revealed_user.name}.`
    );
    bot.answerCallbackQuery(query.id, {
      text: "Your name has now been revealed...",
      show_alert: true,
    });
  }

  // someone has received a fellows message
  if (params.frec) {
    const from_user = await User.findOne({
      where: { telegram_id: query.from.id },
    });
    console.log(params)
    const received_message = await FellowsMessage.findByPk(params.fmid);
    let settings = {
      // messy but it works lol
      from_init: !received_message.from_init,
      fellowschatId: params.fcid,
      replyId: params.fmid,
    };
    if (params.frec == "2") {
      settings = {
        ...settings,
        from_init: received_message.from_init,
        replyId: received_message.replyId,
      };
    }
    // create message to respond
    const fmess = await FellowsMessage.create(settings);

    const message_out = await MENUS.fellows_say.send(query.from, {
      ...params,
      fmess,
      reply_to: message_id,
    });
    from_user.misc = { ...from_user.misc, active_menu: message_out.message_id };

    from_user.state = "w_fellows";
    await from_user.save();
    return;
  }

  // clear the content warning of a confession
  if ("clear_cw" in params) {
    shared_confession.content_warning = null;
    const conf_id = parseInt(params.clear_cw);
    const conf = await Confession.findByPk(conf_id);
    conf.content_warning = null;
    await conf.save();
  }

  // change allow response setting of a confession
  if ("allow_res" in params) {
    // if (params.allow_res == "true") {
    //   bot.answerCallbackQuery(query.id, {
    //     text: "Note that ths feature will currently not do anything.\n\nHowever it will allow responses to your confession once I finish it.",
    //     show_alert: true,
    //   });
    // }
    shared_confession.allow_responses = params.allow_res == "true";
    await shared_confession.save();
  }

  // set the stage of a confession
  if (params.set_stage) {
    if (params.set_stage == "wait_cw" && shared_confession.type == "poll") {
      bot.answerCallbackQuery(query.id, {
        text: "You can't put a content warning on a poll",
        show_alert: true,
      });
      return;
    }
    shared_confession.stage = params.set_stage;
    await shared_confession.save();
  }

  // sets that aux chat to the id provided in target_id
  if (params.target_id) {
    if (params.target_id == "-1") {
      await shared_confession.setChat(null);
    } else {
      const chat = await Chat.findByPk(parseInt(params.target_id));

      // chat has been removed while in the menu or some error happened
      if (chat == null) {
        bot.answerCallbackQuery(query.id, {
          text: "The selected chat could not be found, please try again.",
          show_alert: true,
        });
        swapMenu(query, { menu: "settings" }, bot);
        return;
      }

      const chat_member = await bot.getChatMember(chat.chat_id, query.from.id);
      if (!chat_member || chat_member.status == "left") {
        bot.answerCallbackQuery(query.id, {
          text: "You cannot send confessions to this chat as you are not in it.",
          show_alert: true,
        });
        return;
      }
      await shared_confession.setChat(chat);
    }
  }

  // setting the message the confession wil reply to
  if (params.c_id && params.m_id) {
    const num = parseInt(params.c_id);
    let chat_id = null;
    switch (num) {
      case -1:
        chat_id = process.env.CONFESSIONS_CHAT_ID;
        break;
      case -2:
        chat_id = process.env.CONFESSIONS_CHANNEL_ID;
        break;
      default: {
        const chat = await Chat.findByPk(num);
        chat_id = chat.chat_id;
      }
    }
    shared_confession.stage = "idle";
    shared_confession.reply_message = [[chat_id, params.m_id]];
    // TODO detect reply to a confession

    await shared_confession.save();
  }

  // clear reply info
  if (params.clear_ri) {
    shared_confession.reply_message = null;
    await shared_confession.save();
  }

  // swaps to a new menu if the menu key is in params
  detectAndSwapMenu(query, params, bot);

  // select the delay time at which the confession will be sent
  if (params.send_time) {
    let send_time = Date.now();
    const rnd = Math.random();
    switch (params.send_time) {
      case "0":
        send_time -= 420 * 69;
        break;
      case "1":
        send_time += 1000 * 5 * rnd + 1000 * 60 * 10;
        break;
      case "2":
        send_time += 1000 * 15 * rnd + 1000 * 60 * 30;
        break;
      case "3":
        send_time += 1000 * 60 * rnd + 1000 * 60 * 60;
        break;
    }
    send_time = new Date(send_time);
    // const user = await User.findOne({ where: { telegram_id: query.from.id } });
    // const confession = await Confession.findOne({
    //   where: { in_progress: true, userId: user.id },
    // });

    if (shared_confession == null) {
      // for some reason the confession does not exist
      // TODO tell the user something went wrong
      return;
    }
    shared_confession.send_by = send_time;
    shared_confession.in_progress = false;
    shared_confession.stage = null;
    shared_confession.menu_id = null;
    await shared_confession.save();
    Confession.send();
  }
});
