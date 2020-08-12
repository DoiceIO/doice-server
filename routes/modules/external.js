const ExpressRoute = require("../ExpressRoute.js");

const { getLocalStamp, createVideoFromUrl } = require("../../methods.js");

const uniqid = require("uniqid");

module.exports = ({ io, socket }) => {
  const { verifySocketId, verifyRoomId } = require("../middleware.js")({
    io,
    socket
  });

  return {
    create: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          videoUrl: {
            type: "string",
            required: true
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId],

      /**
       * Add a new external stream
       * @param {string} videoUrl Video URL
       */
      async function(req, res) {
        const { videoUrl } = req.body;

        // Check if allowed to post more streams
        if (req.router.$streams.external.length >= 1) {
          return {
            ok: false,
            error: "You have reached the max external streams of 1"
          };
        }

        // Create the new stream
        const stream = {
          id: uniqid(),
          type: "video", // Video stream
          queue: {}, // Video queue
          state: 2, // Video state 1 = play, 2 = pause
          startedAt: getLocalStamp(), // Timestamp of stream start
          time: {
            // Video sync time data
            value: 0,
            stamp: -1
          },
          buffering: new Set(
            Object.keys(io.sockets.adapter.rooms[req.socket.roomId].sockets)
          )
          // Array of socket id's still buffering
        };

        const queueId = uniqid();

        // Create a video from the url if valid url
        const { ok, error, status, video } = await createVideoFromUrl(videoUrl);

        if (!ok) {
          return { ok, error, status };
        }

        // Add created video to queue
        stream.queue[queueId] = video;
        req.router.$streams.external.push(stream);

        // Create a shallow copy of stream info so client only gets what is needed
        const streamCopyForClient = {
          ...stream,
          state: -1,
          time: 0,
          isBuffering: true
        };

        // Delete things we don't want the client to know of
        delete streamCopyForClient.buffering;

        // Tell all users in room new stream added
        io.in(req.socket.roomId).emit(`external/create`, streamCopyForClient);

        // Tell all clients that user created external stream
        io.in(req.socket.roomId).emit("chat/message", {
          type: "action",
          text: `${req.socket.username} added video player`
        });

        return { ok: true };
      }
    }),

    close: new ExpressRoute({
      type: "POST",

      model: {
        id: {
          type: "string",
          required: true
        }
      },

      middleware: [verifySocketId, verifyRoomId],

      /**
       * Remove an external stream by ID
       * @param {string} id External stream ID
       */
      function(req, res) {
        const { id } = req.body;
        const { external } = req.router.$streams;

        const find = e => e.id === id;
        const found = external.find(find);

        if (!found) {
          return {
            ok: false,
            error: `No external stream found by ID ${id}`
          };
        }

        external.splice(external.indexOf(found), 1);

        // Tell all users in room stream has been removed
        io.in(req.socket.roomId).emit(`external/close/${id}`);

        // Tell all clients that user removed external stream
        io.in(req.socket.roomId).emit("chat/message", {
          type: "action",
          text: `${req.socket.username} removed video player`
        });

        return { ok: true };
      }
    })
  };
};
