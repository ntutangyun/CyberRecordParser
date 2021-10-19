const {
    ChunkHeader,
    ChunkBody,
} = require("../protobuf_out/cyber/proto/record_pb");


const SECTION_LENGTH = 16;
const HEADER_LENGTH = 2048;

const channelTypeRegex = /proto\.apollo\.\S+\.repeatedFields_/;

function channelTypeExtract(channelType) {
    return channelTypeRegex.exec(channelType.toString())[0]
        .replace("proto.", "")
        .replace(".repeatedFields_", "");
}

class Chunk {
    constructor() {
        this.header = null;
        this.body = null;
        this.clear();
    }

    clear() {
        this.body = new ChunkBody();
        this.header = new ChunkHeader();
        this.header.setBeginTime(0);
        this.header.setEndTime(0);
        this.header.setMessageNumber(0);
        this.header.setRawSize(0);
    }

    add(singleMessage) {
        this.body.addMessages(singleMessage);
        if (this.header.getBeginTime() === 0) {
            this.header.setBeginTime(singleMessage.getTime());
        }
        if (this.header.getBeginTime() > singleMessage.getTime()) {
            this.header.setBeginTime(singleMessage.getTime());
        }
        if (this.header.getEndTime() < singleMessage.getTime()) {
            this.header.setEndTime(singleMessage.getTime());
        }
        this.header.setMessageNumber(this.header.getMessageNumber() + 1);
        this.header.setRawSize(this.header.getRawSize() + singleMessage.getContent().length);
    }

    empty() {
        return this.header.getMessageNumber() === 0;
    }
}

module.exports = {
    SECTION_LENGTH,
    HEADER_LENGTH,
    channelTypeExtract,
    Chunk
};
