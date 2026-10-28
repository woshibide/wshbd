<script setup>
import { inject } from 'vue';
import { site } from 'virtual:content';
import { CODING_BRIEF, DESIGN_BRIEF, EMAIL, FOOTER_LINKS, TELEGRAM } from '../site.js';
import { onActivateKey } from '../ui.js';

// The archive page filters in place; everywhere else the brief opens the archive filtered.
const selectArea = inject('selectArea', null);

function openArea(tag) {
    if (selectArea) {
        selectArea(tag);
        document.getElementById('archive')?.scrollIntoView();
        return;
    }
    window.location.href = `/archive/?area=${encodeURIComponent(tag)}#archive`;
}

const briefs = [
    { id: 'design-brief', title: 'DESIGN', tags: DESIGN_BRIEF },
    { id: 'dev-brief', title: 'CODING', tags: CODING_BRIEF },
];
</script>

<template>
    <footer>
        <div class="footer-wrapper">
            <div class="footer-columns">
                <div id="links"></div>
                <div v-for="brief in briefs" :id="brief.id" :key="brief.id">
                    <h4>{{ brief.title }}</h4>
                    <p
                        v-for="tag in brief.tags"
                        :key="tag"
                        role="button"
                        tabindex="0"
                        @click="openArea(tag)"
                        @keydown="onActivateKey(() => openArea(tag))($event)"
                    >{{ tag.toUpperCase() }}</p>
                </div>
                <div id="contact-details">
                    <h4>REACH OUT</h4>
                    <p>{{ EMAIL.toUpperCase() }}</p>
                    <p>{{ TELEGRAM.replace('https://', '').toUpperCase() }}</p>
                </div>
            </div>
            <div class="footer-columns">
                <div class="extr-link"></div>
                <div v-for="link in FOOTER_LINKS" :key="link.href" class="extr-link">
                    <a :href="link.href" target="_blank" rel="noopener">{{ link.label.toUpperCase() }} &#8599;</a>
                </div>
            </div>
        </div>
        <div class="footer-note">
            <p>
                <span>UPDATED <time :datetime="site.builtAt">{{ site.builtAtLabel }}</time></span>
                <span class="footer-note-separator"> / </span>
                <span>CONTENTS CHANGED <time :datetime="site.contentChangedAt">{{ site.contentChangedAtLabel }}</time></span>
            </p>
        </div>
    </footer>
</template>
