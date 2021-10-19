# Apollo CyberRT Recording Parser (Node.JS)

A Node.JS utility to parse Apollo CyberRT Recording files.

For more information about Apollo CyberRT tools, please refer to
[CyberRT Developer Tools](https://github.com/ApolloAuto/apollo/blob/master/docs/cyber/CyberRT_Developer_Tools.md)

Tested Apollo version:

- Apollo 6.0
- Apollo Pre6

## Setup

* Clone the repository to local environment

```bash
# HTTPS
git clone https://github.com/ntutangyun/CyberRecordParser.git

# SSH
git clone git@github.com:ntutangyun/CyberRecordParser.git  

# install dependencies
npm install
```

* Generate JavaScript protobuf libraries for all the proto definitions in your Apollo version. The generated JS files
  will be saved in folder `/apollo/protobuf_out/`.

```bash
# Inside Apollo container
cd /apollo
mkdir protobuf_out
find modules/ cyber/ -name "*.proto" | grep -v node_modules | xargs protoc --js_out=import_style=commonjs,binary:protobuf_out
```

* If you encounter following or similar error, you may comment out the content of `yolo.proto` in the previous step.

```
...
modules/perception/camera/lib/obstacle/detector/yolo/proto/yolo.proto:6:23: "apollo.perception.camera.yolo.YoloParam.model_param" is already defined in file "modules/perception/camera/lib/obstacle/detector/yolov4/proto/yolov4.proto".
modules/perception/camera/lib/obstacle/detector/yolo/proto/yolo.proto:7:25: "apollo.perception.camera.yolo.YoloParam.net_param" is already defined in file "modules/perception/camera/lib/obstacle/detector/yolov4/proto/yolov4.proto".
modules/perception/camera/lib/obstacle/detector/yolo/proto/yolo.proto:8:21: "apollo.perception.camera.yolo.YoloParam.nms_param" is already defined in file "modules/perception/camera/lib/obstacle/detector/yolov4/proto/yolov4.proto".
modules/perception/camera/lib/obstacle/detector/yolo/proto/yolo.proto:5:9: "apollo.perception.camera.yolo.YoloParam" is already defined in file "modules/perception/camera/lib/obstacle/detector/yolov4/proto/yolov4.proto".
modules/perception/camera/lib/obstacle/detector/yolo/proto/yolo.proto:12:19: "apollo.perception.camera.yolo.ModelParam.model_name" is already defined in file "modules/perception/camera/lib/obstacle/detector/yolov4/proto/yolov4.proto".
modules/perception/camera/lib/obstacle/detector/yolo/proto/yolo.proto:13:19: "apollo.perception.camera.yolo.ModelParam.proto_file" is already defined in file "modules/perception/camera/lib/obstacle/detector/yolov4/proto/yolov4.proto".
...
```

* Copy the generated `protobuf_out` folder into cloned project, such that the file structure looks like:

```
- CyberRecordParser/
    - src/
        - RecordParser.js
        - RecordWriter.js
        - ...
    - examples/
        - parse_example/
            ...
        - write_example/
            ...
    - protobuf_out/
        - cyber/
            ...
        - modules/
            ...
    ...
```

## Example

Please checkout examples under `examples/` folder.

```bash
cd example/parse_example
node parse_example.js
```

## Usage - Parse record binary

* import and instantiate `RecordParser` class

```javascript
const RecordParser = require("../src/RecordParser");
const parser = new RecordParser();
``` 

* import protobuf libraries from `protobuf_out` folder. e.g. If you wish to extract localization and obstacle perception
  channels. Define the parsers object with key: channel name, value: protobuf class.

```javascript
const {PerceptionObstacles} = require("../protobuf_out/modules/perception/proto/perception_obstacle_pb");
const {LocalizationEstimate} = require("../protobuf_out/modules/localization/proto/localization_pb");

const parsers = {
    "/apollo/perception/obstacles": PerceptionObstacles,
    "/apollo/localization/pose": LocalizationEstimate,
};
```

* define the containers for saving the extracted messages. Note that the keys are the channels you wish to extract, and
  the value can be an empty `Object` or an empty `Array`.

```javascript
const messageObjects = {
    "/apollo/perception/obstacles": {},
    "/apollo/localization/pose": {},
};
```

* run the parser

```javascript
const recordFile = "./TEST-rec.00000";
parser.parse(recordFile, messageObjects, parsers);

// you may save the extracted messages into a JSON file for later process.
try {
    fs.writeFileSync("./messageObjects.json", JSON.stringify(messageObjects));
} catch (err) {
    console.error(err);
}
```

* If you define the messages containers as `Object`, the extracted format will be the following. The keys are
  the `LidarTimestamp` (by default) extracted from message header.

```json
{
  "/apollo/perception/obstacles": {
    "1614695837931246000": {
      "perceptionObstacleList": [],
      "header": {
        "timestampSec": 1614695837.931246,
        "moduleName": "perception_obstacle",
        "sequenceNum": 19,
        "lidarTimestamp": 1614695837931246000,
        "version": 1
      },
      "errorCode": 0
    }
  }
}
```

* You can also define message containers as `Array`

```javascript
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
```

* the extracted format for array containers are the following:

```json
{
  "/apollo/perception/obstacles": [
    {
      "perceptionObstacleList": [],
      "header": {
        "timestampSec": 1614695837.931246,
        "moduleName": "perception_obstacle",
        "sequenceNum": 19,
        "lidarTimestamp": 1614695837931246000,
        "version": 1
      },
      "errorCode": 0
    }
  ]
}
```

## Usage - Write binary records

Writing is similar to parsing. Please check `examples/write_example` for reference.

The basic flow of writing or modifying the cyber recordings files are:

1. use the parser to parse the binary recording files and save data in JSON format.
2. change the data directly in the JSON format
3. use the `fromObject()` functions to convert JSON data into protobuf class instances
4. serialize the messages into binary format and save to the new recording file.

#### NOTE

To make writing possible, user need to install the customized version of `protoc`, where I've enabled the
function `fromObject()` which is used to parse the user defined JavaScript objects and create its corresponding protobuf
class instances.

1. Un-compress the zip file at `third-party/protobuf-3.17.3.zip`
2. Open the terminal and build the customized version of the `protoc`

```bash
./autogen.sh
 ./configure
 make
 make check
 sudo make install
 sudo ldconfig # refresh shared library cache.
```

3. use the customized `protoc` to generate the JavaScript libraries
```bash
find modules/ cyber/ -name "*.proto" | grep -v node_modules | xargs protoc --js_out=import_style=commonjs,binary:protobuf_out
```

Please refer to [protocolbuffers](https://github.com/protocolbuffers/protobuf/blob/master/src/README.md) if you
encounter any errors.

