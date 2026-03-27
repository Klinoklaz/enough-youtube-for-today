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
            selector = 'ytd-comments'
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

const hideable = [
    'related',
    'comments',
    'shorts',
    'watch-next',
    'next-shorts',
    'related-shorts',
]

browser.storage.sync.get().then(data => {
    for (const name of hideable) {
        if (!data || (data[name] ?? true)) {
            hide(name)
        } else {
            removeStyle(name)
        }
    }

    scrollCtl = data.scrolling ?? scrollCtl
    if (!allowScrolling()) {
        setScrolling(scrollCtl)
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

    scrollCtl = changes?.scrolling?.newValue ?? scrollCtl
    if (!allowScrolling() && 'scrolling' in changes) {
        setScrolling(scrollCtl)
    }
})