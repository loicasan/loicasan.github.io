/*
	イベント追加時に更新するところ
		script.js-----LATEST_ANNIV、EVENT_IDS、FIRST_DATES
		index.html----#select-loop、冒頭の説明文
*/
const LATEST_ANNIV = 7;
const EVENT_IDS = [339, 290, 241, 192, 142, 92, 44];
const FIRST_DATES = [
    "2024-06-30T00:00:00+09:00",
    "2023-06-30T00:00:00+09:00",
    "2022-06-30T00:00:00+09:00",
    "2021-06-29T00:00:00+09:00",
    "2020-06-29T00:00:00+09:00",
    "2019-07-01T00:00:00+09:00",
    "2018-06-29T00:00:00+09:00"
];
const API_BASE_URL = "https://api.matsurihi.me/api/mltd/v2/events/";
const ETAG_CACHE_PREFIX = "etag_";
const DATA_CACHE_PREFIX = "data_";

async function fetchWithCache(url) {
    const etagCacheKey = ETAG_CACHE_PREFIX + url;
    const dataCacheKey = DATA_CACHE_PREFIX + url;
    const storedEtag = localStorage.getItem(etagCacheKey);

    const headers = {};
    if (storedEtag) {
        headers['If-None-Match'] = storedEtag;
    }

    try {
        const response = await fetch(url, { headers });

        if (response.status === 304) {
            console.log(`[Cache] Using cached data for ${url}`);
            const cachedData = localStorage.getItem(dataCacheKey);
            return JSON.parse(cachedData);
        }

        if (response.status === 200) {
            const newEtag = response.headers.get('ETag');
            const responseDataText = await response.text();

            if (newEtag) {
                localStorage.setItem(etagCacheKey, newEtag);
            }
            localStorage.setItem(dataCacheKey, responseDataText);
            console.log(`[Cache] Fetched and cached new data for ${url}`);
            return JSON.parse(responseDataText);
        }

        console.error(`[Fetch Error] Status ${response.status} for ${url}`);
        throw new Error(`Request failed with status ${response.status}`);

    } catch (error) {
        console.error(`[Fetch Error] Could not fetch ${url}:`, error);
        if (error instanceof TypeError && localStorage.getItem(dataCacheKey)) {
             console.warn(`[Cache] Network error, returning stale data for ${url}`);
             const cachedData = localStorage.getItem(dataCacheKey);
             return JSON.parse(cachedData);
        }
        throw error;
    }
}

function toYyyyMmDdString(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function generateTableHtml(apiId, index, idol, rank) {
    const apiUrl = `${API_BASE_URL}${apiId}/rankings/idolPoint/${idol}/logs/${rank}?prettyPrint=false`;
    let jsonData;

    try {
        jsonData = await fetchWithCache(apiUrl);
        if (jsonData === null || !jsonData[0] || !jsonData[0].data || jsonData[0].data.length === 0) {
            console.warn(`[Data Error] No data or empty data for event ID: ${apiId}`, jsonData);
            return `<p>イベントID:${apiId}のデータ取得に失敗しました。(API Error or No Data)</p>`;
        }
    } catch (error) {
        console.error(`[Generate Table Error] Failed to fetch data for event ID: ${apiId}`, error);
        return `<p>イベントID:${apiId}のデータ取得に失敗しました。(${error.message})</p>`;
    }

    const firstDateString = FIRST_DATES[index];
    if (!firstDateString) {
        return `<p>イベントID:${apiId}の初日の日付が設定されていません。</p>`;
    }

    const firstDate = new Date(firstDateString);
    const apiData = jsonData[0].data;

    const dailyDataForTable = [];
    for (let d = 1; d <= 13; d++) {
        const currentDisplayDate = new Date(firstDate);
        currentDisplayDate.setDate(firstDate.getDate() + d);
        const currentDisplayDateStr = toYyyyMmDdString(currentDisplayDate);

        let foundData = null;
        let usedTime = null;

        const time1Str = `${currentDisplayDateStr}T00:30:00+09:00`;
        const time2Str = `${currentDisplayDateStr}T01:00:00+09:00`;

        for (const item of apiData) {
            if (item.aggregatedAt.startsWith(time1Str)) {
                foundData = item;
                usedTime = '00:30';
                break;
            } else if (item.aggregatedAt.startsWith(time2Str) && foundData === null) {
                foundData = item;
                usedTime = '01:00';
            }
        }
        dailyDataForTable.push({
            date: currentDisplayDate,
            data: foundData,
            usedTime: usedTime
        });
    }

    const previousScores = {};
    const firstDateYyyyMmDd = toYyyyMmDdString(firstDate);
    const day1Time1Str = `${firstDateYyyyMmDd}T00:30:00+09:00`;
    const day1Time2Str = `${firstDateYyyyMmDd}T01:00:00+09:00`;

    for (const item of apiData) {
        if (item.aggregatedAt.startsWith(day1Time1Str)) {
            previousScores[firstDateYyyyMmDd] = item.score;
            break;
        } else if (item.aggregatedAt.startsWith(day1Time2Str) && !previousScores[firstDateYyyyMmDd]) {
            previousScores[firstDateYyyyMmDd] = item.score;
        }
    }
     if (!previousScores[firstDateYyyyMmDd]) {
        for (const item of apiData) {
            if (item.aggregatedAt.startsWith(firstDateYyyyMmDd)) {
                 previousScores[firstDateYyyyMmDd] = item.score;
                 console.warn(`Using fallback Day 1 score for ${firstDateYyyyMmDd} from time ${item.aggregatedAt.substring(11,16)}`);
                 break;
            }
        }
    }


    const htmlRows = [];
    for (const dayInfo of dailyDataForTable) {
        const displayDate = dayInfo.date;
        const dateStr = displayDate.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
        const timeClass = (dayInfo.usedTime === '01:00') ? 'text-danger' : '';
        const currentDisplayDateYyyyMmDd = toYyyyMmDdString(displayDate);

        let htmlRow;

        if (dayInfo.data) {
            const currentScore = dayInfo.data.score;
            const formattedScore = currentScore.toLocaleString();
            
            const previousDisplayDate = new Date(displayDate);
            previousDisplayDate.setDate(displayDate.getDate() - 1);
            const previousDisplayDateYyyyMmDd = toYyyyMmDdString(previousDisplayDate);
            
            let diffSpan = '<small class="d-block text-black-50 d-none data-diff">-</small>';
            if (previousScores[previousDisplayDateYyyyMmDd] !== undefined) {
                const diff = currentScore - previousScores[previousDisplayDateYyyyMmDd];
                const sign = diff >= 0 ? '+' : '';
                const formattedDiff = diff.toLocaleString();
                diffSpan = `<small class="d-block text-black-50 d-none data-diff">${sign}${formattedDiff}</small>`;
            }
            
            htmlRow = `<tr><td><div style="height:52px;"><span class="d-block">${formattedScore}</span><small class="d-block text-black-50 ${timeClass} data-date">${dateStr} ${dayInfo.usedTime}</small>${diffSpan}</div></td></tr>`;
            previousScores[currentDisplayDateYyyyMmDd] = currentScore;
        } else {
            htmlRow = `<tr><td><div style="height:52px;"><span class="d-block">-</span><small class="d-block text-black-50 data-date">${dateStr} 00:30</small><small class="d-none text-black-50 data-diff">-</small></div></td></tr>`;
        }
        htmlRows.push(htmlRow);
    }

    const anniv = LATEST_ANNIV - index;
    const tableHtml = `<table class="table table-striped text-nowrap align-middle w-auto" id="table-anniv${anniv}"><thead><tr><th>${anniv}周年</th></tr></thead><tbody>${htmlRows.join('')}</tbody></table>`;
    
    return tableHtml;
}

// displayData function (equivalent to PHP main)
async function displayData(idol, rank, loop) {
    const resultElement = document.getElementById("result");
    if (!resultElement) {
        console.error("Result element not found!");
        return;
    }

    resultElement.innerHTML = "NOW LOADING...";
    resultElement.classList.add("loading");

    let htmlOutput = [];

    // Initial "Day" column table HTML string
    const dayColumnHtml = `
        <table class="table table-striped text-nowrap align-middle w-auto">
            <thead>
                <tr><th>日時</th></tr>
            </thead>
            <tbody>
                <tr><td><div style="height:52px;">Day2<small class="d-block text-black-50">00:30</small></div></td></tr>
                <tr><td><div style="height:52px;">Day3<small class="d-block text-black-50">00:30</small></div></td></tr>
                <tr><td><div style="height:52px;">Day4<small class="d-block text-black-50">00:30</small></div></td></tr>
                <tr><td><div style="height:52px;">Day5<small class="d-block text-black-50">00:30</small></div></td></tr>
                <tr><td><div style="height:52px;">Day6<small class="d-block text-black-50">00:30</small></div></td></tr>
                <tr><td><div style="height:52px;">Day7<small class="d-block text-black-50">00:30</small></div></td></tr>
                <tr><td><div style="height:52px;">Day8<small class="d-block text-black-50">00:30</small></div></td></tr>
                <tr><td><div style="height:52px;">Day9<small class="d-block text-black-50">00:30</small></div></td></tr>
                <tr><td><div style="height:52px;">Day10<small class="d-block text-black-50">00:30</small></div></td></tr>
                <tr><td><div style="height:52px;">Day11<small class="d-block text-black-50">00:30</small></div></td></tr>
                <tr><td><div style="height:52px;">Day12<small class="d-block text-black-50">00:30</small></div></td></tr>
                <tr><td><div style="height:52px;">Day13<small class="d-block text-black-50">00:30</small></div></td></tr>
                <tr><td><div style="height:52px;">最終結果<small class="d-block text-black-50">-</small></div></td></tr>
            </tbody>
        </table>
    `;
    htmlOutput.push(dayColumnHtml);

    const maxLoop = parseInt(loop, 10);

    for (let i = 0; i < maxLoop; i++) {
        if (i >= EVENT_IDS.length) { // Ensure we don't go out of bounds for EVENT_IDS
            console.warn(`Loop index ${i} is out of bounds for EVENT_IDS.`);
            break;
        }
        const eventId = EVENT_IDS[i];
        const firstDate = FIRST_DATES[i]; // index i corresponds to the i-th most recent event

        if (!firstDate) {
            htmlOutput.push(`<p>イベントID${eventId}の開始日が設定されていません。</p>`);
            continue;
        }
        // Pass index `i` to generateTableHtml for FIRST_DATES access
        htmlOutput.push(await generateTableHtml(eventId, i, idol, rank));
    }

    resultElement.innerHTML = htmlOutput.join("");
    resultElement.classList.remove("loading");
}
