const getRangebetweenDates = require("./getdatelist");
const moment = require("moment");

const isDateSame = (sDate, eDate, index = 1) => {
  let isSame = false;
  if (index == 1) {
    if (moment(sDate).format("YYYY") == moment(eDate).format("YYYY")) {
      isSame = true;
    }
  } else if (index == 2) {
    if (moment(sDate).format("YYYY-MM") == moment(eDate).format("YYYY-MM")) {
      isSame = true;
    }
  }

  return isSame;
};

exports.dateGroup = (start_date, end_date, date) => {
  let dayDiff = 1;
  let isLeapYear = false;
  let isMonthSame = false;

  if (start_date && end_date) {
    let startDate = moment(start_date).format("YYYY-MM-DD");
    let endDate = moment(end_date).format("YYYY-MM-DD");

    dayDiff = getRangebetweenDates(startDate, endDate, "days");
    dayDiff = dayDiff?.length;

    isMonthSame = isDateSame(startDate, endDate, 2);
    isLeapYear = isDateSame(startDate, endDate, 1);
  }

  let group = {
    _id: { $hour: `$${date}` },
  };

  if ((dayDiff > 1 && dayDiff < 31) || (isMonthSame && dayDiff != 1)) {
    group._id = {
      $dateToString: { format: "%Y-%m-%d", date: `$${date}` },
    };
  } else if (dayDiff >= 31 && dayDiff <= 365) {
    group._id = { $month: `$${date}` };
  } else if (dayDiff > 365) {
    group._id = { $year: `$${date}` };
  }

  return group;
};
