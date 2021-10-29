const axios = require('axios')
const cheerio = require("cheerio")
const Qs = require('qs')
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
    getDividendValue: async (stockNum) => {
        // 換 PCHOME
        const url = `https://pchome.megatime.com.tw/stock/sto3/ock1/sid${stockNum}.html`
        // const url = `https://tw.stock.yahoo.com/quote/${stockNum}/dividend`
        // const url = `https://tw.stock.yahoo.com/d/s/dividend_${stockNum}.html`
        return await axios.post(
            url,
            Qs.stringify({ is_check: 1 })
        )
            .then((res) => {
                const $ = cheerio.load(res.data)
                let currentYear = 0
                let lastYear = 0
                let previousYear = 0

                const RowSelectors = {
                    firstRow: '#bttb table tr:nth-child(5) .ct16:nth-child(8)',
                    secondRow: '#bttb table tr:nth-child(6) .ct16:nth-child(8)',
                    thirdRow: '#bttb table tr:nth-child(7) .ct16:nth-child(8)',
                    fourthRow: '#bttb table tr:nth-child(8) .ct16:nth-child(8)',
                }
                const {
                    firstRow,
                    secondRow,
                    thirdRow,
                    fourthRow,
                } = RowSelectors

               currentYear = +$(firstRow).text()
               lastYear = +$(secondRow).text()
               previousYear = +$(thirdRow).text()

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
            })
    }
}
