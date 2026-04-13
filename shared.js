// 0 ~ 6 => SUN ~ SAT
const timeLimit = [
    [['00:00', '24:00']],
    [['00:00', '24:00']],
    [['00:00', '24:00']],
    [['00:00', '24:00']],
    [['00:00', '24:00']],
    [['00:00', '24:00']],
    [['00:00', '24:00']],
]

function setTimeLimit(value) {
    if (!value) {
        return
    }
    for (const i in timeLimit) {
        timeLimit[i] = value[i] ?? timeLimit[i]
    }
}

const scrollConfig = {
    default: 'short',
    special: {}, // for specific pages
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
const HAS_NAVIGATION = navigation && 'onnavigate' in navigation