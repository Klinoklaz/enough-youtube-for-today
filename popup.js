function setCheckbox(id, values) {
    document.querySelector('#' + id).checked = values[id] ?? true
}

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