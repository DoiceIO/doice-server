const ExpressRoute = require("../ExpressRoute.js");

const Router = require("../../mediasoup/router");
const Producer = require("../../mediasoup/producer");

module.exports = ({ io, socket }) => {
  const { verifySocketId } = require("../middleware")({ io });

  return {
    /**
     * Toggle a producer stream by id
     * @param {string} producerId Producer ID
     * @param {string} state Desired producer state (pause or resume)
     */
    pause: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          producerId: {
            type: "string",
            required: true
          },
          state: {
            type: "string",
            required: true,
            validator: type => ({
              isValid: ["pause", "resume"].includes(type),
              error: "Producer state must be pause or resume."
            })
          }
        }
      },

      function(req, res) {
        const { producerId, state } = req.body;

        const producer = producers.get(producerId);

        if (!producer) {
          return {
            ok: false,
            error: `No Producer found in Producers map by ID ${producerId}.`
          };
        }

        // producer.pause() or producer.resume()
        producer[state]();

        return { ok: true };
      }
    }),

    /**
     * Close a producer by id
     * @param {string} producerId Producer ID
     */
    close: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          producerId: {
            type: "string",
            required: true
          }
        }
      },

      middleware: [verifySocketId],

      async function(req, res) {
        const { producerId } = req.body;

        // Remove this stream from streams
        const { success, error } = Router.removeStreamByProducerId({
          roomId: req.socket.roomId,
          producerId
        });

        if (!success) {
          return {
            ok: false,
            error
          };
        }

        // Delete producer
        const res2 = await Producer.delete(producerId);

        if (!res2.success) {
          return {
            ok: false,
            error: res2.error
          };
        }

        // Remove stream from streams array
        const types = Object.keys(req.socket.$streams);
        for (let i = 0; i < types.length; i++) {
          if (req.socket.$streams[types[i]] === producerId) {
            req.socket.$streams[types[i]] = "";
            break;
          }
        }

        // Remove producerId from users streams
        const room = rooms.get(req.socket.roomId);
        const user = room.users[req.socket.id];
        if (user) {
          for (const key in user.producerIds) {
            if (user.producerIds[key] === producerId) {
              user.producerIds[key] = "";
              break;
            }
          }
        }

        // Tell any consumers that producer has closed
        io.in(req.socket.roomId).emit(`producer/close/${producerId}`);
        io.to(req.socket.roomId).emit(`chat/users`, room.users);

        return { ok: true };
      }
    })
  };
};
