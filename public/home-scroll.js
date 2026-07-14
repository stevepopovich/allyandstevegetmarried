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

function createHomeNav(panels) {
  const nav = document.createElement("nav");
  nav.className = "home-nav";
  nav.setAttribute("aria-label", "Page sections");

  const buttons = [];

  panels.forEach((panel) => {
    const iconName = panel.getAttribute("data-nav-icon");
    if (!iconName) return;

    const label = panel.getAttribute("aria-label") || "Section";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "home-nav__btn";
    button.setAttribute("aria-label", label);
    button.dataset.target = panel.id;

    const icon = document.createElement("i");
    icon.className = "home-nav__icon";
    icon.setAttribute("data-lucide", iconName);
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);

    button.addEventListener("click", () => {
      panel.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    });

    nav.appendChild(button);
    buttons.push({ button, panel });
  });

  return { nav, buttons };
}

function renderNavIcons(nav) {
  if (typeof lucide === "undefined" || typeof lucide.createIcons !== "function") {
    return;
  }
  lucide.createIcons({
    attrs: {
      class: "home-nav__icon",
      "stroke-width": 1.75,
      "aria-hidden": "true",
    },
  });
}

function bindNavActiveState(scrollRoot, buttons) {
  if (!buttons.length) return;

  const setActive = (activePanel) => {
    buttons.forEach(({ button, panel }) => {
      const isActive = panel === activePanel;
      button.classList.toggle("is-active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  };

  setActive(buttons[0].panel);

  const ratios = new Map();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        ratios.set(entry.target, entry.intersectionRatio);
      });

      let bestPanel = null;
      let bestRatio = 0;
      ratios.forEach((ratio, panel) => {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestPanel = panel;
        }
      });

      if (bestPanel) setActive(bestPanel);
    },
    {
      root: scrollRoot,
      threshold: [0, 0.25, 0.5, 0.55, 0.75, 1],
    }
  );

  buttons.forEach(({ panel }) => observer.observe(panel));
}

document.querySelectorAll(".home-scroll").forEach((scrollRoot) => {
  const panels = [...scrollRoot.querySelectorAll(".home-panel")];

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

  const navPanels = panels.filter((panel) => panel.hasAttribute("data-nav-icon"));
  if (!navPanels.length) return;

  const { nav, buttons } = createHomeNav(navPanels);
  document.body.insertBefore(nav, document.body.firstChild);
  renderNavIcons(nav);
  bindNavActiveState(scrollRoot, buttons);
});
