function initializeProjects() {
    // horizontal scrolling galleries (standard projects)
    const stdProjectElements = document.querySelectorAll('.spotlight-project');
    stdProjectElements.forEach(projectElement => {
        const galleryContainer = projectElement.querySelector('.spotlight-gallery-container');
        if (galleryContainer) {
            setupHorizontalGallery(galleryContainer);
        }
    });

    // vertical click-through galleries
    const verticalProjectElements = document.querySelectorAll('.spotlight-vertical');
    verticalProjectElements.forEach(projectElement => {
        const galleryContainer = projectElement.querySelector('.gallery');
        const images = Array.from(galleryContainer.querySelectorAll('.spotlight-gallery-image'));
        const imageCounter = projectElement.querySelector('.vertical-image-counter');

        if (images.length > 0) {
            setupClickGallery(galleryContainer, images, imageCounter);
        }
    });

    // giant projects (same as vertical)
    const giantProjectElements = document.querySelectorAll('.spotlight-giant');
    giantProjectElements.forEach(projectElement => {
        const galleryContainer = projectElement.querySelector('.spotlight-giant-gallery');
        const images = Array.from(galleryContainer.querySelectorAll('.spotlight-gallery-image'));

        if (images.length > 0) {
            setupClickGallery(galleryContainer, images, null);
        }
    });
}

// simple horizontal scrolling gallery - no auto-scroll, just manual
function setupHorizontalGallery(container) {
    const images = container.querySelectorAll('.spotlight-gallery-image');
    
    // setup simple lazy loading
    setupSimpleLazyLoading(images);
    
    // browser will handle horizontal scrolling natively
    // container.addEventListener('wheel', (e) => {
    //     e.preventDefault();
    //     container.scrollLeft += e.deltaY * 2; // scroll horizontally with wheel
    // });
}

// simple lazy loading - load images when they get close to viewport
function setupSimpleLazyLoading(images) {
    if (!('IntersectionObserver' in window)) {
        // fallback - just load all images
        images.forEach(loadImage);
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadImage(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '10px', // load when Npx from viewport
        threshold: 0.01 // load when 1% visible
    });

    images.forEach(img => {
        if (img.classList.contains('lazy')) {
            observer.observe(img);
        }
    });
}

// load individual image
function loadImage(img) {
    if (img.dataset.src && img.classList.contains('lazy')) {
        img.src = img.dataset.src;
        img.onload = () => {
            img.classList.remove('lazy');
            img.classList.add('lazyloaded');
        };
    }
}

// simple click-through gallery for vertical and giant projects
function setupClickGallery(container, images, imageCounter) {
    let currentIndex = 0;
    
    // setup images
    images.forEach((img, index) => {
        img.style.opacity = index === 0 ? '1' : '0';
        img.classList.toggle('active', index === 0);
    });
    
    // setup lazy loading
    setupSimpleLazyLoading(images);
    
    // load first image immediately
    loadImage(images[0]);
    
    // update counter
    function updateCounter() {
        if (imageCounter) {
            imageCounter.textContent = `${currentIndex + 1}/${images.length}`;
        }
    }
    
    // change to specific image
    function showImage(newIndex) {
        if (newIndex === currentIndex || newIndex < 0 || newIndex >= images.length) return;
        
        // load the new image
        loadImage(images[newIndex]);
        
        // simple fade transition
        images[currentIndex].style.opacity = '0';
        images[currentIndex].classList.remove('active');
        
        currentIndex = newIndex;
        
        images[currentIndex].style.opacity = '1';
        images[currentIndex].classList.add('active');
        
        updateCounter();
    }
    
    // click navigation
    container.addEventListener('click', (e) => {
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const isLeftClick = clickX < rect.width / 2;
        
        const newIndex = isLeftClick 
            ? (currentIndex - 1 + images.length) % images.length
            : (currentIndex + 1) % images.length;
            
        showImage(newIndex);
    });
    
    // touch navigation
    let touchStartX = 0;
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    });
    
    container.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const swipeThreshold = 50;
        
        if (Math.abs(touchStartX - touchEndX) > swipeThreshold) {
            const isSwipeLeft = touchStartX > touchEndX;
            const newIndex = isSwipeLeft
                ? (currentIndex + 1) % images.length
                : (currentIndex - 1 + images.length) % images.length;
                
            showImage(newIndex);
        }
    });
    
    updateCounter();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeProjects();
});
