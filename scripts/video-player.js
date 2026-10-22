function formatVideoTime(time) {
    if (!Number.isFinite(time) || time < 0) return '00:00';

    const totalSeconds = Math.floor(time);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function videoHasNoAudioTrack(video) {
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) return false;

    if (video.audioTracks && typeof video.audioTracks.length === 'number') {
        return video.audioTracks.length === 0;
    }

    if (typeof video.mozHasAudio === 'boolean') {
        return !video.mozHasAudio;
    }

    if (typeof video.webkitAudioDecodedByteCount === 'number' && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        return video.webkitAudioDecodedByteCount === 0;
    }

    return false;
}

function createControlButton(className, label, ariaLabel) {
    const button = document.createElement('button');
    button.className = className;
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-label', ariaLabel);
    return button;
}

document.addEventListener('fullscreenchange', () => {
    document.querySelectorAll('[data-video-player]').forEach(player => {
        const fullscreenButton = player.querySelector('.video-control-fullscreen');
        if (!fullscreenButton) return;

        const isFullscreen = document.fullscreenElement === player;
        fullscreenButton.textContent = isFullscreen ? 'EXIT' : 'FULL';
        fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
    });
});

function initializeVideoPlayer(video) {
    if (video.closest('[data-video-player]')) return;

    const player = document.createElement('div');
    player.className = 'video-player';
    player.dataset.videoPlayer = '';

    const isArchiveVideo = video.classList.contains('archive-media-video');
    if (isArchiveVideo) player.classList.add('archive-video-player');
    if (video.classList.contains('project-media')) player.classList.add('project-video-player');

    video.parentNode.insertBefore(player, video);
    player.appendChild(video);

    const controls = document.createElement('div');
    controls.className = 'video-player-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Video controls');

    const playButton = createControlButton(
        'video-control-button video-control-play',
        'PAUSE',
        'Pause video'
    );
    const currentTime = document.createElement('span');
    currentTime.className = 'video-control-time video-control-current-time';
    currentTime.textContent = '00:00';
    currentTime.setAttribute('aria-hidden', 'true');

    const timeline = document.createElement('input');
    timeline.className = 'video-control-timeline';
    timeline.type = 'range';
    timeline.min = '0';
    timeline.max = '1000';
    timeline.value = '0';
    timeline.step = '1';
    timeline.setAttribute('aria-label', 'Seek video');

    const duration = document.createElement('span');
    duration.className = 'video-control-time video-control-duration';
    duration.textContent = '00:00';
    duration.setAttribute('aria-hidden', 'true');

    const soundButton = createControlButton(
        'video-control-button video-control-sound',
        video.muted ? 'MUTED' : 'SOUND ON',
        video.muted ? 'Unmute video' : 'Mute video'
    );
    const fullscreenButton = createControlButton(
        'video-control-button video-control-fullscreen',
        'FULL',
        'Enter fullscreen'
    );

    controls.append(playButton, currentTime, duration, soundButton, fullscreenButton);
    player.appendChild(controls);
    player.appendChild(timeline);
    let noSoundNotice = false;

    const updateTimeline = () => {
        const progress = Number.isFinite(video.duration) && video.duration > 0
            ? Math.min(1000, Math.max(0, (video.currentTime / video.duration) * 1000))
            : 0;

        timeline.value = String(progress);
        timeline.style.setProperty('--video-progress', `${progress / 10}%`);
        timeline.setAttribute('aria-valuetext', `${formatVideoTime(video.currentTime)} of ${formatVideoTime(video.duration)}`);
        currentTime.textContent = formatVideoTime(video.currentTime);
        duration.textContent = formatVideoTime(video.duration);
    };

    const updatePlayback = () => {
        const isPaused = video.paused || video.ended;
        playButton.textContent = isPaused ? 'PLAY' : 'PAUSE';
        playButton.setAttribute('aria-label', isPaused ? 'Play video' : 'Pause video');
        player.classList.toggle('is-paused', isPaused);
    };

    const updateSound = () => {
        if (noSoundNotice) {
            soundButton.textContent = 'VIDEO HAS NO SOUND';
            soundButton.setAttribute('aria-label', 'Video has no sound');
            player.classList.toggle('is-unmuted', !video.muted);
            return;
        }

        soundButton.textContent = video.muted
            ? 'MUTED'
            : 'SOUND ON';
        soundButton.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
        player.classList.toggle('is-unmuted', !video.muted);
    };

    playButton.addEventListener('click', () => {
        if (video.paused || video.ended) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    });

    soundButton.addEventListener('click', () => {
        if (noSoundNotice) {
            noSoundNotice = false;
            updateSound();
            return;
        }

        if (video.muted && videoHasNoAudioTrack(video)) {
            noSoundNotice = true;
            updateSound();
            return;
        }

        video.muted = !video.muted;
        if (!video.muted && video.paused) video.play().catch(() => {});
        updateSound();
    });

    timeline.addEventListener('input', () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        video.currentTime = (Number(timeline.value) / 1000) * video.duration;
        updateTimeline();
    });

    fullscreenButton.addEventListener('click', async () => {
        try {
            if (document.fullscreenElement === player) {
                await document.exitFullscreen();
            } else if (player.requestFullscreen) {
                await player.requestFullscreen();
            } else if (video.webkitEnterFullscreen) {
                video.webkitEnterFullscreen();
            }
        } catch {
            // Fullscreen may be unavailable in embedded or restricted contexts.
        }
    });

    video.addEventListener('loadedmetadata', () => {
        if (video.videoWidth && video.videoHeight) {
            player.style.setProperty('--video-aspect-ratio', `${video.videoWidth} / ${video.videoHeight}`);
        }
        updateTimeline();
    });
    video.addEventListener('durationchange', updateTimeline);
    video.addEventListener('timeupdate', updateTimeline);
    video.addEventListener('play', updatePlayback);
    video.addEventListener('pause', updatePlayback);
    video.addEventListener('ended', updatePlayback);
    video.addEventListener('volumechange', updateSound);

    video.controls = false;
    video.removeAttribute('controls');
    video.playsInline = true;
    updateTimeline();
    updatePlayback();
    updateSound();
}

export function initializeVideoPlayers(root = document) {
    root.querySelectorAll('video.project-media[controls], video.archive-media-video[controls]').forEach(initializeVideoPlayer);
}
