const form = document.getElementById("rsvp-form");
const messageEl = document.getElementById("rsvp-message");

const venueCarousel = document.getElementById("venue-carousel");
if (venueCarousel) {
  const track = venueCarousel.querySelector(".carousel-track");
  const slides = venueCarousel.querySelectorAll(".carousel-slide");
  const prevBtn = venueCarousel.querySelector(".carousel-btn-prev");
  const nextBtn = venueCarousel.querySelector(".carousel-btn-next");
  const dots = venueCarousel.querySelectorAll(".carousel-dot");
  const viewport = venueCarousel.querySelector(".carousel-viewport");
  const count = slides.length;

  let index = 0;

  function goTo(nextIndex) {
    index = ((nextIndex % count) + count) % count;
    const pct = (100 / count) * index;
    track.style.transform = `translateX(-${pct}%)`;

    slides.forEach((slide, i) => {
      slide.setAttribute("aria-hidden", i === index ? "false" : "true");
    });

    dots.forEach((dot, i) => {
      if (i === index) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    });
  }

  prevBtn?.addEventListener("click", () => goTo(index - 1));
  nextBtn?.addEventListener("click", () => goTo(index + 1));

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const i = parseInt(dot.getAttribute("data-go-to"), 10);
      if (!Number.isNaN(i)) goTo(i);
    });
  });

  viewport?.setAttribute("tabindex", "0");
  viewport?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    }
  });

  goTo(0);
}

function setMessage(text, kind) {
  messageEl.textContent = text;
  messageEl.className = "form-message" + (kind ? ` ${kind}` : "");
}

if (form && messageEl) form.addEventListener("submit", async (e) => {
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
