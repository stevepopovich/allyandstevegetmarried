document.querySelectorAll(".scroll-hint").forEach((hint) => {
  const panel = hint.closest(".home-scroll")?.querySelector(".home-panel--details");
  if (!panel) return;

  hint.addEventListener("click", () => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    panel.scrollIntoView({ behavior, block: "start" });
  });
});
