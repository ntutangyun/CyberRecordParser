// Instantiate a new parser.
const RecordWriter = require("../../src/RecordWriter");
const recordWriter = new RecordWriter();

// import generated protobuf libraries
const {PerceptionObstacles} = require("../../protobuf_out/modules/perception/proto/perception_obstacle_pb");
const {LocalizationEstimate} = require("../../protobuf_out/modules/localization/proto/localization_pb");

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
const messageObjects = require("../data/messageObjects.json");

const outputFile = "../data//TEST-write.rec";
recordWriter.run(outputFile, messageObjects, parsers);
