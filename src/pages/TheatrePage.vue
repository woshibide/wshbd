<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { projects as allProjects } from 'virtual:content';
import SiteHeader from '../components/SiteHeader.vue';
import TheatreSection from '../components/TheatreSection.vue';
import { shownProjects } from '../lib/content.js';
import { runCurtain } from '../lib/curtain.js';

const HASH_REPLACE_DELAY_MS = 180;
const PROGRAMMATIC_SCROLL_LOCK_MS = 1200;

// Newest additions to archive.json come last there, so the theatre plays it backwards.
const projects = shownProjects(allProjects).reverse();

const sections = [];
const progress = ref('0%');
const curtainOpen = ref(false);
const curtainHidden = ref(false);

let currentIndex = 0;
let observer;
let hashTimer;
// While a keyboard jump scrolls, ignore sections passing by on the way.
let scrollLock = { active: false, targetId: null, releaseAt: 0 };

function sectionElements() {
    return projects.map(project => document.getElementById(project.id));
}

function isOnScreen(element) {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
}

function goToProject(index) {
    currentIndex = (index + projects.length) % projects.length;
    const { id } = projects[currentIndex];
    scrollLock = { active: true, targetId: id, releaseAt: performance.now() + PROGRAMMATIC_SCROLL_LOCK_MS };
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
    if (window.location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
}

function onKeydown(event) {
    const actions = {
        ArrowLeft: () => sections[currentIndex]?.step(-1),
        ArrowRight: () => sections[currentIndex]?.step(1),
        ArrowUp: () => goToProject(currentIndex - 1),
        ArrowDown: () => goToProject(currentIndex + 1),
    };
    if (!actions[event.key]) return;
    event.preventDefault();
    actions[event.key]();
}

function scheduleHashReplace(id) {
    if (scrollLock.active && scrollLock.targetId && id !== scrollLock.targetId) return;
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
        if (window.location.hash !== `#${id}`) {
            history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`);
        }
    }, HASH_REPLACE_DELAY_MS);
}

function trackVisibleSection(elements) {
    observer = new IntersectionObserver(entries => {
        const top = entries.reduce((best, entry) => (entry.intersectionRatio > best.intersectionRatio ? entry : best));
        const visibleId = top.target.id;
        if (scrollLock.active) {
            if (performance.now() < scrollLock.releaseAt && visibleId !== scrollLock.targetId) return;
            scrollLock = { active: false, targetId: null, releaseAt: 0 };
        }
        if (top.intersectionRatio <= 0.5) return;
        const index = elements.indexOf(top.target);
        if (index !== -1 && index !== currentIndex) {
            currentIndex = index;
            scheduleHashReplace(visibleId);
        }
    }, { threshold: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9] });
    elements.forEach(element => observer.observe(element));
}

onMounted(() => {
    const elements = sectionElements();
    const mediaOf = element => element.querySelector('.project-media');
    const essential = [...new Set([elements[0], ...elements.filter(isOnScreen)].map(mediaOf))];
    runCurtain({
        essential,
        projects,
        setProgress: value => { progress.value = value; },
        open: () => { curtainOpen.value = true; },
        hide: () => { curtainHidden.value = true; },
    });
    document.addEventListener('keydown', onKeydown);
    trackVisibleSection(elements);
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown);
    observer?.disconnect();
    clearTimeout(hashTimer);
});
</script>

<template>
    <div v-show="!curtainHidden" id="theatre-curtain">
        <div class="curtain-half left" :class="{ open: curtainOpen }"></div>
        <div class="loading-percentage" :class="{ hidden: curtainOpen }">{{ progress }}</div>
        <div class="curtain-half right" :class="{ open: curtainOpen }"></div>
    </div>
    <SiteHeader />
    <section>
        <div id="random-gallery-container" class="random-gallery">
            <TheatreSection
                v-for="(project, index) in projects"
                :key="project.id"
                :ref="section => { sections[index] = section; }"
                :project="project"
            />
        </div>
    </section>
</template>
