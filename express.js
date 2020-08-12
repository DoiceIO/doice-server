const express = require("express");

/**
 * Respond to request with data
 * @param {object} data JSON to respond with
 * @param {number} status HTTP status code
 */
express.response.success = function (data, status = 200) {
  this.status(status).json({ data });
};

/**
 * Respond to request with an error
 * @param {object} data JSON to respond with
 * @param {string} error Error text
 * @param {number} status HTTP status code
 */
express.response.error = function (data, error, status) {
  console.error(`${status} Error: ${error}`);
  this.status(status).json({ data, error });
};

module.exports = express;
