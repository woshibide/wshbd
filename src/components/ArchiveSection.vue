<script setup>
import { reactive, ref } from 'vue';
import { projects as allProjects } from 'virtual:content';
import ArchiveItem from './ArchiveItem.vue';
import { SORT_FIELDS, applySort, collectTags, initialArchive, matchesTags, sortIndicator } from '../lib/archive.js';
import { useBlink } from '../ui.js';

const tags = collectTags(allProjects);
const initial = initialArchive(allProjects);
const sortState = ref(initial.state);
const projects = ref(initial.projects);
const selectedTags = ref([]);
const openKeys = reactive(new Set());
const tagBlink = useBlink(100);
const itemBlink = useBlink(1000);

function sortBy(field) {
    const result = applySort(sortState.value, projects.value, field);
    sortState.value = result.state;
    projects.value = result.projects;
}

function toggleTag(tag) {
    selectedTags.value = selectedTags.value.includes(tag)
        ? selectedTags.value.filter(item => item !== tag)
        : [...selectedTags.value, tag];
    tagBlink.trigger();
    itemBlink.trigger();
}

function resetTags() {
    selectedTags.value = [];
    openKeys.clear();
    tagBlink.trigger();
    itemBlink.trigger();
}

function setOpen(key, open) {
    if (open) openKeys.add(key);
    else openKeys.delete(key);
}

// Selecting an unknown area does nothing, like clicking a tag that isn't there.
function selectArea(tag) {
    if (tags.includes(tag)) toggleTag(tag);
}

defineExpose({ selectArea });
</script>

<template>
    <div class="section-main">
        <div class="hello">
            <h1>ARCHIVE</h1>
            <p>A collection of projects across editorial, web, generative graphics, and experimental interfaces. Code shapes both process and outcome, from early prototypes to final builds. Each explores how computational thinking can shape visual form, interaction, and digital experience.</p>
        </div>
    </div>
    <div id="archive" class="archive">
        <section class="hashtag-container archive-areas" aria-labelledby="archive-areas-title">
            <h2 id="archive-areas-title" class="archive-section-title">Areas</h2>
            <ul class="hashtag-pool">
                <li id="hashtag-reset" class="hashtag hashtag--reset" :class="{ blinking: tagBlink.active.value }" data-tag="reset">
                    <button class="hashtag-button" type="button" @click="resetTags">~ % RESET SCOPE</button>
                </li>
                <li
                    v-for="tag in tags"
                    :key="tag"
                    class="hashtag"
                    :class="{ selected: selectedTags.includes(tag), blinking: tagBlink.active.value }"
                    :data-tag="tag"
                >
                    <button
                        class="hashtag-button"
                        type="button"
                        :aria-pressed="String(selectedTags.includes(tag))"
                        @click="toggleTag(tag)"
                    >{{ tag }}</button>
                </li>
            </ul>
        </section>
        <section class="archive-controls" aria-label="Archive sorting">
            <div class="archive-headers" role="group" aria-label="archive sorting">
                <button
                    v-for="field in SORT_FIELDS"
                    :id="`filter-${field}`"
                    :key="field"
                    class="archive-filters"
                    type="button"
                    @click="sortBy(field)"
                >{{ field }}<template v-if="sortIndicator(sortState, field)">{{ ' ' }}<span class="sort-indicator">{{ sortIndicator(sortState, field) }}</span></template></button>
            </div>
        </section>
        <div class="archive-list">
            <ArchiveItem
                v-for="project in projects"
                v-show="matchesTags(project, selectedTags)"
                :key="project.key"
                :project="project"
                :open="openKeys.has(project.key)"
                :blinking="itemBlink.active.value"
                @update:open="open => setOpen(project.key, open)"
            />
        </div>
    </div>
</template>
