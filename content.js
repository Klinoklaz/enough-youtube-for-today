function addStyle(name, content) {
    const style = document.createElement('style')
    style.textContent = content
    style.setAttribute('class', 'eytft-' + name)
    document.head.appendChild(style)
}

function removeStyle(name) {
    document.querySelectorAll('.eytft-' + name).forEach(e => {
        e.remove()
    })
}

const hideable = [
    'related',
    'comments',
    'shorts',
    'watch-next',
    'next-shorts',
    'related-shorts',
]

function hide(name) {
    let selector
    switch (name) {
        case 'related-shorts': // hide shorts in related videos
            selector = '#related yt-horizontal-list-renderer'
            break
        case 'next-shorts': // disable scrolling in shorts
            selector = '#shorts-inner-container > div:not([id="0"])'
            break
        case 'related': // hide related videos
            selector = '#related'
            break
        case 'shorts': // hide shorts in homepage and sidebar
            selector = 'ytd-rich-shelf-renderer[is-shorts], #guide a[title="Shorts"]'
            break
        case 'comments':
            selector = 'ytd-comments#comments'
            break
        case 'watch-next': // hide recommendation after video end
            selector = '#movie_player div[title="More videos (v)"]'
            break
    }
    if (!selector) {
        return
    }
    addStyle(name, selector + '{ display: none !important; }')
}

let playbackCtl = 1

function setPlaybackRate(retry) {
    // wait for page navigation
    if (!retry) {
        setTimeout(() => {
            setPlaybackRate(1)
        }, 1000)
        return
    }
    if (retry > 5) {
        return
    }
    const vid = document.querySelector('video')
    // wait for video element to render
    if (!vid) {
        setTimeout(() => {
            setPlaybackRate(++retry)
        }, retry * 1000)
        return
    }
    // detect music video:
    // A. check like button animation config
    // `body.textContent.includes('animated_like_music')`
    // this doesn't work across navigation
    // B. check description
    // `$('#footer-section')?.innerText === 'Music'`
    // this detects very few instances
    // and this element probably won't load
    if (playbackCtl == 1 ||
        document.querySelector('#footer-section')?.innerText !== 'Music') {
        vid.playbackRate = playbackCtl
    }
}

function setScrolling(value) {
    switch (value) {
        case 'none': // disable scrolling altogether
            removeStyle('scroll-partial')
            addStyle('scroll-none', `body {
                overflow-y: hidden !important;
            }`)
            break
        case 'allow':
            removeStyle('scroll-partial')
            removeStyle('scroll-none')
            break
        case 'partial': // allow scrolling for one screen
            removeStyle('scroll-none')
            addStyle('scroll-partial', `ytd-page-manager {
                max-height: 200vh !important;
                overflow-y: hidden !important;
            }`)
            break
    }
}

// path prefix whitelist
const mustScroll = [
    '/results',
    '/feed',
    '/@', // channel profile
    '/channel',
    '/playlist',
]
let scrollCtl = 'partial'
let allowScrolling = () => false

// entering a new page doesn't necessarily reload script,
// this is the easy solution
if (navigation && 'onnavigate' in navigation) {
    allowScrolling = () => {
        const path = window.location.pathname
        for (const item of mustScroll) {
            if (path.startsWith(item)) {
                return true
            }
        }
        return false
    }

    navigation.addEventListener('navigate', e => {
        if (e.hashChange || e.downloadRequest !== null) {
            return
        }
        setPlaybackRate()
        const path = (new URL(e.destination.url)).pathname
        for (const item of mustScroll) {
            if (path.startsWith(item)) {
                setScrolling('allow')
                return
            }
        }
        setScrolling(scrollCtl)
    })
}

// blur entire screen and display reminder message
function blockScreen() {
    const mask = document.createElement('div')
    const style = {
        zIndex: '9999',
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        textAlign: 'center',
        fontSize: '8em',
        paddingTop: '30vh',
        color: 'white',
        background: 'rgba(0, 0, 0, 0.5)'
    }
    Object.assign(mask.style, style)
    mask.innerText = 'Hey, Time to Rest!'
    mask.setAttribute('class', 'eytft-page-mask')

    // pause video (if any)
    const vid = document.querySelector('video')
    if (vid && !vid.paused) {
        vid.pause() // doesn't work for shorts
        document.querySelector('#shorts-player')?.click()
    }

    setScrolling('none')
    addStyle('page-blur', 'ytd-app { filter: blur(5px); }')
    document.body.appendChild(mask)
}

function unblockScreen() {
    removeStyle('page-mask')
    removeStyle('page-blur')
    setScrolling(allowScrolling() ? 'allow' : scrollCtl)
}

function dayAndWeekStart() {
    const date = new Date
    const dayStart = date.setUTCHours(0, 0, 0, 0)
    const weekStart = date.setUTCDate(
        date.getUTCDate() - date.getUTCDay())
    return { dayStart, weekStart }
}

// millisec
const timeLimit = {
    daily: 0,
    weekly: 0,
    init: false
}

// page stay time, millisec
const timeStat = {
    inTheDay: 0,
    inTheWeek: 0,
    init: false
}
Object.assign(timeStat, dayAndWeekStart())

function calcRemainingTime() {
    let res = null
    let minLimit
    if (timeLimit.daily) {
        minLimit = timeLimit.daily
        res = timeLimit.daily - timeStat.inTheDay
    }
    if (timeLimit.weekly) {
        const weekRem = timeLimit.weekly - timeStat.inTheWeek
        res = Math.min(res ?? weekRem, weekRem)
        minLimit = Math.min(
            minLimit ?? timeLimit.weekly, timeLimit.weekly)
    }
    if (!res) {
        return res
    }
    const now = new Date
    const end = new Date(now.getTime() + res)
    // is tomorrow
    if (end.getUTCDate() > now.getUTCDate()) {
        res = end.setUTCHours(0, 0, 0, 0) - now + minLimit
    }
    return res
}

function updateTimeStat(start, end) {
    const info = dayAndWeekStart()

    // if crossed date or week
    if (timeStat.dayStart < info.dayStart) {
        timeStat.inTheDay = 0
    }
    if (timeStat.weekStart < info.weekStart) {
        timeStat.inTheWeek = 0
    }

    Object.assign(timeStat, info)
    const duration = end - start
    timeStat.inTheDay += start < info.dayStart
        ? end - info.dayStart
        : duration
    timeStat.inTheWeek += start < info.weekStart
        ? end - info.weekStart
        : duration
}

// pause and start should be idempotent
const timer = {
    id: null,
    start: null,
    end: null,
    triggered: false
}

function startTimer(millisec) {
    if (timer.id) { // restart
        pauseTimer()
    }
    if (timer.triggered) {
        if ((millisec ?? 1) <= 0) {
            return
        } else {
            unblockScreen()
            timer.triggered = false
        }
    }
    if (millisec === null) {
        return
    }
    timer.start = Date.now()
    timer.end = null
    timer.id = setTimeout(() => {
        timer.id = null
        blockScreen()
        pauseTimer() // this updates timeStat
        timer.triggered = true
    }, millisec)
}

function pauseTimer() {
    if (timer.id) {
        clearTimeout(timer.id)
        timer.id = null
    }
    if (!timer.start) {
        return
    }
    timer.end = Date.now()
    // avoid updating storage directly
    // to mitigate race condition
    browser.runtime.sendMessage({ timer })
    updateTimeStat(timer.start, timer.end)
    timer.start = timer.end = null
}

browser.storage.sync.get().then(data => {
    for (const name of hideable) {
        if (!data || (data[name] ?? true)) {
            hide(name)
        } else {
            removeStyle(name)
        }
    }

    if (data.playbackRate) {
        playbackCtl = data.playbackRate
        setPlaybackRate()
    }

    scrollCtl = data.scrolling ?? scrollCtl
    if (!allowScrolling()) {
        setScrolling(scrollCtl)
    }

    if (data.timeLimit) {
        timeLimit.init = true
        Object.assign(timeLimit, data.timeLimit)
    }
})

browser.storage.sync.onChanged.addListener(changes => {
    for (const name of hideable) {
        if (!(name in changes)) {
            continue
        }
        if (changes[name].newValue) {
            hide(name)
        } else {
            removeStyle(name)
        }
    }

    if (changes.playbackRate) {
        playbackCtl = changes.playbackRate.newValue
        setPlaybackRate()
    }

    scrollCtl = changes?.scrolling?.newValue ?? scrollCtl
    if (!allowScrolling() && 'scrolling' in changes) {
        setScrolling(scrollCtl)
    }

    if (changes.timeLimit) {
        Object.assign(timeLimit, changes.timeLimit.newValue)
        startTimer(calcRemainingTime())
    }
})

// avoid storage.sync to mitigate race condition
browser.storage.local.get().then(data => {
    timeStat.init = true
    if (!data.timeStat) {
        return
    }
    if (data.timeStat.dayStart === timeStat.dayStart) {
        timeStat.inTheDay = data.timeStat.inTheDay
    }
    if (data.timeStat.weekStart === timeStat.weekStart) {
        timeStat.inTheWeek = data.timeStat.inTheWeek
    }
})

browser.storage.local.onChanged.addListener(changes => {
    if (changes.timeStat) {
        Object.assign(timeStat, changes.timeStat.newValue)
    }
})

// track stay time
if ('onvisibilitychange' in document) {
    if (document.visibilityState === 'visible') {
        if (timeLimit.init && timeStat.init) {
            startTimer(calcRemainingTime())
        } else {
            setTimeout(() => {
                startTimer(calcRemainingTime())
            }, 1000)
        }
    }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            pauseTimer()
        } else {
            startTimer(calcRemainingTime())
        }
    })
}