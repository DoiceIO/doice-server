module.exports = ({ io }) => ({
  /**
   * Check if socket-id id is present, and if a socket exits
   * @param {Request} req
   * @param {Response} res
   */
  verifySocketId(req, res) {
    // Check if the socketId header exists
    const socketId = req.headers["socket-id"];
    if (!socketId) {
      return {
        ok: false,
        error: "No socket-id header in request"
      };
    }

    // Check if the socket exists
    const socket = io.sockets.connected[socketId];
    if (!socket) {
      return {
        ok: false,
        error: `No socket found by Socket ID: ${socketId}`
      };
    }

    // Attach socket to req
    req.socket = socket;

    // If user has key tied to them
    if (req.socket.key) {
      const key = req.headers["user-key"];

      if (!key) {
        return {
          ok: false,
          error: "No user-key header on request"
        };
      }

      // Keys do not match
      if (req.socket.key !== key) {
        return {
          ok: false,
          error: "You're not authenticated for this route"
        };
      }
    }

    return { ok: true };
  },

  /**
   * Check if router exists by roomId
   * @param {Request} req
   * @param {Response} res
   */
  verifyRoomId(req, res) {
    const { roomId } = req.body;
    const router = routers.get(roomId);
    const room = rooms.get(roomId);

    if (!router || !room) {
      return {
        ok: false,
        error: `No router or room found by room ID ${roomId}`
      };
    }

    req.router = router;
    req.room = room;

    return { ok: true };
  },

  /**
   * Check if a video stream exists by id
   * @param {Request} req
   * @param {Response} res
   */
  verifyVideoId(req, res) {
    const { id } = req.body;

    if (!req.router) {
      return {
        ok: false,
        error: `No router attached to Request object. You must verifyRoomId before verifyVideoId`
      };
    }

    // Find stream by id in room
    const find = e => e.id === id && e.type === "video";
    const stream = req.router.$streams.external.find(find);

    if (!stream) {
      return {
        ok: false,
        error: `No stream found by id ${id} in room ${req.socket.roomId}`
      };
    }

    req.stream = stream;

    return { ok: true };
  }
});
