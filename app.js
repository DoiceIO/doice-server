require("dotenv").config();

const fs = require("fs");
const express = require("./express.js");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const Worker = require("./mediasoup/worker");
const http = require("http");
const https = require("https");
const consola = require("consola");

let credentials = {};
if (process.env.PORT === "443" && process.env.DOMAIN_NAME) {
  credentials = {
    key: fs.readFileSync(
      `/etc/letsencrypt/live/${process.env.DOMAIN_NAME}/privkey.pem`,
      "utf8"
    ),
    cert: fs.readFileSync(
      `/etc/letsencrypt/live/${process.env.DOMAIN_NAME}/fullchain.pem`,
      "utf8"
    )
  };
}

// Create http server if not https
const server =
  process.env.PORT !== "443"
    ? http.createServer(app)
    : https.createServer(credentials, app);

const io = require("socket.io")(server);

// All workers representing CPU vCores
global.workers = [];

// All routers representing rooms
global.routers = new Map();

// All Doice rooms
global.rooms = new Map();

// All transports representing streamer sending data
global.sendTransports = new Map();

// All transports representing viewer receiving data
global.recvTransports = new Map();

// All producers
global.producers = new Map();

// All consumers
global.consumers = new Map();

main();

async function main() {
  await Worker.createWorkers();

  createExpressApp();

  createSocketApp();

  server.listen(process.env.PORT, process.env.IP, () => {
    consola.success(
      `Doice server listening on ${process.env.IP}:${process.env.PORT}`
    );
  });
}

function createExpressApp() {
  console.log("****CREATING EXPRESS APP****");

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  // Generate routes from /routes/index.js and /rotues/modules
  require("./routes/index.js")({ app, io });

  app.use(express.static(__dirname + "/public", { dotfilex: "allow" }));

  console.log("****CREATED EXPRESS APP****");
}

function createSocketApp() {
  console.log("****CREATING SOCKET APP****");

  const socketEvents = require("./sockets/sockets.js");
  socketEvents({ io });

  console.log("****CREATED SOCKET APP****");
}
