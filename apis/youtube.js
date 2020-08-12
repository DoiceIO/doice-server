const fetch = require("node-fetch");

const { YOUTUBE_API_KEY } = process.env;
const URL = `https://www.googleapis.com/youtube/v3`;

module.exports = {
  async getYouTubeVideoById(id) {
    const res = await fetch(
      `${URL}/videos?part=snippet&key=${YOUTUBE_API_KEY}&id=${id}`
    );

    if (!res.ok) {
      return {
        ok: false,
        error: "YouTube API request failed. This video might not exist"
      };
    }

    const v = (await res.json()).items[0].snippet;

    const res2 = await fetch(
      `${URL}/videos?part=contentDetails&key=${YOUTUBE_API_KEY}&id=${id}`
    );

    if (!res2.ok) {
      return {
        ok: false,
        error: "YouTube API request failed. This video might not exist"
      };
    }

    // Parse video time
    let { duration } = (await res2.json()).items[0].contentDetails;

    let re = /(\d+)([DMHS])/g;
    let time = "";
    let matches;
    while ((matches = re.exec(duration))) {
      let [m, t, u] = matches;
      if (u === "M" || u === "S") {
        if (t.length < 2) t = "0" + t;
      }
      time += t + (u !== "S" ? ":" : "");
    }

    return {
      ok: true,
      video: {
        title: v.title,
        publishedAt: v.publishedAt,
        duration: time
      }
    };
  },

  async getYouTubeVideosFromPlayList(playlistId) {}
};
