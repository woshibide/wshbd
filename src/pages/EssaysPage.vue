<script setup>
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import { WEB_ESSAYS } from '../site.js';
</script>

<template>
    <SiteHeader />
    <main>
        <div class="hello">
            <h1>WEB-ESSAYS</h1>
            <p>its this new medium of writting on web, making use of technologies available at a time</p>
        </div>
        <div class="web-essays">
            <a v-for="essay in WEB_ESSAYS" :key="essay.href" :href="essay.href" target="_blank" rel="noopener">{{ essay.label }}</a>
        </div>
    </main>
    <SiteFooter />
</template>
