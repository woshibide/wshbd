// variables to store projects, current project index, and imageMap
let projectsList = [];
let currentProjectIndex = 0;
let imageMap = {};
//console.log('initialized variables');

async function fetchJSON(url) {
    //console.log(`fetching JSON data from ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`failed to fetch ${url}: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        //console.log(`successfully fetched data from ${url}`);
        return data;
    } catch (error) {
        console.error(`error fetching ${url}:`, error);
        return null;
    }
}

// function to update the gallery with project data
function updateGallery(project, images, currentImageIndex) {
    //console.log('updating gallery with project:', project);
    const galleryImage = document.querySelector('.random-gallery-images img');
    if (!galleryImage) {
        console.error('gallery image element not found');
        return;
    }
    galleryImage.src = images[currentImageIndex];
    galleryImage.alt = project.title;

    // update the project info
    document.getElementById('brand').textContent = project.brand;
    document.getElementById('title').textContent = project.title;
    document.getElementById('date').textContent = project.date;
    document.getElementById('gallery-id').textContent = project.id;

    //console.log(`gallery updated with image: ${images[currentImageIndex]}`);
}

// function to preload images
async function preloadImages(images) {
    //console.log('preloading images:', images);
    return Promise.all(images.map(src => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                //console.log(`image loaded: ${src}`);
                resolve(src);
            };
            img.onerror = () => {
                console.error(`image failed to load: ${src}`);
                resolve(src);
            };
        });
    }));
}

// function to load a specific project
async function loadProject(index, imageMap) {
    //console.log(`loading project at index ${index}`);
    // showLoader('random-gallery-container');

    // wrap index if out of bounds
    if (index < 0) {
        currentProjectIndex = projectsList.length - 1;
    } else if (index >= projectsList.length) {
        currentProjectIndex = 0;
    } else {
        currentProjectIndex = index;
    }

    const project = projectsList[currentProjectIndex];
    let images = imageMap[project.id];

    //console.log('project selected:', project);

    // if no images, use a default image
    if (!images || images.length === 0) {
        images = ['/content/misc/non-image.svg'];
    } else {
        const basePath = '/content/images/';
        images = images.map(image => {
            return image.startsWith('/content/images/')
                ? image
                : `${basePath}${project.id}/${image}`;
        });
    }

    //console.log('images for project:', images);

    // preload images
    const preloadedImages = await preloadImages(images);

    // start with the first image
    let currentImageIndex = 0;
    updateGallery(project, preloadedImages, currentImageIndex);

    // hideLoader('random-gallery-container');

    // add image navigation
    addImageNavigation(preloadedImages, project, currentImageIndex);
}

// function to add image click and swipe navigation within a project
function addImageNavigation(preloadedImages, project, currentImageIndex) {
    //console.log('adding image navigation');
    const galleryContainer = document.querySelector('.random-gallery-images');

    if (!galleryContainer) {
        console.error('gallery container not found');
        return;
    }

    // remove previous event listeners
    const newGalleryContainer = galleryContainer.cloneNode(true);
    galleryContainer.parentNode.replaceChild(newGalleryContainer, galleryContainer);

    // click navigation
    newGalleryContainer.addEventListener('click', (event) => {
        //console.log('gallery image clicked');
        const containerWidth = newGalleryContainer.offsetWidth;
        const clickX = event.clientX - newGalleryContainer.getBoundingClientRect().left;

        if (clickX < containerWidth / 2) {
            // clicked on left side, show previous image
            currentImageIndex = (currentImageIndex === 0) ? preloadedImages.length - 1 : currentImageIndex - 1;
            //console.log('showing previous image');
        } else {
            // clicked on right side, show next image
            currentImageIndex = (currentImageIndex === preloadedImages.length - 1) ? 0 : currentImageIndex + 1;
            //console.log('showing next image');
        }

        updateGallery(project, preloadedImages, currentImageIndex);
    });

    // swipe navigation
    let touchStartX = null;

    newGalleryContainer.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].screenX;
    });

    newGalleryContainer.addEventListener('touchend', (event) => {
        if (touchStartX === null) return;

        const touchEndX = event.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;

        if (Math.abs(diffX) > 30) {
            if (diffX > 0) {
                // swiped right, show previous image
                currentImageIndex = (currentImageIndex === 0) ? preloadedImages.length - 1 : currentImageIndex - 1;
                //console.log('swiped right, showing previous image');
            } else {
                // swiped left, show next image
                currentImageIndex = (currentImageIndex === preloadedImages.length - 1) ? 0 : currentImageIndex + 1;
                //console.log('swiped left, showing next image');
            }

            updateGallery(project, preloadedImages, currentImageIndex);
        }

        touchStartX = null;
    });

    // cursor styling based on mouse position
    newGalleryContainer.addEventListener('mousemove', (event) => {
        const containerWidth = newGalleryContainer.offsetWidth;
        const mouseX = event.clientX - newGalleryContainer.getBoundingClientRect().left;

        if (mouseX < containerWidth / 2) {
            newGalleryContainer.classList.add('left-hover');
        } else {
            newGalleryContainer.classList.remove('left-hover');
        }
    });
}

// function to handle scroll navigation between projects
function addScrollNavigation() {
    //console.log('adding scroll navigation');

    let accumulatedScroll = 0; // track accumulated scroll distance
    const scrollThreshold = 500; // set a threshold for significant scroll

    window.addEventListener('wheel', (event) => {
        //console.log('wheel event detected:', event.deltaY);
        
        // accumulate scroll distance
        accumulatedScroll += event.deltaY;

        if (accumulatedScroll > scrollThreshold) {
            //console.log('scrolled down significantly, loading next project');
            loadProject(currentProjectIndex + 1, imageMap);
            accumulatedScroll = 0; // reset accumulated scroll
        } else if (accumulatedScroll < -scrollThreshold) {
            //console.log('scrolled up significantly, loading previous project');
            loadProject(currentProjectIndex - 1, imageMap);
            accumulatedScroll = 0; // reset accumulated scroll
        }

        // prevent default scroll behavior
        event.preventDefault();
    }, { passive: false });
}

// main function to initialize the gallery
async function initializeGallery() {
    //console.log('initializing gallery');
    // showLoader('random-gallery-container');

    const archiveData = await fetchJSON('/content/info/archive.json');
    if (!archiveData) {
        console.error('failed to fetch archive data');
        return;
    }
    //console.log('archiveData:', archiveData);
    imageMap = await fetchJSON('/content/info/image-map.json');
    if (!imageMap) {
        console.error('failed to fetch image map');
        return;
    }
    //console.log('imageMap:', imageMap);

    projectsList = archiveData.projects;
    //console.log('projectsList:', projectsList);

    if (!projectsList || projectsList.length === 0) {
        console.error('no projects found');
        return;
    }

    currentProjectIndex = Math.floor(Math.random() * projectsList.length);
    //console.log('currentProjectIndex:', currentProjectIndex);
    await loadProject(currentProjectIndex, imageMap);

    // add scroll navigation between projects
    addScrollNavigation();

    // hideLoader('random-gallery-container');
}

// event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    //console.log('DOM fully loaded and parsed');
    initializeGallery();
});