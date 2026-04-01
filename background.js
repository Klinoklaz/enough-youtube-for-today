/// <reference path="shared.js" />

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