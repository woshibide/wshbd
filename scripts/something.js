let currentProjectIndex = 0

document.addEventListener('DOMContentLoaded', () => {

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
})

function addImageNavigation(imageContainer, images, imgElement) {
    let currentImageIndex = 0

    function updateImage() {
        imgElement.src = images[currentImageIndex]
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

function addProjectNavigation(projectSections) {
    let currentImageIndex = 0 // track current image index for the current project

    document.addEventListener('keydown', (event) => {
        const currentProject = projectSections[currentProjectIndex]
        const imgElement = currentProject.querySelector('.project-image img')
        const images = JSON.parse(imgElement.getAttribute('data-images'))

        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            // left arrow key, show previous image
            currentImageIndex = (currentImageIndex - 1 + images.length) % images.length
            imgElement.src = images[currentImageIndex]
        } else if (event.key === 'ArrowRight') {
            event.preventDefault()
            // right arrow key, show next image
            currentImageIndex = (currentImageIndex + 1) % images.length
            imgElement.src = images[currentImageIndex]
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
        currentProject.scrollIntoView({ behavior: 'smooth' })
        currentImageIndex = 0 // reset image index when changing projects
        const projectId = currentProject.getAttribute('id') // get project id
        window.location.hash = projectId // update url hash
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