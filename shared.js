function dayAndWeekStart() {
    const date = new Date
    const dayStart = date.setHours(0, 0, 0, 0)
    const weekStart = date.setDate(
        date.getDate() - date.getDay())
    return { dayStart, weekStart }
}

// page stay time, millisec
const timeStat = {
    inTheDay: 0,
    inTheWeek: 0,
    init: false
}
Object.assign(timeStat, dayAndWeekStart())

function updateTimeStat(start, end) {
    const info = dayAndWeekStart()

    // if crossed date or week
    if (timeStat.dayStart < info.dayStart) {
        timeStat.inTheDay = 0
    }
    if (timeStat.weekStart < info.weekStart) {
        timeStat.inTheWeek = 0
    }

    Object.assign(timeStat, info)
    const duration = end - start
    timeStat.inTheDay += start < info.dayStart
        ? end - info.dayStart
        : duration
    timeStat.inTheWeek += start < info.weekStart
        ? end - info.weekStart
        : duration
}

const hideableParts = {
    // recommendation after video end
    watchNext: '#movie_player div[title="More videos (v)"]',
    // disable scrolling in shorts
    nextShorts: '#shorts-inner-container > div:not([id="0"])',
    // shorts in related videos
    relatedShorts: '#related yt-horizontal-list-renderer',
    // related videos
    related: '#related',
    // comment section
    comments: 'ytd-comments#comments',
    // shorts in homepage and sidebar
    shorts: 'ytd-rich-shelf-renderer[is-shorts], #guide a[title="Shorts"]',
    // game recommendation on homepage
    playables: 'ytd-rich-shelf-renderer:has(a[title="YouTube Playables"])',
}

// feature detection
const HAS_VIS_CHANGE = 'onvisibilitychange' in document
const HAS_NAVIGATION = navigation && 'onnavigate' in navigation