const form = document.forms["contact-form"];

form.addEventListener("submit", e => {
  submitForm(e);
});

function submitForm(e) {
  e.preventDefault();
  const name = form.querySelector("input[name='name']").value;
  const phone = form.querySelector("input[name='phone']").value;
  const email = form.querySelector("input[name='email']").value;
  const message = form.querySelector("textarea[name='message']").value;
  const telephone = form.querySelector("input[name='telephone']").value;
  const formData = {
    name,
    email,
    phone,
    message,
    telephone
  };
  form.reset();
  axios.post("/contact", formData).then(res => {
    if (res.status === 200) {
      flashMessage(true);
    } else {
      flashMessage(false);
    }
  });
}

function flashMessage(success = true) {
  const flash = form.querySelector(".flash-message");
  flash.innerHTML = "";
  const flashMessage = document.createElement("p");
  if (success) {
    flashMessage.innerHTML =
      "Thanks for your enquiry. We'll get back to you as soon as possible.";
  } else {
    flashMessage.innerHTML =
      "Error submitting your enquiry. Please call us or try again later.";
    flashMessage.classList.add("error");
  }
  flash.appendChild(flashMessage);
}
