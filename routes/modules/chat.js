const ExpressRoute = require("../ExpressRoute.js");

const { getLocalStamp } = require("../../methods.js");

module.exports = ({ io }) => {
  const { verifySocketId, verifyRoomId } = require("../middleware.js")({ io });

  return {
    /**
     * Join a room by roomId, get or create the Router
     * @param {string} roomId
     */
    message: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          text: {
            type: "string",
            required: true,
            maxLength: 256
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId],

      function(req, res) {
        const { text } = req.body;

        io.in(req.socket.roomId).emit("chat/message", {
          type: "message",
          text,
          username: req.socket.username,
          socketId: req.socket.id
        });

        return { ok: true };
      }
    }),

    username: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          username: {
            type: "string",
            required: true,
            maxLength: 16
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId],

      function(req, res) {
        const { username } = req.body;

        const oldUsername = req.socket.username;
        req.socket.username = username;
        req.room.users[req.socket.id].username = username;

        io.in(req.socket.roomId).emit("chat/message", {
          type: "action",
          text: `${oldUsername} changed their name to ${username}`
        });

        // Update users array for all users
        io.in(req.socket.roomId).emit("chat/users", req.room.users);

        return { ok: true };
      }
    })
  };
};
