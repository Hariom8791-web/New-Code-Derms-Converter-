const express = require("express");
const mongoose = require("mongoose");
var cors = require("cors");
const DeviceMsg = require("./models/deviceMsg");
const Device = require("./models/device");
const util = require("util");
const { series } = require("async");
const exec = util.promisify(require("child_process").exec);
const { spawn } = require("child_process");
const moment = require("moment");
const getRangebetweenDates = require("./helperFunction/getdatelist");
var ObjectId = require("mongodb").ObjectId;
const morgan = require("morgan");

const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 5009;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors("*"));
app.use(morgan("dev"));
// app.use('/public', express.static('public'));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/site", require("./routes/siteRoutes"));
app.use("/api/device", require("./routes/deviceRoutes"));
app.use("/api/alarm", require("./routes/alarmRoutes"));

mongoose.set("strictQuery", false);
mongoose
  .connect("mongodb://127.0.0.1:27017/gnVoltage", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Mongo DB successfully Connected");
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`  === SERVER CONNECTED SUCCESSFULLY AT ${PORT} === `);
    });
  })
  .then(() => {
    //  frontendStart()
  })
  .catch((err) => {
    console.log(err);
  });

async function frontendStart() {
  let masterTimer = setTimeout(async () => {
    if (true) {
      console.log("//============== Frontend Has Been Started ============//");
      let timer2 = setTimeout(async () => {
        // exec("chromium-browser --app=http://www.localhost:3000/ --kiosk",(err,stdout , stderr)=>{
        //let { stdout } = exec("firefox http://localhost:3000 --kiosk");
       // if (stdout) {
          console.log("//========= fireFox has been started =========//");
          let timer3 = setTimeout(() => {
            let { stdout } = exec(
              "xdotool search --sync --onlyvisible --name firefox key F11"
            );
            if (stdout) {
              console.log("//========= F11 Command has been executed ====//");
            }
            clearTimeout(timer3);
          }, 6000);
        //}
        clearTimeout(timer2);
        clearTimeout(masterTimer);
      }, 5000);
    }
  }, 5000);
}

// ================================ Test ================================== //

// ======================================================================== //

// "638ca2205a1fc41d62e8b197"  //"RES"

// console.log(genRand(0, 5, 2));

function genRand(min, max, decimalPlaces) {
  return (Math.random() * (max - min) + min).toFixed(decimalPlaces) * 1;
}

async function feedData(NodeID, deviceNumber, param) {
  console.log("creating One Year Data");

  let deviceId = await Device.findOne({ nodeUid: NodeID });
  let startDate = moment().subtract(1, "year").format("YYYY-MM-DD");
  // let startDate = moment().subtract(2, "days").format("YYYY-MM-DD");
  let endDate = moment().format("YYYY-MM-DD");
  // console.log("date Range ==>", startDate, endDate)

  let dateList = getRangebetweenDates(startDate, endDate, "days");
  // Ignore today date
  dateList.pop();

  // console.log("dateRange ==>", dateList);

  for (let item of dateList) {
    let hour = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23,
    ];

    for (let item2 of hour) {
      let today = moment(item).add(item2, "hours").format();
      // console.log("today ==>", today)

      // let time = [
      //   0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450,
      //   480, 510, 540, 570, 600, 630, 660, 690, 720, 750, 780, 810, 840, 870,
      //   900, 930, 960, 990, 1020, 1050, 1080, 1110, 1140, 1170, 1200, 1230,
      //   1260, 1290, 1320, 1350, 1380, 1410, 1440, 1470, 1500, 1530, 1560, 1590,
      //   1620, 1650, 1680, 1710, 1740, 1770, 1800, 1830, 1860, 1890, 1920, 1950,
      //   1980, 2010, 2040, 2070, 2100, 2130, 2160, 2190, 2220, 2250, 2280, 2310,
      //   2340, 2370, 2400, 2430, 2460, 2490, 2520, 2550, 2580, 2610, 2640, 2670,
      //   2700, 2730, 2760, 2790, 2820, 2850, 2880, 2910, 2940, 2970, 3000, 3000,
      //   3030, 3060, 3090, 3120, 3150, 3180, 3210, 3240, 3270, 3300, 3330, 3360,
      //   3390, 3420, 3450, 3480, 3510, 3540, 3570
      // ];

      let time = [
        0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840,
        900, 960, 1020, 1080, 1140, 1200, 1260, 1320, 1380, 1440, 1500, 1560,
        1620, 1680, 1740, 1800, 1860, 1920, 1980, 2040, 2100, 2160, 2220, 2280,
        2340, 2400, 2460, 2520, 2580, 2640, 2700, 2760, 2820, 2880, 2940, 3000,
        3030, 3090, 3150, 3210, 3270, 3330, 3390, 3450, 3510, 3570,
      ];

      for (let item3 of time) {
        // console.log("time ==>", `${moment(today).add(item3, "seconds")}`)
        let dataStream = [];
        dataStream = [...new Array(deviceNumber)].map((_, i) => {
          return {
            deviceNumber: `${param}_${i}`,
            value: genRand(0, 1, 2),
          };
        });
        await DeviceMsg.create([
          {
            deviceId: deviceId._id,
            msg: {
              DEVICE_TYPE: param,
              DATASTREAMS: dataStream,
            },
            date: item,
            time: `${moment(today).add(item3, "seconds").format("hh:mm")}`,
            dateAndTime: moment(moment(today).add(item3, "seconds")).format(),
            createdAt: moment(today).add(item3, "seconds"),
            updatedAt: moment(today).add(item3, "seconds"),
          },
        ]);
      }
    }
    console.log(`Data for Date - ${item} created`);
  }

  console.log("Data Added for One Year - Completed");
}

// ==== comment out these lines to add One Year Data === //

// feedData("1452", 1 ,"RES")
// feedData("1453", 1 ,"RES")
// feedData("1454", 1 ,"RES")
// feedData("1455", 1 ,"RES")
