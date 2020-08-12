module.exports = {
  /**
   * Build a missing property error
   * @param {object} object The object you want to check
   * @param {string[]} properties The array of keys you want to check
   */
  missingPropertyError(object, properties) {
    // Check if object is type object
    if (typeof object !== "object") {
      return "Object to check was not provided or of type object";
    }
    if (typeof properties === "undefined" || !properties.length) {
      return "Properties were not provided or of type array";
    }

    // Check which, if any, properties are unfilled
    let unprovided = [];
    for (let i = 0; i < properties.length; i++) {
      if (object[properties[i]] === undefined || object[properties[i]] === "") {
        unprovided.push(properties[i]);
      }
    }

    // Build requirements error message
    if (unprovided.length) {
      let resText = "No";
      let itemCount = unprovided.length - 1;
      for (let i = 0; i < unprovided.length; i++) {
        if (itemCount === i && i > 0) resText += " or";
        resText += ` ${unprovided[i]}`;
        if (i < itemCount) resText += itemCount > 1 ? "," : "";
      }
      return resText + " provided";
    }

    return "";
  },

  /**
   * Check for correct variable types
   * @param {any[]} properties The array of variables
   * @param {string[]} types The array of types
   */
  incorrectTypes(properties, types) {
    // Check which, if any, properties are incorrect type
    for (let i = 0; i < properties.length; i++) {
      if (typeof properties[i] !== types[i]) {
        return `${properties[i]} is type ${typeof properties[
          i
        ]} instead of type ${types[i]}`;
      }
    }

    return "";
  },

  /**
   * Validate the params passed into a Socket event function
   * @param {object} params The model to base params on
   * @param {object} passed The params passed from client
   */
  validateParams(model, params) {
    for (const key in model) {
      // Get the required param
      const property = model[key];
      const param = params[key];

      // If param is not provded
      if (typeof param === "undefined" && property.required) {
        return {
          ok: false,
          error: `${key} is required, but was not provided.`,
        };
      }

      // If incorrect type
      if (typeof param !== property.type) {
        return {
          ok: false,
          error: `${key} was type ${typeof param}, 
              when it was supposed to be type ${property.type}`,
        };
      }

      if (typeof param === "string") {
        // If max length
        if (
          typeof property.maxLength === "number" &&
          param.length > property.maxLength
        ) {
          return {
            ok: false,
            error: `${key} is longer than max length of ${property.maxLength}`,
          };
        }
      }

      // Run validator function
      if (property.validator && typeof property.validator === "function") {
        const { isValid, error } = property.validator(param);
        if (!isValid) {
          return { ok: false, error };
        }
      }
    }

    return { ok: true };
  },
};
