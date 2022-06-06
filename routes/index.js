const fs = require("fs");
const consola = require("consola");

const { validateParams } = require("../functions/error-builder");

module.exports = async ({ app, io }) => {
  const modules = [];

  // Get all modules
  const moduleNames = await fs.promises.readdir(`${__dirname}/modules`);

  moduleNames.forEach(name => modules.push(require(`./modules/${name}`)));

  // Loop through all modules
  modules.forEach((module, i) => {
    const moduleCopy = module({ io });

    // Create routes for all routes
    const routeKeys = Object.keys(moduleCopy);

    // Loop through each route
    routeKeys.forEach(eventKey => {
      // Remove .js from file name for route group
      const routeGroup = moduleNames[i].substr(0, moduleNames[i].length - 3);

      const { type, model, middleware } = moduleCopy[eventKey];

      // Verify type is correct
      if (!type) {
        consola.error(
          `${routeGroup}.${eventKey} route does not have a type property assigned.`
        );
        return;
      }
      if (!["GET", "POST", "PUT", "DELETE"].includes(type)) {
        consola.error(
          `${routeGroup}.${eventKey} route does not have a valid type. Must be GET, POST, PUT, or DELETE`
        );
        return;
      }

      // Assign route
      app[type.toLowerCase()](
        `/api/${routeGroup}/${eventKey}`,
        async (req, res) => {
          // Do validation on model
          const valResult = validateParams(model.body, req.body);

          if (!valResult.ok) {
            res.error({}, valResult.error, 400);
            return;
          }

          // Run middleware validation
          if (middleware) {
            for (let i = 0; i < middleware.length; i++) {
              if (typeof middleware[i] !== "function") {
                res.error(
                  {},
                  `Middleware at index ${i} was not a function for ${routeGroup}/${eventKey}`,
                  500
                );
                return;
              }

              const { ok, error, status } = await middleware[i](req, res);

              if (!ok) {
                res.error({}, error, status || 400);
                return;
              }
            }
          }

          // Run function
          const result = await moduleCopy[eventKey].function(req, res);

          // If nothing to do with result, assume ok
          if (!result) {
            res.success({}, 200);
            return;
          }

          const { ok, error, status, data } = result;

          if (!ok) {
            consola.error(error);
            res.error({}, error, status || 500);
            return;
          }

          res.success(data, status || 200);
        }
      );
    });
  });
};
