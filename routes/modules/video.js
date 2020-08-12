const ExpressRoute = require("../ExpressRoute.js");

const consola = require("consola");
const uniqid = require("uniqid");

const { getLocalStamp, createVideoFromUrl } = require("../../methods.js");

module.exports = ({ io }) => {
  const {
    verifySocketId,
    verifyRoomId,
    verifyVideoId
  } = require("../middleware.js")({ io });

  return {
    // Update the time of the video stream by id
    time: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          id: {
            type: "string",
            required: true
          },
          time: {
            type: "number",
            required: true
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId, verifyVideoId],

      /**
       * Update the time of the video stream by id
       * @param {string} id Id of the video stream in $streams array
       * @param {number} time New video video time
       */
      function(req, res) {
        const { id, time } = req.body;

        // Update the video time
        req.stream.time = {
          value: time,
          stamp: getLocalStamp()
        };

        // Tell all users that room time has updated
        io.to(req.socket.roomId).emit(`video/time/${id}`, {
          time
        });

        // Tell all clients that user has changed video time
        const formattedTime = new Date(time * 1000).toISOString().substr(11, 8);
        io.in(req.socket.roomId).emit("chat/message", {
          type: "action",
          text: `${req.socket.username} changed video time to ${formattedTime}`
        });

        return { ok: true };
      }
    }),

    // Play a video stream by id
    play: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          id: {
            type: "string",
            required: true
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId, verifyVideoId],

      /**
       * Play a video stream by id
       * @param {string} id The stream id
       * @param {number} time The time of video
       */
      function(req, res) {
        const { id } = req.body;

        // Update the state to playing
        req.stream.state = 1;

        // Update stream with player time
        req.stream.time.stamp = getLocalStamp();

        // Tell all users in room that video is playing
        io.in(req.socket.roomId).emit(`video/play/${id}`);

        // Tell all clients that user played the video
        io.in(req.socket.roomId).emit("chat/message", {
          type: "action",
          text: `${req.socket.username} played the video`
        });

        return { ok: true };
      }
    }),

    // Pause a video stream by id
    pause: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          id: {
            type: "string",
            required: true
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId, verifyVideoId],

      /**
       * Pause a video stream by id
       * @param {string} id The stream id
       * @param {number} time Time of video on pause
       */
      function(req, res) {
        const { id } = req.body;

        // Update stream state to paused
        req.stream.state = 2;

        // Update stream time
        const { value, stamp } = req.stream.time;
        req.stream.time = {
          value: value + getLocalStamp() - stamp,
          stamp: -1
        };

        // Tell all users in room that video is paused
        io.in(req.socket.roomId).emit(`video/pause/${id}`);

        // Tell all clients that user paused the video
        io.in(req.socket.roomId).emit("chat/message", {
          type: "action",
          text: `${req.socket.username} paused the video`
        });

        return { ok: true };
      }
    }),

    // Add a new video steam to queue
    add: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          id: {
            type: "string",
            required: true
          },
          videoUrl: {
            type: "string",
            required: true
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId, verifyVideoId],

      /**
       * Add a video video to an existing video stream queue
       * @param {string} id The stream id
       * @param {string} videoUrl Video id
       */
      async function(req, res) {
        const { id, videoUrl } = req.body;

        // Check if queue is not already at max length
        if (Object.keys(req.stream.queue).length > 99) {
          return {
            ok: false,
            error:
              "This video player already has the max videos in queue of 100",
            status: 400
          };
        }

        const queueId = uniqid();

        // Create a video from the url if valid url
        const { ok, error, status, video } = await createVideoFromUrl(videoUrl);

        if (!ok) {
          return {
            ok: false,
            error,
            status
          };
        }

        // Add video to queue
        req.stream.queue[queueId] = video;

        // Tell all clients in room new video added to queue
        io.in(req.socket.roomId).emit(`video/add/${id}`, {
          queueId,
          video
        });

        // Tell all clients that user added video
        io.in(req.socket.roomId).emit("chat/message", {
          type: "action",
          text: `${req.socket.username} added a video to the queue`
        });

        return { ok: true };
      }
    }),

    // Skip a video by stream id
    skip: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          id: {
            type: "string",
            required: true
          },
          queueId: {
            type: "string",
            required: true
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId, verifyVideoId],

      /**
       * Skip video video by stream id and index of queue
       * @param {string} id Id of stream
       * @param {string} queueId Id of video in video queue
       */
      function(req, res) {
        const { id, queueId } = req.body;

        // If video was already skipped
        if (!req.stream.queue[queueId]) return { ok: true };

        const keys = Object.keys(req.stream.queue);
        if (!keys.length || !keys.includes(queueId)) {
          return;
        }

        const firstQueueId = keys[0];

        // Remove video from queue by queueId
        delete req.stream.queue[queueId];

        // If skipping current video, reset video time & set all clients to buffering
        if (firstQueueId === queueId) {
          req.stream.time = {
            value: 0,
            stamp: getLocalStamp()
          };

          // Set stream to isBuffering
          req.stream.buffering = new Set(
            Object.keys(io.sockets.adapter.rooms[req.socket.roomId].sockets)
          );

          // Tell all clients we are no longer buffering
          io.in(req.socket.roomId).emit(`video/buffer/${id}`, {
            isBuffering: true
          });
        }

        // Tell users in room video was removed by queueId
        io.in(req.socket.roomId).emit(`video/skip/${id}`, { queueId });

        // Tell all clients that user skipped a video
        io.in(req.socket.roomId).emit("chat/message", {
          type: "action",
          // TODO emit video name
          text: `${req.socket.username} skipped a video`
        });

        return { ok: true };
      }
    }),

    // On client stop buffering
    buffer: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          id: {
            type: "string",
            required: true
          },
          isBuffering: {
            type: "boolean",
            required: true
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId, verifyVideoId],

      /**
       * Skip video video by stream id and index of queue
       * @param {string} id Id of stream
       */
      function(req, res) {
        const { id, isBuffering } = req.body;

        // If user is not buffering, remove them from array
        if (!isBuffering) {
          req.stream.buffering.delete(req.socket.id);

          // Check if buffering array is empty
          if (!req.stream.buffering.size) {
            // Update local time
            req.stream.time.stamp = getLocalStamp();

            // Set state to playing
            req.stream.state = 1;

            // Tell all clients we are bno longer buffering
            io.in(req.socket.roomId).emit(`video/buffer/${id}`, {
              isBuffering: false
            });
          }
        }

        // If user is buffering, add them to the array
        else {
          req.stream.buffering.add(req.socket.id);

          // If first person to start buffering
          if (req.stream.buffering.size === 1) {
            // Update local time
            const { time } = req.stream;
            if (time.stamp > -1) {
              time.value += getLocalStamp() - time.stamp;
              time.stamp = -1;
            }

            // Set state to paused
            req.stream.state = 2;

            // Tell all clients we are buffering
            io.in(req.socket.roomId).emit(`video/buffer/${id}`, {
              isBuffering: true
            });
          }
        }

        return { ok: true };
      }
    })
  };
};
