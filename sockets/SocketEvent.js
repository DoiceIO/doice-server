module.exports = class SocketEvent {
  /**
   * A socket event
   * @param {object} val Values
   * @param {object} val.model Model of function paramaters
   * @param {function} val.function The function run
   */
  constructor(val) {
    this.model = val.model;
    this.function = val.function;
  }
};
