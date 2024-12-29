 

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

