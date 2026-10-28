<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

// Video with the site's own text controls. `variant` picks the layout: "project" or "archive".
const props = defineProps({
    src: { type: String, required: true },
    type: { type: String, required: true },
    poster: { type: String, default: null },
    variant: { type: String, required: true },
    autoplay: { type: Boolean, default: false },
    preload: { type: String, default: 'metadata' },
});

const player = ref(null);
const video = ref(null);
const paused = ref(true);
const muted = ref(true);
const currentTime = ref(0);
const duration = ref(NaN);
const aspectRatio = ref(null);
const isFullscreen = ref(false);
const noSoundNotice = ref(false);

const videoClass = computed(() => props.variant === 'archive'
    ? 'archive-media-item archive-media-video'
    : 'project-media project-media-video');

const progress = computed(() => (Number.isFinite(duration.value) && duration.value > 0
    ? Math.min(1000, Math.max(0, (currentTime.value / duration.value) * 1000))
    : 0));

function formatTime(time) {
    if (!Number.isFinite(time) || time < 0) return '00:00';
    const total = Math.floor(time);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const soundLabel = computed(() => {
    if (noSoundNotice.value) return 'VIDEO HAS NO SOUND';
    return muted.value ? 'MUTED' : 'SOUND ON';
});

const soundAriaLabel = computed(() => {
    if (noSoundNotice.value) return 'Video has no sound';
    return muted.value ? 'Unmute video' : 'Mute video';
});

function hasNoAudioTrack(element) {
    if (element.readyState < HTMLMediaElement.HAVE_METADATA) return false;
    if (element.audioTracks && typeof element.audioTracks.length === 'number') return element.audioTracks.length === 0;
    if (typeof element.mozHasAudio === 'boolean') return !element.mozHasAudio;
    if (typeof element.webkitAudioDecodedByteCount === 'number' && element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        return element.webkitAudioDecodedByteCount === 0;
    }
    return false;
}

function syncTime() {
    currentTime.value = video.value.currentTime;
    duration.value = video.value.duration;
}

function syncPlayback() {
    paused.value = video.value.paused || video.value.ended;
}

function onLoadedMetadata() {
    const { videoWidth, videoHeight } = video.value;
    if (videoWidth && videoHeight) aspectRatio.value = `${videoWidth} / ${videoHeight}`;
    syncTime();
}

function togglePlay() {
    if (video.value.paused || video.value.ended) video.value.play().catch(() => {});
    else video.value.pause();
}

function toggleSound() {
    if (noSoundNotice.value) {
        noSoundNotice.value = false;
        return;
    }
    if (video.value.muted && hasNoAudioTrack(video.value)) {
        noSoundNotice.value = true;
        return;
    }
    video.value.muted = !video.value.muted;
    if (!video.value.muted && video.value.paused) video.value.play().catch(() => {});
}

function seek(event) {
    if (!Number.isFinite(video.value.duration) || video.value.duration <= 0) return;
    video.value.currentTime = (Number(event.target.value) / 1000) * video.value.duration;
    syncTime();
}

async function toggleFullscreen() {
    try {
        if (document.fullscreenElement === player.value) await document.exitFullscreen();
        else if (player.value.requestFullscreen) await player.value.requestFullscreen();
        else if (video.value.webkitEnterFullscreen) video.value.webkitEnterFullscreen();
    } catch {
        // fullscreen can be unavailable in embedded or restricted contexts
    }
}

function onFullscreenChange() {
    isFullscreen.value = document.fullscreenElement === player.value;
}

onMounted(() => {
    // the video may have started (autoplay) or loaded metadata before hydration
    if (video.value.readyState >= HTMLMediaElement.HAVE_METADATA) onLoadedMetadata();
    syncPlayback();
    muted.value = video.value.muted;
    document.addEventListener('fullscreenchange', onFullscreenChange);
});

onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFullscreenChange));

defineExpose({ video });
</script>

<template>
    <div
        ref="player"
        class="video-player"
        :class="[`${variant}-video-player`, { 'is-paused': paused, 'is-unmuted': !muted }]"
        :style="aspectRatio ? { '--video-aspect-ratio': aspectRatio } : null"
        data-video-player
    >
        <video
            ref="video"
            :class="videoClass"
            :poster="poster"
            :autoplay="autoplay"
            muted
            loop
            playsinline
            :preload="preload"
            @loadedmetadata="onLoadedMetadata"
            @durationchange="syncTime"
            @timeupdate="syncTime"
            @play="syncPlayback"
            @pause="syncPlayback"
            @ended="syncPlayback"
            @volumechange="muted = video.muted"
        >
            <source :src="src" :type="type">
        </video>
        <div class="video-player-controls" role="group" aria-label="Video controls">
            <button
                class="video-control-button video-control-play"
                type="button"
                :aria-label="paused ? 'Play video' : 'Pause video'"
                @click="togglePlay"
            >{{ paused ? 'PLAY' : 'PAUSE' }}</button>
            <span class="video-control-time video-control-current-time" aria-hidden="true">{{ formatTime(currentTime) }}</span>
            <span class="video-control-time video-control-duration" aria-hidden="true">{{ formatTime(duration) }}</span>
            <button
                class="video-control-button video-control-sound"
                type="button"
                :aria-label="soundAriaLabel"
                @click="toggleSound"
            >{{ soundLabel }}</button>
            <button
                class="video-control-button video-control-fullscreen"
                type="button"
                :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
                @click="toggleFullscreen"
            >{{ isFullscreen ? 'EXIT' : 'FULL' }}</button>
        </div>
        <input
            class="video-control-timeline"
            type="range"
            min="0"
            max="1000"
            step="1"
            aria-label="Seek video"
            :value="progress"
            :aria-valuetext="`${formatTime(currentTime)} of ${formatTime(duration)}`"
            :style="{ '--video-progress': `${progress / 10}%` }"
            @input="seek"
        >
    </div>
</template>
