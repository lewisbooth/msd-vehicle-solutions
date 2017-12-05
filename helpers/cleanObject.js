// Removes all undefined, empty or null values from an array recursively.

// CAUTION: Mutates original object
const cleanObject = object => {
  Object.keys(object).forEach(key => {
    if (
      object[key] === undefined ||
      object[key] === null ||
      object[key].length === 0
    ) {
      delete object[key];
    }
    if (typeof object[key] === "object") {
      cleanObject(object[key]);
    }
  });
};

exports.cleanObject = cleanObject;
