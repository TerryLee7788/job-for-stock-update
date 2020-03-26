const axios = require('axios')

module.exports = {
    getStockCurrentPrice: async (stockNum) => (
        await axios.get(`https://www.twse.com.tw/exchangeReport/STOCK_DAY_AVG?stockNo=${stockNum}`)
            .then((res) => (res.data))
    ),
    getStockDividendValue: async (stockNum) => (
        await axios.get(`https://www.twse.com.tw/exchangeReport/BWIBBU?stockNo=${stockNum}`)
            .then((res) => (res.data))
    )
}
