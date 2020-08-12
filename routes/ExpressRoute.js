module.exports = class ExpressRoute {
  /**
   * A socket event
   * @param {object} val Values
   * @param {string} val.type Type of request. GET, POST, etc...
   * @param {object} val.model Model of function paramaters
   * @param {array} val.middleware Middleware functions to run
   * @param {function} val.function The function run
   */
  constructor(val) {
    this.type = val.type;
    this.model = val.model;
    this.middleware = val.middleware;
    this.function = val.function;
  }
};
