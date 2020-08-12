/**
 * TODO remove
 *
 * This module is out of date and no longer used.
 * See module transport/produce for new version.
 */

const ExpressRoute = require("../ExpressRoute.js");

const { getLocalStamp } = require("../../methods.js");

const Producer = require("../../mediasoup/producer");

module.exports = ({ io }) => {
  const { verifySocketId, verifyRoomId } = require("../middleware.js")({ io });

  return {
    video: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          stream: {
            type: "object",
            required: true
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId],

      /**
       * After producers have been created, this is called to add stream to room
       * @param {object} stream Info about the stream, like producerIds
       */
      async function(req, res) {
        let { stream } = req.body;

        // If no video producer found in global producers map
        if (!producers.has(stream.producerId)) {
          return {
            ok: false,
            error: `No video producer found by id: ${stream.producerId}`
          };
        }

        // If is streaming desktop audio
        if (typeof stream.audio === "object") {
          if (typeof stream.audio.producerId !== "string") {
            return {
              ok: false,
              error: "No producerId provided for audio stream"
            };
          }

          // If no audio producer found in global producers map
          if (!producers.has(stream.audio.producerId)) {
            return {
              ok: false,
              error: `No audio producer found by id: ${stream.audio.producerId}`
            };
          }
        }

        stream = {
          ...stream,
          startedAt: getLocalStamp()
        };

        const { video } = req.router.$streams;

        // Check if client is already producing a video stream
        /**
         * The logic behind this code is if the streams array was ever
         * saying that someone was streaming when they aren't, its better
         * to override the stream than to throw an error. This also prevents
         * users from streaming to the same playspace from multiple devices.
         * If they do, it will just remove their old stream
         */
        for (let i = 0; i < video.length; i++) {
          // If already producing
          if (video[i].username === req.socket.username) {
            // Close video producer
            const { success, error } = await Producer.delete(
              video[i].producerId
            );

            if (!success) {
              return {
                ok: false,
                error
              };
            }

            // Check if audio producer exits
            if (video[i].audio && video[i].audio.producerId) {
              // Close audio producer
              const { success, error } = await Producer.delete(
                video[i].audio.producerId
              );

              if (!success) {
                return {
                  ok: false,
                  error
                };
              }
            }

            // Tell any consumers that producer has closed
            io.in(req.socket.roomId).emit(
              `produce/close/${video[i].producerId}`
            );

            // Remove old stream
            req.router.$streams.video.splice(i, 1);

            break;
          }
        }

        // Add stream to
        req.router.$streams.video.push(stream);

        // Tell anyone in the room, that a new producer has started
        req.socket.in(req.socket.roomId).emit("stream/video", stream);

        return {
          ok: true
        };
      }
    }),

    webcam: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          stream: {
            type: "object",
            required: true
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId],

      /**
       * After producers have been created, this is called to add stream to room
       * @param {object} stream Info about the stream, like producerIds
       */
      async function(req, res) {
        let { stream } = req.body;

        // If no video producer found in global producers map
        if (!producers.has(stream.producerId)) {
          return {
            ok: false,
            error: `No video producer found by id: ${stream.producerId}`
          };
        }

        stream = {
          ...stream,
          startedAt: getLocalStamp()
        };

        const { webcam } = req.router.$streams;

        // Check if client is already producing a webcam stream
        /**
         * The logic behind this code is if the streams array was ever
         * saying that someone was streaming when they aren't, its better
         * to override the stream than to throw an error. This also prevents
         * users from streaming to the same playspace from multiple devices.
         * If they do, it will just remove their old stream
         */
        for (let i = 0; i < webcam.length; i++) {
          // If already producing
          if (webcam[i].username === req.socket.username) {
            // Close webcam producer
            const { success, error } = await Producer.delete(
              webcam[i].producerId
            );

            if (!success) {
              return {
                ok: false,
                error
              };
            }

            // Tell any consumers that producer has closed
            io.in(req.socket.roomId).emit(
              `produce/close/${webcam[i].producerId}`
            );

            // Remove old stream
            req.router.$streams.webcam.splice(i, 1);

            break;
          }
        }

        // Add stream to
        req.router.$streams.webcam.push(stream);

        // Tell anyone in the room, that a new producer has started
        req.socket.in(req.socket.roomId).emit("stream/webcam", stream);

        return {
          ok: true
        };
      }
    }),

    mic: new ExpressRoute({
      type: "POST",

      model: {
        body: {
          stream: {
            type: "object",
            required: true
          }
        }
      },

      middleware: [verifySocketId, verifyRoomId],

      /**
       * Add microphone stream to mic streams array
       * @param {object} stream Info about the stream, like producerId
       */
      async function(req, res) {
        let { stream } = req.body;

        // If no video producer found in global producers map
        if (!producers.has(stream.producerId)) {
          return {
            ok: false,
            error: `No microphone producer found by id: ${stream.producerId}`
          };
        }

        stream = {
          ...stream,
          startedAt: getLocalStamp()
        };

        // Add stream to mic streams array
        req.router.$streams.mic.push(stream);

        // Tell anyone in room that a new producer has started
        req.socket.in(req.socket.roomId).emit("stream/mic", stream);

        return { ok: true };
      }
    })
  };
};
