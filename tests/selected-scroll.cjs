// Run against a local HTTP server and Chromium with remote debugging enabled.
// SELECTED_ORIGIN=http://127.0.0.1:8882 SELECTED_CDP=http://127.0.0.1:9242 node tests/selected-scroll.cjs
const assert = require('node:assert/strict')

const origin = process.env.SELECTED_ORIGIN || 'http://127.0.0.1:4173'
const debuggerOrigin = process.env.SELECTED_CDP || 'http://127.0.0.1:9222'
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function connect() {
    const target = await (await fetch(`${debuggerOrigin}/json/new?about:blank`, { method: 'PUT' })).json()
    const socket = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
        socket.onopen = resolve
        socket.onerror = reject
    })
    let id = 0
    const pending = new Map()
    socket.onmessage = event => {
        const message = JSON.parse(event.data)
        if (!message.id) return
        pending.get(message.id)(message)
        pending.delete(message.id)
    }
    const call = (method, params = {}) => new Promise((resolve, reject) => {
        const key = ++id
        pending.set(key, message => message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result))
        socket.send(JSON.stringify({ id: key, method, params }))
    })
    const evaluate = async expression => {
        const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
        return result.result.value
    }
    return {
        call,
        evaluate,
        close: async () => {
            socket.close()
            await fetch(`${debuggerOrigin}/json/close/${target.id}`)
        }
    }
}

async function run() {
    const browser = await connect()
    const { call, evaluate } = browser
    const waitFor = async expression => {
        const deadline = Date.now() + 12000
        while (Date.now() < deadline) {
            if (await evaluate(expression)) return
            await wait(50)
        }
        throw new Error(`Timed out: ${expression}`)
    }
    const state = () => evaluate(`(() => {
        const container = document.getElementById('random-gallery-container')
        const sections = [...container.querySelectorAll('.project-section')]
        const active = sections.reduce((nearest, section) =>
            Math.abs(section.getBoundingClientRect().top) < Math.abs(nearest.getBoundingClientRect().top) ? section : nearest)
        return {
            id: active.dataset.projectId,
            elementId: active.id,
            top: active.getBoundingClientRect().top,
            offset: active.offsetTop,
            scroll: container.scrollTop,
            count: sections.length,
            hash: location.hash,
            mediaIndex: active.querySelector('.project-media').dataset.mediaIndex
        }
    })()`)
    const key = async key => {
        await call('Input.dispatchKeyEvent', { type: 'keyDown', key })
        await call('Input.dispatchKeyEvent', { type: 'keyUp', key })
    }

    try {
        await call('Page.enable')
        await call('Page.bringToFront')
        await call('Network.enable')
        await call('Network.setCacheDisabled', { cacheDisabled: true })
        await call('Network.setBypassServiceWorker', { bypass: true })
        await call('Page.addScriptToEvaluateOnNewDocument', {
            source: `
                Math.random = () => 0.8
                ${process.argv.includes('--native-scrollend') ? '' : `
                const add = EventTarget.prototype.addEventListener
                EventTarget.prototype.addEventListener = function(type, ...args) {
                    if (type !== 'scrollend') return add.call(this, type, ...args)
                }`}
            `
        })

        for (const [width, height] of [[1440, 1000], [390, 844]]) {
            await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 })
            await call('Page.navigate', { url: 'about:blank' })
            await call('Page.navigate', { url: `${origin}/selected/#E16` })
            await waitFor(`document.readyState === 'complete' && document.querySelector('.project-section') !== null`)
            const ids = await evaluate(`[...document.querySelector('.project-sequence').querySelectorAll('.project-section')].map(section => section.dataset.projectId)`)
            const initial = await state()
            assert.equal(initial.id, 'E16')
            assert.equal(initial.elementId, initial.id, 'Deep-linked entry must use original project group')
            assert.ok(Math.abs(initial.top) < 1)

            const groupStart = initial.offset - ids.indexOf('E16') * height
            await evaluate(`document.getElementById('random-gallery-container').scrollTop = ${groupStart + (ids.length - 3) * height}`)
            await wait(100)
            assert.equal((await state()).count, ids.length)
            await evaluate(`document.getElementById('random-gallery-container').scrollTop = ${groupStart + (ids.length - 2) * height}`)
            await wait(100)
            assert.equal((await state()).count, ids.length * 2, 'The penultimate project must populate the next group')
            assert.equal((await state()).offset, groupStart + (ids.length - 2) * height, 'Population must preserve existing project coordinates')

            await evaluate(`
                window.scrollWrites = []
                window.scrollSamples = []
                window.sampleScroll = true
                const container = document.getElementById('random-gallery-container')
                const scrollTo = container.scrollTo.bind(container)
                container.scrollTo = (...args) => {
                    scrollWrites.push(args)
                    return scrollTo(...args)
                }
                const sample = () => {
                    if (!sampleScroll) return
                    const sections = [...container.querySelectorAll('.project-section')]
                    scrollSamples.push({
                        count: sections.length,
                        covered: sections.reduce((height, section) => {
                            const rect = section.getBoundingClientRect()
                            return height + Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0))
                        }, 0)
                    })
                    requestAnimationFrame(sample)
                }
                requestAnimationFrame(sample)
            `)

            // No pauses long enough to recycle between wheel events.
            for (const direction of [1, -1]) {
                for (let index = 0; index < 45; index++) {
                    await call('Input.dispatchMouseEvent', {
                        type: 'mouseWheel', x: width / 2, y: height / 2, deltaX: 0, deltaY: direction * height
                    })
                    await wait(65)
                }
                await waitFor(`(() => {
                    const sections = [...document.querySelectorAll('.project-section')]
                    return sections.some(section => Math.abs(section.getBoundingClientRect().top) < 1)
                })()`)
                await wait(250)
                const current = await state()
                assert.equal(current.hash, `#${current.id}`)
                assert.ok(current.count <= ids.length * 2)
            }
            const samples = await evaluate('sampleScroll = false; scrollSamples')
            assert.ok(samples.every(sample => sample.covered >= height - 1), 'Projects must cover the entire viewport on every frame')
            assert.ok(samples.every(sample => sample.count <= ids.length * 3), 'Wheel scrolling must keep a bounded DOM')
            assert.equal(await evaluate('scrollWrites.length'), 0, 'Wheel scrolling must never reposition the scroller')

            let expected = ids.indexOf((await state()).id)
            for (let index = 0; index < 25; index++) {
                await key('ArrowDown')
                expected = (expected + 1) % ids.length
                await wait(25)
            }
            await wait(1600)
            const navigated = await state()
            assert.equal(navigated.id, ids[expected])
            assert.ok(Math.abs(navigated.top) < 1)
            assert.ok(navigated.count <= ids.length * 2, 'Keyboard navigation must release intermediate groups')
            await key('ArrowRight')
            await wait(450)
            assert.equal((await state()).mediaIndex, '1', 'Newly populated galleries must remain interactive')
            assert.equal(await evaluate('scrollWrites.length'), 0)
            console.log(JSON.stringify({ width, fastWheel: true, rapidKeyboard: true, boundedDOM: true, scrollWrites: 0 }))
        }

        await call('Input.synthesizeScrollGesture', { x: 195, y: 400, yDistance: -4000, speed: 4000, gestureSourceType: 'touch' })
        await wait(900)
        assert.ok(Math.abs((await state()).top) < 1)
        assert.equal(await evaluate('scrollWrites.length'), 0, 'Touch momentum must never reposition the scroller')

        const beforeResize = await state()
        await call('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true })
        await wait(500)
        const resized = await state()
        assert.equal(resized.id, beforeResize.id, 'Viewport resizing must preserve the selected project')
        assert.ok(Math.abs(resized.top) < 1)
        console.log(JSON.stringify({ touchMomentum: true, resize: true }))

        const writesBeforeRecenter = await evaluate('scrollWrites.length')
        await evaluate(`
            document.getElementById('random-gallery-container').style.scrollSnapType = 'none'
            document.getElementById('random-gallery-container').scrollTop = 390 * 5
        `)
        await wait(100)
        const beforeRecenter = await state()
        await evaluate(`document.getElementById('random-gallery-container').style.removeProperty('scroll-snap-type')`)
        await waitFor(`document.getElementById('random-gallery-container').scrollTop > 100000`)
        const recentered = await state()
        assert.equal(recentered.id, beforeRecenter.id)
        assert.ok(Math.abs(recentered.top - beforeRecenter.top) < 1)
        assert.ok(recentered.scroll > 100000, 'Idle recovery must restore scroll space in both directions')
        assert.equal(await evaluate('scrollWrites.length'), writesBeforeRecenter + 1)
        console.log(JSON.stringify({ longSessionRecovery: true }))
    } finally {
        await browser.close()
    }
}

run().catch(error => {
    console.error(error)
    process.exitCode = 1
})
