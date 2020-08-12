# Mediasoup API

Everything in this folder is a custom API built on top of the [Mediasoup Javascript API](https://mediasoup.org/documentation/v3/mediasoup/api/)

## Router.js

### `Router.getOrCreate(roomId)`
#### Get a create a router for the room
##### Params:
- `roomId`: String - The Room ID, used for the Router ID in global routers map

##### Returns `router` https://mediasoup.org/documentation/v3/mediasoup/api/#Router

Router has a custom property attached called `$streams`

### `router.$streams`
#### Object with properites for each type of stream

- .video:

      // All video streams
      video: [
        {
          producerId: "Iruqw8jai*aDIWAQ9WIDK",
          username: "JohnDoe"
        },
        {
          producerId: "2wj93fje988jaisr32QED",
          username: "BobSag",
          audio: {
            producerId: "qjsaiudhNSUADHHAasd"
          }
        }
      ],

- .mic:

      // All chatters in the room
      mic: [
        {
          producerId: "",
          username: ""
        }
      ]

- .external: 

      // All thrird-party streams
      external: [
        {
          type: "youtube",
          id: "dj983q9jdjhsaud" (Unique ID of external stream),
          videoId: "hA29sdjwaid" (YouTube Video ID),
          state: 1 (Video state),
          time: {
            value: 4 (Video time at snapshot)
            stamp: 12392143284 (Universal Timestamp),
          }
        },
        {
          type: "twitch",
          username: "summit1g" (Twitch channel name)
        }
      ],

## Transport.js

## Producer.js

## Consumer.js