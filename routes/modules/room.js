const ExpressRoute = require("../ExpressRoute.js");
const consola = require("consola");
const crypto = require("crypto");

const Room = require("../../classes/Room");
const Router = require("../../mediasoup/router.js");

const { getLocalStamp } = require("../../methods.js");

module.exports = ({ io }) => {
  const { verifySocketId } = require("../middleware.js")({ io });

  return {
    /**
     * Join a room by roomId, get or create the Router
     * @param {string} roomId
     */
    join: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          roomId: {
            type: "string",
            required: true
          },
          username: {
            type: "string",
            required: true
          }
        }
      },

      middleware: [verifySocketId],

      async function(req, res) {
        const { roomId, username } = req.body;

        // Get the roomId, used as an id in rooms and join socket room
        req.socket.roomId = roomId;
        req.socket.username = username;
        req.socket.key = crypto.randomBytes(16).toString("base64");

        if (io.getSocketCount(roomId) >= SETTINGS.rooms.default.maxUsers) {
          return {
            ok: false,
            error: `Max users of ${SETTINGS.rooms.default.maxUsers} in room ${roomId}`,
            status: 400
          };
        }

        // Create or join a room by the id
        const router = await Router.getOrCreate(roomId);

        if (!router) {
          return {
            ok: false,
            error: "Unknown error, no router was found or created."
          };
        }

        // TODO functionize joining room to condense logic
        let room = rooms.get(roomId);
        if (!room) {
          room = new Room();
          rooms.set(roomId, room);
        }

        // Join the Socket.IO room
        req.socket.join(roomId);
        room.users[req.socket.id] = {
          username,
          producerIds: {
            video: "",
            webcam: "",
            mic: "",
            audio: ""
          }
        };

        // Get all streams for connection later (deep copy)
        const streams = JSON.parse(JSON.stringify(router.$streams));

        // Get the RTP capabilities of the router
        const routerRtpCapabilities = router.rtpCapabilities;

        // Loop through all video players to calculate correct time
        /**
         * I wish I could do this calculation on the client side to also account for the time it takes for
         * the request to reach the client, but timezones make this a fucking hellhole. So i'm going with KISS
         */
        streams.external.forEach((stream, i) => {
          const { stamp, value } = stream.time;
          if (stamp > -1) {
            stream.time = value + getLocalStamp() - stamp;
          } else {
            stream.time = value;
          }

          // Set stream to isBuffering
          stream.isBuffering = true;
        });

        // Tell all clients that user has joined
        io.in(roomId).emit("chat/message", {
          type: "action",
          text: `${username} joined the room`
        });

        // Update users array for all users
        io.in(roomId).emit("chat/users", room.users);

        // Respond to client with router capabilites and streams array
        return {
          ok: true,
          data: {
            routerRtpCapabilities,
            streams,
            room: {
              ...room,
              SETTINGS: {
                ...SETTINGS.rooms.default,
                secret: undefined
              }
            },
            key: req.socket.key
          }
        };
      }
    })
  };
};
