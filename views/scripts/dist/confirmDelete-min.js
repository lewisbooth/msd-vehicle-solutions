"use strict";function confirmDelete(e){e.preventDefault(),body.classList.contains("modal-active")?body.classList.remove("modal-active"):body.classList.add("modal-active")}document.querySelector(".confirm-delete").addEventListener("click",confirmDelete),document.querySelector(".modal-box .cancel").addEventListener("click",confirmDelete);var body=document.querySelector("body");