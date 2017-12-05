// Normalises a list of variable to true or false

const isBlank = value => {
  return (
    value === undefined || value === "" || value.length === 0 || value === null
  );
};

function defaultBoolean(value) {
  if (isBlank(value)) {
    value = false;
  } else {
    value = true;
  }
  return value;
}

exports.bool = defaultBoolean;
