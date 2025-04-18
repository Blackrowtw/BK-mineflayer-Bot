async function __SAMPLE__(bot, options) {
  let _number_ = null;
  // 嘗試將 options 轉換為 _number_
  if (options) {
    try {
      // 將 options 轉換為整數，並指定基數為 10（十進位制）
      _number_ = parseInt(options, 10);
      console.log(`options 轉換成功 _number_ = ${_number_}`); //debug 用
    } catch (error) {
      _number_ = null;
      console.log(`options 轉換失敗`); //debug 用
    }
  }
  //
  if (options == null) {
    try {
    } catch (error) {}
  }
  //
  else if (_number_ || _number_ === 0) {
    try {
    } catch (error) {}
  }
  //
  else if (options === "all") {
    try {
      for (let i = 1; i < 100; i++) {}
    } catch (error) {}
  }
}
module.exports = { __SAMPLE__ };
