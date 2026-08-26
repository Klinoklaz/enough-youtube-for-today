// will run in main world (the actual ytb webpage)
(() => {
    // playback speed control:
    // - detect mv using like button config and meta tag at first page load
    // - detect mv using mutation observer after navigation
    // - give up if in playlist (implemented in content.js)

    // extract params passed by content.js
    const thisElm = document.currentScript
    const isInit = Boolean(thisElm.dataset.isInit)
    const isMobile = Boolean(thisElm.dataset.isMobile)
    const customRate = Number(thisElm.dataset.playbackRate ?? 1)

    const keywords = {
        metaTag: 'meta[itemprop="genre"]',
        mvMetaText: /music/i,
        mvLikeButton: 'animated_like_music',
        thumbnail: isMobile
            ? 'yt-thumbnail-view-model'
            : ':is(ytm-thumbnail-cover, ytm-compact-thumbnail)',
        get mvThumbnail() {
            return `a:has(${this.thumbnail} .ytSpecIconShapeHost)`
        }
    }

    const mvDB = new Set

    function getVid(href) {
        const m = String(href).match(/[?&]v=([0-9a-zA-Z_-]+)/)
        return m && m[1] ? m[1] : null
    }

    function searchMv(elm) {
        if (!(elm instanceof Element)) {
            return
        }
        elm.querySelectorAll(keywords.mvThumbnail).forEach(item => {
            mvDB.add(getVid(item.getAttribute('href')))
        })
    }

    function handleDomLoad() {
        searchMv(document)
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleDomLoad)
    } else {
        handleDomLoad()
    }
    // - first page load, test if current page is mv
    // this is different from dom loaded event
    // bc the script can be injected at any time
    const metaTag = document.querySelector(keywords.metaTag)
    const params = new URLSearchParams(location.search)
    if (isInit && params.has('v') && (
        keywords.mvMetaText.test(metaTag?.content) ||
        document.body.textContent.includes(keywords.mvLikeButton)
    )) {
        mvDB.add(params.get('v'))
    }

    function setPlaybackRate(video) {
        if (!(video instanceof HTMLVideoElement)) {
            return
        }
        const vid = getVid(location.search)
        video.playbackRate = vid && mvDB.has(vid)
            ? video.playbackRate : customRate
    }

    // - alter playback speed globally
    const realPlay = HTMLVideoElement.prototype.play
    HTMLVideoElement.prototype.play = function () {
        setPlaybackRate(this)
        return realPlay.call(this)
    }
    setPlaybackRate(document.querySelector('video'))

    // - give back control to user
    function handleManualControl(e) {
        if (e instanceof KeyboardEvent && e.key !== 'Escape') {
            return
        }
        const vid = getVid(location.search)
        if (!vid) {
            return
        }
        mvDB.add(vid)
        document.querySelector('video').playbackRate = 1
    }
    document.addEventListener('keydown', handleManualControl)

    // - observe navigation / lazy loading
    const observer = new MutationObserver((muList) => {
        for (const mutation of muList) {
            if (mutation.type !== 'childList') {
                continue
            }
            mutation.addedNodes.forEach(node => {
                if (!(node instanceof Element)) {
                    return
                }
                if (node.matches(keywords.mvThumbnail)) {
                    mvDB.add(getVid(node.getAttribute('href')))
                } else {
                    searchMv(node) // search subtree
                }
            })
        }
    })
    observer.observe(
        document.documentElement, {childList: true, subtree: true})

    // - register clean up action to ensure idempotency
    const selfObserver = new MutationObserver((muList) => {
        for (const mutation of muList) {
            if (!mutation.removedNodes.length) {
                continue
            }
            mutation.removedNodes.forEach(node => {
                if (node !== thisElm) {
                    return
                }
                selfObserver.disconnect()
                observer.disconnect()
                HTMLVideoElement.prototype.play = realPlay
                document.removeEventListener('keydown', handleManualControl)
                document.removeEventListener('DOMContentLoaded', handleDomLoad)
            })
        }
    })
    selfObserver.observe(thisElm.parentNode, {childList: true})
})()