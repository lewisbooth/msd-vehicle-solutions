const menuButton = $(".main-nav-dropdown-toggle")
const menu = $(".main-nav")

menuButton.addEventListener("click", function(e) {
  e.preventDefault()
  if (menu.classList.contains("mobile-active")) {
    menu.classList.remove("mobile-active")
  } else {
    menu.classList.add("mobile-active")
  }
})
