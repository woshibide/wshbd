<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { EMAIL, PROFILE_LINKS, TELEGRAM } from '../site.js';
import { formatAmsterdamClock } from '../lib/format.js';
import { useCopyLabel, vImageLoading } from '../ui.js';

const time = ref('HH:MM:SS');
let clock;
onMounted(() => {
    const tick = () => { time.value = formatAmsterdamClock(new Date()); };
    tick();
    clock = setInterval(tick, 1000);
});
onBeforeUnmount(() => clearInterval(clock));

const contacts = [
    useCopyLabel({ label: EMAIL, value: EMAIL, storageKey: 'copy-label-about-email', maxExtra: 100 }),
    useCopyLabel({ label: TELEGRAM.replace('https://', ''), value: TELEGRAM, storageKey: 'copy-label-about-telegram', maxExtra: 100 }),
];
const contactLabels = ['Copy email address', 'Copy Telegram link'];
</script>

<template>
    <div class="section-main">
        <div class="info">
            <div id="about" v-image-loading>
                <img src="/content/misc/team.jpg" alt="Pyotr Goloub">
                <p>Pyotr Goloub is a designer who uses programming to design. Based in Netherlands, he works across borders, seeking harmony between modern aesthetics and functional design. His work revolves around idea of anti-disciplinary approach, with a special passion for editorial and web projects.</p>
                <p>Tailored project selection and CV are available upon a request. It is now <span id="time">{{ time }}</span> in Netherlands, lets bring the highest values to earth by means of our labour.</p>
                <div id="contact-highlight">
                    <p v-for="(contact, index) in contacts" :key="index">
                        <button
                            class="copy-contact"
                            :class="{ blinking: contact.blinking.value }"
                            type="button"
                            :aria-label="contactLabels[index]"
                            @click="contact.copy"
                        >{{ contact.text.value }}</button>
                    </p>
                </div>
            </div>
            <div class="media">
                <div class="links">
                    <a v-for="link in PROFILE_LINKS" :key="link.href" class="extr-link" :href="link.href" target="_blank" rel="noopener">{{ link.label }} &#8599;</a>
                </div>
            </div>
        </div>
    </div>
</template>
