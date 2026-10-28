<script setup>
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import ArchiveSection from '../components/ArchiveSection.vue';
import AboutSection from '../components/AboutSection.vue';
import { AVAILABILITY_SHORT, EMAIL } from '../site.js';
</script>

<template>
    <SiteHeader>
        <div id="hero">
            <div class="hero-video">
                <video autoplay muted loop playsinline preload="auto" tabindex="0" aria-label="showreel video background">
                    <source src="/content/video/showreel-30fps.mp4" type="video/mp4">
                </video>
            </div>
            <div class="hero-column hero-intro">
                <h1>PYOTR GOLOUB</h1>
            </div>
            <div class="hero-column hero-statement">
                <p>DESIGNER WHO USES PROGRAMMING TO DESIGN</p>
            </div>
            <div class="hero-column hero-details">
                <p class="hero-tags">Web, Editorial, <a href="/#archive" class="hero-link">More</a></p>
                <p class="hero-availability">{{ AVAILABILITY_SHORT }}</p>
                <address class="hero-contact">
                    <p>{{ EMAIL }}</p>
                </address>
            </div>
        </div>
    </SiteHeader>
    <main>
        <section class="other-page">
            <ArchiveSection />
        </section>
        <section class="other-page">
            <AboutSection />
        </section>
        <section id="theatre-welcome">
            <h1>Please be welcomed to the <a href="/theatre/">theatre</a></h1>
        </section>
    </main>
    <SiteFooter />
</template>
