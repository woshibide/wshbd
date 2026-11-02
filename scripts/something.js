let currentProjectIndex = 0
const mediaNavigationState = new WeakMap()
const hashReplaceDelayMs = 180
const curtainFallbackMs = 8000
const curtainMinimumVisibleMs = 900
const curtainProgressTransitionMs = 600
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
    counterElement.textContent = `IMAGE ${currentIndex + 1} OUT OF ${totalMedia}`
}

function replaceProjectMedia(section, mediaList, mediaIndex) {
    const imageContainer = section.querySelector('.project-image')
    const counterElement = section.querySelector('#gallery-counter')
    if (!imageContainer || !mediaList.length) return null

    const mediaItem = mediaList[mediaIndex]
    const projectTitle = section.querySelector('#title')?.textContent || section.id

    const state = mediaNavigationState.get(section) || {}
    clearTimeout(state.timer)
    state.index = mediaIndex
    mediaNavigationState.set(section, state)
    imageContainer.classList.add('transitioning')

    state.timer = setTimeout(() => {
        imageContainer.innerHTML = ''
        const nextNode = createMediaNode(mediaItem, mediaList, mediaIndex, projectTitle)
        imageContainer.appendChild(nextNode)
        updateMediaCounter(mediaIndex, mediaList.length, counterElement)
        imageContainer.classList.remove('transitioning')

        if (nextNode instanceof HTMLVideoElement) {
            const playPromise = nextNode.play()
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {})
            }
        }
    }, 180)

    return mediaIndex
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.project-section details.project-copy').forEach(copy => {
        copy.addEventListener('click', event => {
            if (event.target.closest('summary, a, button, input, textarea, select')) return
            if (window.getSelection()?.toString()) return
            copy.open = !copy.open
        })
    })

    const projectSections = document.querySelectorAll('.project-section')
    if (!projectSections.length) return

    projectSections.forEach((section) => {
        const mediaElement = getProjectMediaElement(section)
        const mediaList = parseMediaData(mediaElement)
        if (!mediaList.length) return
        addMediaNavigation(section, mediaList)
    })

    initInfiniteProjectScroll(projectSections)
    initTheatreCurtain()
    addProjectNavigation(projectSections)
    trackScrollPosition(projectSections)
    addTransitionStyles()
})

function initTheatreCurtain() {
    const curtain = document.getElementById('theatre-curtain')
    const leftCurtain = document.querySelector('.curtain-half.left')
    const rightCurtain = document.querySelector('.curtain-half.right')
    const loadingIndicator = curtain?.querySelector('.curtain-loading')
    if (!curtain || !leftCurtain || !rightCurtain || !loadingIndicator) return

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

    const firstSection = visibleSections[0] || allSections[0]
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

        loadingIndicator.classList.add('hidden')
        leftCurtain.classList.add('open')
        rightCurtain.classList.add('open')

        setTimeout(() => {
            curtain.style.display = 'none'
            preloadRemainingImages(heavyGifs, otherImages)
        }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1500)
    }

    const openCurtainsRespectingMinimumTime = () => {
        if (curtainOpened) return
        const elapsed = performance.now() - curtainStartTime
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const remaining = reducedMotion ? 0 : Math.max(curtainMinimumVisibleMs - elapsed, curtainProgressTransitionMs)
        setTimeout(openCurtains, remaining)
    }

    const setProgress = progress => {
        loadingIndicator.style.setProperty('--loading-progress', String(progress))
        loadingIndicator.querySelector('.curtain-loading-label').textContent = String(Math.floor(progress * 100))
    }

    const mediaProgress = new Map(essentialMediaElements.map(media => [media, 0]))
    const updateProgress = (mediaElement, progress) => {
        if (curtainOpened) return
        mediaProgress.set(mediaElement, progress)
        const totalProgress = Array.from(mediaProgress.values()).reduce((sum, value) => sum + value, 0)
        setProgress(totalProgress / totalInitialMedia)
    }

    const onMediaReady = (mediaElement) => {
        if (curtainOpened) return
        updateProgress(mediaElement, 1)
        loadedMedia++
        if (loadedMedia >= totalInitialMedia) {
            openCurtainsRespectingMinimumTime()
        }
    }

    if (!totalInitialMedia) {
        setProgress(1)
        openCurtainsRespectingMinimumTime()
    } else {
        essentialMediaElements.forEach(mediaElement => {
            if (mediaElement === primaryVideoElement && hasPrimaryVideo) {
                waitForVideoBufferedRatio(mediaElement, 0.33, ratio => {
                    updateProgress(mediaElement, Math.min(ratio / 0.33, 0.99))
                }).then(() => {
                    if (curtainOpened) return
                    mediaElement.play().catch(() => {})
                    onMediaReady(mediaElement)
                })
            } else {
                waitForMediaReady(mediaElement).then(() => onMediaReady(mediaElement))
            }
        })
    }

    fallbackTimerId = setTimeout(() => {
        if (!curtainOpened) {
            setProgress(1)
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

    let lastSwipeTime = -Infinity
    imageContainer.addEventListener('click', (event) => {
        if (performance.now() - lastSwipeTime < 500) return
        const rect = imageContainer.getBoundingClientRect()
        if (event.clientY > rect.bottom - 56) {
            return
        }

        const clickX = event.clientX - rect.left
        if (clickX < rect.width / 2) {
            navigateProjectMedia(section, -1)
        } else {
            navigateProjectMedia(section, 1)
        }
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
            lastSwipeTime = performance.now()
            if (diffX > 0) {
                navigateProjectMedia(section, -1)
            } else {
                navigateProjectMedia(section, 1)
            }
        }

        touchStartX = null
    })
}

function navigateProjectMedia(section, direction) {
    const mediaElement = getProjectMediaElement(section)
    const mediaList = parseMediaData(mediaElement)
    if (!mediaList.length) return
    const index = mediaNavigationState.get(section)?.index ?? Number(mediaElement.dataset.mediaIndex || 0)
    replaceProjectMedia(section, mediaList, (index + direction + mediaList.length) % mediaList.length)
}

function initInfiniteProjectScroll(projectSections) {
    const container = document.getElementById('random-gallery-container')
    const sequences = container?.querySelectorAll(':scope > .project-sequence')
    if (!sequences || sequences.length !== 2 || projectSections.length < 4) return

    const initialSections = [...sequences[1].querySelectorAll('.project-section')]
    const initialSection = initialSections.find(section => section.dataset.projectId === location.hash.slice(1)) || initialSections[0]
    container.scrollTo({ top: initialSection.offsetTop, behavior: 'instant' })

    const recycleOffscreenSequence = () => {
        const first = container.querySelector('.project-sequence')
        const last = container.lastElementChild
        const height = first.getBoundingClientRect().height
        const scrollTop = container.scrollTop
        const buffer = Math.min(height / 4, container.clientHeight * 2)
        let nextScrollTop

        if (scrollTop < buffer) {
            nextScrollTop = scrollTop + height
        } else if (scrollTop > container.scrollHeight - container.clientHeight - buffer) {
            nextScrollTop = scrollTop - height
        } else {
            return
        }

        // Recycle only after scrolling settles so native touch momentum stays intact.
        container.style.scrollSnapType = 'none'
        if (nextScrollTop > scrollTop) {
            container.prepend(last)
        } else {
            container.append(first)
        }
        container.scrollTo({ top: nextScrollTop, behavior: 'instant' })
        requestAnimationFrame(() => container.style.removeProperty('scroll-snap-type'))
    }

    container.addEventListener('scrollend', recycleOffscreenSequence)
}

function getVisibleProjectIndex(projectSections) {
    let nearestIndex = 0
    let nearestDistance = Infinity
    projectSections.forEach((section, index) => {
        const rect = section.getBoundingClientRect()
        const distance = Math.abs((rect.top + rect.bottom) / 2 - window.innerHeight / 2)
        if (distance < nearestDistance) {
            nearestDistance = distance
            nearestIndex = index
        }
    })
    return nearestIndex
}

function addProjectNavigation(projectSections) {
    document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
            event.target.closest('.project-copy, #nav-menu, input, textarea, select, button, a, [contenteditable="true"]')) return
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
        if (!hashObserverLock.active || performance.now() >= hashObserverLock.releaseAt) {
            currentProjectIndex = getVisibleProjectIndex(projectSections)
        }

        const currentProject = projectSections[currentProjectIndex]
        if (!currentProject) return

        const mediaElement = getProjectMediaElement(currentProject)
        const mediaList = parseMediaData(mediaElement)
        if (!mediaList.length) return

        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            navigateProjectMedia(currentProject, -1)
        } else if (event.key === 'ArrowRight') {
            event.preventDefault()
            navigateProjectMedia(currentProject, 1)
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

        const projectId = currentProject.dataset.projectId || currentProject.id
        hashObserverLock = {
            active: true,
            targetId: projectId,
            releaseAt: performance.now() + programmaticScrollLockMs
        }

        currentProject.scrollIntoView({ behavior: 'smooth' })

        if (window.location.hash !== `#${projectId}`) {
            history.pushState(null, null, `#${projectId}`)
        }
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
            if (hashObserverLock.active && projectId !== hashObserverLock.targetId) return
            const nextHash = `#${projectId}`
            if (window.location.hash !== nextHash) {
                const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`
                history.replaceState(null, null, nextUrl)
            }
        }, hashReplaceDelayMs)
    }

    const syncVisibleProject = () => {
        const visibleIndex = getVisibleProjectIndex(projectSections)
        const section = projectSections[visibleIndex]
        const projectId = section.dataset.projectId || section.id
        if (hashObserverLock.active) {
            const reachedTarget = projectId === hashObserverLock.targetId &&
                Math.abs(section.getBoundingClientRect().top) < 1
            if (!reachedTarget && performance.now() < hashObserverLock.releaseAt) return
            hashObserverLock = { active: false, targetId: null, releaseAt: 0 }
        }
        currentProjectIndex = visibleIndex
        scheduleHashReplace(projectId)
    }

    const scrollContainer = document.getElementById('random-gallery-container')
    let scrollFrame = null
    scrollContainer.addEventListener('scroll', () => {
        if (scrollFrame !== null) return
        scrollFrame = requestAnimationFrame(() => {
            scrollFrame = null
            syncVisibleProject()
        })
    }, { passive: true })
    scrollContainer.addEventListener('scrollend', () => {
        hashObserverLock = { active: false, targetId: null, releaseAt: 0 }
        syncVisibleProject()
    })
    const releaseScrollLock = () => {
        hashObserverLock = { active: false, targetId: null, releaseAt: 0 }
    }
    scrollContainer.addEventListener('wheel', releaseScrollLock, { passive: true })
    scrollContainer.addEventListener('touchstart', releaseScrollLock, { passive: true })
    syncVisibleProject()
}
