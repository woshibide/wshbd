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
    // Toggle the dark-mode class on the body
    document.body.classList.toggle('dark-mode');

    // Check the current state and save it to localStorage
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

export function showLoader(elementId = null) {
    // Default to covering the whole screen if no elementId is provided
    const isWholeScreen = elementId === null;
    const container = isWholeScreen ? document.body : document.getElementById(elementId);

    // Check if the loader already exists, to avoid adding multiple loaders
    if (!document.getElementById('loader')) {
        // Create the loader element
        const loader = document.createElement('div');
        loader.id = 'loader';
        loader.innerHTML = `
            <div class="spinner"></div>
        `;

        // Set styles based on whether it covers the whole screen or a specific element
        if (isWholeScreen) {
            loader.style.position = 'fixed';
        } else {
            loader.style.position = 'absolute';
        }

        // Append the loader to the container
        container.appendChild(loader);

        // Add the 'loading' class to the container to hide the content
        container.classList.add('loading');
    }
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

export function hideLoader(elementId = null) {
    // Default to covering the whole screen if no elementId is provided
    const container = elementId === null ? document.body : document.getElementById(elementId);

    // Remove the 'loading' class from container to show the content
    container.classList.remove('loading');

    // Find the loader element and remove it
    const loader = document.getElementById('loader');
    if (loader) {
        loader.remove(); // Remove the loader from the DOM
    }
}

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
            // update src for single image
            if (newSrc) {
                element.src = newSrc;
            }
            
            // update counter if exists
            if (counterElement && images) {
                counterElement.textContent = `[${newIndex + 1}/${images.length}]`;
            }
            
            // remove transitioning class after loading
            element.onload = () => element.classList.remove('transitioning');
        }, transitionDelay);
    }
}

