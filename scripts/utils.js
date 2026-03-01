//////////////////////////////////////////
//           Shared Functions
//////////////////////////////////////////

export function navigateToProject(projectId) {
    if (projectId) {
        window.location.href = '/archive/' + projectId;
    }
}

export function redirectToHomepage() {
    window.location.href = '/';
}

export function toggleTheme() {
    document.body.classList.toggle('dark-mode');

    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

export function showLoader(elementId = null) {
    const isWholeScreen = elementId === null;
    const container = isWholeScreen ? document.body : document.getElementById(elementId);

    if (!document.getElementById('loader')) {
        const loader = document.createElement('div');
        loader.id = 'loader';
        loader.innerHTML = `
            <div class="spinner"></div>
        `;

        if (isWholeScreen) {
            loader.style.position = 'fixed';
        } else {
            loader.style.position = 'absolute';
        }

        container.appendChild(loader);
        container.classList.add('loading');
    }
}
    
export function enableDragToScroll(container) {
    let isDown = false;
    let startX;
    let scrollLeft;

    container.style.cursor = 'grab';

    const onMouseDown = (e) => {
        isDown = true;
        container.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
        e.preventDefault();
    };

    const onMouseLeave = () => {
        isDown = false;
        container.style.cursor = 'grab';
    };

    const onMouseUp = () => {
        isDown = false;
        container.style.cursor = 'grab';
    };

    const onMouseMove = (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 2; // scroll speed multiplier
        container.scrollLeft = scrollLeft - walk;
    };

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mousemove', onMouseMove);
}

export function updateTime() {
    const timeElement = document.getElementById('time');
    if (!timeElement) return; // safety check if element doesn't exist
    
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    timeElement.textContent = `${hours}:${minutes}:${seconds}`;
}

// export function hideLoader(elementId = null) {
//     // Default to covering the whole screen if no elementId is provided
//     const container = elementId === null ? document.body : document.getElementById(elementId);

//     // Remove the 'loading' class from container to show the content
//     container.classList.remove('loading');

//     // Find the loader element and remove it
//     const loader = document.getElementById('loader');
//     if (loader) {
//         loader.remove(); // Remove the loader from the DOM
//     }
// }

export async function fetchJSON(filePath) {
    const response = await fetch(filePath);
    const data = await response.json();
    return data;
}

export function handleFooterClick() {
    const designBriefElements = document.querySelectorAll('#design-brief p');
    const devBriefElements = document.querySelectorAll('#dev-brief p');

    function handleClick(hashtag) {
        if (window.location.pathname.endsWith('/archive')) {
            // We're already on /archive/
            // Dispatch a custom event with the hashtag
            const event = new CustomEvent('footerHashtagClicked', { detail: { hashtag } });
            window.dispatchEvent(event);
            // Scroll to the #archive section
            document.getElementById('archive').scrollIntoView();
        } else {
            // Store the selected hashtag and navigate to /archive
            localStorage.setItem('selectedBrief', hashtag);
            window.location.href = '/archive#archive';
        }
    }

    designBriefElements.forEach(element => {
        element.addEventListener('click', () => {
            const hashtag = element.textContent.trim();
            handleClick(hashtag);
        });
    });

    devBriefElements.forEach(element => {
        element.addEventListener('click', () => {
            const hashtag = element.textContent.trim();
            handleClick(hashtag);
        });
    });
}

export function initImageLoadIndicators() {
    const imageStates = new WeakMap();
    const hostSelector = '.project-image, .spotlight-gallery-container, .spotlight-giant-gallery, figure, picture';

    const getHost = (img) => {
        const host = img.closest(hostSelector) || img.parentElement;
        if (!host) return null;

        if (window.getComputedStyle(host).position === 'static') {
            host.classList.add('image-loading-host');
        }

        return host;
    };

    const ensureIndicator = (img) => {
        const host = getHost(img);
        if (!host) return null;

        let indicator = host.querySelector(':scope > .image-load-indicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'image-load-indicator';
            indicator.setAttribute('aria-hidden', 'true');

            for (let index = 0; index < 12; index++) {
                const bar = document.createElement('span');
                bar.className = 'image-load-indicator-bar';
                bar.style.setProperty('--bar-index', String(index));
                indicator.appendChild(bar);
            }

            host.appendChild(indicator);
        }

        return indicator;
    };

    const finishState = (img, state) => {
        if (!state || state.finished) return;

        state.finished = true;
        state.indicator.classList.add('is-finished');

        setTimeout(() => {
            if (state.indicator) {
                state.indicator.classList.remove('is-visible', 'is-finished');
            }
        }, 220);
    };

    const startState = (img) => {
        const indicator = ensureIndicator(img);
        if (!indicator) return;

        const previousState = imageStates.get(img);
        if (previousState) {
            previousState.finished = true;
        }

        const state = {
            indicator,
            finished: false,
            src: img.currentSrc || img.src
        };

        indicator.classList.remove('is-finished');
        indicator.classList.add('is-visible');

        imageStates.set(img, state);

        const onDone = () => {
            img.removeEventListener('load', onDone);
            img.removeEventListener('error', onDone);
            finishState(img, state);
        };

        img.addEventListener('load', onDone);
        img.addEventListener('error', onDone);

        if (img.complete) {
            onDone();
        }
    };

    const observeImage = (img) => {
        if (!(img instanceof HTMLImageElement)) return;

        startState(img);

        const srcObserver = new MutationObserver(() => {
            const nextSrc = img.currentSrc || img.src;
            const currentState = imageStates.get(img);

            if (!currentState || nextSrc !== currentState.src) {
                startState(img);
            }
        });

        srcObserver.observe(img, {
            attributes: true,
            attributeFilter: ['src', 'srcset']
        });
    };

    document.querySelectorAll('img').forEach(observeImage);

    const domObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;

                if (node.tagName === 'IMG') {
                    observeImage(node);
                }

                node.querySelectorAll?.('img').forEach(observeImage);
            });
        });
    });

    domObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/**
 * animates image transitions with smooth fade effect
 * @param {Object} options - configuration options
 * @param {Element|Array} options.element - the image element or array of elements
 * @param {string} [options.newSrc] - new image source (for single image)
 * @param {number} [options.newIndex] - new index (for image galleries)
 * @param {Array} [options.images] - array of images (for galleries)
 * @param {number} [options.currentIndex] - current index
 * @param {Element} [options.counterElement] - counter element to update
 * @param {boolean} [options.isGallery=false] - whether this is a gallery with multiple images
 */
export function animateImageTransition(options) {
    const {
        element,
        newSrc,
        newIndex,
        images,
        currentIndex,
        counterElement,
        isGallery = false
    } = options;
    
    const transitionDelay = 200; // half of css transition time for crossfade
    
    if (isGallery) {
        // gallery mode (for index.js)
        // apply transitioning class to all images except current
        images.forEach((img, idx) => {
            if (idx === currentIndex) return;
            img.classList.add('transitioning');
        });
        
        // small timeout for transition
        setTimeout(() => {
            // update active states
            images.forEach((img, idx) => {
                img.classList.toggle('active', idx === newIndex);
                // remove transitioning from newly active image
                if (idx === newIndex) {
                    img.classList.remove('transitioning');
                }
            });
            
            // update counter if exists
            if (counterElement) {
                counterElement.textContent = `[${newIndex + 1}/${images.length}]`;
            }
        }, transitionDelay);
    } else {
        // single image mode (for something.js)
        element.classList.add('transitioning');
        
        setTimeout(() => {
            const clearTransition = () => {
                element.classList.remove('transitioning');
            };

            const finishTransition = () => {
                element.removeEventListener('load', finishTransition);
                element.removeEventListener('error', finishTransition);
                clearTransition();
            };

            // update src for single image
            if (newSrc) {
                element.addEventListener('load', finishTransition);
                element.addEventListener('error', finishTransition);
                element.src = newSrc;

                if (element.complete) {
                    finishTransition();
                }
            } else {
                clearTransition();
            }
            
            // update counter if exists
            if (counterElement && images) {
                counterElement.textContent = `[${newIndex + 1}/${images.length}]`;
            }
        }, transitionDelay);
    }
}

