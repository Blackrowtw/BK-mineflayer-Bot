// errorHandler.js
let uncaughtExceptionCount = 0; // 錯誤計數器

function errorHandler() {
  process.on("uncaughtException", (err) => {
    console.log("----------\n[Terminal] >> Something is wrong !!!\n----------");
    console.error(`[process.uncaughtException] ${err.stack}`);

    uncaughtExceptionCount++;
    if (uncaughtExceptionCount > 3) {
      console.error("Too many uncaught exceptions. Exiting...");
      process.exit(1);
    }
  });
}

module.exports = {
  errorHandler,
};
