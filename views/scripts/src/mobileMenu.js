const menuButton = document.querySelector(".main-nav-dropdown-toggle");
const menu = document.querySelector(".main-nav");

menuButton.addEventListener("click", function(e) {
  e.preventDefault();
  if (menu.classList.contains("mobile-active")) {
    menu.classList.remove("mobile-active");
  } else {
    menu.classList.add("mobile-active");
  }
});
