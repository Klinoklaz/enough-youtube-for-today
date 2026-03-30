function dayAndWeekStart() {
    const date = new Date
    const dayStart = date.setUTCHours(0, 0, 0, 0)
    const weekStart = date.setUTCDate(
        date.getUTCDate() - date.getUTCDay())
    return { dayStart, weekStart }
}

const timeStat = dayAndWeekStart()
timeStat.inTheDay = timeStat.inTheWeek = 0

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

browser.runtime.onMessage.addListener(message => {
    const timer = message?.timer
    if (!timer) {
        return
    }

    browser.storage.local.get().then(data => {
        if (data?.timeStat) {
            Object.assign(timeStat, data.timeStat)
        }
        updateTimeStat(timer.start, timer.end)
        browser.storage.local.set({ timeStat })
    })
})