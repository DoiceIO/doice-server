const ExpressRoute = require("../ExpressRoute.js");
const consola = require("consola");

const Transport = require("../../mediasoup/transport.js");
const Consumer = require("../../mediasoup/consumer.js");

module.exports = ({ io }) => {
  return {
    /**
     * Toggle a consumer stream by id
     * @param {string} consumerId Consumer ID
     * @param {string} state Desired consumer state (pause or resume)
     */
    pause: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          consumerId: {
            type: "string",
            required: true
          },
          state: {
            type: "string",
            required: true,
            validator: type => ({
              isValid: ["pause", "resume"].includes(type),
              error: "Consumer state must be pause or resume"
            })
          }
        }
      },

      function(req, res) {
        const { consumerId, state } = req.body;

        const consumer = consumers.get(consumerId);

        if (!consumer) {
          return {
            ok: false,
            error: `No Consumer found in Consumers map by ID ${consumerId}`
          };
        }

        // consumer.pause() or consumer.resume()
        consumer[state]();

        return { ok: true };
      }
    }),

    close: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          consumerId: {
            type: "string",
            required: true
          }
        }
      },

      async function(req, res) {
        const { consumerId } = req.body;

        await Consumer.delete(consumerId);

        return { ok: true };
      }
    })
  };
};
