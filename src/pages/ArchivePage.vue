<script setup>
import { onMounted, provide, ref } from 'vue';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import ArchiveSection from '../components/ArchiveSection.vue';

const archive = ref(null);
const selectArea = tag => archive.value.selectArea(tag);
provide('selectArea', selectArea);

// Footer briefs on other pages link here with ?area=<tag>.
onMounted(() => {
    const url = new URL(window.location.href);
    const area = url.searchParams.get('area');
    if (!area) return;
    selectArea(area);
    url.searchParams.delete('area');
    history.replaceState(history.state, '', url);
});
</script>

<template>
    <SiteHeader />
    <main id="extract-me">
        <ArchiveSection ref="archive" />
    </main>
    <SiteFooter />
</template>
