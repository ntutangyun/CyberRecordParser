const fs = require("fs");
const RecordParser = require("../src/RecordParser");

// Instantiate a new parser.
const parser = new RecordParser();

// import generated protobuf libraries
const {PerceptionObstacles} = require("../protobuf_out/modules/perception/proto/perception_obstacle_pb");
const {LocalizationEstimate} = require("../protobuf_out/modules/localization/proto/localization_pb");

// This is where user defines the ProtoBuf Classes for the channels to extract
const parsers = {
    "/apollo/perception/obstacles": PerceptionObstacles,
    "/apollo/localization/pose": LocalizationEstimate,
};

// This is where user defines what channels to read.
// Note that if you define containers as objects, the messages will be saved by default as "LidarTimestamp : message" pairs.
// e.g.
//      "/apollo/perception/obstacles": {
//          1614695850876774000: {
//              header: {...}
//              errorCode: 0,
//              perceptionObstacleList: []
//          },
//          1614695850982206700: {
//              header: {...}
//              errorCode: 0,
//              perceptionObstacleList: [...]
//          }
//          ...
//      }
// This is used to help index and synchronize the messages from different channels.
const messageObjects = {
    "/apollo/perception/obstacles": {},
    "/apollo/localization/pose": {},
};

const recordFile = "./TEST-rec.00000";
parser.parse(recordFile, messageObjects, parsers);

try {
    fs.writeFileSync("./messageObjects.json", JSON.stringify(messageObjects));
} catch (err) {
    console.error(err);
}

// If you Define the message containers as Arrays, the messages will be pushed into the corresponding arrays.
//      "/apollo/perception/obstacles": [
//          {
//                 header: {...}
//                 errorCode: 0,
//                 perceptionObstacleList: []
//          },
//          {
//              header: {...}
//              errorCode: 0,
//              perceptionObstacleList: [...]
//          },
//      ]
const messageArrays = {
    "/apollo/perception/obstacles": [],
    "/apollo/localization/pose": [],
};

parser.parse(recordFile, messageArrays, parsers);

try {
    fs.writeFileSync("./messageArrays.json", JSON.stringify(messageArrays));
} catch (err) {
    console.error(err);
}

