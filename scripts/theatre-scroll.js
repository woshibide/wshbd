const reservedScrollRangePx = 8_000_000
const scrollIdleDelayMs = 250

export function initInfiniteProjectScroll(initializeSection, disposeSection) {
    const container = document.getElementById('random-gallery-container')
    if (!container) return null
    const initialSequences = [...container.querySelectorAll(':scope > .project-sequence')]
    if (!initialSequences.length) return null
    const initialSections = [...initialSequences[0].querySelectorAll('.project-section')]
    if (!initialSections.length) return null

    const template = initialSequences[0].cloneNode(true)
    const projectCount = initialSections.length
    let sectionHeight = initialSections[0].getBoundingClientRect().height
    let sequenceHeight = sectionHeight * projectCount
    // Reserve native scroll space in both directions without growing the DOM.
    const sequenceCount = Math.max(8, Math.floor(reservedScrollRangePx / sequenceHeight))
    const origin = Math.floor(sequenceCount / 2)
    const sequences = new Map(initialSequences.map((sequence, index) => [origin + index, sequence]))
    const before = document.createElement('div')
    const after = document.createElement('div')
    for (const spacer of [before, after]) {
        spacer.className = 'project-scroll-spacer'
        spacer.setAttribute('aria-hidden', 'true')
    }
    container.insertBefore(before, initialSequences[0])
    container.append(after)
    initialSequences.forEach(sequence => sequence.querySelectorAll('img.project-media').forEach(image => {
        image.loading = 'eager'
        image.decoding = 'async'
    }))

    const updateSpacers = () => {
        const indexes = [...sequences.keys()]
        before.style.height = `${Math.min(...indexes) * sequenceHeight}px`
        after.style.height = `${(sequenceCount - Math.max(...indexes) - 1) * sequenceHeight}px`
    }

    const createSequence = index => {
        const sequence = template.cloneNode(true)
        sequence.querySelectorAll('.project-section').forEach(section => {
            section.id = `${section.dataset.projectId}-sequence-${index}`
            section.querySelectorAll('details').forEach(copy => copy.open = false)
            section.querySelectorAll('.image-load-indicator').forEach(indicator => indicator.remove())
            const image = section.querySelector('.project-media')
            if (image instanceof HTMLImageElement) {
                image.loading = 'eager'
                image.decoding = 'async'
            }
            initializeSection(section)
        })
        const nextIndex = [...sequences.keys()].filter(existing => existing > index).sort((a, b) => a - b)[0]
        container.insertBefore(sequence, sequences.get(nextIndex) || after)
        sequences.set(index, sequence)
    }

    let navigationPosition = null
    let logicalPosition = 0
    let touching = false
    let touchSequence = null
    const ensureAround = (position) => {
        if (Number.isFinite(position)) navigationPosition = position
        const measuredHeight = sequences.values().next().value.querySelector('.project-section').getBoundingClientRect().height
        if (measuredHeight !== sectionHeight) return
        position = container.scrollTop
        logicalPosition = position / sectionHeight
        if (navigationPosition !== null && Math.abs(navigationPosition - position) < 1) navigationPosition = null
        const index = Math.max(0, Math.min(sequenceCount - 1, Math.floor(position / sequenceHeight)))
        const projectIndex = Math.floor((position - index * sequenceHeight) / sectionHeight)
        const targetIndex = navigationPosition === null ? index : Math.floor(navigationPosition / sequenceHeight)
        const navigationFirst = navigationPosition === null ? index : targetIndex - 1
        const navigationLast = navigationPosition === null ? index : targetIndex + 1
        // Removing the native touch target before touchend can interrupt the gesture.
        const touchIndex = touchSequence ? [...sequences].find(([, sequence]) => sequence === touchSequence)?.[0] ?? index : index
        const first = Math.max(0, Math.min(index - (projectIndex <= 1 ? 1 : 0), navigationFirst, touchIndex))
        const last = Math.min(sequenceCount - 1, Math.max(index + (projectIndex >= projectCount - 2 ? 1 : 0), navigationLast, touchIndex))

        // Exchange groups and spacer height in one frame without moving existing content.
        for (let next = first; next <= last; next++) {
            if (!sequences.has(next)) createSequence(next)
        }
        for (const [existing, sequence] of sequences) {
            if (existing >= first && existing <= last) continue
            if (sequence.contains(document.activeElement)) document.activeElement.blur()
            sequence.querySelectorAll('.project-section').forEach(disposeSection)
            sequence.remove()
            sequences.delete(existing)
        }
        updateSpacers()
    }

    updateSpacers()
    const initialSection = initialSections[Math.floor(Math.random() * projectCount)]
    const initialImage = initialSection.querySelector('img.project-media')
    if (initialImage) initialImage.fetchPriority = 'high'
    container.scrollTo({ top: initialSection.offsetTop, behavior: 'instant' })
    history.replaceState(null, '', `${location.pathname}${location.search}#${initialSection.dataset.projectId}`)
    ensureAround()

    let frame = null
    container.addEventListener('scroll', () => {
        if (frame !== null) return
        frame = requestAnimationFrame(() => {
            frame = null
            ensureAround()
        })
    }, { passive: true })
    const cancelNavigation = () => navigationPosition = null
    container.addEventListener('wheel', cancelNavigation, { passive: true })
    container.addEventListener('touchstart', cancelNavigation, { passive: true })

    // Recenter only at the remote ends of the reserved range, after scrolling stops.
    let settleTimer = null
    const recenter = () => {
        clearTimeout(settleTimer)
        if (touching) return
        const index = Math.floor(container.scrollTop / sequenceHeight)
        if (index > 2 && index < sequenceCount - 3) return
        const shift = origin - index
        const position = container.scrollTop + shift * sequenceHeight
        logicalPosition += shift * projectCount
        if (navigationPosition !== null) navigationPosition += shift * sequenceHeight
        const entries = [...sequences]
        sequences.clear()
        entries.forEach(([existing, sequence]) => sequences.set(existing + shift, sequence))
        updateSpacers()
        container.scrollTo({ top: position, behavior: 'instant' })
    }
    const scheduleRecenter = () => {
        clearTimeout(settleTimer)
        settleTimer = setTimeout(recenter, scrollIdleDelayMs)
    }
    container.addEventListener('scroll', scheduleRecenter, { passive: true })
    container.addEventListener('touchstart', event => {
        touching = true
        touchSequence = event.target.closest('.project-sequence')
        clearTimeout(settleTimer)
    }, { passive: true })
    const finishTouch = event => {
        if (event.touches.length) return
        touching = false
        touchSequence = null
        ensureAround()
        scheduleRecenter()
    }
    container.addEventListener('touchend', finishTouch, { passive: true })
    container.addEventListener('touchcancel', finishTouch, { passive: true })

    new ResizeObserver(() => {
        const section = sequences.values().next().value.querySelector('.project-section')
        const nextHeight = section.getBoundingClientRect().height
        if (nextHeight === sectionHeight || !nextHeight) return
        const position = logicalPosition
        if (navigationPosition !== null) navigationPosition *= nextHeight / sectionHeight
        sectionHeight = nextHeight
        sequenceHeight = sectionHeight * projectCount
        updateSpacers()
        container.scrollTo({ top: position * sectionHeight, behavior: 'instant' })
        ensureAround()
    }).observe(container)

    return { ensureAround }
}
