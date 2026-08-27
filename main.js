// will run in main world (the actual ytb webpage)
// playback speed control
(() => {
    const thisElm = document.currentScript

    const keywords = {
        metaTag: 'meta[itemprop="genre"]',
        mvMetaText: /music/i,
        mvLikeButton: 'animated_like_music',
        thumbnail: thisElm.dataset.isMobile
            ? ':is(ytm-thumbnail-cover, ytm-compact-thumbnail)'
            : 'yt-thumbnail-view-model',
        get mvThumbnail() {
            return `a:has(${this.thumbnail} .ytSpecIconShapeHost)`
        }
    }

    const mvDB = new Set

    function getVid(href) {
        if (href instanceof URLSearchParams) {
            return href.get('v')
        }
        const m = String(href).match(/[?&]v=([0-9a-zA-Z_-]+)/)
        return m && m[1] ? m[1] : null
    }

    class Poller {
        constructor(callback, interval, count) {
            this.count = this.counter = count ?? 10
            this.interval = interval ?? 1000
            this.id = null
            this.callback = callback
        }

        exec() {
            if (this.counter-- < 0) {
                this.stop()
            } else {
                this.callback()
            }
        }

        stop() {
            clearInterval(this.id)
            this.id = null
        }

        start(count) {
            this.stop()
            this.counter = count ?? this.count
            this.id = setInterval(() => this.exec(), this.interval)
        }
    }

    // - initial page load
    const mvPoller = new Poller(() => {
        document.querySelectorAll(keywords.mvThumbnail).forEach(item => {
            mvDB.add(getVid(item.getAttribute('href')))
        })
        /* alternative mv detection:
        ytInitialData.contents
            .twoColumnBrowseResultsRenderer
            .tabs[*].tabRenderer.content
            ..lockupViewModel
            .contentImage
            .thumbnailViewModel
            .overlays[*]
            .thumbnailBottomOverlayViewModel
            .badges[*]
            .thumbnailBadgeViewModel
            .icon
            .sources[*]
            .clientResource.imageName === 'MUSIC'
        */
    }, 3000, 5)
    window.addEventListener('load', () => mvPoller.start())
    // test if current page is mv
    const metaTag = document.querySelector(keywords.metaTag)
    const query = new URLSearchParams(location.search)
    if (query.has('v') && (
        keywords.mvMetaText.test(metaTag?.content) ||
        document.body.textContent.includes(keywords.mvLikeButton)
    )) {
        mvDB.add(query.get('v'))
    }

    function setPlaybackRate(video) {
        if (!(video instanceof HTMLVideoElement)) {
            return
        }
        const query = new URLSearchParams(location.search)
        // give up if in playlist
        if (query.has('list')) {
            return
        }
        const vid = getVid(query)
        video.playbackRate = vid && mvDB.has(vid)
            ? video.playbackRate
            : Number(thisElm.dataset.playbackRate ?? 1)
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

    // - observe paginating / lazy loading
    function getScrollHandler() {
        let maxScrollY = 0
        const reset = function () {
            maxScrollY = 0
        }
        const handler = function () {
            if (window.scrollY < maxScrollY) {
                return
            }
            // scroll pass half screen, assume new content is rendered
            if (window.scrollY - maxScrollY >= window.innerHeight / 2) {
                mvPoller.start(3)
            }
            // remember longest scroll
            maxScrollY = window.scrollY
        }
        return {handler, reset}
    }
    const {
        handler: handleScroll, reset: resetScroll
    } = getScrollHandler()
    document.addEventListener('scrollend', handleScroll)

    // - watch dataset change
    const selfObserver = new MutationObserver(muList => {
        for (const mutation of muList) {
            if (mutation.type !== 'attributes') {
                continue
            }
            const name = mutation.attributeName
            if (name === 'data-navigation') {
                resetScroll()
                mvPoller.start(5)
            } else if (name === 'data-playback-rate') {
                setPlaybackRate(document.querySelector('video'))
            }
        }
    })
    selfObserver.observe(thisElm, {attributes: true})
})()