import {
  handleFooterClick,
  redirectToHomepage,
  navigateToProject,
  updateTime,
} from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  const emailLink = document.querySelector(".sticky-email");
  if (emailLink) {
    let blinkTimeout;
    const copiedLabelKey = "sticky-email-copied-label";
    let copiedLabel = "email";

    try {
      const savedLabel = localStorage.getItem(copiedLabelKey);
      if (savedLabel === "email" || savedLabel?.startsWith("email COPIED!")) {
        copiedLabel = savedLabel;
      } else if (savedLabel?.startsWith("COPIED!")) {
        copiedLabel = `email ${savedLabel}`;
      }
    } catch (error) {
      console.error("Could not load saved email label:", error);
    }
    emailLink.textContent = copiedLabel;

    emailLink.addEventListener("click", async (event) => {
      event.preventDefault();

      const email = emailLink.href.replace(/^mailto:/, "").split("?")[0];
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(email);
        } else {
          const temporaryInput = document.createElement("textarea");
          temporaryInput.value = email;
          temporaryInput.style.position = "fixed";
          temporaryInput.style.opacity = "0";
          document.body.appendChild(temporaryInput);
          temporaryInput.select();
          const copied = document.execCommand("copy");
          temporaryInput.remove();
          if (!copied) return;
        }

        copiedLabel =
          copiedLabel === "email"
            ? "email COPIED!"
            : copiedLabel.length - "email COPIED".length >= 29
              ? "email"
              : `${copiedLabel}!`;
        emailLink.textContent = copiedLabel;
        try {
          localStorage.setItem(copiedLabelKey, copiedLabel);
        } catch (error) {
          console.error("Could not save email label:", error);
        }
        emailLink.classList.remove("blinking");
        void emailLink.offsetWidth;
        emailLink.classList.add("blinking");

        clearTimeout(blinkTimeout);
        blinkTimeout = setTimeout(
          () => emailLink.classList.remove("blinking"),
          100,
        );
      } catch (error) {
        console.error("Could not copy email address:", error);
      }
    });
  }

  document.querySelectorAll(".copy-contact").forEach((copyButton) => {
    const valueToCopy = copyButton.dataset.copyValue;
    const storageKey = `copy-label-${copyButton.dataset.copyKey}`;
    const originalLabel = copyButton.textContent.trim();
    let copiedLabel = originalLabel;
    let blinkTimeout;

    try {
      const savedLabel = localStorage.getItem(storageKey);
      const copiedPrefix = `${originalLabel} COPIED!`;
      if (
        savedLabel === originalLabel ||
        savedLabel?.startsWith(copiedPrefix)
      ) {
        copiedLabel = savedLabel;
      } else if (savedLabel?.startsWith("COPIED!")) {
        copiedLabel = `${originalLabel} ${savedLabel}`;
      }
    } catch (error) {
      console.error("Could not load saved copy label:", error);
    }
    copyButton.textContent = copiedLabel;

    copyButton.addEventListener("click", async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(valueToCopy);
        } else {
          const temporaryInput = document.createElement("textarea");
          temporaryInput.value = valueToCopy;
          temporaryInput.style.position = "fixed";
          temporaryInput.style.opacity = "0";
          document.body.appendChild(temporaryInput);
          temporaryInput.select();
          const copied = document.execCommand("copy");
          temporaryInput.remove();
          if (!copied) return;
        }

        copiedLabel =
          copiedLabel === originalLabel
            ? `${originalLabel} COPIED!`
            : copiedLabel.length - `${originalLabel} COPIED`.length >= 100
              ? originalLabel
              : `${copiedLabel}!`;
        copyButton.textContent = copiedLabel;

        try {
          localStorage.setItem(storageKey, copiedLabel);
        } catch (error) {
          console.error("Could not save copy label:", error);
        }

        copyButton.classList.remove("blinking");
        void copyButton.offsetWidth;
        copyButton.classList.add("blinking");
        clearTimeout(blinkTimeout);
        blinkTimeout = setTimeout(
          () => copyButton.classList.remove("blinking"),
          100,
        );
      } catch (error) {
        console.error("Could not copy contact detail:", error);
      }
    });
  });

  let savedTheme;
  try {
    savedTheme = localStorage.getItem("theme");
  } catch {}

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }

  handleFooterClick();

  // initialize clock if time element exists
  const timeElement = document.getElementById("time");
  if (timeElement) {
    updateTime(); // initial update
    setInterval(updateTime, 1000); // update every second
  }

  const legacyNextProjectButton = document.querySelector(
    "#next-project[data-next-id]",
  );
  if (legacyNextProjectButton) {
    legacyNextProjectButton.tabIndex = 0;
    legacyNextProjectButton.setAttribute("role", "link");
    legacyNextProjectButton.addEventListener("click", function () {
      navigateToProject(this.getAttribute("data-next-id"));
    });
    legacyNextProjectButton.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      navigateToProject(this.getAttribute("data-next-id"));
    });
  }

  window.redirectToHomepage = redirectToHomepage;
  const homeButton = document.getElementById("home");
  if (homeButton) {
    homeButton.addEventListener("click", redirectToHomepage);
  }

  // document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  const menuIcon = document.getElementById("menu-icon");
  const navMenu = document.getElementById("nav-menu");
  const normalizePagePath = (pathname) =>
    pathname.replace(/\/index\.html$/, "/").replace(/\/+$/, "") || "/";
  const currentPagePath = normalizePagePath(window.location.pathname);
  if (!navMenu || !menuIcon) return;
  navMenu.querySelectorAll("a[href]").forEach((link) => {
    const destination = new URL(link.href);
    const destinationPath = normalizePagePath(destination.pathname);
    const isSameOrigin = destination.origin === window.location.origin;
    if (isSameOrigin && destinationPath === currentPagePath) {
      link.setAttribute("aria-current", "page");
    } else if (
      isSameOrigin &&
      destinationPath === "/archive" &&
      currentPagePath.startsWith("/archive/")
    ) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  menuIcon.addEventListener("click", () => {
    navMenu.classList.toggle("open");
    menuIcon.classList.toggle("open");
    menuIcon.setAttribute(
      "aria-expanded",
      String(navMenu.classList.contains("open")),
    );
    menuIcon.setAttribute(
      "aria-label",
      navMenu.classList.contains("open") ? "Close menu" : "Open menu",
    );
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !navMenu.classList.contains("open")) return;

    navMenu.classList.remove("open");
    menuIcon.classList.remove("open");
    menuIcon.setAttribute("aria-expanded", "false");
    menuIcon.setAttribute("aria-label", "Open menu");
  });

  const columnGrid = document.createElement("div");
  columnGrid.id = "column-grid-overlay";
  columnGrid.setAttribute("aria-hidden", "true");
  for (let column = 0; column < 4; column += 1) {
    columnGrid.appendChild(document.createElement("div"));
  }
  document.body.appendChild(columnGrid);

  document.addEventListener("keydown", (event) => {
    if (
      event.key.toLowerCase() !== "d" ||
      event.repeat ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.target.closest('input, textarea, select, [contenteditable="true"]')
    )
      return;

    columnGrid.classList.toggle("is-visible");
  });
});
