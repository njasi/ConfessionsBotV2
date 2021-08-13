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
  console.log("\nMETA:\n",meta)
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
