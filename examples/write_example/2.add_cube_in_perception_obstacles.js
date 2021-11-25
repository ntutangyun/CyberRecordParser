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
const {TrafficLightDetection} = require('../../protobuf_out/modules/perception/proto/traffic_light_detection_pb');
const {ADCTrajectory} = require("../../protobuf_out/modules/planning/proto/planning_pb");
const {PredictionObstacles} = require("../../protobuf_out/modules/prediction/proto/prediction_obstacle_pb");
const {RoutingRequest} = require("../../protobuf_out/modules/routing/proto/routing_pb");
const {RoutingResponse} = require("../../protobuf_out/modules/routing/proto/routing_pb");

// This is where user defines the ProtoBuf Classes for the channels to extract
const parsers = {
    "/apollo/control": ControlCommand,
    "/apollo/hmi/status": HMIStatus,
    "/apollo/localization/pose": LocalizationEstimate,
    "/apollo/perception/obstacles": PerceptionObstacles,
    "/apollo/planning": ADCTrajectory,
    "/apollo/routing_request": RoutingRequest,
    "/apollo/monitor/system_status": SystemStatus,
    "/apollo/prediction": PredictionObstacles,
    "/apollo/sensor/gnss/odometry": Gps,
    "/apollo/navigation": NavigationInfo,
    "/apollo/localization/msf_gnss": LocalizationEstimate,
    "/apollo/drive_event": DriveEvent,
    "/apollo/routing_response": RoutingResponse,
    "/apollo/canbus/chassis": Chassis,
    // "/apollo/localization/msf_status": LocalizationStatus,
    "/apollo/sensor/gnss/best_pose": GnssBestPose,
    "/apollo/sensor/gnss/gnss_status": GnssStatus,
    "/apollo/sensor/gnss/corrected_imu": CorrectedImu,
    "/apollo/sensor/gnss/ins_stat": InsStat,
    "/apollo/sensor/gnss/rtk_obs": EpochObservation,
    "/apollo/sensor/gnss/raw_data": RawData,
    "/apollo/perception/traffic_light": TrafficLightDetection,
    "/apollo/localization/msf_lidar": LocalizationEstimate,
    "/apollo/control/pad": PadMessage,
    "/apollo/guardian": GuardianCommand,
    // "/apollo/hmi/audio_capture": "apollo.dreamview.AudioCapture",
};

const messageTypes = {
    "/tf_static": "apollo.transform.TransformStampeds",
    "/apollo/monitor": "apollo.common.monitor.MonitorMessage",
    "/apollo/localization/pose": "apollo.localization.LocalizationEstimate",
    "/apollo/perception/obstacles": "apollo.perception.PerceptionObstacles",
    "/apollo/planning": "apollo.planning.ADCTrajectory",
    "/apollo/sensor/gnss/imu": "apollo.drivers.gnss.Imu",
    "/apollo/canbus/chassis_detail": "apollo.canbus.ChassisDetail",
    "/apollo/hmi/status": "apollo.dreamview.HMIStatus",
    "/apollo/routing_request": "apollo.routing.RoutingRequest",
    "/apollo/sensor/gnss/rtk_eph": "apollo.drivers.gnss.GnssEphemeris",
    "/tf": "apollo.transform.TransformStampeds",
    "/apollo/control": "apollo.control.ControlCommand",
    "/apollo/monitor/system_status": "apollo.monitor.SystemStatus",
    "/apollo/prediction": "apollo.prediction.PredictionObstacles",
    "/apollo/sensor/gnss/odometry": "apollo.localization.Gps",
    "/apollo/navigation": "apollo.relative_map.NavigationInfo",
    "/apollo/localization/msf_gnss": "apollo.localization.LocalizationEstimate",
    "/apollo/drive_event": "apollo.common.DriveEvent",
    "/apollo/routing_response": "apollo.routing.RoutingResponse",
    "/apollo/canbus/chassis": "apollo.canbus.Chassis",
    "/apollo/localization/msf_status": "apollo.localization.LocalizationStatus",
    "/apollo/sensor/gnss/best_pose": "apollo.drivers.gnss.GnssBestPose",
    "/apollo/sensor/gnss/gnss_status": "apollo.drivers.gnss.GnssStatus",
    "/apollo/sensor/gnss/corrected_imu": "apollo.localization.CorrectedImu",
    "/apollo/sensor/gnss/ins_stat": "apollo.drivers.gnss.InsStat",
    "/apollo/sensor/gnss/rtk_obs": "apollo.drivers.gnss.EpochObservation",
    "/apollo/sensor/gnss/raw_data": "apollo.drivers.gnss.RawData",
    "/apollo/perception/traffic_light": "apollo.perception.TrafficLightDetection",
    "/apollo/localization/msf_lidar": "apollo.localization.LocalizationEstimate",
    "/apollo/control/pad": "apollo.control.PadMessage",
    "/apollo/guardian": "apollo.guardian.GuardianCommand",
    "/apollo/hmi/audio_capture": "apollo.dreamview.AudioCapture"
};

const messageObjects = {
    // "/tf_static": [],
    "/apollo/monitor": [],
    "/apollo/localization/pose": [],
    "/apollo/perception/obstacles": [],
    "/apollo/planning": [],
    "/apollo/sensor/gnss/imu": [],
    "/apollo/canbus/chassis_detail": [],
    "/apollo/hmi/status": [],
    "/apollo/routing_request": [],
    // "/apollo/sensor/gnss/rtk_eph": [],
    // "/tf": [],
    "/apollo/control": [],
    "/apollo/monitor/system_status": [],
    "/apollo/prediction": [],
    "/apollo/sensor/gnss/odometry": [],
    "/apollo/navigation": [],
    "/apollo/localization/msf_gnss": [],
    "/apollo/drive_event": [],
    "/apollo/routing_response": [],
    "/apollo/canbus/chassis": [],
    // "/apollo/localization/msf_status": [],
    "/apollo/sensor/gnss/best_pose": [],
    "/apollo/sensor/gnss/gnss_status": [],
    "/apollo/sensor/gnss/corrected_imu": [],
    "/apollo/sensor/gnss/ins_stat": [],
    "/apollo/sensor/gnss/rtk_obs": [],
    "/apollo/sensor/gnss/raw_data": [],
    "/apollo/perception/traffic_light": [],
    "/apollo/localization/msf_lidar": [],
    "/apollo/control/pad": [],
    "/apollo/guardian": [],
};

// load original record file
const recordFile = "../data/demo_3.5.record";
console.log(parser.parse(recordFile, messageObjects, parsers));

// configure the obstacle data
const {PerceptionObstacle} = require("../../protobuf_out/modules/perception/proto/perception_obstacle_pb");

const obstacleData = {
    id: 1000,
    position: {
        x: 587720,
        y: 4141421,
        z: -32.4
    },
    length: 4,
    width: 4,
    height: 4,
    polygonPointList: [
        {x: 587718, y: 4141419, z: -32.4},
        {x: 587718, y: 4141423, z: -32.4},
        {x: 587722, y: 4141423, z: -32.4},
        {x: 587722, y: 4141419, z: -32.4},
    ],
    anchorPoint: {
        x: 587720,
        y: 4141421,
        z: -32.4
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

const injectStartTimestamp = 1545095755.823001;

messageObjects["/apollo/perception/obstacles"].forEach(msg => {
    if (msg.header.timestampSec >= injectStartTimestamp) {
        msg.perceptionObstacleList.push({
            ...obstacleData,
            timestamp: msg.header.timestampSec,
            trackingTime: msg.header.timestampSec - injectStartTimestamp
        });
    }
});

const outputFile = "../data/demo_3.5.simple_cube.record";
writer.run(outputFile, messageObjects, parsers, messageTypes);
