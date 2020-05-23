// ==UserScript==
// @name         在线视频外挂字幕
// @namespace    https://truework.top
// @version      0.42
// @description  目前支持B站，爱奇艺，优酷和西瓜视频（腾讯视频的有bug暂不支持，西瓜视频全屏暂无字幕），按Q键+100ms，按W键-100ms，按E键显示/隐藏字幕，console可作为transcript使用
// @author       cyj98
// @match        https://www.bilibili.com/bangumi/*
// @match        https://www.iqiyi.com/*
// @match        https://www.ixigua.com/cinema/album/*
// @match        https://v.youku.com/*
// @require https://greasyfork.org/scripts/373379-subtitle-utils-module/code/subtitle%20utils%20module.js?version=637875
// ==/UserScript==

(function () {
    'use strict';
    let fileInput = document.createElement("input")
    fileInput.type = 'file'
    document.body.prepend(fileInput)
    let newFile = false
    let firstFile = false

    let isShowSubtitle = true
    let delayTime = 0
    const hostname = window.location.hostname
    let subtitleElem, snackbarElem, curTimeElem, subtitlePosElem

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        if (firstFile === true) {
            newFile = true
            subtitleElem.remove()
            snackbarElem.remove()
        } else {
            const subtitlePosObj = { 'www.bilibili.com': 'subtitle-position', 'www.iqiyi.com': 'iqp-subtitle', 'www.ixigua.com': 'teleplay__playerContainer', 'v.youku.com': 'subtitle-container' }
            const curTimeObj = { 'www.bilibili.com': 'bilibili-player-video-time-now', 'www.iqiyi.com': 'iqp-time-cur', 'www.ixigua.com': 'xgplayer-time', 'v.youku.com': 'control-time-current' }
            subtitlePosElem = document.getElementsByClassName(subtitlePosObj[hostname])[0]
            curTimeElem = document.getElementsByClassName(curTimeObj[hostname])[0]

            let isShowDelay = false
            const logKey = (e) => {
                const key = e.key.toUpperCase()
                if (key === 'Q' || key === 'W') {
                    if (key === 'Q') delayTime += 100
                    if (key === 'W') delayTime -= 100

                    snackbarElem.innerHTML = 'delaytime: ' + delayTime
                    if (isShowDelay) {
                        return
                    }
                    snackbarElem.style.visibility = 'visible'
                    isShowDelay = true
                    setTimeout(() => {
                        snackbarElem.style.visibility = 'hidden'
                        isShowDelay = false
                    }, 2000);
                } else if (key === 'E') {
                    isShowSubtitle = !isShowSubtitle
                    if (!isShowSubtitle) {
                        subtitleElem.style.visibility = 'hidden'
                        console.log("hide subtitle")
                    } else {
                        subtitleElem.style.visibility = 'visible'
                        console.log("show subtitle")
                    }
                }
            };
            document.addEventListener('keypress', logKey);
        }
        firstFile = true
        subtitleElem = document.createElement('div')
        subtitleElem.id = 'custom-subtitle'
        subtitleElem.style.cssText = 'text-align:center;  font-size: 32px; font-weight: bold;  text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black;'
        snackbarElem = document.createElement('div')
        snackbarElem.id = 'snackbar'
        snackbarElem.style.cssText = 'font-size: 16px; position: absolute; text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black;'
        subtitlePosElem.prepend(subtitleElem)
        subtitlePosElem.prepend(snackbarElem)
        if (hostname === 'www.ixigua.com') {
            snackbarElem.style.cssText += "position: absolute; z-index: 1; color: white; bottom: 56px;"
            subtitleElem.style.cssText += "position: absolute; z-index: 1; color: white; bottom: 0; left: 50%; -webkit-transform: translateX(-50%); transform: translateX(-50%);"
        } else if (hostname === 'www.iqiyi.com') {
            subtitlePosElem.style.cssText += "display: block; height: 50px;"
        }

        const reader = new FileReader();
        reader.readAsText(file)
        reader.onload = (e) => {
            let subtitles
            try {
                subtitles = window.Subtitle.parse(e.target.result)
            } catch (e) {
                alert("字幕解析出现问题");
            }

            let prevPos = -2
            const binarySearch = (target, arr) => {
                let start = 0;
                let end = arr.length - 1;
                while (start <= end) {
                    const mid = parseInt(start + (end - start) / 2);
                    if (target >= arr[mid].start && target <= arr[mid].end) {
                        return mid;
                    } else if (target > arr[mid].end) {
                        start = mid + 1;
                    } else {
                        end = mid - 1;
                    }
                }
                return -1;
            }
            const callback = (_, observer) => {
                if (newFile === true) {
                    newFile = false
                    subtitleElem.innerHTML = ''
                    observer.disconnect()
                    return
                }
                let strTime
                if (hostname === 'www.ixigua.com') {
                    strTime = curTimeElem.firstElementChild.firstElementChild.innerHTML;
                } else {
                    strTime = curTimeElem.innerHTML
                }
                if (strTime.length <= 5) {
                    strTime = "00:" + strTime + ",000"
                } else {
                    strTime = strTime + ",000"
                }
                const time = window.Subtitle.toMS(strTime);

                const pos = binarySearch(time + delayTime, subtitles)
                if (pos === -1) {
                    prevPos = -2
                    subtitleElem.style.visibility = 'hidden'
                    return;
                }
                if (pos === prevPos) {
                    prevPos = pos
                    return
                }
                console.log(subtitles[pos].text);
                if (isShowSubtitle) {
                    subtitleElem.style.visibility = 'visible'
                }
                subtitleElem.innerHTML = subtitles[pos].text
                window.subtitleCount += 1
                prevPos = pos
            };

            const observer = new MutationObserver(callback);
            const config = {
                attributes: true,
                childList: true,
                subtree: true
            };
            observer.observe(curTimeElem, config);
        }
    }
})();