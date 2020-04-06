const { GoogleSpreadsheet } = require('google-spreadsheet')
const { SHEET_ID, creds } = require('./config')

const {
    getStockCurrentPrice,
    getStockDividendValue,
    getStockCurrentPriceFromYahoo,
    getDividendValueFromYahoo
} = require('./Service')

const SLEEP = 4 * 1000
const SHEETCELLS = 110
const START_AT = 3

function formateStockText(text) {
    return text.replace(/[^0-9]+/, '')
}

// 更新股利政策
function updateDividendStockPrice({
    STOCK,
    DIVIDENDCELL,
    currentPrice
}) {

    return getStockDividendValue(STOCK)
        .then((res) => {

            const { data } = res

            // 抓到資料
            if (data) {

                const currentStockDividendRate = +(data[data.length - 1][1]) / 100
                const currentStockDividend = +((currentPrice * currentStockDividendRate).toFixed(2))

                DIVIDENDCELL.value = +currentStockDividend

            }
            // 證交所 API 抓不到，改去 yahoo
            else {

                getDividendValueFromYahoo(STOCK)
                    .then((res) => {

                        const { dividend: value } = res
                        DIVIDENDCELL.value = value

                    })

            }

        })

}

// 更新股價
function updateCurrentStockPrice({
    STOCK,
    TARGETCELL,
    DIVIDENDCELL
}) {

    return new Promise((resolve) => {

        setTimeout(() => {
            console.log('STOCK: ', STOCK);

            getStockCurrentPrice(STOCK)
                .then((res) => {

                    const { data } = res
                    let currentPrice = 0

                    // 抓到資料
                    if (data) {

                        currentPrice = data[data.length - 2][1]

                        TARGETCELL.value = +currentPrice


                    }
                    // 證交所 API 抓不到，改去 yahoo
                    else {

                        getStockCurrentPriceFromYahoo(STOCK)
                            .then((res) => {

                                const { price: value } = res
                                TARGETCELL.value = +value

                            })

                    }

                    // 間隔1秒，再去更新股利
                    setTimeout(() => {

                        updateDividendStockPrice({
                            STOCK,
                            DIVIDENDCELL,
                            currentPrice
                        })
                            .then(() => {

                                resolve()

                            })

                    }, 1000);

                })

        }, SLEEP);

    })

}

async function accessSpreadSheet() {

    try {

        const doc = new GoogleSpreadsheet(SHEET_ID)

        await doc.useServiceAccountAuth(creds)
        await doc.loadInfo()

        const sheet = doc.sheetsByIndex[0]
        // load 範圍
        await sheet.loadCells(`A1:E${SHEETCELLS}`);

        for (let i = START_AT; i < SHEETCELLS; i++) {

            // "股票" 那欄
            const a1 = sheet.getCell(i, 0);
            // "目前股價" 那欄
            const d3 = sheet.getCell(i, 3);
            // "股利政策" 那欄
            const b1 = sheet.getCell(i, 1);

            // 如果空格有填東西
            if (a1._rawData.effectiveValue) {

                const STOCK = formateStockText(a1._rawData.effectiveValue.stringValue)

                if (STOCK) {

                    await updateCurrentStockPrice({
                        STOCK,
                        TARGETCELL: d3,
                        DIVIDENDCELL: b1
                    })
                    // sheet 更新
                    await sheet.saveUpdatedCells()

                }

            }

        }

    }
    catch (error) {

        console.log('error: ', error);

    }

}

accessSpreadSheet()
