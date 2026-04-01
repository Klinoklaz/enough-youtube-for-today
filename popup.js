function setCheckbox(id, values) {
    document.querySelector('#' + id).checked = values[id] ?? true
}

const dailyLimit = document.querySelector('#daily-limit')
const weeklyLimit = document.querySelector('#weekly-limit')
const playbackRate = document.querySelector('#playback-rate')
const dailyLimitLabel = document.querySelector('#daily-limit-label')
const weeklyLimitLabel = document.querySelector('#weekly-limit-label')
const playbackRateLabel = document.querySelector('#playback-rate + label')

const hideable = [
    'related',
    'comments',
    'shorts',
    'playables',
    'watch-next',
    'next-shorts',
    'related-shorts',
]

// init
browser.storage.sync.get().then(res => {
    res = res ?? {}
    hideable.forEach(item => {
        setCheckbox(item, res)
    })
    setCheckbox('scroll-' + (res.scrolling ?? 'partial'), res)
    playbackRate.value = res?.playbackRate ?? 1
    // millisec to min
    dailyLimit.value = (res?.timeLimit?.daily ?? 0) / 1000 / 60
    weeklyLimit.value = (res?.timeLimit?.weekly ?? 0) / 1000 / 60
    // label text
    playbackRateLabel.innerText = playbackRate.value + 'x'
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

playbackRate.addEventListener('change', e => {
    playbackRateLabel.innerText = playbackRate.value + 'x'
    browser.storage.sync.set({ playbackRate: e.target.value })
})

document.querySelectorAll('input[type="checkbox"]').forEach(item => {
    item.addEventListener('change', e => {
        let val = {}
        val[e.target.id] = e.target.checked
        browser.storage.sync.set(val)
    })
})
document.querySelectorAll('input[name="scrolling"]').forEach(item => {
    item.addEventListener('change', e => {
        browser.storage.sync.set({ scrolling: e.target.value })
    })
})

// feature detection
if ('onvisibilitychange' in document) {
    document.querySelectorAll('.require-vis').forEach(item => {
        item.style.display = 'block'
    })
}
if (navigation && 'onnavigate' in navigation) {
    document.querySelectorAll('.require-nav').forEach(item => {
        item.style.display = 'block'
    })
}