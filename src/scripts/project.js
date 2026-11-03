import { initImageLoadIndicators } from "./utils.js";
import { initializeVideoPlayers } from "./video-player.js";

document.addEventListener("DOMContentLoaded", () => {
  initImageLoadIndicators();
  initializeVideoPlayers();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { target: video, isIntersecting } of entries) {
        if (!isIntersecting) video.pause();
      }
    },
    { threshold: 0.15 },
  );
  document
    .querySelectorAll("video[data-src]")
    .forEach((video) => observer.observe(video));
});
