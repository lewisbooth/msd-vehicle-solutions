"use strict";var menuButton=document.querySelector(".main-nav-dropdown-toggle"),menu=document.querySelector(".main-nav");menuButton.addEventListener("click",function(e){e.preventDefault(),menu.classList.contains("mobile-active")?menu.classList.remove("mobile-active"):menu.classList.add("mobile-active")});