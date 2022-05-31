document.querySelector(".confirm-delete")
  .addEventListener("click", confirmDelete);

document.querySelector(".modal-box .cancel")
  .addEventListener("click", confirmDelete);

const body = document.querySelector("body");

function confirmDelete(e) {
  e.preventDefault();
  if (body.classList.contains("modal-active")) {
    body.classList.remove("modal-active");
  } else {
    body.classList.add("modal-active");
  }
}
