const fs = require("fs");
const express = require("./express.js");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const Worker = require("./mediasoup/worker");
const http = require("http");
const consola = require("consola");

if (!fs.existsSync("settings.json")) {
  fs.writeFileSync("settings.json", JSON.stringify({}))
}

// Create http server if not https
let server
let io

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
    ...JSON.parse(fs.readFileSync("template.settings.json")),
    ...JSON.parse(fs.readFileSync("settings.json"))
  };

  await Worker.createWorkers();

  createExpressApp();

  if (!global.SETTINGS.server.is_initial_install) {
    if (process.env.dev === "true") {
      server = http.createServer(app);

      server.listen(SETTINGS.server.port, () => {
        consola.success(
          `Doice server listening on ${global.SERVER_IP}:${SETTINGS.server.port}`
        );
      });

      io = require("socket.io")(server);
    } else {
      server = require("greenlock-express").init({
        packageRoot: __dirname,
        configDir: "./greenlock.d",
        cluster: false,
        maintainerEmail: global.SETTINGS.server.admin_email
      }).serve(app)
      
      io = require("socket.io")(server);
    }

    createSocketApp();
  } 
  
  else {
    server = http.createServer(app);

    app.post("/api/admin/init-setup", (req, res) => {
      console.log(req.body)
      fs.writeFileSync("settings.json", JSON.stringify({
        server: {
          port: 443,
          domain_name: req.body.domainName,
          admin_email: req.body.adminEmail,
          is_initial_install: false
        }
      }))

      fs.writeFileSync("greenlock.d/config.json", JSON.stringify({
        sites: [
          { subject: req.body.domainName, altnames: [req.body.domainName] }
        ]
      }))

      server.close()
      main()
    })

    server.listen(80, () => {
      consola.success(
        `Doice server listening on ${global.SERVER_IP}:80`
      );
    });
  }
}

function createExpressApp() {
  console.log("****CREATING EXPRESS APP****");

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.use((req, res, next) => {
    // If API method
    if (/^\/api/.test(req.path)) {
      next();
      return;
    }

    // If not api method and server is in initial install
    else if (global.SETTINGS.server.is_initial_install) {
      res.sendFile(__dirname + "/initial-setup/index.html")
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
