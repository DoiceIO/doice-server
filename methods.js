const YouTubeAPI = require("./apis/youtube");
const DailyMotionAPI = require("./apis/dailymotion");

const regex = require("./data/regex");

module.exports = {
  /**
   * Get time in seconds since epoch
   */
  getLocalStamp() {
    return Date.now() / 1000;
  },

  /**
   * Regex test video URL to determine what type of video it is (YouTube, DailyMotion, or .mp4)
   * @param {string} url Video URL
   */
  async createVideoFromUrl(url) {
    // If video url is youtube
    if (regex.youtube.test(url)) {
      const match = url.match(regex.youtube);
      const videoId = match && match[5].length === 11 ? match[5] : false;

      if (!videoId) {
        return {
          ok: false,
          error: "Your YouTube URL was invalid",
          status: 400
        };
      }

      const { ok, error, video } = await YouTubeAPI.getYouTubeVideoById(
        videoId
      );

      if (!ok) {
        return {
          ok: false,
          error
        };
      }

      return {
        ok: true,
        video: {
          videoId,
          type: "youtube",
          data: video
        }
      };
    }

    if (regex.dailymotion.test(url)) {
      const match = url.match(regex.dailymotion);
      const videoId = match && match[4];

      if (!videoId) {
        return {
          ok: false,
          error: "Your DailyMotion URL was invalid",
          status: 400
        };
      }

      const { ok, error, video } = await DailyMotionAPI.getDailyMotionVideoById(
        videoId
      );

      if (!ok) {
        return {
          ok: false,
          error,
          status: 500
        };
      }

      return {
        ok: true,
        video: {
          videoId,
          type: "dailymotion",
          data: video
        }
      };
    }

    if (regex.twitch.test(url)) {
      const match = url.match(regex.twitch);
      const videoId = match && match[3];

      if (!videoId) {
        return {
          ok: false,
          error: "Your Twitch URL was invalid",
          status: 400
        };
      }

      return {
        ok: true,
        video: {
          videoId,
          type: "twitch"
        }
      };
    }

    if (regex.directUrl.test(url)) {
      return {
        ok: true,
        video: {
          videoId: url,
          type: "directUrl"
        }
      };
    }

    // If invalid URL
    return {
      ok: false,
      error: "That URL was invalid",
      status: 400
    };
  }
};
