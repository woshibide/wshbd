const fs = require('fs');
const path = require('path');

const baseHtmlPath = path.join(__dirname, '..', '..', 'index.html');
const outputRoot = path.join(__dirname, '..', '..', 'video_tests');

function readBaseHtml() {
    return fs.readFileSync(baseHtmlPath, 'utf-8');
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function replaceHeroVideo(html, replacement) {
    return html.replace(/<div class="hero-video"[\s\S]*?<\/div>/, replacement);
}

function updateMeta(html, title, urlPath) {
    const ogTitle = `${title} // wshbd`;
    const ogUrl = `https://wshbd.com${urlPath}`;
    let updated = html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${ogTitle}</title>`)
        .replace(/<meta property="og:title" content="[\s\S]*?"\s*\/>/, `<meta property="og:title" content="${ogTitle}">`)
        .replace(/<meta property="og:title" content="[\s\S]*?">/, `<meta property="og:title" content="${ogTitle}">`)
        .replace(/<meta property="og:url" content="[\s\S]*?"\s*\/>/, `<meta property="og:url" content="${ogUrl}">`)
        .replace(/<meta property="og:url" content="[\s\S]*?">/, `<meta property="og:url" content="${ogUrl}">`);

    return updated;
}

function insertBeforeClosingTag(html, tag, content) {
    const regex = new RegExp(`</${tag}>`, 'i');
    if (!regex.test(html)) {
        return html;
    }
    return html.replace(regex, `${content}\n</${tag}>`);
}

function normalizeScriptPaths(html) {
    return html
        .replace(/src="scripts\//g, 'src="/scripts/')
        .replace(/src='scripts\//g, "src='/scripts/");
}

function buildPage({
    testNumber,
    title,
    heroVideoHtml,
    extraHead = '',
    extraBody = ''
}) {
    const baseHtml = readBaseHtml();
    const withHero = replaceHeroVideo(baseHtml, heroVideoHtml);
    const withMeta = updateMeta(withHero, title, `/video_tests/${testNumber}`);
    const withHead = extraHead ? insertBeforeClosingTag(withMeta, 'head', extraHead) : withMeta;
    const withBody = extraBody ? insertBeforeClosingTag(withHead, 'body', extraBody) : withHead;
    const normalized = normalizeScriptPaths(withBody);

    const outputDir = path.join(outputRoot, String(testNumber));
    ensureDir(outputDir);
    fs.writeFileSync(path.join(outputDir, 'index.html'), normalized, 'utf-8');
}

function generateVideoTests() {
    ensureDir(outputRoot);

    buildPage({
        testNumber: 1,
        title: 'video test 1',
        heroVideoHtml: [
            '<div class="hero-video" aria-hidden="true">',
            '    <video autoplay muted loop playsinline preload="auto">',
            '        <source src="/content/video/mp4/hero_1080p.mp4" type="video/mp4">',
            '    </video>',
            '</div>'
        ].join('\n')
    });

    buildPage({
        testNumber: 5,
        title: 'video test 5',
        heroVideoHtml: [
            '<div class="hero-video" aria-hidden="true">',
            '    <video autoplay muted loop playsinline preload="auto">',
            '        <source src="/content/video/webm/test.webm" type="video/webm">',
            '    </video>',
            '</div>'
        ].join('\n')
    });

    buildPage({
        testNumber: 2,
        title: 'video test 2',
        heroVideoHtml: [
            '<div class="hero-video" aria-hidden="true">',
            '    <video id="hero-hls" autoplay muted loop playsinline preload="auto"></video>',
            '</div>'
        ].join('\n'),
        extraBody: [
            '<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js"></script>',
            '<script>',
            '    const video = document.getElementById("hero-hls");',
            '    const source = "/content/video/hls/master.m3u8";',
            '    if (video && video.canPlayType("application/vnd.apple.mpegurl")) {',
            '        video.src = source;',
            '    } else if (window.Hls && Hls.isSupported()) {',
            '        const hls = new Hls({',
            '            maxBufferLength: 30,',
            '            backBufferLength: 60,',
            '            enableWorker: true',
            '        });',
            '        hls.loadSource(source);',
            '        hls.attachMedia(video);',
            '    }',
            '</script>'
        ].join('\n')
    });

    buildPage({
        testNumber: 3,
        title: 'video test 3',
        heroVideoHtml: [
            '<div class="hero-video" aria-hidden="true">',
            '    <video id="hero-plyr" autoplay muted loop playsinline preload="auto"></video>',
            '</div>'
        ].join('\n'),
        extraBody: [
            '<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js"></script>',
            '<script src="https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.min.js"></script>',
            '<script>',
            '    const video = document.getElementById("hero-plyr");',
            '    const source = "/content/video/hls/master.m3u8";',
            '    if (video && video.canPlayType("application/vnd.apple.mpegurl")) {',
            '        video.src = source;',
            '        const player = new Plyr(video, { autoplay: true, muted: true, controls: [], clickToPlay: false });',
            '        player.play().catch(() => {});',
            '    } else if (window.Hls && Hls.isSupported()) {',
            '        const hls = new Hls({',
            '            maxBufferLength: 30,',
            '            backBufferLength: 60,',
            '            enableWorker: true',
            '        });',
            '        hls.loadSource(source);',
            '        hls.attachMedia(video);',
            '        hls.on(Hls.Events.MANIFEST_PARSED, () => {',
            '            const player = new Plyr(video, { autoplay: true, muted: true, controls: [], clickToPlay: false });',
            '            player.play().catch(() => {});',
            '        });',
            '    }',
            '</script>'
        ].join('\n')
    });

    buildPage({
        testNumber: 4,
        title: 'video test 4',
        heroVideoHtml: [
            '<div class="hero-video" aria-hidden="true">',
            '    <video',
            '        id="hero-vjs"',
            '        class="video-js vjs-default-skin"',
            '        autoplay',
            '        muted',
            '        loop',
            '        playsinline',
            '        preload="auto">',
            '        <source src="/content/video/hls/master.m3u8" type="application/x-mpegURL">',
            '    </video>',
            '</div>'
        ].join('\n'),
        extraBody: [
            '<script src="https://vjs.zencdn.net/8.10.0/video.min.js"></script>',
            '<script>',
            '    if (window.videojs) {',
            '        window.videojs("hero-vjs", {',
            '            autoplay: true,',
            '            muted: true,',
            '            loop: true,',
            '            controls: false,',
            '            preload: "auto"',
            '        });',
            '    }',
            '</script>'
        ].join('\n')
    });

    console.log('video tests generated');
}

generateVideoTests();
