<script setup>
import { projects } from 'virtual:content';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import VideoPlayer from '../components/VideoPlayer.vue';
import { nextProjectWithImage } from '../lib/content.js';
import { vImageLoading } from '../ui.js';

const props = defineProps({ id: { type: String, required: true } });

const project = projects.find(item => item.shown && item.id === props.id);
const next = nextProjectWithImage(projects, props.id);
</script>

<template>
    <SiteHeader />
    <main>
        <div class="project-info">
            <div class="project-info-columns">
                <div>
                    <h1>{{ project.id }}</h1>
                    <h2>{{ project.brand }}</h2>
                    <p>{{ project.title }}</p>
                    <p>{{ project.location }}</p>
                    <p>{{ project.date }}</p>
                </div>
                <div>
                    <h3>{{ project.intro }}</h3>
                    <p>{{ project.description }}</p>
                </div>
            </div>
        </div>
        <div v-image-loading class="solo-project-images">
            <template v-for="item in project.media" :key="item.src">
                <VideoPlayer
                    v-if="item.type === 'video'"
                    :src="item.src"
                    :type="item.mimeType"
                    :poster="item.poster"
                    variant="project"
                    autoplay
                />
                <img v-else class="project-media project-media-image" :src="item.src" :alt="project.title">
            </template>
        </div>
    </main>
    <section>
        <div class="projects-navigator">
            <div class="next-project-panel">
                <a
                    id="next-project"
                    v-image-loading
                    class="next-project-preview"
                    :href="`/archive/${next.project.id}/`"
                    :aria-label="`Next project: ${next.project.title}`"
                >
                    <span class="next-project-label">NEXT PROJECT</span>
                    <img :src="next.image.src" :alt="next.project.title">
                    <div class="next-project-caption">
                        <span class="next-project-title">{{ next.project.title }}</span>
                    </div>
                </a>
            </div>
        </div>
    </section>
    <SiteFooter />
</template>
