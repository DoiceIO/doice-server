const Worker = require("./worker");

const errorBuilder = require("../functions/error-builder");

const eventsList = ["newrouter", "close"];

// Learn more here: https://mediasoup.org/documentation/v3/mediasoup/api/#RouterOptions
const ROUTER_OPTIONS = {
  mediaCodecs: [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2
    },
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000,
      rtcpFeedback: [
        { type: "nack" },
        { type: "nack", parameter: "pli" },
        { type: "ccm", parameter: "fir" },
        { type: "goog-remb" },
        { type: "transport-cc" }
      ]
    }
  ]
};

module.exports = {
  /**
   * Get a create a router for the room
   * @param {string} roomId The Room ID, used for the Router ID in global routers map
   */
  getOrCreate: async roomId => {
    // Get the router from global routers map
    let router = routers.get(roomId);

    // If router doesn't exist, create it
    if (!router) {
      // Get the next worker (cpu)
      const worker = Worker.getWorker();

      router = await worker.createRouter(ROUTER_OPTIONS);

      // Add event listeners to the router
      addEventListeners(roomId, router);

      // All video streams (Learn more in README.md in this folder)
      router.$streams = {
        video: [],
        webcam: [],
        mic: [],
        external: []
      };

      // Add router to global routers map
      routers.set(roomId, router);
    }

    return router;
  },

  /**
   * Remove a stream from a Room by Producer ID
   * @param {object} params
   * @param {string} params.roomId The key for the router in global routers map
   * @param {string} params.producerId The Producer ID
   */
  removeStreamByProducerId({ roomId, producerId }) {
    const requirementError = errorBuilder.missingPropertyError(
      {
        roomId,
        producerId
      },
      ["roomId", "producerId"]
    );

    if (requirementError) {
      return {
        success: false,
        error: requirementError
      };
    }

    // Get the router from the global map of routers
    const router = routers.get(roomId);

    if (!router) {
      return {
        success: false,
        error: `No Router found by Room ID: ${roomId}`
      };
    }

    // Get array of video and mic streams
    const { video, webcam, mic } = router.$streams;

    // Find stream in video array
    const streams = { video, webcam, mic };
    const find = e => e.producerId === producerId;
    let stream;

    // Loop through all posible stream arrays
    for (const type in streams) {
      stream = streams[type].find(find);
      if (stream) {
        const i = streams[type].indexOf(stream);
        router.$streams[type].splice(i, 1);
        break;
      }
    }

    return { success: true };
  },

  /**
   * Remove all streams by username
   * @param {object} params
   * @param {string} params.roomId The key for the router in global routers map
   * @param {string} params.username Username of streamer
   */
  removeAllStreamsByUsername({ roomId, username }) {
    const requirementError = errorBuilder.missingPropertyError(
      {
        roomId,
        username
      },
      ["roomId", "username"]
    );

    if (requirementError) {
      return {
        success: false,
        error: requirementError
      };
    }

    // Get the router from the global map of routers
    const router = routers.get(roomId);

    if (!router) {
      return {
        success: false,
        error: `No Router found by Room ID: ${roomId}`
      };
    }

    // Get array of video and mic streams
    const { video, mic } = router.$streams;

    // Find stream in video array
    const find = e => e.username === username;

    const videoStream = video.find(find);
    const micStream = mic.find(find);

    if (videoStream) {
      video.splice(video.indexOf(videoStream), 1);
    }

    if (micStream) {
      mic.splice(mic.indexOf(micStream), 1);
    }

    return { success: true };
  },

  // Delete and close the router for the room
  close: async roomId => {
    // Get the router from global map of routers
    const router = routers.get(roomId);

    if (!router) return;

    // Close the actual router
    await router.close();

    // Remove router from global map of routers
    routers.delete(roomId);
  }
};

// Add custom event listeners to router
function addEventListeners(roomId, router) {
  eventsList.forEach(event => {
    router.observer.on(event, () => {
      console.log(
        `@router - (${event}) room:${roomId} router:${router._internal.routerId}`
      );
    });
  });
}
