// Initialize existing project elements
function initializeProjects() {
    // Initialize vertical projects
    // const vrtProjectElements = document.querySelectorAll('.spotlight-vertical');
    // vrtProjectElements.forEach(projectElement => {
    //     const galleryContainer = projectElement.querySelector('.gallery');
    //     const images = Array.from(galleryContainer.querySelectorAll('.spotlight-gallery-image'));
    //     const imageCounter = galleryContainer.querySelector('.gallery-nav .image-counter');

    //     if (images.length > 0) {
    //         images[0].classList.add('active');
    //         setupGalleryNavigation(galleryContainer, images, imageCounter);
    //     }
    // });

    // Initialize giant projects
    const giantProjectElements = document.querySelectorAll('.spotlight-giant');
    giantProjectElements.forEach(projectElement => {
        const galleryContainer = projectElement.querySelector('.spotlight-giant-gallery');
        const images = Array.from(galleryContainer.querySelectorAll('.spotlight-gallery-image'));
        const imageCounter = projectElement.querySelector('.image-counter');

        if (images.length > 0) {
            images[0].classList.add('active');
            setupGalleryNavigation(galleryContainer, images, imageCounter);
        }
    });

    // Initialize standard projects
    const stdProjectElements = document.querySelectorAll('.spotlight-project');
    stdProjectElements.forEach(projectElement => {
        const spotlightGalleryContainer = projectElement.querySelector('.spotlight-gallery-container');
        const images = Array.from(spotlightGalleryContainer.querySelectorAll('.spotlight-gallery-image'));
        const imageCounter = spotlightGalleryContainer.querySelector('.image-counter');

        if (images.length > 0) {
            images[0].classList.add('active');
            setupGalleryNavigation(spotlightGalleryContainer, images, imageCounter);
        }
    });
}


function setupGalleryNavigation(container, images, imageCounter) {
    let newIndex = 0;
    let touchStartX = 0;

    function updateCounter() {
        if (imageCounter) {
            imageCounter.textContent = `[${newIndex + 1}/${images.length}]`;
        }
    }

    updateCounter();

    container.addEventListener('click', (e) => {
        const clickX = e.clientX - container.getBoundingClientRect().left;
        const isClickLeft = clickX < container.clientWidth / 2;
        newIndex = isClickLeft ? (newIndex - 1 + images.length) % images.length : (newIndex + 1) % images.length;
        images.forEach((img, index) => img.classList.toggle('active', index === newIndex));
        updateCounter();
    });

    container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    });

    container.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const swipeThreshold = 50;

        if (Math.abs(touchStartX - touchEndX) > swipeThreshold) {
            newIndex = touchStartX > touchEndX ? (newIndex + 1) % images.length : (newIndex - 1 + images.length) % images.length;
            images.forEach((img, index) => img.classList.toggle('active', index === newIndex));
            updateCounter();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeProjects();
});
