let currentProjectIndex = 0
const hashReplaceDelayMs = 180
const curtainFallbackMs = 8000
const curtainMinimumVisibleMs = 900
const programmaticScrollLockMs = 1200

let hashObserverLock = {
    active: false,
    targetId: null,
    releaseAt: 0
}

function parseMediaData(mediaElement) {
    if (!mediaElement) return []

    const rawMedia = mediaElement.getAttribute('data-media')
    if (rawMedia) {
        try {
            const parsed = JSON.parse(rawMedia)
            if (Array.isArray(parsed)) return parsed
        } catch {
            return []
        }
    }

    const rawImages = mediaElement.getAttribute('data-images')
    if (!rawImages) return []

    try {
        const parsed = JSON.parse(rawImages)
        if (!Array.isArray(parsed)) return []
        return parsed.map(path => ({ path, type: 'image' }))
    } catch {
        return []
    }
}

function getProjectMediaElement(section) {
    return section.querySelector('.project-image .project-media, .project-image img, .project-image video')
}

function isVideoMedia(item) {
    return item?.type === 'video'
}

function getBufferedRatio(videoElement) {
    if (!(videoElement instanceof HTMLVideoElement)) return 0

    const duration = videoElement.duration
    if (!Number.isFinite(duration) || duration <= 0) {
        return videoElement.readyState >= 2 ? 1 : 0
    }

    const ranges = videoElement.buffered
    if (!ranges || ranges.length === 0) return 0

    let bufferedEnd = 0
    for (let i = 0; i < ranges.length; i++) {
        const start = ranges.start(i)
        const end = ranges.end(i)
        if (videoElement.currentTime >= start && videoElement.currentTime <= end) {
            bufferedEnd = end
            break
        }
        bufferedEnd = Math.max(bufferedEnd, end)
    }

    return Math.min(Math.max(bufferedEnd / duration, 0), 1)
}

function waitForVideoBufferedRatio(videoElement, targetRatio, onProgress) {
    return new Promise(resolve => {
        if (!(videoElement instanceof HTMLVideoElement)) {
            resolve(false)
            return
        }

        let settled = false
        const events = ['loadedmetadata', 'durationchange', 'loadeddata', 'progress', 'canplay', 'canplaythrough']

        const finish = (didReachTarget) => {
            if (settled) return
            settled = true
            events.forEach(eventName => videoElement.removeEventListener(eventName, onCheck))
            videoElement.removeEventListener('error', onError)
            resolve(didReachTarget)
        }

        const onCheck = () => {
            const ratio = getBufferedRatio(videoElement)
            if (typeof onProgress === 'function') {
                onProgress(ratio)
            }

            if (ratio >= targetRatio || videoElement.readyState >= 3) {
                finish(true)
            }
        }

        const onError = () => finish(false)

        events.forEach(eventName => videoElement.addEventListener(eventName, onCheck))
        videoElement.addEventListener('error', onError)

        videoElement.preload = 'auto'
        try {
            videoElement.load()
        } catch {
        }

        onCheck()
    })
}

function waitForMediaReady(mediaElement) {
    return new Promise(resolve => {
        if (!mediaElement) {
            resolve()
            return
        }

        if (mediaElement instanceof HTMLImageElement) {
            if (mediaElement.complete && mediaElement.naturalWidth > 0) {
                resolve()
                return
            }

            const onDone = () => {
                mediaElement.removeEventListener('load', onDone)
                mediaElement.removeEventListener('error', onDone)
                resolve()
            }

            mediaElement.addEventListener('load', onDone)
            mediaElement.addEventListener('error', onDone)

            if (typeof mediaElement.decode === 'function') {
                mediaElement.decode().then(resolve).catch(() => {})
            }
            return
        }

        if (mediaElement instanceof HTMLVideoElement) {
            if (mediaElement.readyState >= 2) {
                resolve()
                return
            }

            const onDone = () => {
                mediaElement.removeEventListener('loadeddata', onDone)
                mediaElement.removeEventListener('error', onDone)
                resolve()
            }

            mediaElement.addEventListener('loadeddata', onDone)
            mediaElement.addEventListener('error', onDone)
            return
        }

        resolve()
    })
}

function createMediaNode(mediaItem, mediaList, mediaIndex, projectTitle) {
    if (isVideoMedia(mediaItem)) {
        const video = document.createElement('video')
        video.className = 'project-media'
        video.src = mediaItem.path
        video.autoplay = true
        video.muted = true
        video.loop = true
        video.playsInline = true
        video.controls = true
        video.preload = 'auto'
        video.setAttribute('aria-label', projectTitle || 'project video')
        video.setAttribute('data-media', JSON.stringify(mediaList))
        video.setAttribute('data-media-index', String(mediaIndex))
        return video
    }

    const img = document.createElement('img')
    img.className = 'project-media'
    img.src = mediaItem.path
    img.alt = projectTitle || 'project image'
    img.loading = 'lazy'
    img.setAttribute('data-media', JSON.stringify(mediaList))
    img.setAttribute('data-media-index', String(mediaIndex))
    return img
}

function updateMediaCounter(currentIndex, totalMedia, counterElement) {
    if (!counterElement) return
    counterElement.textContent = `[${currentIndex + 1}/${totalMedia}]`
}

function replaceProjectMedia(section, mediaList, mediaIndex) {
    const imageContainer = section.querySelector('.project-image')
    const counterElement = section.querySelector('#gallery-counter')
    if (!imageContainer || !mediaList.length) return null

    const mediaItem = mediaList[mediaIndex]
    const projectTitle = section.querySelector('#title')?.textContent || section.id

    imageContainer.classList.add('transitioning')

    setTimeout(() => {
        imageContainer.innerHTML = ''
        const nextNode = createMediaNode(mediaItem, mediaList, mediaIndex, projectTitle)
        imageContainer.appendChild(nextNode)
        imageContainer.classList.remove('transitioning')

        if (nextNode instanceof HTMLVideoElement) {
            const playPromise = nextNode.play()
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {})
            }
        }
    }, 180)

    updateMediaCounter(mediaIndex, mediaList.length, counterElement)
    return mediaIndex
}

document.addEventListener('DOMContentLoaded', () => {
    initTheatreCurtain()

    const projectSections = document.querySelectorAll('.project-section')
    if (!projectSections.length) return

    projectSections.forEach((section) => {
        const mediaElement = getProjectMediaElement(section)
        const mediaList = parseMediaData(mediaElement)
        if (!mediaList.length) return
        addMediaNavigation(section, mediaList)
    })

    addProjectNavigation(projectSections)
    trackScrollPosition(projectSections)
    addTransitionStyles()
})

function initTheatreCurtain() {
    const curtain = document.getElementById('theatre-curtain')
    const leftCurtain = document.querySelector('.curtain-half.left')
    const rightCurtain = document.querySelector('.curtain-half.right')
    const loadingPercentage = document.querySelector('.loading-percentage')
    if (!curtain || !leftCurtain || !rightCurtain || !loadingPercentage) return

    const allSections = Array.from(document.querySelectorAll('.project-section'))
    if (!allSections.length) {
        curtain.style.display = 'none'
        return
    }

    const visibleSections = getVisibleSections()
    const heavyGifs = []
    const otherImages = []
    const essentialMediaElements = []
    const seenOtherImages = new Set()
    const seenHeavyGifs = new Set()

    const firstSection = allSections[0]
    if (firstSection) {
        const firstMedia = getProjectMediaElement(firstSection)
        if (firstMedia && !essentialMediaElements.includes(firstMedia)) {
            essentialMediaElements.push(firstMedia)
        }
    }

    visibleSections.forEach(section => {
        const visibleMedia = getProjectMediaElement(section)
        if (visibleMedia && !essentialMediaElements.includes(visibleMedia)) {
            essentialMediaElements.push(visibleMedia)
        }
    })

    allSections.forEach(section => {
        const mediaElement = getProjectMediaElement(section)
        const mediaList = parseMediaData(mediaElement)
        if (!mediaList.length) return

        mediaList.slice(1).forEach(mediaItem => {
            if (mediaItem.type !== 'image' || !mediaItem.path) return

            const lowerPath = mediaItem.path.toLowerCase()
            if (lowerPath.endsWith('.gif')) {
                if (!seenHeavyGifs.has(mediaItem.path)) {
                    heavyGifs.push(mediaItem.path)
                    seenHeavyGifs.add(mediaItem.path)
                }
            } else {
                if (!seenOtherImages.has(mediaItem.path)) {
                    otherImages.push(mediaItem.path)
                    seenOtherImages.add(mediaItem.path)
                }
            }
        })
    })

    const totalInitialMedia = essentialMediaElements.length
    const primaryVideoElement = essentialMediaElements.find(mediaElement => mediaElement instanceof HTMLVideoElement) || null
    const hasPrimaryVideo = primaryVideoElement instanceof HTMLVideoElement
    let loadedMedia = 0
    let curtainOpened = false
    const curtainStartTime = performance.now()
    let fallbackTimerId = null

    const openCurtains = () => {
        if (curtainOpened) return
        curtainOpened = true

        if (fallbackTimerId) {
            clearTimeout(fallbackTimerId)
            fallbackTimerId = null
        }

        loadingPercentage.classList.add('hidden')
        leftCurtain.classList.add('open')
        rightCurtain.classList.add('open')

        setTimeout(() => {
            curtain.style.display = 'none'
            preloadRemainingImages(heavyGifs, otherImages)
        }, 1500)
    }

    const openCurtainsRespectingMinimumTime = () => {
        if (curtainOpened) return
        const elapsed = performance.now() - curtainStartTime
        const remaining = Math.max(curtainMinimumVisibleMs - elapsed, 0)
        setTimeout(openCurtains, remaining)
    }

    const updateProgress = () => {
        if (curtainOpened) return
        loadedMedia++
        const progress = Math.min(Math.floor((loadedMedia / totalInitialMedia) * 100), 100)
        loadingPercentage.textContent = `${progress}%`

        if (loadedMedia >= totalInitialMedia) {
            openCurtainsRespectingMinimumTime()
        }
    }

    if (!totalInitialMedia) {
        loadingPercentage.textContent = '100%'
        openCurtainsRespectingMinimumTime()
    } else if (hasPrimaryVideo) {
        waitForVideoBufferedRatio(primaryVideoElement, 0.33, (ratio) => {
            if (curtainOpened) return
            const progressFromBuffer = Math.min(Math.floor((ratio / 0.33) * 100), 99)
            loadingPercentage.textContent = `${progressFromBuffer}%`
        }).then(() => {
            if (curtainOpened) return
            const playPromise = primaryVideoElement.play()
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {})
            }
            loadingPercentage.textContent = '100%'
            openCurtainsRespectingMinimumTime()
        })
    } else {
        essentialMediaElements.forEach(mediaElement => {
            waitForMediaReady(mediaElement).then(updateProgress)
        })
    }

    fallbackTimerId = setTimeout(() => {
        if (!curtainOpened) {
            loadingPercentage.textContent = '100%'
            openCurtainsRespectingMinimumTime()
        }
    }, curtainFallbackMs)
}

function getVisibleSections() {
    const sections = document.querySelectorAll('.project-section')
    return Array.from(sections).filter(section => {
        const rect = section.getBoundingClientRect()
        return rect.top < window.innerHeight && rect.bottom > 0
    })
}

function preloadRemainingImages(heavyGifs, otherImages) {
    const preloadImage = (src) => {
        return new Promise(resolve => {
            const img = new Image()
            img.onload = resolve
            img.onerror = resolve
            img.src = src
        })
    }

    const preloadBatch = async (images, batchSize = 5) => {
        for (let i = 0; i < images.length; i += batchSize) {
            const batch = images.slice(i, i + batchSize)
            await Promise.all(batch.map(preloadImage))

            if (i + batchSize < images.length) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }
    }

    preloadBatch(otherImages).then(() => preloadBatch(heavyGifs, 2))
}

function addTransitionStyles() {
    if (document.getElementById('theatre-transition-style')) return

    const style = document.createElement('style')
    style.id = 'theatre-transition-style'
    style.textContent = `
        .project-image .project-media {
            transition: opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            opacity: 1;
        }
        .project-image.transitioning .project-media {
            opacity: 0;
        }
    `
    document.head.appendChild(style)
}

function addMediaNavigation(section, mediaList) {
    const imageContainer = section.querySelector('.project-image')
    if (!imageContainer || !mediaList.length) return

    let currentMediaIndex = Number(getProjectMediaElement(section)?.getAttribute('data-media-index') || 0)
    const update = () => {
        replaceProjectMedia(section, mediaList, currentMediaIndex)
    }

    imageContainer.addEventListener('click', (event) => {
        const rect = imageContainer.getBoundingClientRect()
        if (event.clientY > rect.bottom - 56) {
            return
        }

        const clickX = event.clientX - rect.left
        if (clickX < rect.width / 2) {
            currentMediaIndex = (currentMediaIndex - 1 + mediaList.length) % mediaList.length
        } else {
            currentMediaIndex = (currentMediaIndex + 1) % mediaList.length
        }
        update()
    })

    let touchStartX = null
    imageContainer.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].screenX
    })

    imageContainer.addEventListener('touchend', (event) => {
        if (touchStartX === null) return

        const touchEndX = event.changedTouches[0].screenX
        const diffX = touchEndX - touchStartX

        if (Math.abs(diffX) > 20) {
            if (diffX > 0) {
                currentMediaIndex = (currentMediaIndex - 1 + mediaList.length) % mediaList.length
            } else {
                currentMediaIndex = (currentMediaIndex + 1) % mediaList.length
            }
            update()
        }

        touchStartX = null
    })
}

function addProjectNavigation(projectSections) {
    let currentMediaIndex = 0

    document.addEventListener('keydown', (event) => {
        const currentProject = projectSections[currentProjectIndex]
        if (!currentProject) return

        const mediaElement = getProjectMediaElement(currentProject)
        const mediaList = parseMediaData(mediaElement)
        if (!mediaList.length) return

        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            currentMediaIndex = (currentMediaIndex - 1 + mediaList.length) % mediaList.length
            replaceProjectMedia(currentProject, mediaList, currentMediaIndex)
        } else if (event.key === 'ArrowRight') {
            event.preventDefault()
            currentMediaIndex = (currentMediaIndex + 1) % mediaList.length
            replaceProjectMedia(currentProject, mediaList, currentMediaIndex)
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            currentProjectIndex = (currentProjectIndex - 1 + projectSections.length) % projectSections.length
            updateProjectView()
        } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            currentProjectIndex = (currentProjectIndex + 1) % projectSections.length
            updateProjectView()
        }
    })

    function updateProjectView() {
        const currentProject = projectSections[currentProjectIndex]
        if (!currentProject) return

        const projectId = currentProject.getAttribute('id')
        hashObserverLock = {
            active: true,
            targetId: projectId,
            releaseAt: performance.now() + programmaticScrollLockMs
        }

        currentProject.scrollIntoView({ behavior: 'smooth' })

        currentMediaIndex = 0
        if (window.location.hash !== `#${projectId}`) {
            history.pushState(null, null, `#${projectId}`)
        }

        const mediaElement = getProjectMediaElement(currentProject)
        const counterElement = currentProject.querySelector('#gallery-counter')
        const mediaList = parseMediaData(mediaElement)
        if (!mediaList.length) return
        updateMediaCounter(currentMediaIndex, mediaList.length, counterElement)
    }
}

function trackScrollPosition(projectSections) {
    let hashUpdateTimer = null

    const scheduleHashReplace = (projectId) => {
        if (!projectId) return

        if (hashObserverLock.active && hashObserverLock.targetId && projectId !== hashObserverLock.targetId) {
            return
        }

        if (hashUpdateTimer) {
            clearTimeout(hashUpdateTimer)
        }

        hashUpdateTimer = setTimeout(() => {
            const nextHash = `#${projectId}`
            if (window.location.hash !== nextHash) {
                const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`
                history.replaceState(null, null, nextUrl)
            }
        }, hashReplaceDelayMs)
    }

    const observer = new IntersectionObserver((entries) => {
        if (!entries.length) return

        let maxEntry = entries[0]
        entries.forEach(entry => {
            if (entry.intersectionRatio > maxEntry.intersectionRatio) {
                maxEntry = entry
            }
        })

        const visibleProjectId = maxEntry?.target?.getAttribute('id')
        if (hashObserverLock.active) {
            const lockExpired = performance.now() >= hashObserverLock.releaseAt
            const reachedTarget = visibleProjectId && visibleProjectId === hashObserverLock.targetId

            if (lockExpired || reachedTarget) {
                hashObserverLock = {
                    active: false,
                    targetId: null,
                    releaseAt: 0
                }
            } else {
                return
            }
        }

        if (maxEntry && maxEntry.intersectionRatio > 0.5) {
            const newIndex = Array.from(projectSections).findIndex(
                section => section === maxEntry.target
            )

            if (newIndex !== -1 && newIndex !== currentProjectIndex) {
                currentProjectIndex = newIndex
                const projectId = maxEntry.target.getAttribute('id')
                scheduleHashReplace(projectId)
            }
        }
    }, {
        root: null,
        threshold: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
        rootMargin: '0px'
    })

    projectSections.forEach(section => {
        observer.observe(section)
    })
}