function initializeProjects() {
    // Set up horizontal scroll galleries
    setupHorizontalGalleries();
}

function setupHorizontalGalleries() {
    // Standard galleries (the ones in list sections)
    const standardGalleries = document.querySelectorAll('.spotlight-gallery-container');
    standardGalleries.forEach(gallery => {
        // Remove any existing "active" classes
        const images = gallery.querySelectorAll('.spotlight-gallery-image');
        images.forEach(img => {
            img.classList.remove('active');
            // Make sure all images are displayed
            img.style.display = 'inline-block';
        });
        
        // Update counter to show total images
        const counter = gallery.querySelector('.image-counter');
        if (counter) {
            counter.textContent = `[${images.length} images]`;
        }
    });
    
    // Also handle vertical and giant galleries
    setupVerticalGalleries();
    setupGiantGalleries();
}

function setupVerticalGalleries() {
    const verticalGalleries = document.querySelectorAll('.spotlight-vertical .gallery');
    verticalGalleries.forEach(gallery => {
        const images = gallery.querySelectorAll('.spotlight-gallery-image');
        images.forEach((img, idx) => {
            if (idx === 0) {
                img.classList.add('active');
            } else {
                img.classList.remove('active');
            }
        });
        
        // Keep the click navigation for vertical galleries
        if (images.length > 0) {
            setupClickNavigation(gallery, images);
        }
    });
}

function setupGiantGalleries() {
    const giantGalleries = document.querySelectorAll('.spotlight-giant-gallery');
    giantGalleries.forEach(gallery => {
        const images = gallery.querySelectorAll('.spotlight-gallery-image');
        images.forEach((img, idx) => {
            if (idx === 0) {
                img.classList.add('active');
            } else {
                img.classList.remove('active');
            }
        });
        
        // Keep the click navigation for giant galleries
        if (images.length > 0) {
            const counter = gallery.closest('.spotlight-giant').querySelector('.image-counter');
            setupClickNavigation(gallery, images, counter);
        }
    });
}

function setupClickNavigation(container, images, counter = null) {
    let currentIndex = 0;
    
    function updateDisplay() {
        images.forEach((img, idx) => {
            img.classList.toggle('active', idx === currentIndex);
        });
        
        if (counter) {
            counter.textContent = `[${currentIndex + 1}/${images.length}]`;
        }
    }
    
    container.addEventListener('click', (e) => {
        const rect = container.getBoundingClientRect();
        const clickPosition = e.clientX - rect.left;
        
        if (clickPosition < rect.width / 2) {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
        } else {
            currentIndex = (currentIndex + 1) % images.length;
        }
        
        updateDisplay();
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeProjects);
