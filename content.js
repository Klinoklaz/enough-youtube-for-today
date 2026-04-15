/// <reference path="shared.js" />

const selectors = {
    videoSetting: '.ytp-menuitem .ytp-menuitem-label',
    speedSettingText: 'Playback speed',
    app: 'ytd-app', // entire page
    thumbnail: 'yt-thumbnail-view-model',
}

const selectorsMobile = {
    videoSetting: 'player-settings-menu .ytListItemViewModelTitleWrapper',
    speedSettingText: 'Speed',
    app: 'ytm-app',
    thumbnail: 'ytm-thumbnail-cover',
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

if (window.location.hostname === MOBILE_DOMAIN) {
    Object.assign(scrollEnum, {
        long: `ytm-app {
            max-height: 500vh !important;
            overflow-y: hidden !important;
        }`,
        short: `ytm-app {
            max-height: 250vh !important;
            overflow-y: hidden !important;
        }`,
    })
    Object.assign(selectors, selectorsMobile)
    Object.assign(hideableParts, hideablePartsMobile)
}

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
    const menu = document.querySelectorAll(selectors.videoSetting)
    menu.forEach(item => {
        if (item.innerText === selectors.speedSettingText) {
            const speedMenu = item.parentElement
            speedMenu.addEventListener('click', handleSpeedMenuClick)
        }
    })
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
    const selector = `a:has(
        ${selectors.thumbnail} .ytSpecIconShapeHost)`
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

function setScrolling(path, override) {
    path = path ?? window.location.pathname
    const key = override
        ? override
        : (scrollConfig.special[path] ?? scrollConfig.default)

    for (const item in scrollEnum) {
        removeStyle('scroll-' + item)
    }
    if (key in scrollEnum) {
        addStyle('scroll-' + key, scrollEnum[key])
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

const screenState = {
    blocked: false,
    nextCheck: null,
}

// blur entire screen and display reminder message
function blockScreen(message) {
    if (screenState.blocked) {
        return
    }
    const mask = document.createElement('div')
    Object.assign(mask.style, {
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
    })
    mask.innerText = message
    mask.setAttribute('class', 'eytft-page-mask')

    // pause video (if any)
    const vid = document.querySelector('video')
    if (vid && !vid.paused) {
        vid.pause() // doesn't work for shorts
        document.querySelector('#shorts-player')?.click()
    }

    screenState.blocked = true
    screenState.nextCheck = null
    setScrolling(null, 'none')
    addStyle('page-blur', `${selectors.app} { filter: blur(5px); }`)
    document.body.appendChild(mask)
}

function unblockScreen() {
    if (!screenState.blocked) {
        return
    }
    setScrolling()
    removeStyle('page-mask')
    removeStyle('page-blur')
    screenState.blocked = false
    screenState.nextCheck = null
}

function checkTimeLimit() {
    const now = new Date
    const time = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
    })

    const ytbEnd = new Date
    let nextYtbTime = 'z'
    let isYtbTime = false
    // valid entry must take the form of ["start", "end"]
    let isValid = false
    for (const p of timeLimit[now.getDay()]) {
        if (p?.length !== 2 || !p[0] || !p[1] || p[0] >= p[1]) {
            continue
        }
        isValid = true
        if (p[0] > time && p[0] < nextYtbTime) {
            nextYtbTime = p[0]
        }
        if (time >= p[0] && time < p[1]) {
            isYtbTime = true
            ytbEnd.setHours(...p[1].split(':'), 0, 0)
        }
    }

    if (!isValid) {
        return
    }
    if (isYtbTime) {
        if (screenState.nextCheck) {
            clearTimeout(screenState.nextCheck)
        }
        unblockScreen()
        screenState.nextCheck = setTimeout(checkTimeLimit, ytbEnd - now)
    } else {
        if (screenState.nextCheck) {
            clearTimeout(screenState.nextCheck)
        }
        if (nextYtbTime === 'z') {
            nextYtbTime = '24:00'
            blockScreen('Offline Time. Come Another Day.')
        } else {
            blockScreen(`Offline Time. Come at ${nextYtbTime}.`)
        }
        const ytbStart = new Date
        ytbStart.setHours(...nextYtbTime.split(':'), 0, 0)
        screenState.nextCheck = setTimeout(checkTimeLimit, ytbStart - now)
    }
}

browser.storage.sync.get().then(data => {
    for (const name in hideableParts) {
        if (!data || (data[name] ?? true)) {
            hide(name)
        } else {
            removeStyle(name)
        }
    }

    data = data ?? {}
    setTimeLimit(data.timeLimit)
    checkTimeLimit()

    if (data.playbackRate) {
        playbackCtl.rate = data.playbackRate
        setPlaybackRate(window.location)
    }

    if (data.scrolling) {
        Object.assign(scrollConfig, data.scrolling)
    }
    setScrolling()
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

    if (changes.timeLimit) {
        setTimeLimit(changes.timeLimit.newValue)
        checkTimeLimit()
    }

    if (changes.playbackRate) {
        playbackCtl.rate = changes.playbackRate.newValue
        setPlaybackRate(window.location)
    }

    if (changes.scrolling) {
        Object.assign(scrollConfig, changes.scrolling.newValue)
        setScrolling()
    }
})