const {
    Channel,
    SingleMessage
} = require("../protobuf_out/cyber/proto/record_pb");
const {channelTypeExtract} = require("./common");
const HeaderBuilder = require("./HeaderBuilder");
const RecordFileWriter = require("./RecordFileWriter");


class RecordWriter {
    constructor() {
        this.filePath = null;
        this.fileIndex = 0;
        this.parsers = null;
        this.header = HeaderBuilder.GetHeader();
        this.fileWriter = null;
        this.segmentRawSize = 0;
        this.segmentBeginTime = 0;
        this.messages = null;
        this.parsers = null;
        this.messageTypes = null;
    }

    Open(outputFile) {
        this.outputFile = outputFile;
        if (this.header.getSegmentInterval() > 0 || this.header.getSegmentRawSize() > 0) {
            this.filePath = outputFile + "." + `${this.fileIndex++}`.padStart(5, "0");
        } else {
            this.filePath = outputFile;
        }

        this.fileWriter = new RecordFileWriter();
        if (!this.fileWriter.Open(this.filePath)) {
            console.error(`Failed to open output record file: ${this.filePath}`);
            return false;
        }

        if (!this.fileWriter.WriteHeader(this.header)) {
            console.error(`Failed to write header: ${this.filePath}`);
            this.fileWriter.Close();
            return false;
        }
    }

    InitReadersImpl(messages, parsers) {
        for (const channelName of Object.keys(messages)) {
            const channelParser = parsers[channelName];
            if (!channelParser) {
                console.error(`[RecordWriter] InitReadersImpl : channel type not found for ${channelName}`);
                return false;
            }
            this.WriteChannel(channelName, channelParser);
        }
        return true;
    }

    WriteChannel(channelName, channelParser) {
        const channelType = this.messageTypes ? this.messageTypes[channelName] : channelTypeExtract(channelParser);
        const channel = new Channel();
        channel.setName(channelName);
        channel.setMessageType(channelType);
        console.log(channel.toObject());
        return this.fileWriter.WriteChannel(channel);
    }

    mergeMessage(messages, parsers) {
        const mergedMessageList = [];
        for (const [channelName, channelData] of Object.entries(messages)) {
            const parser = parsers[channelName];
            let channelMessageList;
            if (Array.isArray(channelData)) {
                channelMessageList = channelData;
            } else {
                channelMessageList = Object.values(channelData);
            }

            channelMessageList.forEach(msg => {
                // console.log(new parser(msg));
                let lidarTimestamp;

                if (msg.header) {
                    if (msg.header.lidarTimestamp) {
                        lidarTimestamp = msg.header.lidarTimestamp;
                    } else if (msg.header.timestampSec) {
                        lidarTimestamp = Math.round(msg.header.timestampSec * 1e9);
                    }
                } else if (msg.singleMessageLidarTimestamp) {
                    lidarTimestamp = msg.singleMessageLidarTimestamp;
                }

                if (lidarTimestamp) {
                    mergedMessageList.push({
                        channelName,
                        message: parser.fromObject(msg),
                        lidarTimestamp,
                    });
                }
            });
        }
        mergedMessageList.sort((a, b) => {
            return a.lidarTimestamp - b.lidarTimestamp;
        });
        return mergedMessageList;
    }

    run(filePath, messages, parsers, messageTypes = null) {
        this.messages = messages;
        this.parsers = parsers;
        this.messageTypes = messageTypes;

        this.Open(filePath);
        this.InitReadersImpl(messages, parsers);
        const mergedMessages = this.mergeMessage(messages, parsers);

        mergedMessages.forEach(({channelName, message, lidarTimestamp}, index) => {
            console.log(`[RecordWriter] ======== ${index} / ${mergedMessages.length} =======`);
            const singleMessage = new SingleMessage();
            singleMessage.setChannelName(channelName);
            singleMessage.setContent(message.serializeBinary());
            singleMessage.setTime(lidarTimestamp);
            this.WriteMessage(singleMessage);
        });

        this.Close();
    }

    WriteMessage(singleMessage) {
        if (!this.fileWriter.WriteMessage(singleMessage)) {
            console.error(`[RecordWriter] Write message failed`);
            return false;
        }

        this.segmentRawSize += singleMessage.getContent().length;
        if (this.segmentBeginTime === 0) {
            this.segmentBeginTime = singleMessage.getTime();
        }
        if (this.segmentBeginTime > singleMessage.getTime()) {
            this.segmentBeginTime = singleMessage.getTime();
        }

        if ((this.header.getSegmentInterval() > 0 && singleMessage.getTime() - this.segmentBeginTime > this.header.getSegmentInterval())
            || (this.header.getSegmentRawSize() > 0 && this.segmentRawSize > this.header.getSegmentRawSize())) {
            this.fileWriter.Close();

            if (!this.SplitOutFile()) {
                console.error(`[RecordWriter] Split out file has failed.`);
                return false;
            }
        }
    }

    SplitOutFile() {
        this.fileWriter = new RecordFileWriter();
        if (this.fileIndex > 99999) {
            this.fileIndex = 0;
        }
        this.filePath = this.outputFile + "." + `${this.fileIndex++}`.padStart(5, "0");
        this.segmentRawSize = 0;
        this.segmentBeginTime = 0;

        if (!this.fileWriter.Open(this.filePath)) {
            console.error(`Failed to open record file: ${this.filePath}`);
            return false;
        }

        if (!this.fileWriter.WriteHeader(this.header)) {
            console.error(`Failed to write header for record file: ${this.filePath}`);
            return false;
        }

        for (const channelName of Object.keys(this.messages)) {
            const channel = new Channel();
            channel.setName(channelName);
            channel.setMessageType(this.messageTypes ? this.messageTypes[channelName] : channelTypeExtract(this.parsers[channelName]));
            channel.setProtoDesc("");
            if (!this.fileWriter.WriteChannel(channel)) {
                console.error(`Failed to write channel for record file: ${this.filePath}`);
                return false;
            }
        }
        return true;
    }

    Close() {
        if (this.fileWriter) {
            this.fileWriter.Close();
        }
    }
}

module.exports = RecordWriter;