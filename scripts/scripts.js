import { fetchJSON, toggleTheme, handleFooterClick, redirectToHomepage, navigateToProject } from './utils.js';



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
    
    handleFooterClick();

    const prevProjectButton = document.getElementById('prev-project');
    if (prevProjectButton) { // check if element exists
        prevProjectButton.addEventListener('click', function() {
            const prevProjectId = this.getAttribute('data-prev-id');
            navigateToProject(prevProjectId);
        });
    }

    const nextProjectButton = document.getElementById('next-project');
    if (nextProjectButton) { // check if element exists
        nextProjectButton.addEventListener('click', function() {
            const nextProjectId = this.getAttribute('data-next-id');
            navigateToProject(nextProjectId);
        });
    }

    window.redirectToHomepage = redirectToHomepage;
    const homeButton = document.getElementById('home');
    if (homeButton) { 
        homeButton.addEventListener('click', redirectToHomepage);
    }
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    
    const menuIcon = document.getElementById('menu-icon');
    const navMenu = document.getElementById('nav-menu');
    menuIcon.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        menuIcon.classList.toggle('open');
    });
});
