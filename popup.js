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

const scrollPage = document.querySelector('#scroll-page')
const dailyLimit = document.querySelector('#daily-limit')
const weeklyLimit = document.querySelector('#weekly-limit')
const playback = document.querySelector('#playback-rate')
const dailyLimitLabel = document.querySelector('#daily-limit-label')
const weeklyLimitLabel = document.querySelector('#weekly-limit-label')
const playbackLabel = document.querySelector('#playback-rate + label')

// init
browser.storage.sync.get().then(res => {
    res = res ?? {}
    for (const item in hideableParts) {
        setCheckbox(item, res)
    }
    if (res.scrolling) {
        Object.assign(scrollConfig, res.scrolling)
    }
    scrollPage.value = 'home'
    setCheckbox('scroll-' + scrollConfig.home, {})
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
scrollPage.addEventListener('change', e => {
    setCheckbox('scroll-' + scrollConfig[e.target.value], {})
})

document.querySelectorAll('#blocking input').forEach(item => {
    item.addEventListener('change', e => {
        let val = {}
        val[e.target.id] = e.target.checked
        browser.storage.sync.set(val)
    })
})
document.querySelectorAll('input[name="scrolling"]').forEach(item => {
    item.addEventListener('change', e => {
        scrollConfig[scrollPage.value] = e.target.value
        browser.storage.sync.set({ scrolling: scrollConfig })
    })
})