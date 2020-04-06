const axios = require('axios')
const cheerio = require("cheerio")

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
                return { dividend };
            })
    }
}
