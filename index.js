const { GoogleSpreadsheet } = require('google-spreadsheet')
const { SHEET_ID, creds } = require('./config')

const {
    getStockCurrentPrice,
    getStockDividendValue
} = require('./Service')

const SLEEP = 4 * 1000
const SHEETCELLS = 110

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
            if (data) {

                const currentStockDividendRate = +(data[data.length - 1][1]) / 100
                const currentStockDividend = +((currentPrice * currentStockDividendRate).toFixed(2))

                DIVIDENDCELL.value = +currentStockDividend

            }
            else {

                // API 抓不到資料，標記一下手動更新
                // 備案: 用爬蟲
                DIVIDENDCELL.value = 0

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

                    // 抓到資料
                    if (data) {

                        const currentPrice = data[data.length - 2][1]

                        TARGETCELL.value = +currentPrice

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

                    }
                    else {

                        // API 抓不到資料，標記一下手動更新
                        // 備案: 用爬蟲
                        TARGETCELL.value = 0
                        resolve()

                    }

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

        for (let i = 3; i < SHEETCELLS; i++) {
            // for (let i = 3; i < 8; i++) {   // 測試用

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
