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
