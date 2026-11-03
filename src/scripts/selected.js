import { initInfiniteProjectScroll } from "./selected-scroll.js";

const mediaNavigationState = new WeakMap();
const hashReplaceDelayMs = 180;
const programmaticScrollLockMs = 1200;

let hashObserverLock = {
  active: false,
  targetId: null,
  releaseAt: 0,
};

function parseMediaData(mediaElement) {
  if (!mediaElement) return [];

  const rawMedia = mediaElement.getAttribute("data-media");
  if (rawMedia) {
    try {
      const parsed = JSON.parse(rawMedia);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }

  const rawImages = mediaElement.getAttribute("data-images");
  if (!rawImages) return [];

  try {
    const parsed = JSON.parse(rawImages);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((path) => ({ path, type: "image" }));
  } catch {
    return [];
  }
}

function getProjectMediaElement(section) {
  return section.querySelector(
    ".project-image .project-media, .project-image img, .project-image video",
  );
}

function isVideoMedia(item) {
  return item?.type === "video";
}

function createMediaNode(mediaItem, mediaList, mediaIndex, projectTitle) {
  if (isVideoMedia(mediaItem)) {
    const video = document.createElement("video");
    video.className = "project-media";
    video.src = mediaItem.path;
    video.autoplay =
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !navigator.connection?.saveData;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", projectTitle || "project video");
    video.setAttribute("data-media", JSON.stringify(mediaList));
    video.setAttribute("data-media-index", String(mediaIndex));
    return video;
  }

  const img = document.createElement("img");
  img.className = "project-media";
  img.src = mediaItem.path;
  img.alt = projectTitle || "project image";
  img.loading = "eager";
  img.decoding = "async";
  if (mediaItem.srcset) {
    img.srcset = mediaItem.srcset;
    img.sizes = "(max-width: 758px) 100vw, 75vw";
  }
  if (mediaItem.width) {
    img.width = mediaItem.width;
    img.height = mediaItem.height;
  }
  img.setAttribute("data-media", JSON.stringify(mediaList));
  img.setAttribute("data-media-index", String(mediaIndex));
  return img;
}

function updateMediaCounter(currentIndex, totalMedia, counterElement) {
  if (!counterElement) return;
  counterElement.textContent = `IMAGE ${currentIndex + 1} OUT OF ${totalMedia}`;
}

function replaceProjectMedia(section, mediaList, mediaIndex) {
  const imageContainer = section.querySelector(".project-image");
  const counterElement = section.querySelector("#gallery-counter");
  if (!imageContainer || !mediaList.length) return null;

  const mediaItem = mediaList[mediaIndex];
  const projectTitle =
    section.querySelector("#title")?.textContent || section.id;

  const state = mediaNavigationState.get(section) || {};
  clearTimeout(state.timer);
  state.index = mediaIndex;
  mediaNavigationState.set(section, state);
  imageContainer.classList.add("transitioning");

  state.timer = setTimeout(() => {
    imageContainer.innerHTML = "";
    const nextNode = createMediaNode(
      mediaItem,
      mediaList,
      mediaIndex,
      projectTitle,
    );
    imageContainer.appendChild(nextNode);
    updateMediaCounter(mediaIndex, mediaList.length, counterElement);
    imageContainer.classList.remove("transitioning");

    if (nextNode instanceof HTMLVideoElement && nextNode.autoplay) {
      const playPromise = nextNode.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    }
  }, 180);

  return mediaIndex;
}

function initializeProjectSection(section) {
  section
    .querySelectorAll("details.selected-project-details")
    .forEach((copy) => {
      copy.addEventListener("click", (event) => {
        if (event.target.closest("summary, a, button, input, textarea, select"))
          return;
        if (window.getSelection()?.toString()) return;
        copy.open = !copy.open;
      });
    });

  const mediaElement = getProjectMediaElement(section);
  const mediaList = parseMediaData(mediaElement);
  if (mediaList.length) addMediaNavigation(section, mediaList);
}

document.addEventListener("DOMContentLoaded", () => {
  const projectSections = document.querySelectorAll(".project-section");
  if (!projectSections.length) return;
  projectSections.forEach(initializeProjectSection);
  const projectScroll = initInfiniteProjectScroll(
    initializeProjectSection,
    (section) => {
      clearTimeout(mediaNavigationState.get(section)?.timer);
      section.querySelectorAll("video").forEach((video) => video.pause());
    },
  );
  window.addEventListener("hashchange", () => {
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }
    const container = document.getElementById("random-gallery-container");
    const section = [...container.querySelectorAll(".project-section")]
      .filter((section) => section.dataset.projectId === id)
      .sort(
        (a, b) =>
          Math.abs(a.offsetTop - container.scrollTop) -
          Math.abs(b.offsetTop - container.scrollTop),
      )[0];
    if (!section) return;
    hashObserverLock = {
      active: true,
      targetId: id,
      releaseAt: performance.now() + programmaticScrollLockMs,
    };
    projectScroll?.ensureAround(section.offsetTop);
    section.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  });
  initSelectedMedia();
  addProjectNavigation(projectScroll);
  trackScrollPosition();
  addTransitionStyles();
});

function addTransitionStyles() {
  if (document.getElementById("selected-transition-style")) return;

  const style = document.createElement("style");
  style.id = "selected-transition-style";
  style.textContent = `
        .project-image .project-media {
            transition: opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            opacity: 1;
        }
        .project-image.transitioning .project-media {
            opacity: 0;
        }
    `;
  document.head.appendChild(style);
}

function addMediaNavigation(section, mediaList) {
  const imageContainer = section.querySelector(".project-image");
  if (!imageContainer || !mediaList.length) return;

  let lastSwipeTime = -Infinity;
  imageContainer.addEventListener("click", (event) => {
    if (performance.now() - lastSwipeTime < 500) return;
    const rect = imageContainer.getBoundingClientRect();
    if (event.clientY > rect.bottom - 56) {
      return;
    }

    const clickX = event.clientX - rect.left;
    if (clickX < rect.width / 2) {
      navigateProjectMedia(section, -1);
    } else {
      navigateProjectMedia(section, 1);
    }
  });

  let touchStartX = null;
  imageContainer.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].screenX;
  });

  imageContainer.addEventListener("touchend", (event) => {
    if (touchStartX === null) return;

    const touchEndX = event.changedTouches[0].screenX;
    const diffX = touchEndX - touchStartX;

    if (Math.abs(diffX) > 20) {
      lastSwipeTime = performance.now();
      if (diffX > 0) {
        navigateProjectMedia(section, -1);
      } else {
        navigateProjectMedia(section, 1);
      }
    }

    touchStartX = null;
  });
}

function navigateProjectMedia(section, direction) {
  const mediaElement = getProjectMediaElement(section);
  const mediaList = parseMediaData(mediaElement);
  if (!mediaList.length) return;
  const index =
    mediaNavigationState.get(section)?.index ??
    Number(mediaElement.dataset.mediaIndex || 0);
  replaceProjectMedia(
    section,
    mediaList,
    (index + direction + mediaList.length) % mediaList.length,
  );
}

function getVisibleProjectIndex(projectSections) {
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  projectSections.forEach((section, index) => {
    const rect = section.getBoundingClientRect();
    const distance = Math.abs(
      (rect.top + rect.bottom) / 2 - window.innerHeight / 2,
    );
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

function addProjectNavigation(projectScroll) {
  let navigationTarget = null;
  document.addEventListener("keydown", (event) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.target.closest(
        '.selected-project-details, #nav-menu, input, textarea, select, button, a, [contenteditable="true"]',
      )
    )
      return;
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    projectScroll?.ensureAround(
      hashObserverLock.active && navigationTarget?.isConnected
        ? navigationTarget.offsetTop
        : undefined,
    );
    const projectSections = [...document.querySelectorAll(".project-section")];
    const currentProjectIndex =
      hashObserverLock.active &&
      performance.now() < hashObserverLock.releaseAt &&
      navigationTarget?.isConnected
        ? projectSections.indexOf(navigationTarget)
        : getVisibleProjectIndex(projectSections);

    const currentProject = projectSections[currentProjectIndex];
    if (!currentProject) return;

    const mediaElement = getProjectMediaElement(currentProject);
    const mediaList = parseMediaData(mediaElement);
    if (!mediaList.length) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateProjectMedia(currentProject, -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateProjectMedia(currentProject, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      updateProjectView(
        projectSections[
          (currentProjectIndex - 1 + projectSections.length) %
            projectSections.length
        ],
      );
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      updateProjectView(
        projectSections[(currentProjectIndex + 1) % projectSections.length],
      );
    }
  });

  function updateProjectView(currentProject) {
    if (!currentProject) return;
    navigationTarget = currentProject;
    projectScroll?.ensureAround(currentProject.offsetTop);

    const projectId = currentProject.dataset.projectId || currentProject.id;
    hashObserverLock = {
      active: true,
      targetId: projectId,
      releaseAt: performance.now() + programmaticScrollLockMs,
    };

    currentProject.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });

    if (window.location.hash !== `#${projectId}`) {
      history.pushState(null, null, `#${projectId}`);
    }
  }
}

function trackScrollPosition() {
  let hashUpdateTimer = null;

  const scheduleHashReplace = (projectId) => {
    if (!projectId) return;

    if (
      hashObserverLock.active &&
      hashObserverLock.targetId &&
      projectId !== hashObserverLock.targetId
    ) {
      return;
    }

    if (hashUpdateTimer) {
      clearTimeout(hashUpdateTimer);
    }

    hashUpdateTimer = setTimeout(() => {
      if (hashObserverLock.active && projectId !== hashObserverLock.targetId)
        return;
      const nextHash = `#${projectId}`;
      if (window.location.hash !== nextHash) {
        const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
        history.replaceState(null, null, nextUrl);
      }
    }, hashReplaceDelayMs);
  };

  const syncVisibleProject = () => {
    const projectSections = [...document.querySelectorAll(".project-section")];
    const visibleIndex = getVisibleProjectIndex(projectSections);
    const section = projectSections[visibleIndex];
    const projectId = section.dataset.projectId || section.id;
    if (hashObserverLock.active) {
      const reachedTarget =
        projectId === hashObserverLock.targetId &&
        Math.abs(section.getBoundingClientRect().top) < 1;
      if (!reachedTarget && performance.now() < hashObserverLock.releaseAt)
        return;
      hashObserverLock = { active: false, targetId: null, releaseAt: 0 };
    }
    scheduleHashReplace(projectId);
  };

  const scrollContainer = document.getElementById("random-gallery-container");
  let scrollFrame = null;
  scrollContainer.addEventListener(
    "scroll",
    () => {
      if (scrollFrame !== null) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = null;
        syncVisibleProject();
      });
    },
    { passive: true },
  );
  scrollContainer.addEventListener("scrollend", () => {
    hashObserverLock = { active: false, targetId: null, releaseAt: 0 };
    syncVisibleProject();
  });
  const releaseScrollLock = () => {
    hashObserverLock = { active: false, targetId: null, releaseAt: 0 };
  };
  scrollContainer.addEventListener("wheel", releaseScrollLock, {
    passive: true,
  });
  scrollContainer.addEventListener("touchstart", releaseScrollLock, {
    passive: true,
  });
  syncVisibleProject();
}

function initSelectedMedia() {
  const root = document.getElementById("random-gallery-container");
  const imageObserver = new IntersectionObserver(
    (entries) => {
      for (const { target: section, isIntersecting } of entries) {
        const image = section.querySelector("img[data-src]");
        if (!isIntersecting || !image) continue;
        if (image.dataset.srcset) image.srcset = image.dataset.srcset;
        image.src = image.dataset.src;
        image.loading = "eager";
        delete image.dataset.src;
        delete image.dataset.srcset;
      }
    },
    { root, rootMargin: "100% 0px", threshold: 0.1 },
  );
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { target: section, isIntersecting } of entries) {
        const video = section.querySelector("video");
        if (!video) continue;
        if (!isIntersecting) {
          video.pause();
          continue;
        }
        if (!video.src && video.dataset.src) {
          video.src = video.dataset.src;
          video.load();
        }
        if (
          !matchMedia("(prefers-reduced-motion: reduce)").matches &&
          !navigator.connection?.saveData
        )
          video.play().catch(() => {});
      }
    },
    { root, threshold: 0.1 },
  );
  const observeSection = (section) => {
    imageObserver.observe(section);
    observer.observe(section);
  };
  const observe = (node) => {
    if (!(node instanceof Element)) return;
    if (node.matches(".project-section")) observeSection(node);
    node.querySelectorAll(".project-section").forEach(observeSection);
  };
  root.querySelectorAll(".project-section").forEach(observeSection);
  new MutationObserver((records) =>
    records.forEach((record) => {
      record.addedNodes.forEach(observe);
      record.removedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches(".project-section")) {
          observer.unobserve(node);
          imageObserver.unobserve(node);
        }
        node.querySelectorAll(".project-section").forEach((section) => {
          observer.unobserve(section);
          imageObserver.unobserve(section);
        });
      });
    }),
  ).observe(root, { childList: true, subtree: true });
}
