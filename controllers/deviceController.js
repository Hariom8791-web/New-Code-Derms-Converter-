const Device = require("../models/device");
const moment = require("moment");
const DeviceMsg = require("../models/deviceMsg");
const mqtt = require("mqtt");
const path = require("path");
const csvWriter = require("csv-writer");
const Alarm = require("../models/alarm");
const fs = require("fs");
const User = require("../models/user");
var ObjectId = require("mongodb").ObjectId;
const { exec } = require("child_process");

// ======================================= testing ============================================= //

// const client = mqtt.connect("mqtt://10.5.50.47"); //--> to connect to broker
const client = mqtt.connect("mqtt://127.0.0.1:1883"); //--> to connect to broker

client.on("connect", function () {
  console.log("// == MQTT connected == //");
  client.subscribe("b25saW5lcmVzbW9uaXRvcg==", function (err) {
    if (!err) {
      client.publish("presence", "Hello mqtt");
    }
  });
});

// getChannels;
let DataObject = {};

// DataObject Example
// {
//   '1401': {
//     RES: { DEVICE_TYPE: 'RES', DATASTREAMS: [Array] },
//     NER: { DEVICE_TYPE: 'NER', DATASTREAMS: [] },
//     SPD: { DEVICE_TYPE: 'SPD', DATASTREAMS: [] },
//     VMR: { DEVICE_TYPE: 'VMR', DATASTREAMS: [] }
//   },
//   '1402': {
//     RES: { DEVICE_TYPE: 'RES', DATASTREAMS: [Array] },
//     NER: { DEVICE_TYPE: 'NER', DATASTREAMS: [] },
//     SPD: { DEVICE_TYPE: 'SPD', DATASTREAMS: [] },
//     VMR: { DEVICE_TYPE: 'VMR', DATASTREAMS: [] }
//   }
// }

let temp = 0; // Temperature of device
let hum = 0; // Humidity of device

let RESMsg = {
  DEVICE_TYPE: "RES",
  DATASTREAMS: [],
};
let NERMsg = {
  DEVICE_TYPE: "NER",
  DATASTREAMS: [],
};
let SPDMsg = {
  DEVICE_TYPE: "SPD",
  DATASTREAMS: [],
};
let VMRMsg = {
  DEVICE_TYPE: "VMR",
  DATASTREAMS: [],
};
let TEMPMsg = {
  DEVICE_TYPE: "TEMP",
  DATASTREAMS: [],
};
let HUMMsg = {
  DEVICE_TYPE: "HUM",
  DATASTREAMS: [],
};

let initialstart = {}; // { '1401': true, '1402': true }
let spdValue = {};

client.on("message", async function (topic, message) {
  console.log("Topic incoming inside GNLAN ====>", topic);
  console.log("message from connected insdie GNLAN ==> ", message.toString());

  let parsedData;
  let nodeId;
  let DeviceExists = null;
  console.log()
  try {
    nodeId = JSON.parse(message.toString()).Node_Id;
    DeviceExists = await Device.findOne({
      nodeUid: `${JSON.parse(message.toString()).Node_Id}`,
    });
    // console.log(" DeviceExists ==>", DeviceExists);
  } catch (error) {
    console.log(
      "error from DeviceExists Device Not found  ===>",
      error.message
    );
  }

  if (DeviceExists) {
    console.log(
      "********************************  Inside If device Exist ********************************"
    );
    try {
      let messageString = message.toString();
      let parsedData1 = JSON.parse(messageString);
      // console.log("Under Try Block Data parsed Data ===> : ", messageString.length);
      parsedData = JSON.parse(
        Buffer.from(parsedData1.data, "base64").toString("utf8")
      );
      console.log("base64 decode ===>", parsedData);
    } catch (e) {
      console.log("inside JSON PARSe Catch", e);
      return;
    }

    console.log("initialStart ++>", initialstart);
    if (initialstart[`${nodeId}`]) {
      console.log("initialStart if ==>", initialstart);
      if (parsedData["start"]) {
        if (parsedData["Temp"]) {
          console.log(
            "temperature and Humidity found  ===>",
            parsedData["Temp"],
            parsedData["Hum"]
          );
          temp = parsedData["Temp"];
          hum = parsedData["Hum"];
        }

        console.log(
          "DATAOBJECT FROM DeviceExists before adding nodeKey ==>",
          DataObject
        );
        if (!DataObject[`${DeviceExists.nodeUid}`]) {
          DataObject[`${DeviceExists.nodeUid}`] = {};

          DataObject[`${DeviceExists.nodeUid}`]["RES"] = {
            ...RESMsg,
            DATASTREAMS: [...RESMsg.DATASTREAMS],
          };

          DataObject[`${DeviceExists.nodeUid}`]["NER"] = {
            ...NERMsg,
            DATASTREAMS: [...NERMsg.DATASTREAMS],
          };

          DataObject[`${DeviceExists.nodeUid}`]["SPD"] = {
            ...SPDMsg,
            DATASTREAMS: [...SPDMsg.DATASTREAMS],
          };

          DataObject[`${DeviceExists.nodeUid}`]["VMR"] = {
            ...VMRMsg,
            DATASTREAMS: [...VMRMsg.DATASTREAMS],
          };

          DataObject[`${DeviceExists.nodeUid}`]["TEMP"] = {
            ...TEMPMsg,
            DATASTREAMS: [...TEMPMsg.DATASTREAMS],
          };

          DataObject[`${DeviceExists.nodeUid}`]["HUM"] = {
            ...HUMMsg,
            DATASTREAMS: [...TEMPMsg.DATASTREAMS],
          };
        }
        console.log(
          "DATAOBJECT FROM DeviceExists parsedData START ==>",
          DataObject
        );

        
        console.log("Inside if start is present");
        console.log("Parse Data is ", parsedData);
        console.log(
          "Saving RES VALUE420 ==>",
          `${DeviceExists.nodeUid}`,
          nodeId
        );

        if (
          Object.keys(parsedData)[0].split("_")[0] === "RES" &&
          DataObject[`${DeviceExists.nodeUid}`]["RES"]["DATASTREAMS"].length +
            1 <=
            DeviceExists.resSensors
        ) {
          console.log(
            "RESMsg  ===>",
            DataObject[`${DeviceExists.nodeUid}`]["RES"]["DATASTREAMS"].length,
            DeviceExists.resSensors
          );
          // && ((DataObject[`${DeviceExists.nodeUid}`]['RES']["DATASTREAMS"].length + 1) <= DeviceExists.resSensors)

          let key = Object.keys(parsedData)[0]; //fetched the key at first index
          let msgObj = {};
          msgObj["deviceNumber"] = key;
          msgObj["value"] = (parsedData[key] / 100).toFixed(2);
          console.log(
            `NOdeID = ${nodeId} and RES VAlue = ${parsedData[key] / 100}`
          );

          if (DataObject[`${DeviceExists.nodeUid}`]["RES"]) {
            console.log(
              "Saving RES VALUE ==>",
              `${DeviceExists.nodeUid}`,
              nodeId,
              msgObj
            );
            DataObject[`${DeviceExists.nodeUid}`]["RES"]["DATASTREAMS"].push(
              msgObj
            );
          }
        }

        if (
          Object.keys(parsedData)[0].split("_")[0] === "NER" &&
          DataObject[`${DeviceExists.nodeUid}`]["NER"]["DATASTREAMS"].length +
            1 <=
            DeviceExists.nerSensors
        ) {
          console.log(
            "NERMsg  ===>",
            DataObject[`${DeviceExists.nodeUid}`]["NER"]["DATASTREAMS"].length,
            DeviceExists.nerSensors
          );
          // console.log(`this is the ${Object.keys(parsedData)[0].split("_")[0]} value`)
          let key = Object.keys(parsedData)[0]; //fetched the key at first index
          let msgObj = {};
          msgObj["deviceNumber"] = key;
          msgObj["value"] = (parsedData[key] / 100).toFixed(2);

          if (DataObject[`${DeviceExists.nodeUid}`]["NER"]) {
            DataObject[`${DeviceExists.nodeUid}`]["NER"]["DATASTREAMS"].push(
              msgObj
            );
          }
        }

        if (
          Object.keys(parsedData)[0].split("_")[0] === "SPD" &&
          DataObject[`${DeviceExists.nodeUid}`]["SPD"]["DATASTREAMS"].length +
            1 <=
            DeviceExists.spdSensors
        ) {
          console.log(
            "SPDMsg  ===>",
            DataObject[`${DeviceExists.nodeUid}`]["SPD"]["DATASTREAMS"].length,
            DeviceExists.spdSensors
          );

          // console.log(`this is the ${Object.keys(parsedData)[0].split("_")[0]} value`)
          // get data from db
          let latestSurge = await DeviceMsg.find({
            deviceId: DeviceExists._id,
            "msg.DEVICE_TYPE": "SPD",
          })
            .sort({ _id: -1 })
            .limit(1)
            .lean();
          console.log("Latest surge ==>", latestSurge);
          let key = Object.keys(parsedData)[0]; //fetched the key at first index
          console.log("key Surge ==>", key);

          if (latestSurge.length > 0) {
            console.log(
              "compare these two ==>",
              latestSurge[0].msg.DATASTREAMS.filter(
                (item) => item.deviceNumber === key
              ),
              parsedData[key] / 100
            );
            if (
              latestSurge[0].msg.DATASTREAMS.filter(
                (item) => item.deviceNumber === key
              )[0]?.value ||
              0 === parsedData[key] / 100
            ) {
              console.log("==== surge Value is Same as DB ====");
              let msgObj = {};
              msgObj["deviceNumber"] = key;
              msgObj["value"] = 0;
              // SPDMsg.DATASTREAMS.push(msgObj)
              DataObject[`${DeviceExists.nodeUid}`]["SPD"]["DATASTREAMS"].push(
                msgObj
              );
            } else {
              console.log(
                "==== surge Value is not Same as DB Add new Data ===="
              );

              console.log(
                "spdValue object is same as parsed DATA",
                spdValue[`${DeviceExists.nodeUid}`],
                parsedData[key] / 100
              );
              if (
                spdValue[`${DeviceExists.nodeUid}`] ===
                parsedData[key] / 100
              ) {
                let msgObj = {};
                msgObj["deviceNumber"] = key;
                msgObj["value"] = 0;
                // SPDMsg.DATASTREAMS.push(msgObj)
                DataObject[`${DeviceExists.nodeUid}`]["SPD"][
                  "DATASTREAMS"
                ].push(msgObj);
              } else {
                let msgObj = {};
                msgObj["deviceNumber"] = key;
                msgObj["value"] = parsedData[key] / 100;
                // SPDMsg.DATASTREAMS.push(msgObj)
                spdValue[`${DeviceExists.nodeUid}`] = parsedData[key] / 100;
                DataObject[`${DeviceExists.nodeUid}`]["SPD"][
                  "DATASTREAMS"
                ].push(msgObj);
              }
            }
          } else {
            console.log("==== first Time surge Value ====");
            let msgObj = {};
            msgObj["deviceNumber"] = key;
            msgObj["value"] = parsedData[key] / 100;
            // SPDMsg.DATASTREAMS.push(msgObj)
            DataObject[`${DeviceExists.nodeUid}`]["SPD"]["DATASTREAMS"].push(
              msgObj
            );
          }
        }

        if (Object.keys(parsedData)[0] === "Temp") {
          console.log(
            "Temp  ===>",
            DataObject[`${DeviceExists.nodeUid}`]["TEMP"]["DATASTREAMS"]
          );
          let key = Object.keys(parsedData)[0]; //fetched the key at first index
          let msgObj = {};
          msgObj["deviceNumber"] = key;
          msgObj["value"] = parsedData[key].toFixed(2);

          if (DataObject[`${DeviceExists.nodeUid}`]["TEMP"]) {
            DataObject[`${DeviceExists.nodeUid}`]["TEMP"]["DATASTREAMS"].push(
              msgObj
            );
          }
        }

        console.log(
          "Logs is ",
          Object.keys(parsedData)[1] === "Hum",
          Object.keys(parsedData)[1]
        );

        if (Object.keys(parsedData)[1] === "Hum") {
          console.log(
            "Hum  ===>",
            DataObject[`${DeviceExists.nodeUid}`]["HUM"]["DATASTREAMS"]
          );
          let key = Object.keys(parsedData)[1]; //fetched the key at first index
          let msgObj = {};
          msgObj["deviceNumber"] = key;
          msgObj["value"] = parsedData[key].toFixed(2);

          if (DataObject[`${DeviceExists.nodeUid}`]["HUM"]) {
            DataObject[`${DeviceExists.nodeUid}`]["HUM"]["DATASTREAMS"].push(
              msgObj
            );
          }
        }

        if (
          Object.keys(parsedData)[0].split("_")[0] === "VA" &&
          DataObject[`${DeviceExists.nodeUid}`]["VMR"]["DATASTREAMS"].length +
            1 <=
            DeviceExists.vmrSensors
        ) {
          console.log(
            "VMRMsg  ===>",
            DataObject[`${DeviceExists.nodeUid}`]["VMR"]["DATASTREAMS"].length,
            DeviceExists.vmrSensors
          );
          // console.log(`this is the ${Object.keys(parsedData)[0]} value`)
          // delete parsedData.Node_Id;
          delete parsedData.start;
          delete parsedData.alarm;
          let msgObj = {};
          let arr = [
            {
              phaseNumber: "r",
              value: Object.values(parsedData)[0] / 100,
            },
            {
              phaseNumber: "y",
              value: Object.values(parsedData)[1] / 100,
            },
            {
              phaseNumber: "b",
              value: Object.values(parsedData)[2] / 100,
            },
            {
              phaseNumber: "ry",
              value: Object.values(parsedData)[3] / 100,
            },
            {
              phaseNumber: "yb",
              value: Object.values(parsedData)[4] / 100,
            },
            {
              phaseNumber: "rb",
              value: Object.values(parsedData)[5] / 100,
            },
          ];
          msgObj["deviceNumber"] = Object.keys(parsedData)[0].split("_")[1];
          msgObj["value"] = arr;
          // VMRMsg.DATASTREAMS.push(msgObj)
          if (DataObject[`${DeviceExists.nodeUid}`]["VMR"]) {
            DataObject[`${DeviceExists.nodeUid}`]["VMR"]["DATASTREAMS"].push(
              msgObj
            );
          }
        }

        console.log(
          "DataObject: ===============================> ",
          DataObject
        );
      }

      if (parsedData["end"]) {
        console.log("=== END ARRAY ===", parsedData, nodeId);
        console.log(
          "======== SINGLE DEVICE DATA TO DATABASE ==========",
          DataObject[`${nodeId}`]
        );

        if (DataObject[`${nodeId}`]) {
          try {
            console.log("dataObject has this nodeId");
            console.table(DataObject[`${nodeId}`]);
            // save the data to db
            try {
              if (
                DataObject[`${nodeId}`]["RES"] &&
                DataObject[`${nodeId}`]["NER"] &&
                DataObject[`${nodeId}`]["SPD"] &&
                DataObject[`${nodeId}`]["VMR"]
              ) {
                Promise.all([
                  saveLatestData(
                    DataObject[`${nodeId}`]["RES"],
                    DeviceExists._id,
                    "ResValues",
                    temp,
                    hum
                  ),
                  saveLatestData(
                    DataObject[`${nodeId}`]["NER"],
                    DeviceExists._id,
                    "NerValues",
                    temp,
                    hum
                  ),
                  saveLatestData(
                    DataObject[`${nodeId}`]["SPD"],
                    DeviceExists._id,
                    "SpdValues",
                    temp,
                    hum
                  ),
                  saveLatestData(
                    DataObject[`${nodeId}`]["VMR"],
                    DeviceExists._id,
                    "VmrValues",
                    temp,
                    hum
                  ),

                  saveLatestData(
                    DataObject[`${nodeId}`]["HUM"],
                    DeviceExists._id,
                    "HumValues",
                    temp,
                    hum
                  ),

                  saveLatestData(
                    DataObject[`${nodeId}`]["TEMP"],
                    DeviceExists._id,
                    "TempValues",
                    temp,
                    hum
                  ),
                ]).then(() => {
                  console.log("=== Data saved in db ===");
                });

                Promise.all([
                  compareThresholdValue(
                    DataObject[`${nodeId}`]["RES"],
                    DeviceExists._id,
                    "ResValues",
                    DeviceExists
                  ),
                  compareThresholdValue(
                    DataObject[`${nodeId}`]["NER"],
                    DeviceExists._id,
                    "NerValues",
                    DeviceExists
                  ),
                  compareThresholdValue(
                    DataObject[`${nodeId}`]["SPD"],
                    DeviceExists._id,
                    "SpdValues",
                    DeviceExists
                  ),
                  compareThresholdValue(
                    DataObject[`${nodeId}`]["VMR"],
                    DeviceExists._id,
                    "VmrValues",
                    DeviceExists
                  ),
                ]).then(() => {
                  console.log("=== Threshold comparision done ===");
                });
              }
            } catch (err) {
              console.log("error from saving to DB ==>", err.message);
            }
          } catch (err) {
            console.log("error in table");
          }
          delete DataObject[`${nodeId}`];
          delete initialstart[`${nodeId}`];
        } else {
          console.log("Device NOt FOund with nodeID", nodeId);
        }

        console.log("DATAOBJECT After END ====>", DataObject);
      }
    }
    //

    // ========== Initialise the data entry ========= //
    if (parsedData["initialStart"]) {
      initialstart[`${nodeId}`] = true;
    }
  }
});

//=============================== Save Data to DB ============================= //

// const lastExecutionTimes = new Map();

// async function saveLatestData(structuredMsg, deviceId, parameterValue) {
//   console.log("\n==== saveLatestData STARTED ====");
//   console.log("Input:", {
//     deviceId,
//     parameterValue,
//     structuredMsg: structuredMsg.DEVICE_TYPE,
//   });

//   const now = Date.now();
//   console.log("now",now);
//   const fifteenMinutesInMs = 15 * 60 * 1000;

//   // Initialize device entry if not exists
//   if (!lastExecutionTimes.has(deviceId)) {
//     console.log(`First time for device ${deviceId} - initializing`);
//     lastExecutionTimes.set(deviceId, { lastSavedTime: 0 });
//   }
//   console.log("checking id avaible or not",lastExecutionTimes.get(deviceId),lastExecutionTimes.has(deviceId));
//   const deviceTimers = lastExecutionTimes.get(deviceId);

//   // Validate and get the actual data arrival time
//   let dataArrivalTime = structuredMsg.timestamp
//     ? new Date(structuredMsg.timestamp).getTime()
//     : null;

//   if (!dataArrivalTime || isNaN(dataArrivalTime)) {
//     console.log(`Invalid or missing timestamp for ${structuredMsg.DEVICE_TYPE}. Using last saved time.`);
//     dataArrivalTime = deviceTimers.lastSavedTime || now; // Fallback to now only if no previous timestamp exists
//   }

//   console.log(`Data arrival time: ${dataArrivalTime} (${new Date(dataArrivalTime).toISOString()})`);

//   const timeDiff = dataArrivalTime - deviceTimers.lastSavedTime;

//   console.log(
//     `[${structuredMsg.DEVICE_TYPE}] Time diff: ${Math.floor(timeDiff / 1000)}s ` +
//       `(need ${fifteenMinutesInMs / 1000}s)`
//   );

//   // Check if we should save
//   if (timeDiff >= fifteenMinutesInMs) {
//     console.log(`[${structuredMsg.DEVICE_TYPE}] SAVING DATA (${Math.floor(timeDiff / 1000)}s since last save)`);

//     try {
//       // Create and save new message
//       const msg = new DeviceMsg({
//         deviceId: deviceId,
//         msg: structuredMsg,
//         date: moment().format("YYYY-MM-DD"),
//         time: moment().format("HH:mm:ss"),
//         dateAndTime: moment().format(),
//       });

//       await msg.save();
//       console.log(`[${structuredMsg.DEVICE_TYPE}] DeviceMsg saved successfully`);

//       // Update device state
//       const updateData = {
//         [parameterValue]: structuredMsg,
//         temp,
//         humidity: hum,
//       };

//       await Device.findByIdAndUpdate(deviceId, updateData);
//       console.log(`[${structuredMsg.DEVICE_TYPE}] Device state updated`);

//       // Update last execution time with actual data arrival time
//       deviceTimers.lastSavedTime = dataArrivalTime;
//       lastExecutionTimes.set(deviceId, deviceTimers);
//       console.log(`[${structuredMsg.DEVICE_TYPE}] Updated timestamp to ${dataArrivalTime}`);

//       return true;
//     } catch (error) {
//       console.error(`[${structuredMsg.DEVICE_TYPE}] SAVE ERROR:`, error.message);
//       return false;
//     }
//   }

//   console.log(`[${structuredMsg.DEVICE_TYPE}] SKIPPING save: ${Math.floor(timeDiff / 1000)}s < ${fifteenMinutesInMs / 1000}s`);
//   return false;
// }
//skp data using counter


// Map to track the count for each nodeId and sensor
// Map to track the count for each nodeId and sensor
// const saveCounters = new Map();

// async function saveLatestData(structuredMsg, deviceId, parameterValue) {
//   console.log("\n==== saveLatestDataWithCountLimit STARTED ====");
//   console.log("Input:", {
//     deviceId,
//     parameterValue,
//     structuredMsg: structuredMsg.DEVICE_TYPE,
//   });

//   const skipLimit = 2; // Define the number of cycles to skip before saving

//   // Initialize the counter for the deviceId and sensor if not exists
//   if (!saveCounters.has(deviceId)) {
//     saveCounters.set(deviceId, {});
//   }

//   const deviceCounters = saveCounters.get(deviceId);

//   if (!deviceCounters[parameterValue]) {
//     deviceCounters[parameterValue] = 0; // Initialize the counter for the sensor
//   }

//   // Increment the counter for the sensor
//   deviceCounters[parameterValue]++;

//   console.log(`[${structuredMsg.DEVICE_TYPE}] Current count: ${deviceCounters[parameterValue]} (Limit: ${skipLimit})`);

//   // Check if the counter has reached the skip limit
//   if (deviceCounters[parameterValue] <= skipLimit) {
//     console.log(`[${structuredMsg.DEVICE_TYPE}] SKIPPING save: Count is below limit`);
//     return false; // Skip saving
//   }

//   // Reset the counter after saving
//   deviceCounters[parameterValue] = 0;

//   try {
//     // Create and save new message
//     const msg = new DeviceMsg({
//       deviceId: deviceId,
//       msg: structuredMsg,
//       date: moment().format("YYYY-MM-DD"),
//       time: moment().format("HH:mm:ss"),
//       dateAndTime: moment().format(),
//     });

//     await msg.save();
//     console.log(`[${structuredMsg.DEVICE_TYPE}] DeviceMsg saved successfully`);

//     // Update device state
//     const updateData = {
//       [parameterValue]: structuredMsg,
//       temp,
//       humidity: hum,
//     };

//     await Device.findByIdAndUpdate(deviceId, updateData);
//     console.log(`[${structuredMsg.DEVICE_TYPE}] Device state updated`);

//     return true;
//   } catch (error) {
//     console.error(`[${structuredMsg.DEVICE_TYPE}] SAVE ERROR:`, error.message);
//     return false;
//   }
// }
// Use a persistent storage for counters (in-memory for this example)
// Global persistent counter storage
// Global storage for last save times
global.lastSaveTimes = global.lastSaveTimes || new Map();

async function saveLatestData(structuredMsg, deviceId, parameterValue) {
    const SAVE_INTERVAL_MINUTES = 0.1;
    const DEVICE_TYPE = structuredMsg.DEVICE_TYPE || 'unknown';
    const now = new Date();
    
    // Standardize device ID
    const storageDeviceId = deviceId.toString();

    console.log(`\n[${DEVICE_TYPE}] Processing ${parameterValue} for device ${storageDeviceId} at ${now.toISOString()}`);

    // Initialize last save time if not exists
    if (!global.lastSaveTimes.has(storageDeviceId)) {
        global.lastSaveTimes.set(storageDeviceId, new Map());
        console.log(`[${DEVICE_TYPE}] Initialized timers for device ${storageDeviceId}`);
    }

    const deviceTimers = global.lastSaveTimes.get(storageDeviceId);

    // Get last save time or initialize to epoch
    const lastSave = deviceTimers.get(parameterValue) || new Date(0);
    const minutesSinceLastSave = (now - lastSave) / (1000 * 60);

    console.log(`[${DEVICE_TYPE}] Last saved ${Math.round(minutesSinceLastSave)} minutes ago`);

    // Check if enough time has passed
    if (minutesSinceLastSave < SAVE_INTERVAL_MINUTES) {
        const minutesRemaining = Math.ceil(SAVE_INTERVAL_MINUTES - minutesSinceLastSave);
        console.log(`[${DEVICE_TYPE}] Next save in ${minutesRemaining} minutes`);
        return { saved: false, nextSaveIn: minutesRemaining };
    }

    try {
        // Save the data
        const timestamp = moment();
        const msg = new DeviceMsg({
            deviceId: storageDeviceId,
            msg: structuredMsg,
            date: timestamp.format("YYYY-MM-DD"),
            time: timestamp.format("HH:mm:ss"),
            dateAndTime: timestamp.format()
        });

        await msg.save();
        
        await Device.findByIdAndUpdate(
            storageDeviceId,
            { 
                $set: {
                    [parameterValue]: structuredMsg,
                    lastUpdated: now
                }
            },
            { new: true }
        );

        // Update last save time
        deviceTimers.set(parameterValue, now);
        console.log(`[${DEVICE_TYPE}] Data saved successfully at ${now.toISOString()}`);
        
        return { saved: true };

    } catch (error) {
        console.error(`[${DEVICE_TYPE}] Save failed:`, error.message);
        return { saved: false, error: error.message };
    }
}
// end of skp program
// =============================== Compare latest data from DB ============================= //
async function compareThresholdValue(
  structuredMsg,
  deviceId,
  parameterValue,
  DeviceExists
) {
  if (
    !DeviceExists.ResValues ||
    !DeviceExists.NerValues ||
    !DeviceExists.SpdValues ||
    !DeviceExists.VmrValues
  ) {
    return true;
  }

  if (
    parameterValue === "ResValues" &&
    DeviceExists.ResValues.DATASTREAMS.length > 0
  ) {
    try {
      for (let i = 0; i < new Array(DeviceExists.resSensors).length; i++) {
        if (
          DeviceExists.resSensorsThreshold <
            structuredMsg.DATASTREAMS[i].value &&
          DeviceExists.ResValues.DATASTREAMS[i].value <
            structuredMsg.DATASTREAMS[i].value
        ) {
          console.log("New value is greater than threshold");
          await Alarm.create({
            deviceId,
            SensorName: `R${i + 1}`,
            thresholdValue: DeviceExists.resSensorsThreshold,
            alarmValue: structuredMsg.DATASTREAMS[i].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value >=
              DeviceExists.resSensorsThreshold
                ? true
                : false,
          });
        }
      }
    } catch (error) {
      console.log("error from res threshold compare");
    }
  }

  if (
    parameterValue === "NerValues" &&
    DeviceExists.NerValues.DATASTREAMS.length > 0
  ) {
    try {
      for (let i = 0; i < new Array(DeviceExists.nerSensors).length; i++) {
        if (
          DeviceExists.nerSensorsThreshold <
            structuredMsg.DATASTREAMS[i].value &&
          DeviceExists.NerValues.DATASTREAMS[i].value <
            structuredMsg.DATASTREAMS[i].value
        ) {
          console.log("New value is greater than threshold");
          await Alarm.create({
            deviceId,
            SensorName: `GN${i + 1}`,
            thresholdValue: DeviceExists.nerSensorsThreshold,
            alarmValue: structuredMsg.DATASTREAMS[i].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value >=
              DeviceExists.nerSensorsThreshold
                ? true
                : false,
          });
        }
      }
    } catch (error) {
      console.log("error from ner threshold compare");
    }
  }

  if (
    parameterValue === "SpdValues" &&
    DeviceExists.SpdValues.DATASTREAMS.length > 0
  ) {
    try {
      for (let i = 0; i < new Array(DeviceExists.spdSensors).length; i++) {
        if (
          DeviceExists.spdSensorsThreshold <
            structuredMsg.DATASTREAMS[i].value &&
          DeviceExists.SpdValues.DATASTREAMS[i].value <
            structuredMsg.DATASTREAMS[i].value
        ) {
          console.log("New value is greater than threshold");
          await Alarm.create({
            deviceId,
            SensorName: `SPD${i + 1}`,
            thresholdValue: DeviceExists.spdSensorsThreshold,
            alarmValue: structuredMsg.DATASTREAMS[i].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value >=
              DeviceExists.spdSensorsThreshold
                ? true
                : false,
          });
        }
      }
    } catch (error) {
      console.log("error from spd threshold compare");
    }
  }

  if (
    parameterValue === "VmrValues" &&
    DeviceExists.VmrValues.DATASTREAMS.length > 0
  ) {
    try {
      for (let i = 0; i < new Array(DeviceExists.vmrSensors).length; i++) {
        if (
          DeviceExists.vmrSensorsThreshold.r <
            structuredMsg.DATASTREAMS[i].value[0].value &&
          DeviceExists.VmrValues.DATASTREAMS[i].value[0].value <
            structuredMsg.DATASTREAMS[i].value[0].value
        ) {
          console.log("R phase threshold found");
          await Alarm.create({
            deviceId,
            SensorName: `PH${i + 1} , R`,
            thresholdValue: DeviceExists.vmrSensorsThreshold.r,
            alarmValue: structuredMsg.DATASTREAMS[i].value[0].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value[0].value >=
              DeviceExists.vmrSensorsThreshold.r
                ? true
                : false,
          });
        }

        if (
          DeviceExists.vmrSensorsThreshold.y <
            structuredMsg.DATASTREAMS[i].value[1].value &&
          DeviceExists.VmrValues.DATASTREAMS[i].value[1].value <
            structuredMsg.DATASTREAMS[i].value[1].value
        ) {
          console.log("Y phase threshold found");
          await Alarm.create({
            deviceId,
            SensorName: `PH${i + 1} , Y`,
            thresholdValue: DeviceExists.vmrSensorsThreshold.y,
            alarmValue: structuredMsg.DATASTREAMS[i].value[1].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value[1].value >=
              DeviceExists.vmrSensorsThreshold.y
                ? true
                : false,
          });
        }

        if (
          DeviceExists.vmrSensorsThreshold.b <
            structuredMsg.DATASTREAMS[i].value[2].value &&
          DeviceExists.VmrValues.DATASTREAMS[i].value[2].value <
            structuredMsg.DATASTREAMS[i].value[2].value
        ) {
          console.log("B phase threshold found");
          await Alarm.create({
            deviceId,
            SensorName: `PH${i + 1} , B`,
            thresholdValue: DeviceExists.vmrSensorsThreshold.b,
            alarmValue: structuredMsg.DATASTREAMS[i].value[2].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value[2].value >=
              DeviceExists.vmrSensorsThreshold.b
                ? true
                : false,
          });
        }

        if (
          DeviceExists.vmrSensorsThreshold.ry <
            structuredMsg.DATASTREAMS[i].value[3].value &&
          DeviceExists.VmrValues.DATASTREAMS[i].value[3].value <
            structuredMsg.DATASTREAMS[i].value[3].value
        ) {
          console.log("RY phase threshold found");
          await Alarm.create({
            deviceId,
            SensorName: `PH${i + 1} , RY`,
            thresholdValue: DeviceExists.vmrSensorsThreshold.ry,
            alarmValue: structuredMsg.DATASTREAMS[i].value[3].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value[3].value >=
              DeviceExists.vmrSensorsThreshold.ry
                ? true
                : false,
          });
        }

        if (
          DeviceExists.vmrSensorsThreshold.yb <
            structuredMsg.DATASTREAMS[i].value[4].value &&
          DeviceExists.VmrValues.DATASTREAMS[i].value[4].value <
            structuredMsg.DATASTREAMS[i].value[4].value
        ) {
          console.log("YB phase threshold found");
          await Alarm.create({
            deviceId,
            SensorName: `PH${i + 1} , YB`,
            thresholdValue: DeviceExists.vmrSensorsThreshold.yb,
            alarmValue: structuredMsg.DATASTREAMS[i].value[4].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value[4].value >=
              DeviceExists.vmrSensorsThreshold.yb
                ? true
                : false,
          });
        }

        if (
          DeviceExists.vmrSensorsThreshold.rb <
            structuredMsg.DATASTREAMS[i].value[5].value &&
          DeviceExists.VmrValues.DATASTREAMS[i].value[5].value <
            structuredMsg.DATASTREAMS[i].value[5].value
        ) {
          console.log("RB phase threshold found");
          await Alarm.create({
            deviceId,
            SensorName: `PH${i + 1} , RB`,
            thresholdValue: DeviceExists.vmrSensorsThreshold.rb,
            alarmValue: structuredMsg.DATASTREAMS[i].value[5].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value[5].value >=
              DeviceExists.vmrSensorsThreshold.rb
                ? true
                : false,
          });
        }
      }
    } catch (error) {
      console.log("error from Vmr threshold compare");
    }
  }

  return true;
}

// ======================================== testing ============================================ //

// ================================= Create Device ================================ //
exports.createDevice = async (req, res, next) => {
  console.log("==== createDevice function got hit () ====");
  const {
    siteId,
    deviceName,
    nodeUid,
    vmrSensors,
    resSensors,
    spdSensors,
    nerSensors,
    resSensorsThreshold,
    vmrSensorsThreshold,
    spdSensorsThreshold,
    nerSensorsThreshold,
  } = req.body;

  if (!siteId || !deviceName || !nodeUid) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  try {
    let device = await Device.create({
      siteId,
      deviceName,
      nodeUid,
      vmrSensors,
      resSensors,
      spdSensors,
      nerSensors,
      resSensorsThreshold,
      vmrSensorsThreshold,
      spdSensorsThreshold,
      nerSensorsThreshold,
    });
    if (device) {
      return res.status(200).json({ msg: "device created successfully" });
    }
  } catch (error) {
    console.log("error from createDevice ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ================================= Edit Device ================================ //

exports.editDevice = async (req, res, next) => {
  console.log("==== editDevice function got hit () ====");
  const {
    deviceID,
    deviceName,
    nodeUid,
    vmrSensors,
    resSensors,
    spdSensors,
    nerSensors,
    resSensorsThreshold,
    vmrSensorsThreshold,
    spdSensorsThreshold,
    nerSensorsThreshold,
  } = req.body;
  try {
    let device = await Device.findByIdAndUpdate(deviceID, {
      deviceName,
      nodeUid,
      vmrSensors,
      resSensors,
      spdSensors,
      nerSensors,
      resSensorsThreshold,
      vmrSensorsThreshold,
      spdSensorsThreshold,
      nerSensorsThreshold,
    });
    if (device) {
      return res.status(200).json({ msg: "device edited successfully" });
    }
  } catch (error) {
    console.log("error from editDevice ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ================================= Delete Device ================================ //

exports.deleteDevice = async (req, res, next) => {
  console.log("==== deleteDevice function got hit () ====");
  const { deviceID } = req.body;
  if (!deviceID) {
    return res.status(400).json({ msg: "Please! Provide all required data" });
  }
  try {
    let device = await Device.findByIdAndDelete(deviceID);
    if (device) {
      return res.status(200).json({ msg: "device deleted successfully" });
    }
  } catch (error) {
    console.log("error from deleteDevice ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ========================= Today latest device Graph data ======================== //
exports.latestdevicedata = async (req, res, next) => {
  const { sensorName, deviceNumber, deviceId, startDate, endDate } = req.body;
  // console.table(req.body)

  if (!sensorName || !deviceId || !startDate || !endDate) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  if (sensorName === "VMR") {
    console.log("== Inside VMR condition ==");
    try {
      let resp = await DeviceMsg.aggregate([
        {
          $match: {
            deviceId: ObjectId(deviceId),
            "msg.DEVICE_TYPE": sensorName,
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $unwind: "$msg.DATASTREAMS",
        },
        {
          $match: {
            deviceId: ObjectId(deviceId),
            "msg.DEVICE_TYPE": sensorName,
            "msg.DATASTREAMS.deviceNumber": deviceNumber,
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $unwind: "$msg.DATASTREAMS.value",
        },
        {
          $addFields: {
            phaseNumber: "$msg.DATASTREAMS.value.phaseNumber",
            value: "$msg.DATASTREAMS.value.value",
          },
        },
      ]);

      return res.status(200).json({ msg: resp });
    } catch (error) {
      console.log("Error from VMR ==>", error);
    }
  }
  try {
    let resp = await DeviceMsg.aggregate([
      {
        $match: {
          deviceId: ObjectId(deviceId),
          "msg.DEVICE_TYPE": sensorName,
          date: startDate,
          // date: {
          //   $gte: startDate,
          //   $lte: "",
          // },
        },
      },
    ]);
    // console.log("RES Response LatestDeviceData", resp.length)
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from latest devicedata ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ========================= latest device Graph data according to date ======================== //
exports.latestdevicedataBydate = async (req, res, next) => {
  const { sensorName, deviceNumber, deviceId, startDate, endDate } = req.body;
  console.log("=== latestdevicedataBydate() ===");
  // console.table(req.body)

  if (!sensorName || !deviceId || !startDate || !endDate) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  if (sensorName === "VMR") {
    console.log("== Inside VMR condition ==");
    try {
      let resp = await DeviceMsg.aggregate([
        {
          $match: {
            deviceId: ObjectId(deviceId),
            "msg.DEVICE_TYPE": sensorName,
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $unwind: "$msg.DATASTREAMS",
        },
        {
          $match: {
            deviceId: ObjectId(deviceId),
            "msg.DEVICE_TYPE": sensorName,
            "msg.DATASTREAMS.deviceNumber": deviceNumber,
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $unwind: "$msg.DATASTREAMS.value",
        },
        {
          $addFields: {
            phaseNumber: "r",
            value: [
              {
                $match: {
                  "msg.DATASTREAMS.value.phaseNumber": "r",
                },
              },
            ],
          },
        },
        // {
        //   $match: {
        //     "msg.DATASTREAMS.value.phaseNumber" : 'r'
        //   }
        // }

        // {
        //   $addFields:{
        //     "phaseNumber": "$msg.DATASTREAMS.value.phaseNumber" ,
        //     "value": "$msg.DATASTREAMS.value.value"
        //   }
        // },
        // {
        //   $project : {
        //     msg: 0
        //   }
        // },
        // {
        //   $group: {
        //     "_id": "$phaseNumber"
        //   }
        // }
        // {
        //   $group: {
        //     _id: "$date",
        //     totalavgUnits: {
        //       $avg: "$msg.DATASTREAMS.value.value",
        //     },
        //   },
        // },
      ]);

      return res.status(200).json({ msg: resp });
    } catch (error) {
      console.log("Error from VMR ==>", error);
    }
  }
  try {
    let resp = await DeviceMsg.aggregate([
      {
        $match: {
          deviceId: ObjectId(deviceId),
          "msg.DEVICE_TYPE": sensorName,
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },

      {
        $project: { msg: 1, date: 1 },
      },
      {
        $unwind: "$msg.DATASTREAMS",
      },
      {
        $addFields: {
          deviceNumber: "$msg.DATASTREAMS.deviceNumber",
          value: "$msg.DATASTREAMS.value",
        },
      },
      {
        $project: { msg: 0 },
      },
      {
        $group: {
          _id: "$date",
          totalavgUnits: {
            $avg: "$value",
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from latest devicedata ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ========================= Device Data acc. to siteId ============================= //
exports.getdeviceList = async (req, res, next) => {
  const { siteId } = req.params;
  // console.log("getdeviceList ====>", siteId)

  if (!siteId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  if (siteId === "null" || siteId === "undefined") {
    return res.status(400).json({ msg: "siteId not found" });
  }

  try {
    let deviceList = await Device.find(
      { siteId },
      { deviceName: 1, _id: 1 }
    ).lean();

    if (req.user.role === 2) {
      let userDeviceList = await Device.find(
        {
          siteId: siteId,
          userId: { $in: [req.user._id] },
        },
        { deviceName: 1, _id: 1 }
      ).lean();
      return res.status(200).json({ msg: userDeviceList });
    }

    return res.status(200).json({ msg: deviceList });
  } catch (error) {
    console.log("error from getdeviceList =>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ========================= Device Data acc. to siteId and userId ============================= //
exports.getdeviceListByuserId = async (req, res, next) => {
  const { siteId, userId } = req.body;
  // console.log("getdeviceList ====>", siteId)

  if (!siteId || !userId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  if (siteId === "null" || siteId === "undefined") {
    return res.status(400).json({ msg: "siteId not found" });
  }

  try {
    let userDeviceList = await Device.find({
      siteId: siteId,
      userId: { $in: [userId] },
    }).lean();
    return res.status(200).json({ msg: userDeviceList });
  } catch (error) {
    console.log("error from getdeviceListByuserId =>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ========================= Get Device BY ID ============================= //
exports.getDeviceById = async (req, res, next) => {
  const { deviceId } = req.params;

  if (deviceId === "null" || deviceId === "undefined") {
    return res.status(400).json({ msg: "deviceID not found" });
  }

  if (deviceId) {
    try {
      let device = await Device.findById(deviceId).populate("siteId");
      if (device) {
        return res.status(200).json({ msg: device });
      }
    } catch (error) {
      console.log("error from getDevice", error);
      return res.status(500).json({ msg: error.message });
    }
  }
};

exports.getDeviceDataById = async (req, res, next) => {
  try {
    const deviceId = req.params.deviceId;
    if (!deviceId) {
      return res.status(400).json({ msg: "deviceID not found" });
    }

    let device = await Device.findById(deviceId).populate("siteId");
    return res.status(200).json({ msg: device });
  } catch (error) {
    console.log("error from getDevice", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ====================== Delete device from user Profile =========================== //
exports.deleteDeviceFromUser = async (req, res, next) => {
  const { userId, deviceId } = req.body;
  if (!deviceId || !userId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }
  try {
    let resp = await Device.findByIdAndUpdate(deviceId, {
      $pullAll: {
        userId: [userId],
      },
    });

    await User.findByIdAndUpdate(userId, {
      $pull: {
        deviceSensors: { deviceId: deviceId },
      },
    });
    if (resp) {
      return res.status(200).json({ msg: "Device deleted from user Profile" });
    }
  } catch (error) {
    console.log("error from deleteSiteFromUser ==>", error.message);
  }
};

// =========================  Download CSV report for Device ========================= //
exports.getCsv = async (req, res, next) => {
  const { sensorName, deviceId, deviceNumber, startDate, endDate } = req.body;
  // {
  //   "deviceId": "6374c4703f72921ccc86c4f7",
  //   "sensorName": "RES",
  //   "deviceNumber": ["RES_0", "RES_2"],
  //   "startDate": "2022-11-21",
  //   "endDate": "2022-11-22"
  // }
  console.log("==== ++++++++++ ====");
  console.log("==== generateCSV ====");
  console.log("==== generateCSV ====");
  console.log("==== generateCSV ====");
  console.log("==== ++++++++++ ====");
  // console.table(req.body);

  if (!sensorName || !deviceId || !deviceNumber || !startDate || !endDate) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  if (sensorName === "VMR") {
    try {
      let firstIterate = true;
      let records = [];
      let deviceDetail;

      // for (let item of deviceNumber) {
      deviceDetail = await DeviceMsg.aggregate([
        {
          $match: {
            deviceId: ObjectId(deviceId),
            "msg.DEVICE_TYPE": sensorName,
            createdAt: {
              $gte: moment(startDate).startOf("day").toDate(),
              $lte: moment(endDate).endOf("day").toDate(),
            },
          },
        },
        {
          $unwind: "$msg.DATASTREAMS",
        },
        {
          $match: {
            "msg.DATASTREAMS.deviceNumber": {
              $in: deviceNumber,
            },
          },
        },
        {
          $lookup: {
            from: "devices",
            localField: "deviceId",
            foreignField: "_id",
            // pipeline: [
            //   { "$project": { "deviceName" : 1, "nodeUid": 1 }}
            // ],
            as: "deviceId",
          },
        },
        // {
        //   $addFields: {
        //     "dateAndTime": "$msg.DATASTREAMS.value"
        //   }
        // },
      ]);
      // if (firstIterate) {
      //   deviceDetail = deviceDetails
      //   firstIterate = false
      // } else {
      //   let index = 0
      //   for (let items of deviceDetail) {
      //     items[`${item}`] = deviceDetails[index].msg.DATASTREAMS.value
      //     index++
      //   }
      // }
      // }
      console.log("deviceDetail ==========> ", deviceDetail);
      for (let item of deviceDetail) {
        let obj = {};
        // obj[""]
        obj["deviceUid"] = item.deviceId[0].nodeUid;
        obj["deviceName"] = item.deviceId[0].deviceName;
        obj["date"] = item.date;
        obj["time"] = item.time;
        obj["phaseNumber"] = deviceNumber[0];
        obj["r"] = item.msg.DATASTREAMS.value[0].value;
        obj["y"] = item.msg.DATASTREAMS.value[1].value;
        obj["b"] = item.msg.DATASTREAMS.value[2].value;
        obj["ry"] = item.msg.DATASTREAMS.value[3].value;
        obj["yb"] = item.msg.DATASTREAMS.value[4].value;
        obj["rb"] = item.msg.DATASTREAMS.value[5].value;
        // obj[`${deviceNumber[0]}`] = item.dateAndTime
        // for (let i=1; i < deviceNumber.length; i++) {
        //   obj[`${deviceNumber[i]}`] = item[`${deviceNumber[i]}`]
        // }
        records.push(obj);
      }

      let Headers = [
        { id: "deviceName", title: "Device Name" },
        { id: "date", title: "Date" },
        { id: "time", title: "Time" },
        { id: "phaseNumber", title: "Phase Number" },
        { id: "r", title: "R" },
        { id: "y", title: "Y" },
        { id: "b", title: "B" },
        { id: "ry", title: "RY" },
        { id: "yb", title: "YB" },
        { id: "rb", title: "RB" },
      ];

      // for (let item of deviceNumber) {
      //   let obj = { id: `${item}`, title: `${item}` }
      //   Headers.push(obj)
      // }

      // ========================================================== //
      const writer = csvWriter.createObjectCsvWriter({
        // path: path.resolve(__dirname, 'file.csv.csv'),
        path: "file.csv",
        header: Headers,
      });

      writer.writeRecords(records).then(() => {
        console.log("Done!");
        return res.status(200).json({ msg: "CSV generated successfully" });
      });

      // ========================================================== //
    } catch (error) {
      console.log("error from getCsv VMR ==>", error);
      return res.status(500).json({ msg: error.message });
    }
  } else {
    console.log("it is not a vmr");
    try {
      let firstIterate = true;
      let records = [];
      let deviceDetail;

      for (let item of deviceNumber) {
        try {
          let deviceDetails = await DeviceMsg.aggregate([
            {
              $match: {
                deviceId: ObjectId(deviceId),
                "msg.DEVICE_TYPE": sensorName,
                createdAt: {
              $gte: moment(startDate).startOf("day").toDate(),
              $lte: moment(endDate).endOf("day").toDate(),
            },
              },
            },
            {
              $unwind: "$msg.DATASTREAMS",
            },
            {
              $match: {
                "msg.DATASTREAMS.deviceNumber": item,
              },
            },
            {
              $lookup: {
                from: "devices",
                localField: "deviceId",
                foreignField: "_id",
                // pipeline: [
                //   { "$project": { "deviceName" : 1,"nodeUid": 1 }}
                // ],
                as: "deviceId",
              },
            },
            {
              $addFields: {
                dateAndTime: "$msg.DATASTREAMS.value",
              },
            },
          ]);
          if (firstIterate) {
            deviceDetail = deviceDetails;
            firstIterate = false;
          } else {
            let index = 0;
            for (let items of deviceDetail) {
              items[`${item}`] = deviceDetails[index].msg.DATASTREAMS.value;
              index++;
            }
          }

          console.log("deviceDetails: ", deviceDetails);
        } catch (error) {
          console.log(
            `while generating report the value ${item} not found in db`
          );
        }
      }

      // console.log("deviceDetail ==========> ", deviceDetail)

      for (let item of deviceDetail) {
        let obj = {};
        obj["deviceUid"] = item.deviceId[0].nodeUid;
        obj["deviceName"] = item.deviceId[0].deviceName;
        obj["date"] = item.date;
        obj["time"] = item.time;
        obj[`${deviceNumber[0]}`] = item.dateAndTime;
        for (let i = 1; i < deviceNumber.length; i++) {
          obj[`${deviceNumber[i]}`] = item[`${deviceNumber[i]}`] || 0;
        }
        records.push(obj);
      }

      let Headers = [
        { id: "deviceName", title: "Device Name" },
        { id: "date", title: "Date" },
        { id: "time", title: "Time" },
      ];

      for (let item of deviceNumber) {
        let obj = { id: `${item}`, title: `${item}` };
        Headers.push(obj);
      }

      // ========================================================== //
      const writer = csvWriter.createObjectCsvWriter({
        // path: path.resolve(__dirname, 'file.csv.csv'),
        path: "file.csv",
        header: Headers,
      });

      writer.writeRecords(records).then(() => {
        console.log("Done!");

        return res.status(200).json({ msg: "CSV GENERATED" });
      });
      // return res.status(200).json({msg: records})

      // res.setHeader(
      //   "Content-Type",
      //   "application/vnd.openxmlformats-officedocument.spreadsheatml.sheet"
      // );
      // res.setHeader("Content-Disposition", `attachment; filename=file2.csv`);
      // return res.status(200).json({msg: deviceDetail})
      // ========================================================== //
    } catch (error) {
      console.log("error from getCsv ==>", error);
      return res.status(500).json({ msg: error.message });
    }
  }
};

// ================================= DownlaodCSV =============================== //
exports.downloadcsv = async (req, res, next) => {
  var directFilepath = path.resolve(__dirname, "../file.csv");
  var file = fs.createReadStream(directFilepath);
  file.pipe(res);
};

// ============================== Get Device by deviceId ============================== //
exports.getDeviceByuserId = async (req, res, next) => {
  console.log(" ====== getDeviceByuserId () ========= ");
  try {
    let resp = await Device.find({
      userId: { $in: [req.params.userId] },
    });
    if (resp) {
      return res.status(200).json({ msg: resp });
    }
  } catch (error) {
    console.log("error from getDeviceByuserId", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================== check DeviceNode UID exists or not ============================== //
exports.checkDeviceUid = async (req, res, next) => {
  const { uid } = req.body;
  try {
    let resp = await Device.findOne({ nodeUid: uid });
    // console.log("resp checkDeviceUid ==>",  resp )
    if (!resp) {
      return res
        .status(200)
        .json({ msg: "This UID is available", status: true });
    }
    if (resp) {
      return res
        .status(200)
        .json({ msg: "This UID is not available", status: false });
    }
  } catch (error) {
    console.log("error from checkDeviceUid", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================== Device Shutdown ================================ //
exports.deviceShutdown = async (req, res, next) => {
  console.log("shutDown triggered");

  let { stdout } = exec("pkill -o firefox");
  if (stdout) {
    exec("echo 123456 | sudo -S shutdown now");
  }

  //  exec("pkill -o firefox",(e,i) =>{
  //      exec("shutdown now");
  //   })

  res.send("shutting down");
};

// ============================== Device Reboot ================================ //
exports.deviceReboot = async (req, res, next) => {
  console.log("Reboot triggered");

  let { stdout } = exec("pkill -o firefox");
  if (stdout) {
    exec("echo 123456 | sudo -S reboot");
  }

  // exec("pkill -o firefox",(e,i) =>{
  //     exec("reboot");
  //   })
  res.send("Rebooting");
};
