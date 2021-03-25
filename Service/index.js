const axios = require('axios')
const cheerio = require("cheerio")
const utils = require('../utils')

module.exports = {
    getStockCurrentPrice: async (stockNum) => (
        await axios.get(`https://www.twse.com.tw/exchangeReport/STOCK_DAY_AVG?stockNo=${stockNum}`)
            .then((res) => (res.data))
    ),
    getStockDividendValue: async (stockNum) => (
        await axios.get(`https://www.twse.com.tw/exchangeReport/BWIBBU?stockNo=${stockNum}`)
            .then((res) => (res.data))
    ),
    getStockCurrentPriceFromYahoo: (stockNum) => (
        new Promise(async (resolve, reject) => {
            await axios.get(`https://tw.quote.finance.yahoo.net/quote/q?type=tick&sym=${stockNum}&callback=jsonpCallback`)
                .then((res) => {
                    const jsonpCallback = async (res) => {
                        const { tick } = res
                        const { p: price } = tick[tick.length - 1]

                        return resolve({ price })
                    }
                    eval(res.data)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    ),
    getDividendValueFromYahoo: async (stockNum) => {
        return await axios.get(`https://tw.stock.yahoo.com/d/s/dividend_${stockNum}.html`)
            .then((res) => {
                const $ = cheerio.load(res.data)
                const dividend = +$('tr[bgcolor="#FFF0C1"] + tr[bgcolor="#FFFFFF"] td:last-child').text()
                let currentYear = 0
                let lastYear = 0
                let previousYear = 0

                const currentYearNum = $('tr[bgcolor="#FFF0C1"] ~ tr[bgcolor="#FFFFFF"]:nth-of-type(2) td:first-child').text()
                const lastYearNum = $('tr[bgcolor="#FFF0C1"] ~ tr[bgcolor="#FFFFFF"]:nth-of-type(3) td:first-child').text()
                const lastTwoYearNum = $('tr[bgcolor="#FFF0C1"] ~ tr[bgcolor="#FFFFFF"]:nth-of-type(4) td:first-child').text()
                const YahooRowSelectors = {
                    firstRow: 'tr[bgcolor="#FFF0C1"] ~ tr[bgcolor="#FFFFFF"]:nth-of-type(2) td:last-child',
                    secondRow: 'tr[bgcolor="#FFF0C1"] ~ tr[bgcolor="#FFFFFF"]:nth-of-type(3) td:last-child',
                    thirdRow: 'tr[bgcolor="#FFF0C1"] ~ tr[bgcolor="#FFFFFF"]:nth-of-type(4) td:last-child',
                    fourthRow: 'tr[bgcolor="#FFF0C1"] ~ tr[bgcolor="#FFFFFF"]:nth-of-type(5) td:last-child'
                }
                const {
                    firstRow,
                    secondRow,
                    thirdRow,
                    fourthRow,
                } = YahooRowSelectors
                // 新的一年股利還沒全部配置好，但 yahoo 網頁已經先多一列是預備放新的一年的鼓勵，所以先加個判斷
                // eg: 當前表格前2列為: 108年、108年 (因: 當年股利尚未發布)
                // https://tw.stock.yahoo.com/d/s/dividend_2886.html
                if (currentYearNum === lastYearNum) {
                    currentYear = +$(secondRow).text()
                    lastYear = +$(thirdRow).text()
                    previousYear = +$(fourthRow).text()
                }
                // eg: 當前表格2，3列為: 108年、108年 (因: 當年股利已經發布)
                // https://tw.stock.yahoo.com/d/s/dividend_4205.html
                else if (lastYearNum === lastTwoYearNum) {
                    currentYear = +$(firstRow).text()
                    lastYear = +$(secondRow).text()
                    previousYear = +$(fourthRow).text()
                }
                // 正常版的版位
                else {
                    currentYear = +$(firstRow).text()
                    lastYear = +$(secondRow).text()
                    previousYear = +$(thirdRow).text()
                }

                const pastThreeYearsArray = [
                    currentYear,
                    lastYear,
                    previousYear
                ]
                const pastThreeYearsSum = pastThreeYearsArray.reduce((sum, num) => {
                    sum += num
                    return sum
                }, 0)

                const averageOfPastThreeYears = utils.strip(pastThreeYearsSum / pastThreeYearsArray.length)

                return { dividend: averageOfPastThreeYears };
                // return { dividend };
            })
    }
}
