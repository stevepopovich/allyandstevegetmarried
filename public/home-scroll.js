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
    const navLabel = panel.getAttribute("data-nav-label");
    if (!navLabel) return;

    const a11yLabel = panel.getAttribute("aria-label") || navLabel;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "home-nav__btn";
    button.setAttribute("aria-label", a11yLabel);
    button.dataset.target = panel.id;
    button.textContent = navLabel;

    button.addEventListener("click", () => {
      panel.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    });

    nav.appendChild(button);
    buttons.push({ button, panel });
  });

  return { nav, buttons };
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

function createSwipeHint() {
  const hint = document.createElement("div");
  hint.className = "trio-swipe-hint";
  hint.setAttribute("aria-hidden", "true");
  hint.innerHTML = `<svg class="trio-swipe-hint__arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 347.98 200.44" width="36" height="21" aria-hidden="true">
    <polyline fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" points="3 3.25 173.83 135.3 344.98 3"/>
    <polyline fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" points="3 65.39 173.83 197.44 344.98 65.14"/>
  </svg>`;
  return hint;
}

function ensureScrollerWrap(scroller) {
  let wrap = scroller.parentElement;
  if (!wrap || !wrap.classList.contains("trio-slide__scroller-wrap")) {
    wrap = document.createElement("div");
    wrap.className = "trio-slide__scroller-wrap";
    scroller.before(wrap);
    wrap.appendChild(scroller);
  }

  let hint = wrap.querySelector(".trio-swipe-hint");
  if (!hint) {
    hint = createSwipeHint();
    wrap.appendChild(hint);
  }

  return { wrap, hint };
}

function bindTrioScrollers(root = document) {
  const scrollers = [...root.querySelectorAll(".trio-slide__scroller")];
  if (!scrollers.length) return;

  const updateScroller = (scroller, hint) => {
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    const isScrollable = maxScroll > 1;
    const isAtEnd = !isScrollable || scroller.scrollLeft >= maxScroll - 2;
    scroller.classList.toggle("is-scrollable", isScrollable);
    scroller.classList.toggle("is-at-end", isAtEnd);
    hint.classList.toggle("is-visible", isScrollable && !isAtEnd);
  };

  const bindings = scrollers.map((scroller) => {
    const { hint } = ensureScrollerWrap(scroller);
    return { scroller, hint };
  });

  const updateAll = () => {
    bindings.forEach(({ scroller, hint }) => updateScroller(scroller, hint));
  };

  bindings.forEach(({ scroller, hint }) => {
    scroller.addEventListener("scroll", () => updateScroller(scroller, hint), {
      passive: true,
    });

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateAll);
      observer.observe(scroller);
      const track = scroller.querySelector(".trio-slide__track");
      if (track) observer.observe(track);
    }
  });

  window.addEventListener("resize", updateAll);
  updateAll();
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

  bindTrioScrollers(scrollRoot);

  const navPanels = panels.filter((panel) => panel.hasAttribute("data-nav-label"));
  if (!navPanels.length) return;

  const { nav, buttons } = createHomeNav(navPanels);
  document.body.insertBefore(nav, document.body.firstChild);
  bindNavActiveState(scrollRoot, buttons);
});
