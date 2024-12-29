import { showLoader, hideLoader, fetchJSON } from './utils.js';


// Function to update the gallery with project data
function updateGallery(project, images, currentIndex) {
    const galleryImage = document.querySelector('.random-gallery-images img');
    galleryImage.src = images[currentIndex];
    galleryImage.alt = project.title;

    // Update the project info
    document.getElementById('brand').textContent = project.brand;
    document.getElementById('title').textContent = project.title;
    document.getElementById('date').textContent = project.date;
    document.getElementById('gallery-id').textContent = project.id;
}

async function fetchRandomProject() {
    const archiveData = await fetchJSON('/content/info/archive.json');
    const imageMap = await fetchJSON('/content/info/image-map.json');

    const projects = archiveData.projects;
    const randomProject = projects[Math.floor(Math.random() * projects.length)];

    let images = imageMap[randomProject.id];

    // If no images, use a default image
    if (!images || images.length === 0) {
        images = ['/content/misc/non-image.svg'];
    } else {
        const basePath = '/content/images/';
        images = images.map(image => {
            return image.startsWith('/content/images/')
                ? image
                : `${basePath}${randomProject.id}/${image}`;
        });
    }

    return { randomProject, images };
}



async function loadRandomProject() {

    showLoader('random-gallery-container');

    const { randomProject, images } = await fetchRandomProject();

    let currentIndex = 0;

    // Preload all images
    const preloadedImages = await Promise.all(images.map(src => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(src);
            img.onerror = () => resolve(src);
        });
    }));

    updateGallery(randomProject, preloadedImages, currentIndex);

    hideLoader('random-gallery-container');

    // Add event listeners for gallery navigation
    const galleryInfo = document.getElementById('random-gallery-info');
    const galleryId = document.getElementById('random-gallery-id-container');

    galleryInfo.addEventListener('click', () => {
        currentIndex = (currentIndex === 0) ? preloadedImages.length - 1 : currentIndex - 1;
        updateGallery(randomProject, preloadedImages, currentIndex);
    });

    galleryId.addEventListener('click', () => {
        currentIndex = (currentIndex === preloadedImages.length - 1) ? 0 : currentIndex + 1;
        updateGallery(randomProject, preloadedImages, currentIndex);
    });
}



document.querySelector('#random-project-button').addEventListener('click', loadRandomProject);

document.addEventListener('DOMContentLoaded', () => {
    showLoader();
    document.getElementById("random-gallery-container").scrollIntoView();        
    loadRandomProject();
    hideLoader();        
});
