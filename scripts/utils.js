 

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

    // check the current state and save it to localStorage
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


export function hideLoader(elementId = null) {

    const container = elementId === null ? document.body : document.getElementById(elementId);

        container.classList.remove('loading');

        const loader = document.getElementById('loader');
        if (loader) {
            loader.remove(); 
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
            // we're already on /archive/
            // dispatch a custom event with the hashtag
            const event = new CustomEvent('footerHashtagClicked', { detail: { hashtag } });
            window.dispatchEvent(event);

            document.getElementById('archive').scrollIntoView();
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

