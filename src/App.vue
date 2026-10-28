<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import HomePage from './pages/HomePage.vue';
import ArchivePage from './pages/ArchivePage.vue';
import ProjectPage from './pages/ProjectPage.vue';
import AboutPage from './pages/AboutPage.vue';
import TheatrePage from './pages/TheatrePage.vue';
import EssaysPage from './pages/EssaysPage.vue';
import ErrorPage from './pages/ErrorPage.vue';

defineProps({ route: { type: Object, required: true } });

const pages = {
    home: HomePage,
    archive: ArchivePage,
    project: ProjectPage,
    about: AboutPage,
    theatre: TheatrePage,
    essays: EssaysPage,
    error: ErrorPage,
};

// Press "d" to show the 4-column layout grid.
const showGrid = ref(false);
function onKeydown(event) {
    if (
        event.key.toLowerCase() !== 'd' || event.repeat || event.metaKey || event.ctrlKey || event.altKey
        || event.target.closest?.('input, textarea, select, [contenteditable="true"]')
    ) return;
    showGrid.value = !showGrid.value;
}
onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
    <component :is="pages[route.page]" v-bind="route.props" />
    <div id="column-grid-overlay" :class="{ 'is-visible': showGrid }" aria-hidden="true">
        <div v-for="column in 4" :key="column"></div>
    </div>
</template>
