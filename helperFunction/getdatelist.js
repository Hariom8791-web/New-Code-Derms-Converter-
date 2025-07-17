const moment = require("moment");

function getRangebetweenDates(startDate, endDate, type) {
    let fromDate = moment(startDate)
    let toDate = moment(endDate)
    let diff = toDate.diff(fromDate, type)
    let range = []
    for (let i = 0; i <= diff; i++) {
      range.push(moment(startDate).add(i, type).format("YYYY-MM-DD"))
    }
    return range
  }


  module.exports = getRangebetweenDates;