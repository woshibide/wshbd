<script setup>
import { ref } from 'vue';
import { EMAIL, NAV_INTRO, NAV_LINKS, AVAILABILITY } from '../site.js';
import { onActivateKey, useCopyLabel } from '../ui.js';

const open = ref(false);
const toggle = () => { open.value = !open.value; };

const email = useCopyLabel({ label: 'email', value: EMAIL, storageKey: 'sticky-email-copied-label', maxExtra: 29 });
</script>

<template>
    <header>
        <div
            id="menu-icon"
            :class="{ open }"
            role="button"
            tabindex="0"
            aria-label="Menu"
            aria-controls="nav-menu"
            :aria-expanded="String(open)"
            @click="toggle"
            @keydown="onActivateKey(toggle)($event)"
        >
            <div v-for="stripe in 4" :key="stripe" class="stripe"></div>
        </div>
        <div id="home-sticky" class="sticky-nav-actions">
            <a class="sticky-link" href="/about/">profile</a>
            <a
                class="sticky-email"
                :class="{ blinking: email.blinking.value }"
                :href="`mailto:${EMAIL}`"
                @click.prevent="email.copy"
            >{{ email.text.value }}</a>
        </div>
        <nav id="nav-menu" :class="{ open }">
            <div class="nav-links-container">
                <div>
                    <a v-for="link in NAV_LINKS" :key="link.href" :href="link.href">{{ link.label }}</a>
                </div>
                <div>
                    <p class="nav-hello">{{ NAV_INTRO }}</p>
                    <p class="nav-hello nav-availability">{{ AVAILABILITY.toUpperCase() }}</p>
                    <a id="contact" :href="`mailto:${EMAIL}`">{{ EMAIL }}</a>
                </div>
            </div>
        </nav>
        <slot></slot>
    </header>
</template>
