// Prices per day
const prices = {
  van: {
    "van-small": 50,
    "van-medium": 70,
    "van-large": 90,
    "van-luton": 105
  },
  car: {
    "car-economy": 35,
    "car-saloon": 45,
    "car-suv": 55,
    "car-truck": 65
  }
};

// Discounts for each hire duration in percent
const discounts = {
  "3-7": 10,
  "8-14": 15,
  "15+": 20
};

// Global element selectors
const form = document.forms["instant-quote"];
const fieldsets = form.querySelectorAll(".options");
const inputs = form.querySelectorAll("input");
const priceOutput = form.querySelector("output");
const aside = document.querySelector("aside");
const mobileLocation = document.querySelector("article");
const callToBook = aside.querySelector(".call-to-book");
const quoteForm = document.querySelector(".instant-quote");
const topSection = document.querySelector("article").parentNode;

const vanBlock = form.querySelector("[name=van-size]").parentElement;
const carBlock = form.querySelector("[name=car-size]").parentElement;
const vanInput = form.querySelector("[name=van]");
const carInput = form.querySelector("[name=car]");

// Event listeners
form.addEventListener("submit", e => e.preventDefault());
inputs.forEach(input => {
  input.addEventListener("click", e => checkInput(e));
});

// Trigger immediate setup & price calculation
let formState = getState();
renderForm();

// Lightweight state management for one-way data flow
function setState(newState) {
  formState = newState;
  renderForm();
}

// Loops through the form DOM elements and returns an object containing the current form state
function getState() {
  const currentState = {};
  fieldsets.forEach(fieldset => {
    const fieldsetName = fieldset.getAttribute("name");
    const inputs = fieldset.querySelectorAll("input");
    const inputStates = {};
    inputs.forEach(input => {
      const name = input.getAttribute("name");
      const checked = input.getAttribute("checked") !== null;
      inputStates[name] = { checked };
    });
    currentState[fieldsetName] = inputStates;
  });
  return currentState;
}

// Check boxes based on state, and update the quote result
function renderForm() {
  priceOutput.innerHTML = getPrice();

  fieldsets.forEach(fieldset => {
    const fieldsetName = fieldset.getAttribute("name");
    const inputs = fieldset.querySelectorAll("input");
    inputs.forEach(input => {
      const inputName = input.getAttribute("name");
      if (formState[fieldsetName][inputName].checked === true) {
        input.setAttribute("checked", true);
      } else {
        input.removeAttribute("checked");
      }
    });
  });

  if (carInput.checked === true) {
    carBlock.classList.remove("hidden");
    vanBlock.classList.add("hidden");
  } else {
    vanBlock.classList.remove("hidden");
    carBlock.classList.add("hidden");
  }
}

// Checks the clicked input, and unchecks other inputs in the same fieldset
function checkInput(e) {
  const newState = JSON.parse(JSON.stringify(formState));
  const clickedInput = e.target.getAttribute("name");
  const fieldsetName = e.target.parentElement.getAttribute("name");
  for (const input in newState[fieldsetName]) {
    const checked = input === clickedInput ? true : false;
    newState[fieldsetName][input].checked = checked;
  }
  setState(newState);
}

function getPrice() {
  // Copy state without reference
  const query = JSON.parse(JSON.stringify(formState));

  // Format form state into a 1-layer query for easy processing, e.g. { "vehicle-type": "van", "vehicle-size": "small", "days": "3-7" }
  for (const fieldset in query) {
    for (const input in query[fieldset]) {
      if (query[fieldset][input].checked === false)
        delete query[fieldset][input];
    }
    query[fieldset] = Object.keys(query[fieldset])[0];
  }

  // Calculate the price from query
  const vehicleType = query["vehicle-type"];
  const vehicleSize = query[`${vehicleType}-size`];
  const days = query["days"];
  let price = prices[vehicleType][vehicleSize];
  if (typeof discounts[days] !== "undefined") {
    const modifier = 1 - discounts[days] / 100;
    price = Math.floor(price * modifier);
  }
  return `£${price}`;
}

////////////////////////////////////////////////

// Move form to top of page on mobile screens
function moveForm() {
  if (window.innerWidth < 1024) {
    topSection.insertBefore(quoteForm, mobileLocation);
  } else {
    aside.insertBefore(quoteForm, callToBook);
  }
}

moveForm();

window.addEventListener("resize", function () {
  moveForm();
});

function insertAfter(el, referenceNode) {
  referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
}
