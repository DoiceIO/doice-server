module.exports = {
  youtube: /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,
  dailymotion: /https?:\/\/(www.)?(dailymotion.com|dai.ly)(\/video)?\/(.{7})/,
  twitch: /^(https?:\/\/(www.)?twitch.tv\/)?(\w+)$/,
  directUrl: /^.+(\.webm|\.mp4)$/
};
