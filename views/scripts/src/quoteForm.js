const prices = {
  van: {         // Daily  Weekly
    "van-small":    [75,   300],
    "van-medium":   [100,  400],
    "van-large":    [125,  480],
    "van-luton":    [150,  500]
  },
  car: {
    "car-economy":  [55,   220],
    "car-saloon":   [75,   260],
    "car-suv":      [90,   360],
    "car-truck":    [120,  500]
  }
}

// Global element selectors
const form = document.forms["instant-quote"];
const fieldsets = form.querySelectorAll(".options");
const inputs = form.querySelectorAll("input");
const priceOutput = form.querySelector("output");
const aside = document.querySelector("aside");
const mobileLocation = document.querySelector("article");
const callToBook = aside.querySelector(".call-to-book");
const quoteForm = document.querySelector(".instant-quote");
const durationText = document.querySelector(".per-day");
const topSection = document.querySelector("article").parentNode;

const vanBlock = form.querySelector("[name=van-size]").parentElement;
const carBlock = form.querySelector("[name=car-size]").parentElement;
const vanInput = form.querySelector("[name=van]");
const carInput = form.querySelector("[name=car]");

// Event listeners
form.addEventListener("submit", e => e.preventDefault());

for (var i = 0; i < inputs.length; i++) {
  inputs[i].addEventListener("click", e => checkInput(e));
}

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
  for (var i = 0; i < fieldsets.length; i++) {
    const fieldsetName = fieldsets[i].getAttribute("name");
    const fieldsetInputs = fieldsets[i].querySelectorAll("input");
    const inputStates = {};
    for (var j = 0; j < fieldsetInputs.length; j++) {
      const name = fieldsetInputs[j].getAttribute("name");
      const checked = fieldsetInputs[j].getAttribute("checked") !== null;
      inputStates[name] = { checked };
    };
    currentState[fieldsetName] = inputStates;
  };
  return currentState;
}

// Check boxes based on state, and update the quote result
function renderForm() {
  const query = JSON.parse(JSON.stringify(formState))

  priceOutput.innerHTML = getPrice();

  for (var i = 0; i < fieldsets.length; i++) {
    const fieldsetName = fieldsets[i].getAttribute("name");
    const fieldsetInputs = fieldsets[i].querySelectorAll("input");
    for (var j = 0; j < fieldsetInputs.length; j++) {
      const inputName = fieldsetInputs[j].getAttribute("name");
      if (formState[fieldsetName][inputName].checked === true) {
        fieldsetInputs[j].setAttribute("checked", true);
      } else {
        fieldsetInputs[j].removeAttribute("checked");
      }
    };
  };

  if (carInput.checked === true) {
    carBlock.classList.remove("hidden");
    vanBlock.classList.add("hidden");
  } else {
    vanBlock.classList.remove("hidden");
    carBlock.classList.add("hidden");
  }

  if (query.duration.daily.checked) {
    durationText.innerText = '/day'
  } else {
    durationText.innerText = '/week'
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

  // Flatten form state into one layer for easy processing
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
  const duration = query["duration"] === 'weekly' ? 1 : 0;
  let price = prices[vehicleType][vehicleSize][duration];
  return `£${price}`;
}

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
