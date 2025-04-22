import { animateImageTransition } from './utils.js';

let currentProjectIndex = 0

document.addEventListener('DOMContentLoaded', () => {
    // init the curtain loader
    initTheatreCurtain()

    const projectSections = document.querySelectorAll('.project-section')

    projectSections.forEach((section) => {
        const imageContainer = section.querySelector('.project-image')
        const imgElement = imageContainer.querySelector('img')

        // get images from data-images attribute
        let images = imgElement.getAttribute('data-images')
        images = JSON.parse(images)

        addImageNavigation(imageContainer, images, imgElement)
    })

    // add key navigation
    addProjectNavigation(projectSections)
    
    // add scroll tracking
    trackScrollPosition(projectSections)

    // add styles for transitions
    addTransitionStyles()
})

function initTheatreCurtain() {
    const curtain = document.getElementById('theatre-curtain')
    const leftCurtain = document.querySelector('.curtain-half.left')
    const rightCurtain = document.querySelector('.curtain-half.right')
    const loadingPercentage = document.querySelector('.loading-percentage')
    
    // only load visible images and initial images
    const visibleSections = getVisibleSections()
    const visibleImages = []
    const heavyGifs = []
    const otherImages = []
    
    // categorize images by priority
    document.querySelectorAll('.project-section').forEach((section, index) => {
        const imgElement = section.querySelector('.project-image img')
        const images = JSON.parse(imgElement.getAttribute('data-images'))
        
        // the first image is always the one shown initially
        if (index === 0 || visibleSections.includes(section)) {
            // prioritize visible sections' first images
            visibleImages.push(images[0])
        }
        
        // categorize the rest of the images
        images.slice(1).forEach(imgSrc => {
            if (imgSrc.toLowerCase().endsWith('.gif')) {
                heavyGifs.push(imgSrc)
            } else {
                otherImages.push(imgSrc)
            }
        })
    })
    
    // load only essential images first
    const initialImages = visibleImages
    const totalInitialImages = initialImages.length
    let loadedImages = 0
    
    // update loading percentage based on initial images only
    const updateProgress = () => {
        loadedImages++
        const progress = Math.min(Math.floor((loadedImages / totalInitialImages) * 100), 100)
        loadingPercentage.textContent = `${progress}%`
        
        // open curtains when initial images are loaded
        if (loadedImages >= totalInitialImages) {
            setTimeout(() => {
                loadingPercentage.classList.add('hidden')
                leftCurtain.classList.add('open')
                rightCurtain.classList.add('open')
                
                // remove curtain after animation completes
                setTimeout(() => {
                    curtain.style.display = 'none'
                    
                    // start preloading heavy gifs and other images after curtains open
                    preloadRemainingImages(heavyGifs, otherImages)
                }, 1500)
            }, 500)
        }
    }
    
    // preload initial images
    initialImages.forEach(src => {
        const img = new Image()
        img.onload = updateProgress
        img.onerror = updateProgress
        img.src = src
    })
    
    // fallback in case no images load within 5 seconds
    setTimeout(() => {
        if (loadedImages < totalInitialImages) {
            loadingPercentage.textContent = '100%'
            setTimeout(() => {
                loadingPercentage.classList.add('hidden')
                leftCurtain.classList.add('open')
                rightCurtain.classList.add('open')
                
                setTimeout(() => {
                    curtain.style.display = 'none'
                    
                    // start preloading heavy gifs and other images after curtains open
                    preloadRemainingImages(heavyGifs, otherImages)
                }, 1500)
            }, 500)
        }
    }, 5000)
}

// helper function to get visible sections
function getVisibleSections() {
    const sections = document.querySelectorAll('.project-section')
    return Array.from(sections).filter(section => {
        const rect = section.getBoundingClientRect()
        return (rect.top >= 0 && rect.top <= window.innerHeight) ||
               (rect.bottom >= 0 && rect.bottom <= window.innerHeight)
    })
}

// preload remaining images in the background
function preloadRemainingImages(heavyGifs, otherImages) {
    // use low priority for these images since they're not immediately needed
    const preloadImage = (src) => {
        return new Promise(resolve => {
            const img = new Image()
            img.onload = resolve
            img.onerror = resolve
            img.src = src
        })
    }
    
    // preload other images first (they're generally smaller)
    const preloadBatch = async (images, batchSize = 5) => {
        for (let i = 0; i < images.length; i += batchSize) {
            const batch = images.slice(i, i + batchSize)
            await Promise.all(batch.map(preloadImage))
            
            // add a small delay between batches to prevent overwhelming the browser
            if (i + batchSize < images.length) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }
    }
    
    // preload other images first, then heavy GIFs
    preloadBatch(otherImages).then(() => {
        // preload GIFs with smaller batches since they're heavy
        preloadBatch(heavyGifs, 2)
    })
}

function addTransitionStyles() {
    // smooth transitions
    const style = document.createElement('style')
    style.textContent = `
        .project-image img {
            transition: opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            opacity: 1;
        }
        .project-image img.transitioning {
            opacity: 0;
        }
    `
    document.head.appendChild(style)
}

function addImageNavigation(imageContainer, images, imgElement) {
    let currentImageIndex = 0
    const counterElement = imageContainer.closest('.project-section').querySelector('#gallery-counter')

    function updateImage() {
        // use shared animation function
        animateImageTransition({
            element: imgElement,
            newSrc: images[currentImageIndex],
            newIndex: currentImageIndex,
            images: images,
            counterElement: counterElement
        });
    }

    imageContainer.addEventListener('click', (event) => {
        const containerWidth = imageContainer.offsetWidth
        const clickX = event.clientX - imageContainer.getBoundingClientRect().left

        if (clickX < containerWidth / 2) {
            // clicked on left side, show previous image
            currentImageIndex = (currentImageIndex - 1 + images.length) % images.length
        } else {
            // clicked on right side, show next image
            currentImageIndex = (currentImageIndex + 1) % images.length
        }

        updateImage()
    })

    // swipe navigation
    let touchStartX = null

    imageContainer.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].screenX
    })

    imageContainer.addEventListener('touchend', (event) => {
        if (touchStartX === null) return

        const touchEndX = event.changedTouches[0].screenX
        const diffX = touchEndX - touchStartX

        if (Math.abs(diffX) > 20) {
            if (diffX > 0) {
                // swiped right, show previous image
                currentImageIndex = (currentImageIndex - 1 + images.length) % images.length
            } else {
                // swiped left, show next image
                currentImageIndex = (currentImageIndex + 1) % images.length
            }

            updateImage()
        }

        touchStartX = null
    })
}

function updateImageCounter(currentIndex, totalImages, counterElement) {
    // display 1-based index for user-friendliness
    counterElement.textContent = `[${currentIndex + 1}/${totalImages}]`
}

function addProjectNavigation(projectSections) {
    let currentImageIndex = 0 // track current image index for the current project

    document.addEventListener('keydown', (event) => {
        const currentProject = projectSections[currentProjectIndex]
        const imgElement = currentProject.querySelector('.project-image img')
        const counterElement = currentProject.querySelector('#gallery-counter')
        const images = JSON.parse(imgElement.getAttribute('data-images'))

        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            // left arrow key, show previous image
            currentImageIndex = (currentImageIndex - 1 + images.length) % images.length
            // use shared animation function
            animateImageTransition({
                element: imgElement,
                newSrc: images[currentImageIndex],
                newIndex: currentImageIndex,
                images: images,
                counterElement: counterElement
            });
        } else if (event.key === 'ArrowRight') {
            event.preventDefault()
            // right arrow key, show next image
            currentImageIndex = (currentImageIndex + 1) % images.length
            // use shared animation function
            animateImageTransition({
                element: imgElement,
                newSrc: images[currentImageIndex],
                newIndex: currentImageIndex,
                images: images,
                counterElement: counterElement
            });
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            // show previous project
            currentProjectIndex = (currentProjectIndex - 1 + projectSections.length) % projectSections.length
            updateProjectView(true)
        } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            // show next project
            currentProjectIndex = (currentProjectIndex + 1) % projectSections.length
            updateProjectView(true)
        }
    })

    function updateProjectView(animate = false) {
        const currentProject = projectSections[currentProjectIndex]
        
        if (animate) {
            // custom smooth scroll with cubic-bezier
            smoothScrollTo(currentProject.offsetTop, 800)
        } else {
            currentProject.scrollIntoView()
        }
        
        currentImageIndex = 0 // reset image index when changing projects
        const projectId = currentProject.getAttribute('id') // get project id
        window.location.hash = projectId // update url hash
        
        // update counter for the new project
        const imgElement = currentProject.querySelector('.project-image img')
        const counterElement = currentProject.querySelector('#gallery-counter')
        const images = JSON.parse(imgElement.getAttribute('data-images'))
        updateImageCounter(currentImageIndex, images.length, counterElement)
    }
    
    // custom smooth scroll with cubic bezier
    function smoothScrollTo(targetY, duration) {
        const startY = window.pageYOffset
        const diff = targetY - startY
        let startTime = null
        
        // cubic-bezier implementation
        function easeInOutCubicBezier(t) {
            // cubic-bezier(0.165, 0.84, 0.44, 1)
            const p1 = {x: 0.165, y: 0.84}
            const p2 = {x: 0.44, y: 1}
            
            // simple approximation of cubic bezier
            return 3 * Math.pow(1 - t, 2) * t * p1.y +
                   3 * (1 - t) * Math.pow(t, 2) * p2.y +
                   Math.pow(t, 3)
        }
        
        function animation(currentTime) {
            if (startTime === null) startTime = currentTime
            const timeElapsed = currentTime - startTime
            const progress = Math.min(timeElapsed / duration, 1)
            
            const easedProgress = easeInOutCubicBezier(progress)
            window.scrollTo(0, startY + diff * easedProgress)
            
            if (timeElapsed < duration) {
                requestAnimationFrame(animation)
            }
        }
        
        requestAnimationFrame(animation)
    }
}

function trackScrollPosition(projectSections) {
    // intersection observer to detect which project is most visible
    const observer = new IntersectionObserver((entries) => {

        let maxEntry = entries[0];
        entries.forEach(entry => {
            if (entry.intersectionRatio > maxEntry.intersectionRatio) {
                maxEntry = entry;
            }
        });
        
        // ff the most visible section has significant visibility
        if (maxEntry && maxEntry.intersectionRatio > 0.5) {
            const newIndex = Array.from(projectSections).findIndex(
                section => section === maxEntry.target
            );
            
            // update current project index and URL only if it changed
            if (newIndex !== -1 && newIndex !== currentProjectIndex) {
                currentProjectIndex = newIndex;
                const projectId = maxEntry.target.getAttribute('id');
                // update URL without triggering a scroll (using history.replaceState)
                if (projectId && window.location.hash !== `#${projectId}`) {
                    history.replaceState(null, null, `#${projectId}`);
                }
            }
        }
    }, {
        root: null, // viewport
        threshold: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], // multiple thresholds for better accuracy
        rootMargin: "0px"
    });
    
    // observe all project sections
    projectSections.forEach(section => {
        observer.observe(section);
    });
}