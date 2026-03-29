function setCheckbox(id, values) {
    document.querySelector('#' + id).checked = values[id] ?? true
}

const dailyLimit = document.querySelector('#daily-limit')
const weeklyLimit = document.querySelector('#weekly-limit')

// init
browser.storage.sync.get().then(res => {
    res = res ?? {}
    setCheckbox('related', res)
    setCheckbox('comments', res)
    setCheckbox('shorts', res)
    setCheckbox('watch-next', res)
    setCheckbox('next-shorts', res)
    setCheckbox('related-shorts', res)
    setCheckbox('scroll-' + (res.scrolling ?? 'partial'), res)
    // millisec to min
    dailyLimit.value = (res?.timeLimit?.daily ?? 0) / 1000 / 60
    weeklyLimit.value = (res?.timeLimit?.weekly ?? 0) / 1000 / 60
    // label text
    dailyLimit.nextElementSibling.
        firstElementChild.innerText = formatTime(dailyLimit.value)
    weeklyLimit.nextElementSibling.
        firstElementChild.innerText = formatTime(weeklyLimit.value)
})

function formatTime(minutes) {
    minutes = Math.floor(minutes)
    if (!minutes) {
        return ''
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
    // label text
    dailyLimit.nextElementSibling.
        firstElementChild.innerText = formatTime(e.target.value)
})
weeklyLimit.addEventListener('change', e => {
    browser.storage.sync.set({
        timeLimit: {
            daily: dailyLimit.value * 1000 * 60,
            weekly: e.target.value * 1000 * 60
        }
    })
    weeklyLimit.nextElementSibling.
        firstElementChild.innerText = formatTime(e.target.value)
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

// path whitelisting requires feature 'navigate event'
if (navigation && 'onnavigate' in navigation) {
    document.querySelector('#note-scroll').style.display = 'block'
}