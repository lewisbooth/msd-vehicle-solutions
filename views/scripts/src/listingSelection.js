const searchButton = document.querySelector(".listing-selection button");

const typeText = document.querySelector(".type span");
const vehicleText = document.querySelector(".vehicle span");

const typeOptions = document.querySelectorAll(
  ".type .listing-selection-dropdown-group-option"
);

const vehicleOptions = document.querySelectorAll(
  ".vehicle .listing-selection-dropdown-group-option"
);

addListeners(typeOptions, typeText);
addListeners(vehicleOptions, vehicleText);

function addListeners(nodeList, targetElement) {
  for (let i = 0; i < nodeList.length; i++) {
    nodeList[i].addEventListener("click", function(e) {
      const newValue = e.target.textContent;
      targetElement.textContent = newValue;
    });
  }
}

searchButton.addEventListener("click", function() {
  let type = typeText.textContent;
  let vehicle = vehicleText.textContent;
  if (vehicle === "Van") vehicle = "vans";
  if (vehicle === "Car") vehicle = "cars";
  if (type === "Hire") type = "hire";
  if (type === "Lease") type = "leasing";
  if (type === "Buy") type = "sales";
  window.location = "/vehicles/" + type + "/" + vehicle;
});
