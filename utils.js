module.exports = {
    strip (number, precision = 2) {

        return parseFloat((+number).toFixed(precision));

    },
}
