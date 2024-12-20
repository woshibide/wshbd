import { toggleTheme, showLoader, hideLoader, handleFooterClick, redirectToHomepage, navigateToProject } from './utils.js';


showLoader();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('service worker registered', reg))
        .catch((err) => console.log('service worker not registered', err));
}



document.addEventListener('DOMContentLoaded', () => {
    
    
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    hideLoader();
    handleFooterClick();

    const prevProjectButton = document.getElementById('prev-project');
    if (prevProjectButton) { // check if element exists
        prevProjectButton.addEventListener('click', function() {
            const prevProjectId = this.getAttribute('data-prev-id');
            if (prevProjectId) {
                navigateToProject(prevProjectId);
            }
        });
    }

    const nextProjectButton = document.getElementById('next-project');
    if (nextProjectButton) { // check if element exists
        nextProjectButton.addEventListener('click', function() {
            const nextProjectId = this.getAttribute('data-next-id');
            if (nextProjectId) {
                navigateToProject(nextProjectId);
            }
        });
    }

    window.redirectToHomepage = redirectToHomepage;
    document.getElementById('home').addEventListener('click', redirectToHomepage);

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
});
