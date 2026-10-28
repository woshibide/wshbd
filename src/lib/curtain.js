// Theatre loading curtain: waits for the media on screen, reports progress, then opens.

const FALLBACK_MS = 8000;
const MINIMUM_VISIBLE_MS = 900;
const OPEN_DURATION_MS = 1500;
const VIDEO_BUFFER_TARGET = 0.33;

function bufferedRatio(video) {
    const { duration } = video;
    if (!Number.isFinite(duration) || duration <= 0) return video.readyState >= 2 ? 1 : 0;
    const ranges = video.buffered;
    let bufferedEnd = 0;
    for (let i = 0; i < ranges.length; i += 1) {
        const start = ranges.start(i);
        const end = ranges.end(i);
        if (video.currentTime >= start && video.currentTime <= end) {
            bufferedEnd = end;
            break;
        }
        bufferedEnd = Math.max(bufferedEnd, end);
    }
    return Math.min(Math.max(bufferedEnd / duration, 0), 1);
}

function waitForVideoBuffer(video, onProgress) {
    return new Promise(resolve => {
        const events = ['loadedmetadata', 'durationchange', 'loadeddata', 'progress', 'canplay', 'canplaythrough'];
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            events.forEach(name => video.removeEventListener(name, check));
            video.removeEventListener('error', finish);
            resolve();
        };
        function check() {
            const ratio = bufferedRatio(video);
            onProgress(ratio);
            if (ratio >= VIDEO_BUFFER_TARGET || video.readyState >= 3) finish();
        }
        events.forEach(name => video.addEventListener(name, check));
        video.addEventListener('error', finish);
        video.preload = 'auto';
        video.load(); // restart loading with the new preload hint
        check();
    });
}

function waitForMedia(element) {
    return new Promise(resolve => {
        if (element instanceof HTMLImageElement) {
            if (element.complete && element.naturalWidth > 0) return resolve();
            element.addEventListener('load', resolve, { once: true });
            element.addEventListener('error', resolve, { once: true });
            element.decode?.().then(resolve).catch(() => {});
            return;
        }
        if (element instanceof HTMLVideoElement) {
            if (element.readyState >= 2) return resolve();
            element.addEventListener('loadeddata', resolve, { once: true });
            element.addEventListener('error', resolve, { once: true });
            return;
        }
        resolve();
    });
}

function preload(sources, batchSize) {
    const load = src => new Promise(resolve => {
        const image = new Image();
        image.onload = resolve;
        image.onerror = resolve;
        image.src = src;
    });
    return sources.reduce((chain, _, index) => (index % batchSize === 0
        ? chain.then(() => Promise.all(sources.slice(index, index + batchSize).map(load)))
            .then(() => new Promise(resolve => setTimeout(resolve, 100)))
        : chain), Promise.resolve());
}

// After the curtain opens, warm the cache with every other image; heavy GIFs go last.
function preloadRemaining(projects) {
    const images = [...new Set(projects.flatMap(project => project.media.slice(1))
        .filter(item => item.type === 'image').map(item => item.src))];
    const gifs = images.filter(src => src.toLowerCase().endsWith('.gif'));
    const others = images.filter(src => !src.toLowerCase().endsWith('.gif'));
    preload(others, 5).then(() => preload(gifs, 2));
}

// `essential` are the media elements the visitor sees first; `setProgress(text)` and
// `open()` / `hide()` drive the curtain's markup.
export function runCurtain({ essential, projects, setProgress, open, hide }) {
    const startedAt = performance.now();
    let opened = false;
    let fallbackTimer;

    const openNow = () => {
        if (opened) return;
        opened = true;
        clearTimeout(fallbackTimer);
        open();
        setTimeout(() => {
            hide();
            preloadRemaining(projects);
        }, OPEN_DURATION_MS);
    };
    const openWhenShownLongEnough = () => {
        if (opened) return;
        setTimeout(openNow, Math.max(MINIMUM_VISIBLE_MS - (performance.now() - startedAt), 0));
    };
    const finish = () => {
        setProgress('100%');
        openWhenShownLongEnough();
    };

    const video = essential.find(element => element instanceof HTMLVideoElement);
    if (essential.length === 0) {
        finish();
    } else if (video) {
        waitForVideoBuffer(video, ratio => {
            if (!opened) setProgress(`${Math.min(Math.floor((ratio / VIDEO_BUFFER_TARGET) * 100), 99)}%`);
        }).then(() => {
            video.play().catch(() => {});
            if (!opened) finish();
        });
    } else {
        let loaded = 0;
        essential.forEach(element => waitForMedia(element).then(() => {
            if (opened) return;
            loaded += 1;
            setProgress(`${Math.min(Math.floor((loaded / essential.length) * 100), 100)}%`);
            if (loaded >= essential.length) openWhenShownLongEnough();
        }));
    }

    fallbackTimer = setTimeout(() => {
        if (!opened) finish();
    }, FALLBACK_MS);
}
