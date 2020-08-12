const fetch = require("node-fetch");

const URL = `https://api.dailymotion.com`;

module.exports = {
  async getDailyMotionVideoById(id) {
    const res = await fetch(`${URL}/video/${id}`);

    if (!res.ok) {
      return {
        ok: false,
        error: "DailyMotion API request failed. This video might not exist"
      };
    }

    const v = await res.json();

    return {
      ok: true,
      video: {
        title: v.title
      }
    };
  }
};
