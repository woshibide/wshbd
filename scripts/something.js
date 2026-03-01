import { animateImageTransition } from './utils.js';

let currentProjectIndex = 0
const hashReplaceDelayMs = 180
const curtainFallbackMs = 8000
const curtainMinimumVisibleMs = 900
const programmaticScrollLockMs = 1200

let hashObserverLock = {
    active: false,
    targetId: null,
    releaseAt: 0
}

function parseImageData(imgElement) {
    if (!imgElement) return []

    const rawImages = imgElement.getAttribute('data-images')
    if (!rawImages) return []

    try {
        const parsed = JSON.parse(rawImages)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function waitForImageReady(imgElement) {
    return new Promise(resolve => {
        if (!imgElement) {
            resolve()
            return
        }

        if (imgElement.complete && imgElement.naturalWidth > 0) {
            resolve()
            return
        }

        let settled = false
        const settle = () => {
            if (settled) return
            settled = true
            imgElement.removeEventListener('load', onDone)
            imgElement.removeEventListener('error', onDone)
            resolve()
        }

        const onDone = () => settle()
        imgElement.addEventListener('load', onDone)
        imgElement.addEventListener('error', onDone)

        if (typeof imgElement.decode === 'function') {
            imgElement.decode().then(settle).catch(() => {})
        }
    })
}

document.addEventListener('DOMContentLoaded', () => {
    // init the curtain loader
    initTheatreCurtain()

    const projectSections = document.querySelectorAll('.project-section')
    if (!projectSections.length) return

    projectSections.forEach((section) => {
        const imageContainer = section.querySelector('.project-image')
        if (!imageContainer) return

        const imgElement = imageContainer.querySelector('img')
        if (!imgElement) return

        // get images from data-images attribute
        const images = parseImageData(imgElement)
        if (!images.length) return

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
    if (!curtain || !leftCurtain || !rightCurtain || !loadingPercentage) return

    const allSections = Array.from(document.querySelectorAll('.project-section'))
    if (!allSections.length) {
        curtain.style.display = 'none'
        return
    }
    
    // only load visible images and initial images
    const visibleSections = getVisibleSections()
    const visibleSectionSet = new Set(visibleSections)
    const heavyGifs = []
    const otherImages = []
    const essentialImageElements = []
    const seenOtherImages = new Set()
    const seenHeavyGifs = new Set()

    const firstSection = allSections[0]
    if (firstSection) {
        const firstImage = firstSection.querySelector('.project-image img')
        if (firstImage && !essentialImageElements.includes(firstImage)) {
            essentialImageElements.push(firstImage)
        }
    }

    visibleSections.forEach(section => {
        const visibleImage = section.querySelector('.project-image img')
        if (visibleImage && !essentialImageElements.includes(visibleImage)) {
            essentialImageElements.push(visibleImage)
        }
    })
    
    // categorize images by priority
    allSections.forEach((section, index) => {
        const imgElement = section.querySelector('.project-image img')
        const images = parseImageData(imgElement)
        if (!images.length) return
        
        // the first image is always the one shown initially
        if (index === 0 || visibleSectionSet.has(section)) {
            // visible and first sections are handled by essential image elements
        }
        
        // categorize the rest of the images
        images.slice(1).forEach(imgSrc => {
            if (imgSrc.toLowerCase().endsWith('.gif')) {
                if (!seenHeavyGifs.has(imgSrc)) {
                    heavyGifs.push(imgSrc)
                    seenHeavyGifs.add(imgSrc)
                }
            } else {
                if (!seenOtherImages.has(imgSrc)) {
                    otherImages.push(imgSrc)
                    seenOtherImages.add(imgSrc)
                }
            }
        })
    })
    
    const totalInitialImages = essentialImageElements.length
    let loadedImages = 0
    let curtainOpened = false
    const curtainStartTime = performance.now()
    let fallbackTimerId = null

    const openCurtains = () => {
        if (curtainOpened) return
        curtainOpened = true

        if (fallbackTimerId) {
            clearTimeout(fallbackTimerId)
            fallbackTimerId = null
        }

        loadingPercentage.classList.add('hidden')
        leftCurtain.classList.add('open')
        rightCurtain.classList.add('open')
        
        setTimeout(() => {
            curtain.style.display = 'none'
            preloadRemainingImages(heavyGifs, otherImages)
        }, 1500)
    }

    const openCurtainsRespectingMinimumTime = () => {
        if (curtainOpened) return
        const elapsed = performance.now() - curtainStartTime
        const remaining = Math.max(curtainMinimumVisibleMs - elapsed, 0)
        setTimeout(openCurtains, remaining)
    }
    
    // update loading percentage based on initial images only
    const updateProgress = () => {
        if (curtainOpened) return
        loadedImages++
        const progress = Math.min(Math.floor((loadedImages / totalInitialImages) * 100), 100)
        loadingPercentage.textContent = `${progress}%`
        
        // open curtains when initial images are loaded
        if (loadedImages >= totalInitialImages) {
            openCurtainsRespectingMinimumTime()
        }
    }
    
    if (!totalInitialImages) {
        loadingPercentage.textContent = '100%'
        openCurtainsRespectingMinimumTime()
    } else {
        essentialImageElements.forEach(imgElement => {
            waitForImageReady(imgElement).then(updateProgress)
        })
    }

    // fallback in case no images load within 5 seconds
    fallbackTimerId = setTimeout(() => {
        if (!curtainOpened) {
            loadingPercentage.textContent = '100%'
            openCurtainsRespectingMinimumTime()
        }
    }, curtainFallbackMs)
}

// helper function to get visible sections
function getVisibleSections() {
    const sections = document.querySelectorAll('.project-section')
    return Array.from(sections).filter(section => {
        const rect = section.getBoundingClientRect()
        return rect.top < window.innerHeight && rect.bottom > 0
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
    if (document.getElementById('theatre-transition-style')) return

    // smooth transitions
    const style = document.createElement('style')
    style.id = 'theatre-transition-style'
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
        if (!currentProject) return

        const imgElement = currentProject.querySelector('.project-image img')
        if (!imgElement) return

        const counterElement = currentProject.querySelector('#gallery-counter')
        const images = parseImageData(imgElement)
        if (!images.length) return

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
            updateProjectView()
        } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            // show next project
            currentProjectIndex = (currentProjectIndex + 1) % projectSections.length
            updateProjectView()
        }
    })

    function updateProjectView() {
        const currentProject = projectSections[currentProjectIndex]
        if (!currentProject) return

        const projectId = currentProject.getAttribute('id') // get project id
        hashObserverLock = {
            active: true,
            targetId: projectId,
            releaseAt: performance.now() + programmaticScrollLockMs
        }
        
        currentProject.scrollIntoView({behavior: 'smooth'});
        
        currentImageIndex = 0 // reset image index when changing projects
        // update url hash, ensuring it doesn't scroll again if already smooth scrolling
        if (window.location.hash !== `#${projectId}`) {
            history.pushState(null, null, `#${projectId}`);
        }
        
        // update counter for the new project
        const imgElement = currentProject.querySelector('.project-image img')
        const counterElement = currentProject.querySelector('#gallery-counter')
        const images = parseImageData(imgElement)
        if (!images.length) return
        updateImageCounter(currentImageIndex, images.length, counterElement)
    }
}

function trackScrollPosition(projectSections) {
    let hashUpdateTimer = null

    const scheduleHashReplace = (projectId) => {
        if (!projectId) return

        if (hashObserverLock.active && hashObserverLock.targetId && projectId !== hashObserverLock.targetId) {
            return
        }

        if (hashUpdateTimer) {
            clearTimeout(hashUpdateTimer)
        }

        hashUpdateTimer = setTimeout(() => {
            const nextHash = `#${projectId}`
            if (window.location.hash !== nextHash) {
                const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`
                history.replaceState(null, null, nextUrl)
            }
        }, hashReplaceDelayMs)
    }

    // intersection observer to detect which project is most visible
    const observer = new IntersectionObserver((entries) => {
        if (!entries.length) return

        let maxEntry = entries[0];
        entries.forEach(entry => {
            if (entry.intersectionRatio > maxEntry.intersectionRatio) {
                maxEntry = entry;
            }
        });

        const visibleProjectId = maxEntry?.target?.getAttribute('id')
        if (hashObserverLock.active) {
            const lockExpired = performance.now() >= hashObserverLock.releaseAt
            const reachedTarget = visibleProjectId && visibleProjectId === hashObserverLock.targetId

            if (lockExpired || reachedTarget) {
                hashObserverLock = {
                    active: false,
                    targetId: null,
                    releaseAt: 0
                }
            } else {
                return
            }
        }
        
        // ff the most visible section has significant visibility
        if (maxEntry && maxEntry.intersectionRatio > 0.5) {
            const newIndex = Array.from(projectSections).findIndex(
                section => section === maxEntry.target
            );
            
            // update current project index and URL only if it changed
            if (newIndex !== -1 && newIndex !== currentProjectIndex) {
                currentProjectIndex = newIndex;
                const projectId = maxEntry.target.getAttribute('id');
                scheduleHashReplace(projectId)
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