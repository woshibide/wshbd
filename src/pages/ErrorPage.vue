<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import { errorSketch } from '../lib/errorSketch.js';

const props = defineProps({ code: { type: Number, required: true } });

const canvasHost = ref(null);
let sketch;
let disposed = false;

onMounted(async () => {
    const { default: P5 } = await import('p5');
    const styles = getComputedStyle(document.documentElement);
    const colors = {
        background: styles.getPropertyValue('--color-black').trim(),
        text: styles.getPropertyValue('--color-white').trim(),
    };
    // the page may be gone by the time p5 finished loading
    if (!disposed) sketch = new P5(errorSketch(props.code, colors), canvasHost.value);
});

onBeforeUnmount(() => {
    disposed = true;
    sketch?.remove();
});
</script>

<template>
    <SiteHeader />
    <main>
        <div class="hello">
            <h1 class="error-code">{{ code }} :(</h1>
        </div>
        <div id="p5js" ref="canvasHost"></div>
    </main>
    <SiteFooter />
</template>
