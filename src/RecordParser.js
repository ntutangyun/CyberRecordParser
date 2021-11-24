const fs = require("fs");
const {Header, SectionType, Index, Channel, ChunkHeader, ChunkBody} = require("../protobuf_out/cyber/proto/record_pb");
const {SECTION_LENGTH, HEADER_LENGTH} = require("./common");

class RecordParser {
    constructor() {
        this.filepath = null;
        this.fd = null;
        this.bytesRead = 0;
        this.header = null;
        this.index = null;
        this.channelInfo = {};
        this.messages = null;
        this.parsers = null;
        this.messageTypes = null;
    }

    reset() {
        this.filepath = null;
        this.fd = null;
        this.bytesRead = 0;
        this.header = null;
        this.index = null;
        this.channelInfo = {};
        this.messages = null;
        this.parsers = null;
    }

    parse(filepath, messages, parsers) {
        this.close();
        this.reset();

        this.filepath = filepath;
        this.messages = messages;
        this.parsers = parsers;

        if (!this.openFile()) {
            return false;
        }

        if (!this.readHeader()) {
            return false;
        }

        if (!this.readIndex()) {
            return false;
        }

        if (!this.readMessages()) {
            return false;
        }

        this.close();
        this.reset();
    }

    getChannels(filepath) {
        this.close();
        this.reset();

        this.filepath = filepath;

        if (!this.openFile()) {
            return false;
        }

        if (!this.readHeader()) {
            return false;
        }

        if (!this.readIndex()) {
            return false;
        }
        return this.index.indexesList.filter(index => index.type === SectionType.SECTION_CHANNEL).map(index => {
            return {
                name: index.channelCache.name,
                messageType: index.channelCache.messageType
            };
        });
    }

    openFile() {
        try {
            this.fd = fs.openSync(this.filepath, "r");
            this.bytesRead = 0;
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    readHeader() {
        console.log("reading header");
        let section = {type: null, size: 0};
        if (!this.readSection(section)) {
            return false;
        }

        if (section.type !== SectionType.SECTION_HEADER) {
            console.error("readHeader: check section type failed");
            return false;
        }

        const result = {};
        if (!this.readTypedSection(section.size, Header, result)) {
            console.error("read typed section failed");
            return false;
        }
        this.header = result.object;
        console.log(this.header);

        this.setPosition(SECTION_LENGTH + HEADER_LENGTH);

        return true;
    }

    readIndex() {
        if (!this.header.isComplete) {
            console.error("recording file is not complete");
            return false;
        }

        this.setPosition(this.header.indexPosition);

        let section = {type: null, size: 0};
        if (!this.readSection(section)) {
            return false;
        }

        if (section.type !== SectionType.SECTION_INDEX) {
            console.error("readHeader: check section type failed");
            return false;
        }

        const result = {};
        if (!this.readTypedSection(section.size, Index, result)) {
            console.error("read typed section failed");
            return false;
        }
        this.index = result.object;
        // console.log(this.index);

        this.index.indexesList.forEach(singleIdx => {
            if (singleIdx.type !== SectionType.SECTION_CHANNEL) {
                return;
            }
            if (!singleIdx.channelCache) {
                console.log(`single channel index does not have channel cache.`);
                return;
            }

            const channelCache = singleIdx.channelCache;
            this.channelInfo[channelCache.name] = channelCache;
        });

        this.setPosition(SECTION_LENGTH + HEADER_LENGTH);

        return true;
    }

    readMessages() {
        let reachEnd = false;

        while (!reachEnd) {
            let section = {type: null, size: 0};
            if (!this.readSection(section)) {
                return false;
            }

            // SectionType = {
            //     "SECTION_HEADER": 0,
            //     "SECTION_CHUNK_HEADER": 1,
            //     "SECTION_CHUNK_BODY": 2,
            //     "SECTION_INDEX": 3,
            //     "SECTION_CHANNEL": 4,
            // }
            switch (section.type) {
                case SectionType.SECTION_INDEX: {
                    console.log(`Read index section of size: ${section.size}`);
                    this.skipPadding(section.size);
                    reachEnd = true;
                    break;
                }
                case SectionType.SECTION_CHANNEL: {
                    console.log(`Read channel section of size: ${section.size}`);
                    const result = {};
                    if (!this.readTypedSection(section.size, Channel, result)) {
                        console.error("read typed section failed");
                        return false;
                    }
                    const channelData = result.object;
                    console.log(`name: ${channelData.name}, type: ${channelData.messageType}`);
                    break;
                }
                case SectionType.SECTION_CHUNK_HEADER: {
                    console.log(`Read chunk header section of size: ${section.size}`);
                    const result = {};
                    if (!this.readTypedSection(section.size, ChunkHeader, result)) {
                        console.error("read typed section failed");
                        return false;
                    }
                    // const chunkHeader = result.object;
                    // console.log(chunkHeader);
                    break;
                }
                case SectionType.SECTION_CHUNK_BODY: {
                    console.log(`Read chunk body section of size: ${section.size}`);
                    const result = {};
                    if (!this.readTypedSection(section.size, ChunkBody, result)) {
                        console.error("read typed section failed");
                        return false;
                    }
                    const chunkBody = result.object;
                    // console.log(chunkBody);

                    chunkBody.messagesList.forEach(msg => {
                        if (!this.messages.hasOwnProperty(msg.channelName) || !this.parsers.hasOwnProperty(msg.channelName)) {
                            return;
                        }

                        const parsedMsg = this.parsers[msg.channelName].deserializeBinary(msg.content).toObject();
                        parsedMsg["singleMessageLidarTimestamp"] = msg.time;

                        if (Array.isArray(this.messages[msg.channelName])) {
                            this.messages[msg.channelName].push(parsedMsg);
                        } else {
                            // const timestamp = parsedMsg.header.lidarTimestamp;
                            const timestamp = msg.time;
                            if (this.messages[msg.channelName].hasOwnProperty(timestamp)) {
                                return;
                            }
                            this.messages[msg.channelName][timestamp] = parsedMsg;
                        }
                    });

                    break;
                }
                default: {
                    console.error(`Invalid section type: ${section.type} size ${section.size}`);
                    return false;
                }
            }
        }
    }

    readSection(section) {
        const sectionTypeBuf = Buffer.alloc(4);
        this.readBytes(sectionTypeBuf);
        this.skipPadding(4);
        // console.log(sectionTypeBuf);

        section.type = sectionTypeBuf.readInt32LE(0);

        const sectionSizeBuf = Buffer.alloc(8);
        this.readBytes(sectionSizeBuf);
        // console.log(sectionSizeBuf);

        section.size = Number(sectionSizeBuf.readBigInt64LE(0));

        return true;
    }

    readTypedSection(size, Type, result) {
        const buf = Buffer.alloc(size);
        if (!this.readBytes(buf)) {
            return false;
        }
        try {
            result.object = Type.deserializeBinary(buf).toObject();
        } catch (err) {
            console.error(err);
            return false;
        }

        return true;
    }

    readBytes(buf) {
        const count = fs.readSync(this.fd, buf, 0, buf.length, null);
        this.bytesRead += count;
        console.log(`bytes read: ${count}, total: ${this.bytesRead}`);
        if (count < 0) {
            console.error("error reading bytes from file.");
            return false;
        } else if (count === 0) {
            console.error("reaching end of file.");
            return false;
        } else if (count !== buf.length) {
            console.error(`Read ${count} bytes, but requested ${buf.length} bytes`);
        }
        return true;
    }

    skipPadding(size) {
        const buf = Buffer.alloc(size);
        this.readBytes(buf);
    }

    setPosition(position) {
        if (position < this.bytesRead) {
            this.close();
            this.openFile();
            this.setPosition(position);
            return;
        }

        this.skipPadding(position - this.bytesRead);
    }

    close() {
        if (this.fd) {
            try {
                fs.closeSync(this.fd);
            } catch (err) {
                console.error(err);
            }
        }
    }
}

module.exports = RecordParser;
