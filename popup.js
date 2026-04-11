/// <reference path="shared.js" />

if (!HAS_VIS_CHANGE) {
    document.querySelectorAll('.require-vis').forEach(item => {
        item.style.display = 'none'
    })
}
if (!HAS_NAVIGATION) {
    document.querySelectorAll('.require-nav').forEach(item => {
        item.style.display = 'none'
    })
}

function setCheckbox(id, values) {
    document.querySelector('#' + id).checked = values[id] ?? true
}

async function getURL() {
    const tabs = await browser.tabs
        .query({ active: true, currentWindow: true })
    if (tabs?.length <= 0) {
        return null
    }
    const url = tabs[0].url
    return url ? new URL(url) : null
}

const scrollScope = document.querySelector('#scroll-scope')
const dailyLimit = document.querySelector('#daily-limit')
const weeklyLimit = document.querySelector('#weekly-limit')
const playback = document.querySelector('#playback-rate')
const dailyLimitLabel = document.querySelector('#daily-limit-label')
const weeklyLimitLabel = document.querySelector('#weekly-limit-label')
const playbackLabel = document.querySelector('#playback-rate + label')

// init
browser.storage.sync.get().then(async (res) => {
    res = res ?? {}
    for (const item in hideableParts) {
        setCheckbox(item, res)
    }
    if (typeof res.scrolling === 'object') {
        Object.assign(scrollConfig, res.scrolling)
    }
    // scrolling config of current page
    const path = (await getURL())?.pathname
    let scroll = scrollConfig.special[path]
    scrollScope.value = path ? 'special' : 'default'
    scroll = path && scroll ? scroll : scrollConfig.default
    setCheckbox('scroll-' + scroll, {})

    playback.value = res?.playbackRate ?? 1
    // millisec to min
    dailyLimit.value = (res?.timeLimit?.daily ?? 0) / 1000 / 60
    weeklyLimit.value = (res?.timeLimit?.weekly ?? 0) / 1000 / 60
    // label text
    playbackLabel.innerText = playback.value + 'x'
    dailyLimitLabel.innerText = formatTime(dailyLimit.value)
    weeklyLimitLabel.innerText = formatTime(weeklyLimit.value)
})

function formatTime(minutes) {
    minutes = Math.floor(minutes)
    if (!minutes) {
        return '(off)'
    }
    if (minutes < 60) {
        return '(' + minutes + 'm)'
    }
    let remainder = minutes % 60
    remainder = remainder ? remainder + 'm)' : ')'
    return '(' + Math.floor(minutes / 60) + 'h' + remainder
}

dailyLimit.addEventListener('change', e => {
    browser.storage.sync.set({
        timeLimit: {
            daily: e.target.value * 1000 * 60, // min to millisec
            weekly: weeklyLimit.value * 1000 * 60
        }
    })
    dailyLimitLabel.innerText = formatTime(e.target.value)
})
weeklyLimit.addEventListener('change', e => {
    browser.storage.sync.set({
        timeLimit: {
            daily: dailyLimit.value * 1000 * 60,
            weekly: e.target.value * 1000 * 60
        }
    })
    weeklyLimitLabel.innerText = formatTime(e.target.value)
})

playback.addEventListener('change', e => {
    playbackLabel.innerText = playback.value + 'x'
    browser.storage.sync.set({ playbackRate: e.target.value })
})

scrollScope.addEventListener('change', async (e) => {
    if (e.target.value === 'default') {
        setCheckbox('scroll-' + scrollConfig.default, {})
    } else {
        const path = (await getURL())?.pathname
        const value = scrollConfig.special[path] ?? scrollConfig.default
        setCheckbox('scroll-' + value, {})
    }
})

document.querySelectorAll('#main-menu p').forEach(p => {
    p.addEventListener('click', async (e) => {
        const targetId = e.target.closest('p').id.slice(5)
        document.querySelector('#main-menu')
            .setAttribute('class', 'hide')
        document.querySelector('#' + targetId)
            .setAttribute('class', 'show content')
        if (targetId === 'scroll') {
            const specOption = document.querySelector('#current-path')
            specOption.innerText = (await getURL())?.pathname ?? 'N/A'
        }
    })
})

document.querySelectorAll('p.title').forEach(p => {
    p.addEventListener('click', e => {
        e.target.closest('p').parentElement
            .setAttribute('class', 'hide')
        document.querySelector('#main-menu')
            .setAttribute('class', 'show')
    })
})

document.querySelectorAll('#blocking input').forEach(item => {
    item.addEventListener('change', e => {
        let val = {}
        val[e.target.id] = e.target.checked
        browser.storage.sync.set(val)
    })
})

document.querySelectorAll('input[name="scrolling"]').forEach(item => {
    item.addEventListener('change', async (e) => {
        if (!e.target.checked) {
            return
        }
        const value = e.target.value
        if (scrollScope.value === 'default') {
            scrollConfig.default = value
        } else {
            const path = (await getURL())?.pathname
            if (!path) { // not in ytb
                return
            }
            if (scrollConfig.default === value) {
                delete scrollConfig.special[path]
            } else {
                scrollConfig.special[path] = value
            }
        }
        browser.storage.sync.set({ scrolling: scrollConfig })
    })
})