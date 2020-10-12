const Router = require("./router");
const Producer = require("./producer");
const Consumer = require("./consumer");

const errorBuilder = require("../functions/error-builder");

const EVENTS_LIST = ["newtransport", "close"];

// WebRTC transport options
// Docs here: https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
const WEBRTC_TRANSPORT_OPTIONS = {
  listenIps: [
    {
      ip: "0.0.0.0",
      announcedIp: ""
    }
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true
};

module.exports = {
  /**
   * Create a new recieve or send Transport
   * @param {object} params
   * @param {string} params.type Type of Transport (recv or send)
   * @param {string} params.socketId Socket ID for whom the Transport belongs to
   * @param {string} params.routerId Router ID for the room this Transport belongs to
   */
  create: async ({ type, socketId, routerId }) => {
    // Check for missing properties
    const missingPropertyError = errorBuilder.missingPropertyError(
      {
        type,
        socketId,
        routerId
      },
      ["type", "socketId", "routerId"]
    );

    if (missingPropertyError) {
      return {
        success: false,
        error: {
          type: "requirement",
          text: missingPropertyError
        }
      };
    }

    // Get the Router that this Transport is for
    const router = routers.get(routerId);

    // If Router not found
    if (!router) {
      return {
        success: false,
        error: {
          type: "undefined",
          text: `No Router by Router ID: ${routerId} found`
        }
      };
    }

    // Create the server-side Transport
    const transport = await router.createWebRtcTransport(
      WEBRTC_TRANSPORT_OPTIONS
    );

    // Set the max incoming bitrate (bps)
    try {
      // TODO use proper bitrate
      await transport.setMaxIncomingBitrate(
        SETTINGS.rooms.default.capture.video.maxBitrate * 1000
      );
    } catch (err) {
      return {
        success: false,
        error: {
          type: "transport",
          text:
            "An error occurred when setting the Maximum Bitrate of the Transport"
        }
      };
    }

    // Add event listeners to the transport
    addEventListeners(socketId, transport);

    // Add the transport to the global transports
    if (type === "send") {
      sendTransports.set(socketId, transport);
    } else {
      recvTransports.set(socketId, transport);
    }

    return { transport, success: true };
  },

  /**
   * Connect the server side transport to client transport
   * @param {object} options
   * @param {string} options.type The type of Transport (send, recv)
   * @param {string} options.socketId The Socket ID the Transport belongs to
   * @param {object} options.transportOptions Transport options
   */
  connect: async ({ type, socketId, transportOptions }) => {
    // Check for unprovided properties
    const requirementError = errorBuilder.missingPropertyError(
      {
        type,
        socketId,
        transportOptions
      },
      ["type", "socketId", "transportOptions"]
    );

    if (requirementError) {
      return {
        success: false,
        error: {
          type: "requirement",
          text: requirementError
        }
      };
    }

    // Get the transport from global transport map
    let transport;
    if (type === "send") {
      transport = sendTransports.get(socketId);
    } else {
      transport = recvTransports.get(socketId);
    }

    if (!transport) {
      if (type === "send") {
        return {
          success: false,
          error: {
            type: "undefined",
            text: `No SendTransport found by Socket ID: ${socketId}`
          }
        };
      } else {
        return {
          success: false,
          error: {
            type: "undefined",
            text: `No RecvTransport found by Socket ID: ${socketId}`
          }
        };
      }
    }

    // Connect the transport
    try {
      await transport.connect(transportOptions);
    } catch (err) {
      return {
        success: false,
        error: {
          type: "transport_connect",
          text: "An error occurred when connecting the Transport"
        }
      };
    }

    return { transport, success: true };
  },

  /**
   * Create a producer for receiving a stream from client
   * @param {object} params
   * @param {string} params.socketId The Socket ID of the producer
   * @param {object} params.producerOptions The producer options
   */
  produce: async ({ socketId, producerOptions }) => {
    const requirementError = errorBuilder.missingPropertyError(
      {
        socketId,
        producerOptions
      },
      ["socketId", "producerOptions"]
    );

    if (requirementError) {
      return {
        success: false,
        error: {
          type: "requirement",
          text: requirementError
        }
      };
    }

    // Get the transport
    let transport = sendTransports.get(socketId);

    if (!transport) {
      return {
        success: false,
        error: {
          type: "undefined",
          text: `No SendTransport found by Socket ID ${socketId}`
        }
      };
    }

    // Create producer for receiving audio/video from client
    let producer;

    try {
      producer = await transport.produce(producerOptions);
    } catch (err) {
      return {
        success: false,
        error: {
          type: "producer_create",
          text: "An error occurred when creating a Producer"
        }
      };
    }

    // Add producer to global producers map
    producers.set(producer.id, producer);

    return { producer, success: true };
  },

  /**
   * Create a consumer for sending a stream to client
   * @param {object} params
   * @param {string} params.socketId Socket ID
   * @param {string} params.routerId Router / Room ID
   * @param {object} params.consumerOptions Consumer options
   */
  consume: async ({ socketId, routerId, consumerOptions }) => {
    const requirementError = errorBuilder.missingPropertyError(
      {
        socketId,
        routerId,
        consumerOptions
      },
      ["socketId", "routerId", "consumerOptions"]
    );

    if (requirementError) {
      return {
        success: false,
        error: requirementError
      };
    }

    // Check if client can consume the producers stream
    const router = routers.get(routerId);

    if (!router) {
      return {
        success: false,
        error: `No Router found in Routers map by ID ${routerId}`
      };
    }

    // Check if client can view this stream
    if (!router.canConsume(consumerOptions)) {
      return {
        success: false,
        error: "User cannot consume this stream"
      };
    }

    // Get the transport
    const transport = recvTransports.get(socketId);

    if (!transport) {
      return {
        success: false,
        error: `No RecvTransport found in RecvTransports map by ID: ${socketId}`
      };
    }

    // Create consumer for sending audio/video to client
    let consumer;

    try {
      consumer = await transport.consume({
        ...consumerOptions,
        paused: true
      });
    } catch (err) {
      return {
        success: false,
        error: err
      };
    }

    // Add consumer to global consumers map
    consumers.set(consumer.id, consumer);

    return { success: true, consumer };
  },

  /**
   * Delete and close a transports from the router
   * @param {object} params
   * @param {string} params.socketId SocketID the Transport belongs to
   * @param {string} params.type The type of Transport (send or recv)
   * @param {?object} params.transport The transport in question, if already gotten
   */
  async close({ socketId, type, transport }) {
    // Check for missing properties
    const requirementError = errorBuilder.missingPropertyError(
      {
        socketId,
        type
      },
      ["socketId", "type"]
    );

    if (requirementError) {
      return {
        success: false,
        error: requirementError
      };
    }

    // If RecvTransport
    if (type === "recv") {
      // Check if transport was passed in, or get it from global map
      transport = transport || recvTransports.get(socketId);

      if (!transport) {
        return {
          success: false,
          error: "No RecvTransport found"
        };
      }

      // Close all consumers
      const consumerIds = Array.from(transport._consumers.keys());
      consumerIds.forEach(await Consumer.delete);

      // Close Transport & delete from global map
      await transport.close();
      recvTransports.delete(socketId);
    }

    // If SendTransport
    else if (type === "send") {
      // Check if transport was passed in, or get it from global map
      transport = transport || sendTransports.get(socketId);

      if (!transport) {
        return {
          success: false,
          error: "No SendTransport found"
        };
      }

      // Close all producers
      const producerIds = Array.from(transport._producers.keys());
      producerIds.forEach(await Producer.delete);

      // Close Transport & delete from global map
      await transport.close();
      sendTransports.delete(socketId);
    }

    // If invalid type
    else {
      return {
        success: false,
        error: "Transport type must be 'send' or 'recv'"
      };
    }

    return { success: true };
  },

  /**
   * Close all Transports belonging to Socket ID
   * @param {string} socketId Socket ID
   */
  async closeAll(socketId) {
    if (!socketId) {
      console.error("No Socket ID provided");
    }

    if (recvTransports.has(socketId)) {
      const { success, error } = await this.close({ socketId, type: "recv" });

      if (!success) {
        console.error(error);
      }
    }

    if (sendTransports.has(socketId)) {
      const { success, error } = await this.close({ socketId, type: "send" });

      if (!success) {
        console.error(error);
      }
    }
  }
};

/**
 * Add custom event listeners to the transport
 * @param {string} socketId The Socket ID the transport belongs to
 * @param {transport} transport The Transport
 */
function addEventListeners(socketId, transport) {
  EVENTS_LIST.forEach(event => {
    transport.observer.on(event, () => {
      console.log(
        `@transport - (${event}) socket:${socketId} transport:${transport._internal.transportId}`
      );
    });
  });
}
