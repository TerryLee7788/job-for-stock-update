const axios = require('axios')
const cheerio = require("cheerio")
const Qs = require('qs')
const utils = require('../utils')

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
}

// ── Yahoo Finance: crumb 快取 ──────────────────────────────────────────────
let _yahooCrumb = null
let _yahooCookie = null

async function getYahooCrumb() {
    if (_yahooCrumb && _yahooCookie) return { crumb: _yahooCrumb, cookie: _yahooCookie }

    const cookieRes = await axios.get('https://finance.yahoo.com', {
        headers: BROWSER_HEADERS,
        maxRedirects: 5,
    })
    const setCookie = cookieRes.headers['set-cookie']
    _yahooCookie = setCookie ? setCookie.map(c => c.split(';')[0]).join('; ') : ''

    const crumbRes = await axios.get('https://query2.finance.yahoo.com/v1/test/getcrumb', {
        headers: { ...BROWSER_HEADERS, Cookie: _yahooCookie },
    })
    _yahooCrumb = crumbRes.data
    if (!_yahooCrumb) throw new Error('crumb 取得失敗')

    return { crumb: _yahooCrumb, cookie: _yahooCookie }
}

async function getPriceFromYahoo(stockNum) {
    const { crumb, cookie } = await getYahooCrumb()
    const res = await axios.get(
        `https://query2.finance.yahoo.com/v8/finance/chart/${stockNum}.TW?crumb=${encodeURIComponent(crumb)}`,
        { headers: { ...BROWSER_HEADERS, Cookie: cookie } }
    )
    const [result] = res.data.chart.result
    if (!result) throw new Error('Yahoo API 回傳結果為空')
    const price = result.meta.regularMarketPrice
    if (!price) throw new Error('regularMarketPrice 為空')
    return price
}

// ── TWSE mis API fallback (支援上市 TSE + 上櫃 OTC) ───────────────────────
async function getPriceFromTWSE(stockNum) {
    const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${stockNum}.tw|otc_${stockNum}.tw&json=1&delay=0`
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const items = res.data.msgArray
    if (!items || items.length === 0) throw new Error('TWSE mis API 回傳無資料')

    // 同時查了 tse_ 和 otc_，找有效資料那筆（y = 昨收，有值代表股票存在）
    const item = items.find(i => i.y && i.y !== '-') || items[0]
    // z = 最新成交價（盤中），y = 昨收（收盤後 fallback）
    const rawPrice = item.z !== '-' ? item.z : item.y
    const price = parseFloat(rawPrice)
    if (isNaN(price) || price <= 0) throw new Error(`TWSE 價格無效: z=${item.z}, y=${item.y}`)
    return price
}

// ── 主要對外函式：Yahoo 優先，失敗自動 fallback TWSE ──────────────────────
async function getStockCurrentPriceFromYahoo(stockNum) {
    try {
        const price = await getPriceFromYahoo(stockNum)
        return { price }
    } catch (yahooErr) {
        console.log(`  ⚠ Yahoo 失敗 (${yahooErr.message})，改用 TWSE mis API...`)
        const price = await getPriceFromTWSE(stockNum)
        return { price }
    }
}

module.exports = {
    getStockCurrentPrice: async (stockNum) => (
        await axios.get(`https://www.twse.com.tw/exchangeReport/STOCK_DAY_AVG?stockNo=${stockNum}`)
            .then((res) => (res.data))
    ),
    getStockDividendValue: async (stockNum) => (
        await axios.get(`https://www.twse.com.tw/exchangeReport/BWIBBU?stockNo=${stockNum}`)
            .then((res) => (res.data))
    ),
    getStockCurrentPriceFromYahoo,
    getDividendValue: async (stockNum) => {
        const url = `https://pchome.megatime.com.tw/stock/sto3/ock1/sid${stockNum}.html`
        return await axios.post(
            url,
            Qs.stringify({ is_check: 1 })
        )
            .then((res) => {
                const $ = cheerio.load(res.data)

                const RowSelectors = {
                    firstRow: '#bttb table tr:nth-child(5) .ct16:nth-child(8)',
                    secondRow: '#bttb table tr:nth-child(6) .ct16:nth-child(8)',
                    thirdRow: '#bttb table tr:nth-child(7) .ct16:nth-child(8)',
                }

                const currentYear = +$(RowSelectors.firstRow).text()
                const lastYear = +$(RowSelectors.secondRow).text()
                const previousYear = +$(RowSelectors.thirdRow).text()

                const pastThreeYearsArray = [currentYear, lastYear, previousYear]
                const pastThreeYearsSum = pastThreeYearsArray.reduce((sum, num) => sum + num, 0)
                const averageOfPastThreeYears = utils.strip(pastThreeYearsSum / pastThreeYearsArray.length)

                return { dividend: averageOfPastThreeYears }
            })
    }
}
