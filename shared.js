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

const hideablePartsMobile = {
    watchNext: '#movie_player div[title="More videos (v)"]',
    // this doesn't disble scrolling to next
    nextShorts: '.ytShortsCarouselCarouselItem:not([id="carousel-item-0"])',
    relatedShorts: 'ytm-reel-shelf-renderer:has(ytm-shorts-lockup-view-model)',
    related: 'ytm-item-section-renderer:has(#related-chips-sentinel)',
    comments: `ytm-item-section-renderer:has(
        yt-carousel-item-view-model[aria-label="Comments"])`,
    shorts: 'ytm-rich-section-renderer:has(ytm-shorts-lockup-view-model)',
    playables: 'ytm-rich-section-renderer:has(mini-game-card-view-model)',
    // next/prev button on the player
    switchVideo: 'button.player-middle-controls-prev-next-button',
}

const MOBILE_DOMAIN = 'm.youtube.com'
const HAS_NAVIGATION = navigation && 'onnavigate' in navigation // feature detection