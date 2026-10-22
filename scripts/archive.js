import { enableDragToScroll } from './utils.js';

//////////////////////////////////////////
//              hashtags
//////////////////////////////////////////

let selectedHashtags = [];
const blinkTimeout = 100;
const allHashtags = document.querySelectorAll('.hashtag-pool .hashtag');


function resetHashtagSelection() {

    selectedHashtags = [];

    allHashtags.forEach(tagElement => {

        tagElement.classList.remove('selected');
        tagElement.querySelector('.hashtag-button')?.setAttribute('aria-pressed', 'false');
        tagElement.classList.add('blinking');

        setTimeout(() => {
            tagElement.classList.remove('blinking');
        }, blinkTimeout);
    });

    document.querySelectorAll('.archive-item[open]').forEach(item => {
        item.open = false;
    });

    filterProjectsByHashtags();
}

function toggleHashtagSelection(element) {
    const selectedClass = 'selected';
    const tag = element.dataset.tag.trim();

    element.classList.toggle(selectedClass);
    element.querySelector('.hashtag-button')?.setAttribute(
        'aria-pressed',
        String(element.classList.contains(selectedClass))
    );

    if (element.classList.contains(selectedClass)) {
        selectedHashtags.push(tag);
    } else {
        selectedHashtags = selectedHashtags.filter(item => item !== tag);
    }

    allHashtags.forEach(tagElement => {

        // tagElement.classList.remove('selected');
        tagElement.classList.add('blinking');

        setTimeout(() => {
            tagElement.classList.remove('blinking');
        }, blinkTimeout);
    });

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


        // const archiveList = document.querySelector('.archive-list');
        // if (archiveList && archiveList.firstElementChild) {
        //     archiveList.firstElementChild.scrollIntoView();
        // }
    });

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
//       Sort State and Globals
//////////////////////////////////////////

let sortState = {
    index: 'desc',
    who: 'asc',
    what: 'asc',
    when: 'desc'
};

let currentSortedField = 'when';
let currentWhatIndicator = '☄'; // default indicator for what
let hasWhatBeenSorted = false;

function updateSortIndicator() {
    ['index','who','what','when'].forEach(field => {
        const btn = document.getElementById('filter-' + field);
        if (!btn) return;
        if(field === currentSortedField) {
            if(field === 'what') {
                const indicator = hasWhatBeenSorted ? currentWhatIndicator : (sortState.what === 'asc' ? '↓' : '↑');
                btn.innerHTML = "what <span class='sort-indicator'>" + indicator + "</span>";
            } else {
                // For non-'what', use arrow based on sort order: asc => ↓, desc => ↑
                let arrow = sortState[field] === 'asc' ? '↓' : '↑';
                btn.innerHTML = field + " <span class='sort-indicator'>" + arrow + "</span>";
            }
        } else {
            btn.innerHTML = field;
        }
    });
}

//////////////////////////////////////////
//     Filter and Sort Functions
//////////////////////////////////////////

function sortArchive(field, type = 'text', order = 'asc') {
    const archiveList = document.querySelector('.archive-list');
    const items = Array.from(archiveList.getElementsByClassName('archive-item'));

    const sortOrder = order === 'asc' ? 1 : -1;

    items.sort((a, b) => {
        let valueA, valueB;

        if (type === 'date') {
            valueA = parseDate(a.querySelector(`[data-field="${field}"]`).textContent.trim());
            valueB = parseDate(b.querySelector(`[data-field="${field}"]`).textContent.trim());
        } else {
            valueA = a.querySelector(`[data-field="${field}"]`).textContent.trim().toLowerCase();
            valueB = b.querySelector(`[data-field="${field}"]`).textContent.trim().toLowerCase();
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
        const monthIndex = monthMap[month.substring(0, 3)]; // get numeric month
        return new Date(year, monthIndex); // create Date object for comparison
    }
}

function filterIndex() {
    const currentOrder = sortState.index;
    sortArchive('id', 'text', currentOrder);
    sortState.index = currentOrder === 'asc' ? 'desc' : 'asc';
    currentSortedField = 'index';
    updateSortIndicator();
}

function filterWho() {
    const currentOrder = sortState.who;
    sortArchive('who', 'text', currentOrder);
    sortState.who = currentOrder === 'asc' ? 'desc' : 'asc';
    currentSortedField = 'who';
    updateSortIndicator();
}

function filterWhat() {
    currentSortedField = 'what';
    const whatIndicators = ['☄','☯','✈','😱','🔫','🏃','👤','😉','𝄞','🚁','†','▩','♬','👾'];
    currentWhatIndicator = whatIndicators[Math.floor(Math.random() * whatIndicators.length)];

    if (!hasWhatBeenSorted) {
        sortArchive('what', 'text', 'asc');
        updateSortIndicator();
        hasWhatBeenSorted = true;
        return;
    }
    
    const archiveList = document.querySelector('.archive-list');
    const items = Array.from(archiveList.getElementsByClassName('archive-item'));

    // Fisher-Yates shuffle algorithm
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]]; 
    }
    items.forEach(item => archiveList.appendChild(item));
    updateSortIndicator();
}

function filterWhen() {
    const currentOrder = sortState.when;
    sortArchive('when', 'date', currentOrder);
    sortState.when = currentOrder === 'asc' ? 'desc' : 'asc';
    currentSortedField = 'when';
    updateSortIndicator();
}

// exposing functions to global scope
window.filterIndex = filterIndex;
window.filterWho = filterWho;
window.filterWhat = filterWhat;
window.filterWhen = filterWhen;
window.toggleHashtagSelection = toggleHashtagSelection;
window.resetHashtagSelection = resetHashtagSelection;

//////////////////////////////////////////
//               Misc
//////////////////////////////////////////

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.archive-item[data-shown="true"]').forEach(item => {
        const gallery = item.querySelector('.image-container');

        item.addEventListener('toggle', () => {
            if (!item.open) return;
            if (gallery && gallery.dataset.dragEnabled !== 'true') {
                enableDragToScroll(gallery);
                gallery.dataset.dragEnabled = 'true';
            }
        });

        gallery?.addEventListener('click', event => {
            if (item.open && !event.target.closest('video, button, a')) {
                event.preventDefault();
            }
        });
    });

    const hashtagElements = document.querySelectorAll('.hashtag-pool .hashtag:not(#hashtag-reset)');
    if (hashtagElements.length > 0) {
        hashtagElements.forEach(tagElement => {
            tagElement.querySelector('.hashtag-button')?.addEventListener('click', () => {
                toggleHashtagSelection(tagElement);
            });
        });
    }

    const resetButton = document.querySelector('#hashtag-reset .hashtag-button');
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

    updateSortIndicator(); // ensure correct default indicator on load
    
    filterWhen(); // sort by 'when' on page load
});

if (document.getElementById('archive')) {
    window.addEventListener('footerHashtagClicked', (e) => {
        const hashtag = e.detail.hashtag;
        // resetHashtagSelection();
        const hashtagElement = document.querySelector(`.hashtag-pool .hashtag[data-tag="${hashtag}"]`);
        if (hashtagElement) {
            toggleHashtagSelection(hashtagElement);
        }
        //document.getElementById('archive').scrollIntoView();
    });
}
