<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import VideoPlayer from './VideoPlayer.vue';
import { enableDragScroll, vImageLoading } from '../ui.js';

const props = defineProps({
    project: { type: Object, required: true },
    open: { type: Boolean, default: false },
    blinking: { type: Boolean, default: false },
});
const emit = defineEmits(['update:open']);

const gallery = ref(null);
const players = ref([]);
let dragEnabled = false;
let videoTimers = [];

const idLetter = props.project.id.match(/[A-Z]+/)[0];
const idNumber = props.project.id.match(/\d+/)[0];

function onToggle(event) {
    emit('update:open', event.target.open);
}

// Opening starts the videos one after another; closing pauses them.
watch(() => props.open, isOpen => {
    videoTimers.forEach(clearTimeout);
    videoTimers = [];
    const videos = players.value.map(player => player.video);
    if (!isOpen) {
        videos.forEach(video => video.pause());
        return;
    }
    videos.forEach((video, index) => {
        videoTimers.push(setTimeout(() => {
            if (props.open) video.play().catch(() => {});
        }, index * 400));
    });
    if (!dragEnabled && gallery.value) {
        enableDragScroll(gallery.value);
        dragEnabled = true;
    }
});

onBeforeUnmount(() => videoTimers.forEach(clearTimeout));

// The gallery sits inside <summary>; keep clicks on it from closing the item.
function onGalleryClick(event) {
    if (props.open && !event.target.closest('video, button, a')) event.preventDefault();
}
</script>

<template>
    <details
        :id="project.key"
        class="archive-item"
        :class="{ 'archive-item--hidden': !project.shown, blinking }"
        :data-project-id="project.id"
        :data-shown="String(project.shown)"
        :aria-disabled="String(!project.shown)"
        :inert="!project.shown"
        :open="open"
        @toggle="onToggle"
    >
        <summary class="archive-summary">
            <span class="archive-summary-content">
                <a
                    v-if="project.shown"
                    class="item-id-link"
                    :href="`/archive/${project.id}/`"
                    :aria-label="`Open project ${project.id}`"
                >
                    <span class="item-id" data-field="id"><span class="id-letter">{{ idLetter }}</span><span class="id-number">{{ idNumber }}</span></span>
                </a>
                <span v-else class="item-id-link item-id-link--disabled">
                    <span class="item-id" data-field="id"><span class="id-letter">{{ idLetter }}</span><span class="id-number">{{ idNumber }}</span></span>
                </span>
                <span class="item-info" data-field="who">{{ project.brand }}</span>
                <span class="item-info" data-field="what">{{ project.title }}</span>
                <span class="item-info" data-field="when">{{ project.date }}</span>
            </span>
            <span ref="gallery" v-image-loading class="image-container" @click="onGalleryClick">
                <!-- hidden projects can't be hovered or opened, so their media is never loaded -->
                <template v-if="project.shown">
                    <template v-for="item in project.media" :key="item.src">
                        <VideoPlayer
                            v-if="item.type === 'video'"
                            ref="players"
                            :src="item.src"
                            :type="item.mimeType"
                            :poster="item.poster"
                            variant="archive"
                            preload="none"
                        />
                        <img v-else class="archive-media-item" :src="item.src" :alt="project.id" loading="eager" decoding="async">
                    </template>
                </template>
            </span>
        </summary>
    </details>
</template>
