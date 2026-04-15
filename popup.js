/// <reference path="shared.js" />

if (!HAS_NAVIGATION) {
    document.querySelectorAll('.require-nav')
        .forEach(item => { item.style.display = 'none' })
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

function timeLimitIndex(id) {
    const info = id.split('-')
    const i = +info[1]
    const j = +info[2]
    const k = info[0] === 's' ? 0 : 1
    return [i, j, k]
}

function findTimeLimit(id) {
    const [i, j, k] = timeLimitIndex(id)
    return timeLimit[i] && timeLimit[i][j] && timeLimit[i][j][k]
        ? timeLimit[i][j][k] : ''
}

function editTimeLimit(id, value) {
    const reg = /^(?:(?:[0-1][0-9]|2[0-3]):[0-5][0-9]|24:00)$/
    value = value?.trim() ?? ''
    if (value && !reg.test(value)) {
        return
    }
    const [ii, j, k] = timeLimitIndex(id)
    const all = Number.isNaN(ii) // -x-
    let i = all ? 6 : ii
    if (i > 6 || j > 2 || k > 1 || i < 0 || j < 0 || k < 0) {
        return
    }
    for (; i >= 0; i -= all ? 1 : 7) {
        timeLimit[i] = timeLimit[i] ?? []
        timeLimit[i][j] = timeLimit[i][j] ?? []
        timeLimit[i][j][k] = value
    }
    browser.storage.sync.set({ timeLimit })
}

// create time select forms
const timeGroupTmpl = document.querySelector('.time-picker-group')
const timeGroups = [timeGroupTmpl]
const week = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
for (const i in week) {
    const group = timeGroupTmpl.cloneNode(true)
    const label = group.querySelector('label')
    label.innerText = week[i]
    label.setAttribute('for', `s-${i}-0`)
    group.querySelectorAll('.time-picker-wrap').forEach(wrap => {
        wrap.id = wrap.id.replace('-x-', `-${i}-`)
    })
    timeGroups.push(group)
    document.querySelector('#usage').appendChild(group)
}

const timePickers = document.querySelectorAll('.time-picker-wrap')
const scrollScope = document.querySelector('#scroll-scope')
const playback = document.querySelector('#playback-rate')
const playbackLabel = document.querySelector('#playback-rate + label')

// init form values
browser.storage.sync.get().then(async (res) => {
    const url = await getURL()
    if (navigator.userAgent.includes('Mobi')
        || url?.hostname === MOBILE_DOMAIN) {
        Object.assign(hideableParts, hideablePartsMobile)
    } else {
        document.querySelectorAll('.mobile-only')
            .forEach(item => { item.style.display = 'none' })
    }

    res = res ?? {}
    for (const item in hideableParts) {
        setCheckbox(item, res)
    }
    if (typeof res.scrolling === 'object') {
        Object.assign(scrollConfig, res.scrolling)
    }
    // scrolling config of current page
    const path = url?.pathname
    let scroll = scrollConfig.special[path]
    scrollScope.value = path ? 'special' : 'default'
    scroll = path && scroll ? scroll : scrollConfig.default
    setCheckbox('scroll-' + scroll, {})

    playback.value = res.playbackRate ?? 1
    playbackLabel.innerText = playback.value + 'x'

    setTimeLimit(res.timeLimit)
    for (const item of timePickers) {
        item.querySelector('input').value = findTimeLimit(item.id)
    }
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

const timeInputs = new Map

// edit 'ALL'
function setTimeInputs(pattern, value) {
    if (!pattern?.includes('-x-')) {
        return
    }
    const reg = new RegExp(pattern.replace('-x-', '-\\d-'))
    for (const [key, input] of timeInputs) {
        if (reg.test(key)) {
            input.value = value
        }
    }
}

// create time select panels
timePickers.forEach(wrapper => {
    const minutePicker = document.createElement('ul')
    const hourPicker = document.createElement('ul')
    hourPicker.tabIndex = -1
    minutePicker.tabIndex = -1

    const picker = document.createElement('div')
    picker.classList.add('time-picker', 'hide', 'toggle2')
    picker.appendChild(hourPicker)
    picker.appendChild(minutePicker)
    // prevent input from losing focus
    picker.addEventListener('mousedown', e => {
        e.preventDefault()
    })
    wrapper.appendChild(picker)

    const input = wrapper.querySelector('input')
    input.addEventListener('blur', () => {
        picker.classList.add('hide')
    })
    input.addEventListener('focus', () => {
        picker.classList.remove('hide')
    })
    // won't work for js assignment
    input.addEventListener('change', () => {
        setTimeInputs(wrapper.id, input.value)
        editTimeLimit(wrapper.id, input.value)
    })
    timeInputs.set(wrapper.id, input)

    // clear input
    const clear = wrapper.querySelector('.clear-button')
    clear.addEventListener('click', () => {
        input.value = ''
        setTimeInputs(wrapper.id, '')
        editTimeLimit(wrapper.id, '')
    })

    const nonZeroMin = []
    for (let m = 0; m < 60; m++) {
        const minute = document.createElement('li')
        minutePicker.appendChild(minute)
        if (m > 0) {
            nonZeroMin.push(minute)
        }
        minute.innerText = m.toString().padStart(2, '0')
        // pick a minute
        minute.addEventListener('click', () => {
            const prefix = input.value
                ? input.value.slice(0, 3) : '00:'
            input.value = prefix + minute.innerText
            setTimeInputs(wrapper.id, input.value)
            editTimeLimit(wrapper.id, input.value)
        })
    }

    for (let h = 0; h < 25; h++) {
        const hour = document.createElement('li')
        hourPicker.appendChild(hour)
        hour.innerText = h.toString().padStart(2, '0')
        // pick an hour
        hour.addEventListener('click', () => {
            const suffix = input.value && h !== 24
                ? input.value.slice(2) : ':00'
            input.value = hour.innerText + suffix
            setTimeInputs(wrapper.id, input.value)
            editTimeLimit(wrapper.id, input.value)
        })
        // 24 can only have 24:00
        hour.addEventListener('mouseenter', () => {
            nonZeroMin.forEach(li => {
                li.style.display = h === 24 ? 'none' : ''
            })
        })
    }
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

// goto main menu
document.querySelectorAll('p.title').forEach(p => {
    p.addEventListener('click', e => {
        e.target.closest('p').parentElement.classList.add('hide')
        document.querySelector('#main-menu').classList.remove('hide')
    })
})
// click menu
document.querySelectorAll('#main-menu p').forEach(p => {
    p.addEventListener('click', async (e) => {
        const targetId = e.target.closest('p').id.slice(5)
        if (targetId === 'scroll') {
            const specOption = document.querySelector('#current-path')
            specOption.innerText = (await getURL())?.pathname ?? 'N/A'
        }
        document.querySelector('#main-menu').classList.add('hide')
        document.querySelector('#' + targetId).classList.remove('hide')
    })
})

// toggle time picker group
document.querySelectorAll('.time-picker-expand').forEach(item => {
    item.addEventListener('click', e => {
        const expandable = e.target.closest('.time-picker-group')
            .querySelectorAll('.expandable')
        if (e.target.classList.contains('expanded')) {
            e.target.classList.remove('expanded')
            e.target.style.rotate = ''
            expandable.forEach(div => { div.classList.add('hide') })
        } else {
            e.target.classList.add('expanded')
            e.target.style.rotate = '-180deg'
            expandable.forEach(div => { div.classList.remove('hide') })
        }
        // text reflow cope
        let zIndex = timeGroups.length
        let offset = 0
        timeGroups.forEach(item => {
            item.style.transform = offset
                ? `translateY(calc(${offset} * var(--input-height)))`
                : ''
            const toggler = item.querySelector('.time-picker-expand')
            if (toggler?.classList.contains('expanded')) {
                offset += 2
            }
            // transform causes z-index context change
            // set this to avoid stacking issue of select panels
            item.style.zIndex = zIndex--
        })
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