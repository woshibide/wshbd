import { fetchJSON } from './utils.js';

//////////////////////////////////////////
//              Hashtags
//////////////////////////////////////////

let selectedHashtags = [];

function resetHashtagSelection() {

    selectedHashtags = [];

    const allHashtags = document.querySelectorAll('.hashtag-pool .hashtag');
    allHashtags.forEach(tagElement => {
        tagElement.classList.remove('selected');

        tagElement.classList.add('blinking');

        setTimeout(() => {
            tagElement.classList.remove('blinking');
        }, 100);
    });

    filterProjectsByHashtags();
}

function toggleHashtagSelection(element) {
    const selectedClass = 'selected';
    const tag = element.dataset.tag.trim();

    element.classList.toggle(selectedClass);

    if (element.classList.contains(selectedClass)) {
        selectedHashtags.push(tag);
    } else {
        selectedHashtags = selectedHashtags.filter(item => item !== tag);
    }
    filterProjectsByHashtags();
}

function filterProjectsByHashtags() {
    const archiveItems = document.querySelectorAll('.archive-list .archive-item');

    archiveItems.forEach(archiveItem => {
        const projectHashtags = Array.from(archiveItem.querySelectorAll('.hashtags-line .hashtag'))
            .map(tagElement => tagElement.textContent.trim());

        const hasSelectedHashtags = selectedHashtags.some(tag => projectHashtags.includes(tag));

        if (selectedHashtags.length === 0 || hasSelectedHashtags) {
            archiveItem.style.display = '';
        } else {
            archiveItem.style.display = 'none';
        }
    });

    // Add a check here
    if (archiveItems.length > 0) {
        archiveItems.forEach(tagElement => {
            tagElement.classList.remove('selected');
            tagElement.classList.add('blinking');
            setTimeout(() => {
                tagElement.classList.remove('blinking');
            }, 1000); // match the animation duration
        });
    }
}


//////////////////////////////////////////
//         Filter and Sort Functions
//////////////////////////////////////////

let sortState = {
    index: 'asc',
    who: 'asc',
    what: 'asc',
    when: 'asc'
};

function sortArchive(field, type = 'text', order = 'asc') {
    const archiveList = document.querySelector('.archive-list');
    const items = Array.from(archiveList.getElementsByClassName('archive-item'));

    const sortOrder = order === 'asc' ? 1 : -1;

    items.sort((a, b) => {
        let valueA, valueB;

        if (type === 'date') {
            valueA = parseDate(a.querySelector(`#${field}`).textContent.trim());
            valueB = parseDate(b.querySelector(`#${field}`).textContent.trim());
        } else {
            valueA = a.querySelector(`#${field}`).textContent.trim().toLowerCase();
            valueB = b.querySelector(`#${field}`).textContent.trim().toLowerCase();
        }

        if (valueA < valueB) return -1 * sortOrder;
        if (valueA > valueB) return 1 * sortOrder;

        return 0;
    });

    items.forEach(item => archiveList.appendChild(item));

    function parseDate(dateString) {
        const monthMap = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };
        const [year, month] = dateString.toLowerCase().split(' ');
        const monthIndex = monthMap[month.substring(0, 3)]; // Get numeric month
        return new Date(year, monthIndex); // Create Date object for comparison
    }
}

function filterIndex() {
    const currentOrder = sortState.index;
    sortArchive('id', 'text', currentOrder);
    sortState.index = currentOrder === 'asc' ? 'desc' : 'asc';
}

function filterWho() {
    const currentOrder = sortState.who;
    sortArchive('who', 'text', currentOrder);
    sortState.who = currentOrder === 'asc' ? 'desc' : 'asc';
}

function filterWhat() {
    const archiveList = document.querySelector('.archive-list');
    const items = Array.from(archiveList.getElementsByClassName('archive-item'));

    let tahw = 'what';
    let shuffled = tahw.split('').sort(() => Math.random() - 0.5).join('');
    let what = document.getElementById('what');
    what.textContent = shuffled;

    // Fisher-Yates shuffle algorithm
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]]; 
    }

    items.forEach(item => archiveList.appendChild(item));
}

function filterWhen() {
    const currentOrder = sortState.when;
    sortArchive('when', 'date', currentOrder);
    sortState.when = currentOrder === 'asc' ? 'desc' : 'asc';
}

// exposing functions to global scope
window.filterIndex = filterIndex;
window.filterWho = filterWho;
window.filterWhat = filterWhat;
window.filterWhen = filterWhen;
window.toggleHashtagSelection = toggleHashtagSelection;
window.resetHashtagSelection = resetHashtagSelection;

//////////////////////////////////////////
//        Toggle Archive Item
//////////////////////////////////////////

async function toggleArchiveItem(item) {
    const expandedClass = 'expanded';
    const isExpanded = item.classList.contains(expandedClass);

    if (isExpanded) {
        // collapse the item
        item.classList.remove(expandedClass);

        const imageContainer = item.querySelector('.image-container');
        if (imageContainer) {
            imageContainer.innerHTML = '';
        }
    } else {
        // expand item
        item.classList.add(expandedClass);

        const projectId = item.id;
        const imageMap = await getImageMapData();

        const imageUrls = imageMap[projectId] ? imageMap[projectId] : ['/content/misc/non-image.svg'];

        const imageContainer = item.querySelector('.image-container');


        if (imageContainer) {
            imageContainer.innerHTML = '';

            imageUrls.forEach((imageUrl) => {
                const img = document.createElement('img');
                img.dataset.src = `/content/images/${projectId}/${imageUrl}`;
                img.alt = projectId;
                img.classList.add('lazy');
                imageContainer.appendChild(img);
            });

            lazyLoadImages();
        } else {
            console.warn('No image container found within the archive item.');
        }
    }
}



function lazyLoadImages() {
    const images = document.querySelectorAll('img.lazy');

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.onload = () => img.classList.add('lazyloaded');
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(function(img) {
            imageObserver.observe(img);
        });
    } else {
        images.forEach(function(img) {
            img.src = img.dataset.src;
            img.onload = () => img.classList.add('lazyloaded');
            img.classList.remove('lazy');
        });
    }
}


let imageMapData = null;

async function getImageMapData() {
    if (!imageMapData) {
        imageMapData = await fetchJSON('/content/info/image-map.json');
    }
    return imageMapData;
}

//////////////////////////////////////////
//               Misc
//////////////////////////////////////////

document.addEventListener('DOMContentLoaded', async () => {
    const archiveItems = document.querySelectorAll('.archive-item');
    if (archiveItems.length > 0) {
        archiveItems.forEach(item => {
            item.addEventListener('click', () => toggleArchiveItem(item));
        });
    }

    const hashtagElements = document.querySelectorAll('.hashtag-pool .hashtag');
    if (hashtagElements.length > 0) {
        hashtagElements.forEach(tagElement => {
            tagElement.addEventListener('click', () => toggleHashtagSelection(tagElement));
        });
    }

    const resetButton = document.getElementById('hashtag-reset');
    if (resetButton) {
        resetButton.addEventListener('click', resetHashtagSelection);
    }

    const selectedBrief = localStorage.getItem('selectedBrief');
    if (selectedBrief) {
        const hashtagElement = document.querySelector(`.hashtag-pool .hashtag[data-tag="${selectedBrief}"]`);
        if (hashtagElement) {
            toggleHashtagSelection(hashtagElement);
        }
        localStorage.removeItem('selectedBrief');
    }
});

if (document.getElementById('archive')) {
    window.addEventListener('footerHashtagClicked', (e) => {
        const hashtag = e.detail.hashtag;
        resetHashtagSelection();
        const hashtagElement = document.querySelector(`.hashtag-pool .hashtag[data-tag="${hashtag}"]`);
        if (hashtagElement) {
            toggleHashtagSelection(hashtagElement);
        }
        document.getElementById('archive').scrollIntoView();
    });
}
