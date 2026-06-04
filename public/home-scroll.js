document.querySelectorAll(".scroll-hint").forEach((hint) => {
  const next = hint.closest(".home-panel")?.nextElementSibling;
  if (!next?.classList.contains("home-panel")) return;

  hint.addEventListener("click", () => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    next.scrollIntoView({ behavior, block: "start" });
  });
});
