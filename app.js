const fs = require("fs");
const express = require("./express.js");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const Worker = require("./mediasoup/worker");
const http = require("http");
const consola = require("consola");

// Create http server if not https
const server = http.createServer(app);
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
  global.SERVER_IP = await new Promise(resolve => {
    require("dns").lookup(require("os").hostname(), (err, addr) => {
      resolve(addr);
    });
  });

  global.SETTINGS = {
    ...JSON.parse(fs.readFileSync("template.settings.json"))
    // ...JSON.parse(fs.readFileSync("settings.json"))
  };

  await Worker.createWorkers();

  createExpressApp();

  createSocketApp();

  server.listen("127.0.0.1", SETTINGS.server.port, () => {
    consola.success(
      `Doice server listening on 127.0.0.1:${SETTINGS.server.port}`
    );
  });
}

function createExpressApp() {
  console.log("****CREATING EXPRESS APP****");

  app.use((req, res, next) => {
    // If API method
    if (/^\/api/.test(req.path)) {
      next();
      return;
    }

    // Check if static file matches path url
    const path = `${__dirname}/public/${req.path}`;

    // If static file exists, send it
    if (fs.existsSync(path)) {
      res.sendFile(path);
    }

    // If static file doesn't exist, assume it's a SPA url
    else {
      res.sendFile(`${__dirname}/public/index.html`);
    }
  });

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  // Generate routes from /routes/index.js and /rotues/modules
  require("./routes/index.js")({ app, io });

  console.log("****CREATED EXPRESS APP****");
}

function createSocketApp() {
  console.log("****CREATING SOCKET APP****");

  const socketEvents = require("./sockets/sockets.js");
  socketEvents({ io });

  console.log("****CREATED SOCKET APP****");
}
