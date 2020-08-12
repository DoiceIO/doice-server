const fs = require("fs");

const Router = require("../mediasoup/router");
const Transport = require("../mediasoup/transport");

const consola = require("consola");

const { getLocalStamp } = require("../methods");
const { validateParams } = require("../functions/error-builder");

module.exports = async ({ io }) => {
  const modules = [];

  // Get all modules
  const moduleNames = await fs.promises.readdir(`${__dirname}/modules`);
  moduleNames.forEach(name => modules.push(require(`./modules/${name}`)));

  // Get the count of sockets in socket room
  io.getSocketCount = function (roomId) {
    const room = io.sockets.adapter.rooms[roomId];
    return room ? room.length : 0;
  };

  // On a new viewer connection
  io.on("connection", socket => {
    // Add object to socket for holding related producer ids
    socket.$streams = {
      video: null,
      audio: null,
      webcam: null,
      mic: null
    };

    // Loop through all modules
    modules.forEach((module, i) => {
      const moduleCopy = module({ io, socket });

      // Add all events to socket object
      const eventKeys = Object.keys(moduleCopy);
      eventKeys.forEach(eventKey => {
        const eventGroup = moduleNames[i].substr(0, moduleNames[i].length - 3);
        // Assign socket event and bind this to socket
        socket.on(`${eventGroup}/${eventKey}`, async function (params) {
          const { model, function: func } = moduleCopy[eventKey];

          // Do validation
          const result = validateParams(model, params);

          if (!result.ok) {
            consola.error(result.error);
            socket.emit(eventKey, {
              ok: false,
              error: result.error
            });
            return;
          }

          // Run function
          const res = await (async function () {
            // Await function if async function
            if (func.constructor.name === "AsyncFunction") {
              return await func(params);
            }

            // If not async, run function normally
            return func(params);
          })();

          if (!res) {
            socket.emit(eventKey, { ok: true });
            return;
          }

          const { ok, error, to, data, id } = res;

          if (!ok) {
            consola.error(error);
            socket.emit(eventKey, {
              ok: false,
              error
            });
            return;
          }

          let event = `${eventGroup}/${eventKey}`;
          if (id) event += `/${id}`;

          to.emit(event, {
            event,
            ok: true,
            data
          });
        });
      });
    });

    socket.on("disconnect", async function () {
      // Leave the socket room
      socket.leave(socket.roomId);

      // Tell all clients that user has joined
      io.in(socket.roomId).emit("chat/message", {
        type: "action",
        text: `${socket.username} left the room`
      });

      // Emit events for all producers and consumers that the stream has ended
      const sendTransport = sendTransports.get(socket.id);

      if (sendTransport) {
        const producerIds = Array.from(sendTransport._producers.keys());

        // Tell all consumers and the producer that the stream has handed (possibly in error)
        producerIds.forEach(producerId => {
          io.in(socket.roomId).emit(`producer/close/${producerId}`);

          const { success, error } = Router.removeStreamByProducerId({
            roomId: socket.roomId,
            producerId
          });

          if (!success) {
            console.error(error);
          }
        });
      }

      const router = routers.get(socket.roomId);

      if (router) {
        const { external } = router.$streams;
        external.forEach(stream => {
          // Check if video stream is only waiting on this client
          if (stream.buffering.size === 1 && stream.buffering.has(socket.id)) {
            // Update local stamp
            stream.time.stamp = getLocalStamp();

            // Tell all clients we are no longer buffering
            io.in(socket.roomId).emit(`video/buffer/${stream.id}`, {
              isBuffering: false
            });
          }

          // Remove this client from buffering queue
          stream.buffering.delete(socket.id);
        });
      }

      // Close the viewers transport
      await Transport.closeAll(socket.id);

      // Get the rooms current socket count
      const socketCount = io.getSocketCount(socket.roomId);

      // Update users array for all users
      const room = rooms.get(socket.roomId);
      if (room) {
        delete room.users[socket.id];
        io.in(socket.roomId).emit("chat/users", room.users);
      }

      // If socket is last to leave room, close the router
      if (!socketCount) {
        await Router.close(socket.roomId);
        rooms.delete(socket.roomId);
      }
    });
  });
};
