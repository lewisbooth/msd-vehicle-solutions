"use strict";function moveForm(){window.innerWidth<1024?topSection.insertBefore(formBlock,content):aside.insertBefore(formBlock,callToBook)}function setState(e){formState=e,renderForm()}function getState(){var e={};return fieldsets.forEach(function(t){var r=t.getAttribute("name"),o={};t.querySelectorAll("input").forEach(function(e){var t=e.getAttribute("name"),r=null!==e.getAttribute("checked");o[t]={checked:r}}),e[r]=o}),e}function renderForm(){priceOutput.innerHTML=getPrice(),fieldsets.forEach(function(e){var t=e.getAttribute("name");e.querySelectorAll("input").forEach(function(e){var r=e.getAttribute("name");!0===formState[t][r].checked?e.setAttribute("checked",!0):e.removeAttribute("checked")})})}function checkInput(e){var t=JSON.parse(JSON.stringify(formState)),r=e.target.getAttribute("name"),o=e.target.parentElement.getAttribute("name");for(var n in t[o]){var c=n===r;t[o][n].checked=c}setState(t)}function getPrice(){var e=JSON.parse(JSON.stringify(formState));for(var t in e){for(var r in e[t])!1===e[t][r].checked&&delete e[t][r];e[t]=Object.keys(e[t])[0]}var o=e["vehicle-type"],n=e["vehicle-size"],c=e.days,i=prices[o][n];if(void 0!==discounts[c]){var a=1-discounts[c]/100;i=Math.floor(i*a)}return"£"+i}var prices={van:{small:50,medium:70,large:90,"x-large":105},car:{small:35,medium:45,large:55,"x-large":65}},discounts={"3-7":10,"8-14":15,"15+":20},form=document.forms["instant-quote"],fieldsets=form.querySelectorAll(".options"),inputs=form.querySelectorAll("input"),priceOutput=form.querySelector("output"),aside=document.querySelector("aside"),callToBook=aside.querySelector(".call-to-book"),formBlock=document.querySelector(".instant-quote"),content=document.querySelector(".article-header"),topSection=document.querySelector(".article-header").parentNode;moveForm(),window.addEventListener("resize",function(){moveForm()}),form.addEventListener("submit",function(e){return e.preventDefault()}),inputs.forEach(function(e){e.addEventListener("click",function(e){return checkInput(e)})});var formState=getState();renderForm();