import { animateImageTransition } from './utils.js';

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

    // giant projects
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

    // standard projects
    const stdProjectElements = document.querySelectorAll('.spotlight-project');
    stdProjectElements.forEach(projectElement => {
        const spotlightGalleryContainer = projectElement.querySelector('.spotlight-gallery-container');
        const images = Array.from(spotlightGalleryContainer.querySelectorAll('.spotlight-gallery-image'));
        const imageCounter = spotlightGalleryContainer.querySelector('.image-counter');

        if (images.length > 0) {
            images[0].classList.add('active');
            setupGalleryNavigation(spotlightGalleryContainer, images, imageCounter, 3000); 
        }
    });
}


function setupGalleryNavigation(container, images, imageCounter, autoChangeInterval = null) {
    let newIndex = 0;
    let touchStartX = 0;
    let autoChangeTimer = null;
    let useDebounceInterval = false; 

    function updateCounter() {
        if (imageCounter) {
            imageCounter.textContent = `[${newIndex + 1}/${images.length}]`;
        }
    }
    
    function changeToNextImage() {
        // calculate the next index
        const nextIndex = (newIndex + 1) % images.length;
        
        // manually handle the transition to ensure it works
        // fade out current image
        images[newIndex].style.opacity = '0';
        
        // wait for fade out to complete
        setTimeout(() => {
            // update classes after fade
            images[newIndex].classList.remove('active');
            images[nextIndex].classList.add('active');
            
            // fade in new image
            setTimeout(() => {
                images[nextIndex].style.opacity = '1';
                // update counter
                newIndex = nextIndex;
                updateCounter();
            }, 50); // small delay for browser render
        }, 200); // half of transition time
        
        useDebounceInterval = false;
    }
    
    function resetAutoChangeTimer() {
        // clear existing timer
        if (autoChangeTimer) {
            clearInterval(autoChangeTimer);
        }
        
        // start a new timer if interval is provided
        if (autoChangeInterval && images.length > 1) {
            // use 5x longer interval when user has changed images
            const intervalToUse = useDebounceInterval ? autoChangeInterval * 5 : autoChangeInterval;
            autoChangeTimer = setInterval(changeToNextImage, intervalToUse);
        }
    }
    
    function animateImageChange(direction) {
        // calculate new index based on direction
        const nextIndex = direction === 'prev' 
            ? (newIndex - 1 + images.length) % images.length 
            : (newIndex + 1) % images.length;
        
        // manually handle the transition to ensure it works
        // fade out current image
        images[newIndex].style.opacity = '0';
        
        // wait for fade out to complete
        setTimeout(() => {
            // update classes after fade
            images[newIndex].classList.remove('active');
            images[nextIndex].classList.add('active');
            
            // fade in new image
            setTimeout(() => {
                images[nextIndex].style.opacity = '1';
                // update counter
                newIndex = nextIndex;
                updateCounter();
            }, 50); // small delay for browser render
        }, 200); // half of transition time
    }

    // ensure initial image is visible with proper opacity
    images.forEach((img, idx) => {
        img.style.transition = 'opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';
        img.style.opacity = idx === 0 ? '1' : '0';
    });
    
    updateCounter();
    
    // initialize auto-change timer if interval is provided
    resetAutoChangeTimer();

    container.addEventListener('click', (e) => {
        const clickX = e.clientX - container.getBoundingClientRect().left;
        const isClickLeft = clickX < container.clientWidth / 2;
        
        // animate image change based on direction
        animateImageChange(isClickLeft ? 'prev' : 'next');
        
        useDebounceInterval = true;        
        resetAutoChangeTimer();
    });

    container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    });

    container.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const swipeThreshold = 50;

        if (Math.abs(touchStartX - touchEndX) > swipeThreshold) {
            // determine swipe direction and animate
            const direction = touchStartX > touchEndX ? 'next' : 'prev';
            animateImageChange(direction);
            
            useDebounceInterval = true;
            resetAutoChangeTimer();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeProjects();
});
