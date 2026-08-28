/// <reference path="shared.js" />

const selectors = {
    fullView: 'ytd-app', // `body` won't work
    shortsPlayer: '#shorts-player',
}

const selectorsMobile = {
    fullView: 'ytm-app, body > #player-container-id',
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

const scrollEnumMobile = {
    short: `ytm-app {
        max-height: 500vh !important;
        overflow-y: hidden !important;
    }`,
    long: `ytm-app {
        max-height: 1000vh !important;
        overflow-y: hidden !important;
    }`,
}

const isMobile = window.location.hostname === MOBILE_DOMAIN
if (isMobile) {
    Object.assign(scrollEnum, scrollEnumMobile)
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

function setPlaybackRate(rate) {
    // pass parameters using data-* attributes
    const attr = {
        rate: 'data-playback-rate',
        nav: 'data-navigation',
        isMobile: 'data-is-mobile',
    }

    const id = 'eytft-injected-script'
    const script = document.querySelector('#' + id)
    if (script) {
        script.setAttribute(attr.nav, location.href)
        rate && script.setAttribute(attr.rate, rate)
        return
    }
    const newScript = document.createElement('script')
    newScript.id = id
    newScript.src = browser.runtime.getURL('main.js')
    newScript.setAttribute(attr.rate, rate ?? 1)
    newScript.setAttribute(attr.isMobile, isMobile ? 'true' : '')
    document.head.appendChild(newScript)
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
    setPlaybackRate()
    if (!screenState.blocked) {
        setScrolling(new URL(event.destination.url).pathname)
    }
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
        boxSizing: 'border-box',
        padding: '33vh 1em 0 1em',
        fontSize: 'clamp(3em, 5vw, 8em)',
        color: 'white',
        background: 'rgba(0, 0, 0, 0.5)'
    })
    mask.innerText = message
    mask.setAttribute('class', 'eytft-page-mask')

    // pause video (if any)
    const vid = document.querySelector('video')
    if (vid && !vid.paused) {
        vid.pause() // doesn't work for shorts
        document.querySelector(selectors.shortsPlayer)?.click()
    }

    screenState.blocked = true
    screenState.nextCheck = null
    setScrolling(null, 'none')
    addStyle('page-blur', `${selectors.fullView} { filter: blur(5px); }`)
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
    // 'z' is greater than any valid value
    let nextYtbTime = 'z'
    let isYtbTime = false
    // valid entry must take the form of ["start", "end"]
    let isValid = false
    for (const p of timeLimit[now.getDay()]) {
        const [s, e] = p?.length === 2 ? p : []
        if (!s || !e || s >= e) {
            continue
        }
        isValid = true
        if (s > time && s < nextYtbTime) {
            nextYtbTime = s
        }
        if (time >= s && time < e) {
            isYtbTime = true
            ytbEnd.setHours(...e.split(':'), 0, 0)
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
    Object.assign(scrollConfig, data.scrolling)
    setScrolling()

    data = data ?? {}
    setTimeLimit(data.timeLimit)
    checkTimeLimit()

    for (const key in hideableParts) {
        if (!data || (data[key] ?? true)) {
            hide(key)
        } else {
            removeStyle(key)
        }
    }

    if (data.playbackRate) {
        setPlaybackRate(data.playbackRate)
    }
})

browser.storage.sync.onChanged.addListener(changes => {
    if (changes.scrolling) {
        Object.assign(scrollConfig, changes.scrolling.newValue)
        setScrolling()
    }

    if (changes.timeLimit) {
        setTimeLimit(changes.timeLimit.newValue)
        checkTimeLimit()
    }

    for (const key in hideableParts) {
        if (!(key in changes)) {
            continue
        }
        if (changes[key].newValue) {
            hide(key)
        } else {
            removeStyle(key)
        }
    }

    if (changes.playbackRate) {
        setPlaybackRate(changes.playbackRate.newValue)
    }
})