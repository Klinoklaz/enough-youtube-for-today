/// <reference path="shared.js" />

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

function hide(name) {
    const selector = hideableParts[name]
    if (!selector) {
        return
    }
    addStyle(name, selector + '{ display: none !important; }')
}

const playbackCtl = {
    retry: 10,
    id: null,
    rate: 1,
}

function playbackCtlReset() {
    clearInterval(playbackCtl.id)
    playbackCtl.id = null
    playbackCtl.retry = 10
}

function handleSpeedMenuClick() {
    playbackCtlReset()
    document.querySelector('video').playbackRate = 1
}

function playbackCtlExec() {
    if (playbackCtl.retry-- <= 0) {
        playbackCtlReset()
        return
    }
    const vid = document.querySelector('video')
    if (!vid) {
        return
    }
    vid.playbackRate = MVDB.isMV() ? 1 : playbackCtl.rate
    if (playbackCtl.retry % 2 === 0) {
        return
    }
    updateMVDB()
    // give up control if user choses manual setting
    const menu = document.querySelectorAll(
        '.ytp-menuitem .ytp-menuitem-label')
    for (const item of menu) {
        if (item.innerText === 'Playback speed') {
            const speedMenu = item.parentElement
            speedMenu.addEventListener('click', handleSpeedMenuClick)
            break
        }
    }
}

function setPlaybackRate(url) {
    if (playbackCtl.id) {
        playbackCtlReset()
    }
    // no known way to detect mv in playlist
    // avoid playlists altogether
    if (url?.searchParams?.get('list')) {
        return
    }
    // not in watch page
    const path = url?.pathname ?? ''
    if (!path.startsWith('/watch') && !path.startsWith('/shorts')) {
        clearTimeout(MVDB.updating)
        MVDB.updating = setTimeout(updateMVDB, 2000)
        return
    }
    playbackCtl.id = setInterval(playbackCtlExec, 2000)
}

const MVDB = {
    data: new Map,
    init: false,
    // check like button animation config
    // this won't work across navigation, one-time use only
    isMV: function() {
        const res = document.body.textContent
            .includes('animated_like_music')
        if (res) {
            const search = new URLSearchParams(location.search)
            this.data.set(search.get('v'), true)
        }
        return res
    },
    updating: null
}
const v = /[?&]v=([0-9a-zA-Z_-]+)/ // video id
let lastScrollY = 0

function handleScrollPagination() {
    if (window.scrollY < lastScrollY) {
        return
    }
    const distance = window.scrollY - lastScrollY
    lastScrollY = window.scrollY
    // scroll pass half screen, assume new content is rendered
    // not accurate
    if (distance < window.innerHeight / 2) {
        return
    }
    if (MVDB.updating) {
        clearTimeout(MVDB.updating)
    }
    MVDB.updating = setTimeout(updateMVDB, 1000)
}

// this will be used across navigation
function checkIsMV() {
    const match = location.search.match(v)
    if (!match || !match[1]) {
        return false
    }
    if (MVDB.data.has(match[1])) {
        return true
    }
    const genre = document
        .querySelector('meta[itemprop="genre"]')?.content
    const res = genre && genre.includes('Music')
    if (res) {
        MVDB.data.set(match[1], true)
    }
    return res
}

function updateMVDB() {
    if (!MVDB.init) {
        MVDB.isMV = checkIsMV
        MVDB.init = true
    }
    if (MVDB.updating) {
        clearTimeout(MVDB.updating)
        MVDB.updating = null
    }

    // thumbnail with the music (& probably? other special) icon
    const selector = 'a:has(yt-thumbnail-view-model .ytSpecIconShapeHost)'
    document.querySelectorAll(selector).forEach(item => {
        const match = item.getAttribute('href')?.match(v)
        if (!match || !match[1]) {
            return
        }
        MVDB.data.set(match[1], true)
    })

    // no anon function to assure idempotency
    document.addEventListener('scrollend', handleScrollPagination)
}

const scrollEnum = {
    // disable scrolling entirely
    none: `body {
        overflow-y: hidden !important;
    }`,
    // 2.5 screens
    short: `ytd-page-manager {
        max-height: 250vh !important;
        overflow-y: hidden !important;
    }`,
    // 5 screens
    long: `ytd-page-manager, ytd-app {
        max-height: 500vh !important;
        overflow-y: hidden !important;
    }`,
}

function setScrolling(path, override) {
    path = path ?? window.location.pathname
    let name
    if (override) {
        name = override
    } else {
        name = scrollConfig.special[path] ?? scrollConfig.default
    }

    for (const item in scrollEnum) {
        removeStyle('scroll-' + item)
    }
    if (name in scrollEnum) {
        addStyle('scroll-' + name, scrollEnum[name])
    }
}

function handleNavigate(event) {
    if (event.hashChange || event.downloadRequest !== null) {
        return
    }
    lastScrollY = 0
    const url = new URL(event.destination.url)
    setPlaybackRate(url)
    setScrolling(url.pathname)
}

// SPA location change detection easy solution
if (HAS_NAVIGATION) {
    navigation.addEventListener('navigate', handleNavigate)
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

    setScrolling(null, 'none')
    addStyle('page-blur', 'ytd-app { filter: blur(5px); }')
    document.body.appendChild(mask)
}

function unblockScreen() {
    setScrolling()
    removeStyle('page-mask')
    removeStyle('page-blur')
}

// millisec
const timeLimit = {
    daily: 0,
    weekly: 0,
    init: false
}

function calcRemainingTime() {
    let res = null
    let minLimit
    if (timeLimit.daily) {
        minLimit = timeLimit.daily
        res = timeLimit.daily - timeStat.inTheDay
    }
    if (timeLimit.weekly) {
        const limit = timeLimit.weekly
        const res2 = limit - timeStat.inTheWeek
        res = Math.min(res ?? res2, res2)
        minLimit = Math.min(minLimit ?? limit, limit)
    }
    if (!res) {
        return res
    }
    const now = new Date
    const end = new Date(now.getTime() + res)
    // is tomorrow
    if (end.getDate() > now.getDate()) {
        res = end.setHours(0, 0, 0, 0) - now + minLimit
    }
    return res
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
    for (const name in hideableParts) {
        if (!data || (data[name] ?? true)) {
            hide(name)
        } else {
            removeStyle(name)
        }
    }

    if (data.playbackRate) {
        playbackCtl.rate = data.playbackRate
        setPlaybackRate(window.location)
    }

    if (typeof data.scrolling === 'object') {
        Object.assign(scrollConfig, data.scrolling)
    }
    setScrolling()

    if (data.timeLimit) {
        timeLimit.init = true
        Object.assign(timeLimit, data.timeLimit)
    }
})

browser.storage.sync.onChanged.addListener(changes => {
    for (const name in hideableParts) {
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
        playbackCtl.rate = changes.playbackRate.newValue
        setPlaybackRate(window.location)
    }

    if (changes.scrolling) {
        Object.assign(scrollConfig, changes.scrolling.newValue)
        setScrolling()
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
function handleVisChange() {
    if (document.visibilityState === 'hidden') {
        pauseTimer()
    } else {
        startTimer(calcRemainingTime())
    }
}

if (HAS_VIS_CHANGE) {
    if (document.visibilityState === 'visible') {
        if (timeLimit.init && timeStat.init) {
            startTimer(calcRemainingTime())
        } else {
            setTimeout(() => {
                startTimer(calcRemainingTime())
            }, 1000)
        }
    }
    document.addEventListener('visibilitychange', handleVisChange)
}