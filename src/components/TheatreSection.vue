<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { vImageLoading } from '../ui.js';

const props = defineProps({ project: { type: Object, required: true } });

const SWAP_DELAY_MS = 180;
const media = props.project.media;
// `index` drives the counter at once; `shownIndex` swaps the media after the fade-out.
const index = ref(0);
const shownIndex = ref(0);
const transitioning = ref(false);
const replaced = ref(false);
const container = ref(null);
const current = computed(() => media[shownIndex.value]);
let swapTimer;
let touchStartX = null;

function step(delta) {
    index.value = (index.value + delta + media.length) % media.length;
    transitioning.value = true;
    clearTimeout(swapTimer);
    swapTimer = setTimeout(async () => {
        shownIndex.value = index.value;
        replaced.value = true;
        transitioning.value = false;
        await nextTick();
        container.value.querySelector('video')?.play().catch(() => {});
    }, SWAP_DELAY_MS);
}

// Left half goes back, right half forward. The bottom strip stays free for the caption.
function onClick(event) {
    const rect = container.value.getBoundingClientRect();
    if (event.clientY > rect.bottom - 56) return;
    step(event.clientX - rect.left < rect.width / 2 ? -1 : 1);
}

function onTouchStart(event) {
    touchStartX = event.changedTouches[0].screenX;
}

function onTouchEnd(event) {
    if (touchStartX === null) return;
    const diffX = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diffX) > 20) step(diffX > 0 ? -1 : 1);
    touchStartX = null;
}

onBeforeUnmount(() => clearTimeout(swapTimer));

defineExpose({ step, mediaElement: () => container.value.querySelector('.project-media') });
</script>

<template>
    <div :id="project.id" class="project-section">
        <div
            ref="container"
            v-image-loading
            class="project-image"
            :class="{ transitioning }"
            @click="onClick"
            @touchstart.passive="onTouchStart"
            @touchend="onTouchEnd"
        >
            <video
                v-if="current.type === 'video'"
                :key="current.src"
                class="project-media"
                :src="current.src"
                autoplay
                muted
                loop
                playsinline
                :preload="replaced ? 'auto' : 'metadata'"
                :aria-label="project.title"
            ></video>
            <img v-else :key="current.src" class="project-media" :src="current.src" :alt="project.title" loading="lazy">
        </div>
        <div class="text-columns">
            <div class="gallery-info">
                <a class="gallery-brand" :href="`/archive/${project.id}/`">{{ project.brand }}</a>
                <div class="gallery-info-details">
                    <p class="gallery-title">{{ project.title }}</p>
                    <p class="gallery-counter">IMAGE {{ index + 1 }} OUT OF {{ media.length }}</p>
                    <p class="gallery-date">{{ project.date }}</p>
                </div>
            </div>
        </div>
    </div>
</template>
