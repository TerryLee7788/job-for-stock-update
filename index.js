const { GoogleSpreadsheet } = require('google-spreadsheet')

let SHEET_ID, creds
try {
    // 本機開發時使用 config.js
    const config = require('./config')
    SHEET_ID = config.SHEET_ID
    creds = config.creds
} catch (e) {
    // GitHub Actions 環境下使用環境變數
    SHEET_ID = process.env.GOOGLE_SHEET_ID
    creds = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        // 處理 Private Key 中的換行符號
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
    }
}

const {
    getStockCurrentPrice,
    getStockDividendValue,
    getStockCurrentPriceFromYahoo,
    getDividendValue
} = require('./Service')

const SLEEP = 5 * 1000
const SHEETCELLS = 500
const START_AT = 3

function formateStockText(text) {
    return text.replace(/[^0-9]+/, '')
}

// 更新股利政策
function updateDividendStockPrice({
    STOCK,
    DIVIDENDCELL
}) {

    return getDividendValue(STOCK)
        .then((res) => {

            const { dividend: value } = res
            DIVIDENDCELL.value = value

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

            getStockCurrentPriceFromYahoo(STOCK)
                .then((res) => {

                    const { price: value } = res
                    TARGETCELL.value = +value

                })
                .then(() => {

                    // 間隔 500 毫秒，再去更新股利
                    setTimeout(() => {

                        updateDividendStockPrice({
                            STOCK,
                            DIVIDENDCELL
                        })
                            .then(() => {

                                resolve()

                            })

                    }, 500);

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
