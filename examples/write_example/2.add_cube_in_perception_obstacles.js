const fs = require("fs");

const RecordParser = require("../../src/RecordParser");
const RecordWriter = require("../../src/RecordWriter");

// instantiate parser and writer
const parser = new RecordParser();
const writer = new RecordWriter();

// import generated protobuf libraries
const {Chassis} = require("../../protobuf_out/modules/canbus/proto/chassis_pb");
const {LatencyRecordMap} = require("../../protobuf_out/modules/common/latency_recorder/proto/latency_record_pb");
const {LatencyReport} = require("../../protobuf_out/modules/common/latency_recorder/proto/latency_record_pb");
const {ControlCommand} = require("../../protobuf_out/modules/control/proto/control_cmd_pb");
const {HMIStatus} = require("../../protobuf_out/modules/dreamview/proto/hmi_status_pb");
const {LocalizationStatus} = require("../../protobuf_out/modules/localization/proto/localization_pb");
const {LocalizationEstimate} = require("../../protobuf_out/modules/localization/proto/localization_pb");
const {SystemStatus} = require("../../protobuf_out/modules/monitor/proto/system_status_pb");
const {PerceptionObstacles} = require("../../protobuf_out/modules/perception/proto/perception_obstacle_pb");
const {TrafficLightDetection} = require("../../protobuf_out/modules/perception/proto/traffic_light_detection_pb");
const {ADCTrajectory} = require("../../protobuf_out/modules/planning/proto/planning_pb");
const {PredictionObstacles} = require("../../protobuf_out/modules/prediction/proto/prediction_obstacle_pb");
const {RoutingRequest} = require("../../protobuf_out/modules/routing/proto/routing_pb");
const {RoutingResponse} = require("../../protobuf_out/modules/routing/proto/routing_pb");
const {MonitorMessage} = require("../../protobuf_out/modules/common/monitor_log/proto/monitor_log_pb");

// This is where user defines the ProtoBuf Classes for the channels to extract
const parsers = {
    "/apollo/canbus/chassis": Chassis,
    "/apollo/common/latency_records": LatencyRecordMap,
    "/apollo/common/latency_reports": LatencyReport,
    "/apollo/control": ControlCommand,
    "/apollo/hmi/status": HMIStatus,
    "/apollo/localization/msf_status": LocalizationStatus,
    "/apollo/localization/pose": LocalizationEstimate,
    "/apollo/monitor": MonitorMessage,
    "/apollo/monitor/system_status": SystemStatus,
    "/apollo/perception/obstacles": PerceptionObstacles,
    "/apollo/perception/traffic_light": TrafficLightDetection,
    "/apollo/planning": ADCTrajectory,
    "/apollo/prediction": PredictionObstacles,
    "/apollo/routing_request": RoutingRequest,
    "/apollo/routing_response": RoutingResponse,
};

const messageTypes = {
    "/apollo/canbus/chassis": "apollo.canbus.Chassis",
    "/apollo/common/latency_records": "apollo.common.LatencyRecordMap",
    "/apollo/common/latency_reports": "apollo.common.LatencyReport",
    "/apollo/control": "apollo.control.ControlCommand",
    "/apollo/hmi/status": "apollo.dreamview.HMIStatus",
    "/apollo/localization/msf_status": "apollo.localization.LocalizationStatus",
    "/apollo/localization/pose": "apollo.localization.LocalizationEstimate",
    "/apollo/monitor": "apollo.common.monitor.MonitorMessage",
    "/apollo/monitor/system_status": "apollo.monitor.SystemStatus",
    "/apollo/perception/obstacles": "apollo.perception.PerceptionObstacles",
    "/apollo/perception/traffic_light": "apollo.perception.TrafficLightDetection",
    "/apollo/planning": "apollo.planning.ADCTrajectory",
    "/apollo/prediction": "apollo.prediction.PredictionObstacles",
    "/apollo/routing_request": "apollo.routing.RoutingRequest",
    "/apollo/routing_response": "apollo.routing.RoutingResponse",
};

const messageObjects = {
    "/apollo/canbus/chassis": [],
    "/apollo/common/latency_records": [],
    "/apollo/common/latency_reports": [],
    "/apollo/control": [],
    "/apollo/hmi/status": [],
    "/apollo/localization/msf_status": [],
    "/apollo/localization/pose": [],
    "/apollo/monitor": [],
    "/apollo/monitor/system_status": [],
    "/apollo/perception/obstacles": [],
    "/apollo/perception/traffic_light": [],
    "/apollo/planning": [],
    "/apollo/prediction": [],
    "/apollo/routing_request": [],
    "/apollo/routing_response": [],
};

// load original record file
const recordFile = "../data/TEST-rec.00000";
console.log(parser.parse(recordFile, messageObjects, parsers));

// configure the obstacle data
const {PerceptionObstacle} = require("../../protobuf_out/modules/perception/proto/perception_obstacle_pb");

const obstacleData = {
    id: 1000,
    position: {
        x: 552560,
        y: 4182086,
        z: 10.12
    },
    length: 4,
    width: 4,
    height: 4,
    polygonPointList: [
        {x: 552558, y: 4182084, z: 10.12},
        {x: 552558, y: 4182088, z: 10.12},
        {x: 552562, y: 4182088, z: 10.12},
        {x: 552562, y: 4182084, z: 10.12},
    ],
    anchorPoint: {
        x: 552560,
        y: 4182086,
        z: 10.12
    },
    theta: 0,
    velocity: {
        x: 0,
        y: 0,
        z: 0,
    },
    type: PerceptionObstacle.Type.UNKNOWN,
    pointCloudList: [],
    dropsList: [],
    acceleration: {x: 0, y: 0, z: 0},
    bbox2d: {xmin: 0, ymin: 0, xmax: 0, ymax: 0},
    subType: PerceptionObstacle.SubType.ST_UNKNOWN,
    measurementsList: [],
    heightAboveGround: NaN,
    positionCovarianceList: [0, 0, 0, 0, 0, 0, 0, 0, 0,],
    velocityCovarianceList: [0, 0, 0, 0, 0, 0, 0, 0, 0,],
    accelerationCovarianceList: [0, 0, 0, 0, 0, 0, 0, 0, 0],

    // following to be updated during injection
    // trackingTime: 0,
    // timestamp: 0,
};

const injectStartTimestamp = 1614695848.445411921;

messageObjects["/apollo/perception/obstacles"].forEach(msg => {
    if (msg.header.timestampSec >= injectStartTimestamp) {
        msg.perceptionObstacleList.push({
            ...obstacleData,
            timestamp: msg.header.timestampSec,
            trackingTime: msg.header.timestampSec - injectStartTimestamp
        });
    }
});

const outputFile = "../data/TEST-write.simple_cube.record";
writer.run(outputFile, messageObjects, parsers, messageTypes);
