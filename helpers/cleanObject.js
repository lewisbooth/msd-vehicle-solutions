// Replaces all falsy values in an object with empty string.
// Used to remove zeroes from vehicle data before displaying on the page.

// CAUTION: Mutates original object
const cleanObject = object => {
  Object.keys(object).forEach(key => {
    if (
      object[key] === 0 ||
      object[key] === undefined ||
      object[key] === null ||
      object[key].length === 0
    ) {
      object[key] = "";
    }
    if (typeof object[key] === "object") {
      cleanObject(object[key]);
    }
  });
};

exports.cleanObject = cleanObject;
