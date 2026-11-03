document.addEventListener("DOMContentLoaded", () => {
  const video = document.querySelector(".hero-video video");
  if (!video) return;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const connection = navigator.connection;
  const control = document.createElement("button");
  control.type = "button";
  control.className = "showreel-control";
  control.textContent = "PLAY SHOWREEL";
  control.setAttribute("aria-label", "Play showreel");
  video.parentElement.append(control);
  let allowed =
    !reducedMotion.matches &&
    !connection?.saveData &&
    !/2g/.test(connection?.effectiveType || "");
  let visible = true;
  let userPaused = false;
  function start() {
    if (!video.src) {
      video.src =
        innerWidth <= 768 ? video.dataset.mobileSrc : video.dataset.desktopSrc;
      video.load();
    }
    video.play().catch(() => {
      control.textContent = "PLAY SHOWREEL";
    });
  }
  control.addEventListener("click", () => {
    if (video.paused) {
      allowed = true;
      userPaused = false;
      start();
    } else {
      userPaused = true;
      video.pause();
    }
  });
  video.addEventListener("play", () => {
    control.textContent = "PAUSE SHOWREEL";
    control.setAttribute("aria-label", "Pause showreel");
    performance.mark("showreel-start");
  });
  video.addEventListener("pause", () => {
    control.textContent = "PLAY SHOWREEL";
    control.setAttribute("aria-label", "Play showreel");
  });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) video.pause();
    else if (allowed && !userPaused && document.visibilityState === "visible")
      start();
  });
  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) {
      allowed = false;
      video.pause();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) video.pause();
    else if (visible && allowed && !userPaused) start();
  });
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      performance.mark("hero-content-ready");
      observer.observe(video);
    }),
  );
});
