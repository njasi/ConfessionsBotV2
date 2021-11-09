const Sequelize = require("sequelize");
const db = require("../db");
const bot = require("../../api/bot/bot");
const FellowsChat = require("./fellows_chat");
const User = require("./user");
const fellows_received = require("../../api/bot/menus/fellows_received");

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

  const { name } = await FellowsMessage.get_sender_name(this, fchat);
  let reply_id = null;
  if (this.replyId) {
    const reply_to = await FellowsMessage.findByPk(this.replyId);
    reply_id = reply_to.message_id;
  }
  await fellows_received.send(
    { id: this.from_init ? targ.telegram_id : init.telegram_id },
    { fchat: fchat, fmess: this, ftext: this.text, name, reply_id }
  );
  this.status = "received";
  await this.save();
};

const grab_rel_models = async (_fmess, _fchat, fellows_message_id) => {
  let fmess = _fmess;
  let fchat = _fchat;
  if (!fmess) {
    fmess = await FellowsMessage.findByPk(fellows_message_id);
  }
  if (!fchat) {
    fchat = await FellowsChat.findByPk(fmess.fellowschatId);
  }
  return { fmess, fchat };
};

// stuff to get names for the text
FellowsMessage.get_target_name = async (
  _fmess,
  _fchat,
  fellows_message_id = null
) => {
  const { fmess, fchat } = await grab_rel_models(
    _fmess,
    _fchat,
    fellows_message_id
  );
  let name = "anon"; // default name just in case
  if (fmess.from_init) {
    if (fchat.obscure_target) {
      name = fchat.name_target;
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
  _fmess,
  _fchat,
  fellows_message_id = null
) => {
  const { fmess, fchat } = await grab_rel_models(
    _fmess,
    _fchat,
    fellows_message_id
  );
  let name = "anon";
  if (fmess.from_init) {
    if (fchat.obscure_initiator) {
      name = fchat.name_initiator;
    } else {
      const user = await User.findByPk(fchat.initiator);
      name = user.name;
    }
  } else {
    if (fchat.obscure_target) {
      name = fchat.name_target;
    } else {
      const user = await User.findByPk(fchat.target);
      name = user.name;
    }
  }
  return { name, fmess, fchat };
};

module.exports = FellowsMessage;
