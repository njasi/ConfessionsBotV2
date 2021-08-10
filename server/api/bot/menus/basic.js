const { ik, butt } = require("../helpers");
const { User, Confession } = require("../../../db/models");
const confession_responses = require("../config/confession_responses.json");
const { Menu } = require("./menu_class");

const start = new Menu(async (from, args) => {
  const confs = await Confession.findAll({
    where: { in_progress: true },
    include: {
      model: User,
      where: {
        telegram_id: from.id,
      },
    },
    order: [["updatedAt", "DESC"]],
  });
  let active = true;
  if (confs[0] == null) {
    active = false;
  }

  let text = `Welcome ${
    from.first_name
  }! Please use the buttons below to navigate the menus${
    args.fc || !active
      ? ". \n\nIf you want to send a confession just message me normally"
      : " and configure your confession"
  }.`;
  if (confs.length == 2) {
    text =
      "It seems you already have an active confession. Would you like to discard the older confession and continue with this one?";
    const options = {
      ...ik([
        [
          butt("Continue", `menu=start&remove_confession=${confs[1].id}`),
          butt("Cancel This Confession", `remove_confession=${confs[0].id}`),
        ],
      ]),
      reply_to_message_id: args.message.message_id,
    };
    return { text, options };
  } else if (confs.length > 2) {
    text = `You already have ${
      confs.length - 1
    } other active confessions, please deal with them first.`;
    await confs[0].destroy();
    return {
      text,
      options: {
        ...ik([[butt("Ok", "delete=true")]]),
        reply_to_message_id: args.message.message_id,
      },
    };
  }
  const options = {
    ...ik([
      ...(args.fc || !active
        ? [
            [
              ...(args.user.fellow_darb
                ? [butt("Fellowdarbs List", "menu=fellows_list&fellows_page=0")]
                : []),
              butt("Fellowdarbs Settings", "menu=f_settings&fm=true"),
            ],
          ]
        : [
            [
              butt("Send Confession", "menu=send"),
              butt("Settings", "menu=settings"),
            ],
          ]),
      [
        butt("Help", "menu=help"),
        butt(
          "Cancel",
          args.fc || !active
            ? `delete=true`
            : `remove_confession=${confs[0].id}`
        ),
      ],
    ]),
    ...(args.fc || args.from_swap || !active
      ? {}
      : { reply_to_message_id: args.message.message_id }),
  };

  return { text, options };
}, "start");

const send = new Menu(async (from, args) => {
  const text = "How long from now would you like your message to be sent?";
  const options = {
    ...ik([
      [butt("Instant", "menu=ending_remark&send_time=0")],
      [
        butt("10 - 15 min", "menu=ending_remark&send_time=1"),
        butt("30 - 45 min", "menu=ending_remark&send_time=2"),
        butt("1 - 2 hrs", "menu=ending_remark&send_time=3"),
      ],
      [butt("Back", "menu=start"), butt("Settings", "menu=settings")],
    ]),
  };
  return { text, options };
}, "send");

const ending_remark = new Menu(async (from, args) => {
  let choices = ["oof"];
  if (args.horny) {
    choices = confession_responses.horny;
  } else {
    choices = confession_responses.normal;
  }
  const choice = choices[Math.floor(Math.random() * choices.length)];
  let formatted_btns = [];

  const btns =
    choice[1] != null
      ? choice[1].map((txt) => butt(txt, "delete=true"))
      : [butt("Ok", "delete=true")];
  for (let i = 0, j = btns.length / 3; i < btns.length; i += 3) {
    formatted_btns.push(btns.slice(i, i + 3));
  }
  const options = { ...ik(formatted_btns) };
  return { text: choice[0], options };
});

const cancel = new Menu(async (from, args) => {
  const text = "Cancel everything you are currently doing?";
  const options = {
    ...ik([
      [
        butt("Yes", "delete=true&call=true"),
        butt("No", "delete=true&call=false"),
      ],
    ]),
  };
  return { text, options };
});

module.exports = {
  start, // the start menu
  send, // send confession / time delay options
  cancel, // cancel everything going on
  ending_remark, // menu that you see after confessing, random remark
};
