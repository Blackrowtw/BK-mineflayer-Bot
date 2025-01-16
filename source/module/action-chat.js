module.exports = function (bot) {
  bot.on("chat", (username, jsonMsg) => {
    if (username === bot.username) {
      return;
    } else {
      bot.log(username + " say: " + jsonMsg);
      bot.chat("hi");
    }
  });
  bot.on("whisper", (username, jsonMsg) => {
    if (username === bot.username) {
      return;
    } else {
      bot.log(username + " tell: " + jsonMsg);
      bot.whisper(username, "WTF");
    }
  });
  // bot.on("whisper", (username, message) => {
  //   // 排除機器人自己說的
  //   if (username === bot.username) {
  //     return;
  //   }
  //   if (username === bot.botOnwer) {
  //     command = message.split(" ");
  //   } else {
  //     command = none;
  //   }

  //   if (command.count() == 1) {
  //     switch (command[0]) {
  //       case "A":
  //         bot.chat("AAA");
  //         bot.log("AAA");
  //         break;

  //       default:
  //         bot.log("WTF?");
  //         break;
  //     }
  //   } else {
  //     bot.log("WTF????");
  //     return;
  //   }
  // });
};
