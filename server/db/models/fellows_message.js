const Sequelize = require("sequelize");
const db = require("../db");
const bot = require("../../api/bot/bot");
const FellowsChat = require("./fellows_chat");
const User = require("./user");
const fellows_recieved = require("../../api/bot/menus/fellows_recieved");

const FellowsMessage = db.define("fellowsmessage", {
  text: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  from_init: {
    type: Sequelize.BOOLEAN,
    default: true,
    allowNull: false,
  },
  status: {
    type: Sequelize.ENUM("in_progress", "sent", "received"),
    defaultValue: "in_progress",
    allowNull: false,
  },
  menu_id: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  // telegram message_id in the from users dms
  message_id: {
    type: Sequelize.STRING,
    allowNull: true,
  },
});

FellowsMessage.prototype.send = async function () {
  const fchat = await FellowsChat.findByPk(this.fellowschatId);
  const init = await User.findByPk(fchat.initiator);
  const targ = await User.findByPk(fchat.target);

  // console.log(init, targ);

  const { name } = await FellowsMessage.get_sender_name(this, fchat);

  await fellows_recieved.send(
    bot,
    { id: this.from_init ? targ.telegram_id : init.telegram_id },
    { fchat: fchat, fmess: this, ftext: this.text, name }
  );
  this.status = "recieved";
  await this.save();
};

// stuff to get names for the text
FellowsMessage.get_target_name = async (
  _fmess,
  _fchat,
  fellows_message_id = null
) => {
  let fmess = _fmess;
  let fchat = _fchat;
  if (!fmess) {
    console.log(fellows_message_id, typeof fellows_message_id);
    console.log("\nFinding Fellows Message\n", fmess, "\n");
    fmess = await FellowsMessage.findByPk(fellows_message_id);
  }
  if (!fchat) {
    console.log("\nFinding Fellows Chat\n", fmess, "\n");
    fchat = await FellowsChat.findByPk(fmess.fellowschatId);
  }
  let name = "anon"; // default name just in case
  if (fmess.from_init) {
    if (fchat.obscure_target) {
      if (fchat.target_cnum) {
        // obscured confessor
        name = `Confessor #${fchat.target_cnum}`;
      } else {
        name = fchat.target_name;
      }
    } else {
      const person = await User.findByPk(fchat.target);
      name = person.name;
    }
  } else {
    if (fchat.obscure_initiator) {
      name = fchat.name_initiator;
    } else {
      const person = await User.findByPk(fchat.initiator);
      name = person.name;
    }
  }
  return { name, fmess, fchat };
};

FellowsMessage.get_sender_name = async (
  fmess,
  fchat,
  fellows_message_id = null
) => {
  if (!fmess) {
    args.fmess = await FellowsMessage.findByPk(fellows_message_id);
  }
  if (!fchat) {
    args.fchat = await FellowsMessage.findByPk(fmess.fellowschatId);
  }
  let name = "unknown";
  if (fmess.from_init) {
    if (fchat.obscure_initiator) {
      name = fchat.name_initiator;
    } else {
      const person = await User.findByPk(fchat.initiator);
      name = person.name;
    }
  } else {
    if (fchat.obscure_target) {
      const person = await User.findByPk(fchat.target);
      name = person.name;
    } else {
      if (fchat.target_cnum) {
        name = `Confessor #${fchat.target_cnum}`;
      } else {
        name = fchat.name_target;
      }
    }
  }
  return { name, fmess, fchat };
};

module.exports = FellowsMessage;
