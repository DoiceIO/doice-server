const ExpressRoute = require("../ExpressRoute.js");

const Router = require("../../mediasoup/router");
const Producer = require("../../mediasoup/producer");

module.exports = ({ io, socket }) => {
  const { verifySocketId, verifyRoomId } = require("../middleware")({ io });

  return {
    /**
     * Mute or unmute mic
     * @param {string} producerId Producer ID
     */
    mute: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          producerId: {
            type: "string",
            required: true
          },
          mute: {
            type: "boolean",
            required: true
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId],

      function(req, res) {
        const { producerId, mute } = req.body;

        const producer = producers.get(producerId);

        if (!producer) {
          return {
            ok: false,
            error: `No Producer found in Producers map by ID ${producerId}.`
          };
        }

        const find = s => s.producerId === producerId;
        const stream = req.router.$streams.mic.find(find);

        if (!stream) {
          return {
            ok: false,
            error: `No stream found in mic streams array by Producer ID ${producerId}`
          };
        }

        if (mute) {
          producer.pause();
          stream.isPaused = true;
        } else {
          producer.resume();
          stream.isPaused = false;
        }

        // Tell all clients mic stream is muted
        io.to(req.socket.roomId).emit(`mic/mute/${producerId}`, mute);

        return { ok: true };
      }
    })
  };
};
