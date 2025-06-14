import { animateImageTransition } from './utils.js';

function initializeProjects() {
    // standard projects - create marquee scrolling containers
    const stdProjectElements = document.querySelectorAll('.spotlight-project');
    stdProjectElements.forEach(projectElement => {
        const spotlightGalleryContainer = projectElement.querySelector('.spotlight-gallery-container');
        const galleryDiv = spotlightGalleryContainer.querySelector('.spotlight-gallery');
        const images = Array.from(galleryDiv.querySelectorAll('.spotlight-gallery-image'));

        if (images.length > 0) {
            // create a wrapper for the marquee effect
            const galleryScroll = document.createElement('div');
            galleryScroll.className = 'gallery-scroll';
            
            // duplicate images for seamless loop
            const duplicatedImages = images.map(img => img.cloneNode(true));
            
            // move original images into the scroll wrapper
            images.forEach(img => {
                img.classList.remove('active');
                img.style.opacity = '1';
                img.style.display = 'block';
                galleryScroll.appendChild(img);
            });
            
            // add duplicated images for seamless loop
            duplicatedImages.forEach(img => {
                img.classList.remove('active');
                img.style.opacity = '1';
                img.style.display = 'block';
                galleryScroll.appendChild(img);
            });
            
            // replace the gallery div content with scroll wrapper
            galleryDiv.innerHTML = '';
            galleryDiv.appendChild(galleryScroll);
            
            // setup lazy loading for marquee images
            setupMarqueeLazyLoading(galleryScroll);
            
            // add manual scroll capability
            setupScrollNavigation(spotlightGalleryContainer);
        }
    });

    // vertical projects - add same functionality as giant projects
    const verticalProjectElements = document.querySelectorAll('.spotlight-vertical');
    verticalProjectElements.forEach(projectElement => {
        const galleryContainer = projectElement.querySelector('.gallery');
        const images = Array.from(galleryContainer.querySelectorAll('.spotlight-gallery-image'));
        const imageCounter = projectElement.querySelector('.vertical-image-counter');

        if (images.length > 0) {
            images[0].classList.add('active');
            setupGalleryNavigation(galleryContainer, images, imageCounter);
        }
    });

    // giant projects - keep existing functionality but remove image counter
    const giantProjectElements = document.querySelectorAll('.spotlight-giant');
    giantProjectElements.forEach(projectElement => {
        const galleryContainer = projectElement.querySelector('.spotlight-giant-gallery');
        const images = Array.from(galleryContainer.querySelectorAll('.spotlight-gallery-image'));

        if (images.length > 0) {
            images[0].classList.add('active');
            setupGalleryNavigation(galleryContainer, images, null);
        }
    });
}

// lazy loading for horizontally scrolling marquee images
function setupMarqueeLazyLoading(galleryScroll) {
    const lazyImages = galleryScroll.querySelectorAll('img.lazy');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.onload = () => {
                            img.classList.add('lazyloaded');
                            img.classList.remove('lazy');
                        };
                    }
                    imageObserver.unobserve(img);
                }
            });
        }, {
            // load images when they are 100px away from being visible
            rootMargin: '100px 100px 100px 100px',
            threshold: 0.01
        });

        lazyImages.forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // fallback for browsers without IntersectionObserver
        lazyImages.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.onload = () => {
                    img.classList.add('lazyloaded');
                    img.classList.remove('lazy');
                };
            }
        });
    }
}

function setupScrollNavigation(container) {
    let animationId = null;
    
    function smoothSpeedTransition(scrollWrapper, targetDuration, transitionTime = 800) {
        // cancel any existing transition
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        const startTime = performance.now();
        const currentDuration = parseFloat(getComputedStyle(scrollWrapper).animationDuration) || 400;
        
        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / transitionTime, 1);
            
            // use easing function for smooth transition
            const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            
            const newDuration = currentDuration + (targetDuration - currentDuration) * easeProgress;
            
            // preserve animation position by pausing, changing duration, then resuming
            const computedStyle = getComputedStyle(scrollWrapper);
            scrollWrapper.style.animationPlayState = 'paused';
            scrollWrapper.style.animationDuration = `${newDuration}s`;
            // force a reflow
            scrollWrapper.offsetHeight;
            scrollWrapper.style.animationPlayState = 'running';
            
            if (progress < 1) {
                animationId = requestAnimationFrame(animate);
            }
        }
        
        animationId = requestAnimationFrame(animate);
    }
    
    container.addEventListener('mouseenter', () => {
        const scrollWrapper = container.querySelector('.gallery-scroll');
        if (scrollWrapper) {
            smoothSpeedTransition(scrollWrapper, 800); // slow down to 
        }
    });
    
    container.addEventListener('mouseleave', () => {
        const scrollWrapper = container.querySelector('.gallery-scroll');
        if (scrollWrapper) {
            smoothSpeedTransition(scrollWrapper, 400); // speed up back to 
        }
    });
    
    // add wheel scrolling
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
    });
}


function setupGalleryNavigation(container, images, imageCounter, autoChangeInterval = null) {
    let newIndex = 0;
    let touchStartX = 0;
    let autoChangeTimer = null;
    let useDebounceInterval = false; 

    // lazy loading function for gallery images
    function lazyLoadImage(img) {
        if (img.classList.contains('lazy') && img.dataset.src) {
            img.src = img.dataset.src;
            img.onload = () => {
                img.classList.add('lazyloaded');
                img.classList.remove('lazy');
            };
        }
    }

    // preload adjacent images for smooth navigation
    function preloadAdjacentImages() {
        const prevIndex = (newIndex - 1 + images.length) % images.length;
        const nextIndex = (newIndex + 1) % images.length;
        
        // preload previous and next images
        lazyLoadImage(images[prevIndex]);
        lazyLoadImage(images[nextIndex]);
    }

    function updateCounter() {
        // update image counter if it exists
        if (imageCounter) {
            imageCounter.textContent = `${newIndex + 1}/${images.length}`;
        }
    }
    
    function changeToNextImage() {
        // calculate the next index
        const nextIndex = (newIndex + 1) % images.length;
        
        // lazy load the next image before showing it
        lazyLoadImage(images[nextIndex]);
        
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
                // preload adjacent images for next navigation
                preloadAdjacentImages();
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
        
        // lazy load the next image before showing it
        lazyLoadImage(images[nextIndex]);
        
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
                // preload adjacent images for next navigation
                preloadAdjacentImages();
            }, 50); // small delay for browser render
        }, 200); // half of transition time
    }

    // ensure initial image is visible with proper opacity
    images.forEach((img, idx) => {
        img.style.transition = 'opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';
        img.style.opacity = idx === 0 ? '1' : '0';
    });
    
    // initialize lazy loading for the first image if needed
    lazyLoadImage(images[0]);
    
    updateCounter();
    
    // preload adjacent images for smooth initial navigation
    if (images.length > 1) {
        setTimeout(() => {
            preloadAdjacentImages();
        }, 500); // delay initial preloading to not interfere with first image
    }
    
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
