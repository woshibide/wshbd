// Small browser behaviours shared by several components.
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { nextCopyLabel, restoreCopyLabel } from './lib/format.js';

// Restartable one-shot `.blinking` animation. Bind `active` into the element's class list.
export function useBlink(duration = 100) {
    const active = ref(false);
    let timer;
    async function trigger() {
        active.value = false;
        await nextTick();
        void document.body.offsetWidth; // restart the CSS animation
        active.value = true;
        clearTimeout(timer);
        timer = setTimeout(() => { active.value = false; }, duration);
    }
    onBeforeUnmount(() => clearTimeout(timer));
    return { active, trigger };
}

function readStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // storage can be unavailable (private mode, blocked site data); the label just won't persist
    }
}

async function copyText(value) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
    }
    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    return copied;
}

// Copy-to-clipboard label that remembers how many times it was clicked.
export function useCopyLabel({ label, value, storageKey, maxExtra }) {
    const text = ref(label);
    const blink = useBlink();
    onMounted(() => {
        text.value = restoreCopyLabel(readStorage(storageKey), label);
    });
    async function copy() {
        try {
            if (!(await copyText(value))) return;
        } catch (error) {
            console.error('Could not copy to clipboard:', error);
            return;
        }
        text.value = nextCopyLabel(text.value, label, maxExtra);
        writeStorage(storageKey, text.value);
        blink.trigger();
    }
    return { text, blinking: blink.active, copy };
}

// Shows the spinner while any image inside the element is still loading.
// The spinner lives outside Vue's render tree, like the images it watches are loaded outside it.
export const vImageLoading = {
    mounted(el) {
        const indicator = document.createElement('span');
        indicator.className = 'image-load-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        for (let index = 0; index < 12; index += 1) {
            const bar = document.createElement('span');
            bar.className = 'image-load-indicator-bar';
            bar.style.setProperty('--bar-index', String(index));
            indicator.appendChild(bar);
        }
        el.appendChild(indicator);

        const refresh = () => {
            const loading = [...el.querySelectorAll('img')].some(img => !img.complete);
            indicator.classList.toggle('is-visible', loading);
        };
        el._imageLoading = { refresh };
        el.addEventListener('load', refresh, true);
        el.addEventListener('error', refresh, true);
        refresh();
    },
    updated(el) {
        el._imageLoading?.refresh();
    },
    beforeUnmount(el) {
        el.removeEventListener('load', el._imageLoading.refresh, true);
        el.removeEventListener('error', el._imageLoading.refresh, true);
    },
};

// Click-and-drag horizontal scrolling for mouse users.
export function enableDragScroll(container) {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    const release = () => {
        isDown = false;
        container.style.cursor = 'grab';
    };
    container.style.cursor = 'grab';
    container.addEventListener('mousedown', event => {
        if (event.target.closest('input, button, a')) return; // video controls keep working
        isDown = true;
        container.style.cursor = 'grabbing';
        startX = event.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
        event.preventDefault();
    });
    container.addEventListener('mouseleave', release);
    container.addEventListener('mouseup', release);
    container.addEventListener('mousemove', event => {
        if (!isDown) return;
        event.preventDefault();
        container.scrollLeft = scrollLeft - (event.pageX - container.offsetLeft - startX) * 2;
    });
}

// Enter/Space activation for non-button elements acting as buttons.
export function onActivateKey(handler) {
    return event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        handler(event);
    };
}
