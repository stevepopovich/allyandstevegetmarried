const form = document.getElementById("rsvp-form");
const messageEl = document.getElementById("rsvp-message");

function setMessage(text, kind) {
  messageEl.textContent = text;
  messageEl.className = "form-message" + (kind ? ` ${kind}` : "");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage("");

  const nameInput = form.querySelector("#rsvp-name");
  const attendingInput = form.querySelector('input[name="attending"]:checked');

  const name = (nameInput.value || "").trim();
  if (!name) {
    setMessage("Please enter your full name.", "error");
    return;
  }
  if (!attendingInput) {
    setMessage("Please choose whether you are coming.", "error");
    return;
  }

  const attending = attendingInput.value === "yes";
  const submitBtn = form.querySelector(".submit");
  submitBtn.disabled = true;

  try {
    const res = await fetch("/.netlify/functions/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, attending }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data.error || "Something went wrong. Please try again.", "error");
      return;
    }

    setMessage("Thank you — your RSVP has been saved.", "success");
    form.reset();
  } catch {
    setMessage("Could not reach the server. Check your connection and try again.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});
