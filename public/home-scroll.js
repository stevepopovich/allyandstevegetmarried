const scrollBehavior = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

function bindScrollHint(hint, next) {
  hint.addEventListener("click", () => {
    next.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  });
}

function createScrollHint(next) {
  const nextLabel = next.getAttribute("aria-label");
  const hint = document.createElement("button");
  hint.type = "button";
  hint.className = "scroll-hint";
  hint.setAttribute(
    "aria-label",
    nextLabel ? `Scroll to ${nextLabel}` : "Scroll to next section"
  );
  hint.innerHTML = `<svg class="scroll-hint__arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 347.98 200.44" width="48" height="28" aria-hidden="true">
    <polyline fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" points="3 3.25 173.83 135.3 344.98 3"/>
    <polyline fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" points="3 65.39 173.83 197.44 344.98 65.14"/>
  </svg>`;
  return hint;
}

document.querySelectorAll(".home-scroll").forEach((scrollRoot) => {
  const panels = scrollRoot.querySelectorAll(".home-panel");
  panels.forEach((panel, index) => {
    if (index === panels.length - 1) return;

    const next = panels[index + 1];
    let hint = panel.querySelector(".scroll-hint");
    if (!hint) {
      hint = createScrollHint(next);
      panel.appendChild(hint);
    }
    bindScrollHint(hint, next);
  });
});
