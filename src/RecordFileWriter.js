const fs = require("fs");
const {
    Header,
    SectionType,
    Index,
    Channel,
    ChunkHeader,
    ChunkHeaderCache,
    ChunkBody,
    ChunkBodyCache,
    ChannelCache
} = require("../protobuf_out/cyber/proto/record_pb");
const {HEADER_LENGTH, Chunk} = require("./common");

// record_file_writer.cc
class RecordFileWriter {
    constructor() {
        this.path_ = null;
        this.fd_ = null;
        this.header_ = null;
        this.index_ = new Index();
        this.currentPosition = 0;
        this.chunkActive = null;
        this.channelMessageNumberMap = {};
    }

    Open(path) {
        console.log(`[RecordFileWriter] opening ${path}`);
        this.path_ = path;
        try {
            this.fd_ = fs.openSync(path, "w");
        } catch (err) {
            console.error(`open file failed, file ${path}, fd: ${this.fd_}, err: ${err}`);
            return false;
        }
        this.chunkActive = new Chunk();
        return true;
    }

    WriteHeader(header) {
        this.header_ = header;
        if (!this.WriteSection(header)) {
            console.error(`[RecordFileWriter] write header section failed`);
            return false;
        }
        return true;
    }

    WriteSection(message) {
        console.log(message);
        let type;
        if (message instanceof ChunkHeader) {
            console.log(`[WriteSection] writing ChunkHeader section`);
            type = SectionType.SECTION_CHUNK_HEADER;
        } else if (message instanceof ChunkBody) {
            console.log(`[WriteSection] writing ChunkBody section`);
            type = SectionType.SECTION_CHUNK_BODY;
        } else if (message instanceof Channel) {
            console.log(`[WriteSection] writing Channel section`);
            type = SectionType.SECTION_CHANNEL;
        } else if (message instanceof Header) {
            console.log(`[WriteSection] writing Header section`);
            type = SectionType.SECTION_HEADER;
            if (!this.SetPosition(0)) {
                console.error(`[RecordFileWriter] Jump to position #0 failed`);
                return false;
            }
        } else if (message instanceof Index) {
            console.log(`[WriteSection] writing Index section`);
            type = SectionType.SECTION_INDEX;
        } else {
            console.error(`[RecordFileWriter] Do not support this type: ${message.constructor.name}`);
            return false;
        }

        const messageBinary = message.serializeBinary();

        const sectionTypeBuf = Buffer.alloc(4);
        sectionTypeBuf.writeInt32LE(type, 0);
        const sectionSizeBuf = Buffer.alloc(8);
        sectionSizeBuf.writeBigInt64LE(BigInt(messageBinary.length), 0);

        try {
            if (!this.writeBytes(sectionTypeBuf)) {
                return false;
            }
            if (!this.padBytes(4)) {
                return false;
            }
            if (!this.writeBytes(sectionSizeBuf)) {
                return false;
            }
            if (!this.writeBytes(messageBinary)) {
                return false;
            }
            if (type === SectionType.SECTION_HEADER && !this.padBytes(HEADER_LENGTH - messageBinary.length)) {
                return false;
            }
            this.header_.setSize(this.currentPosition);
        } catch (err) {
            console.error(`[RecordFileWriter] write section failed: ${err}`);
            return false;
        }

        return true;
    }

    WriteChannel(channel) {
        let pos = this.currentPosition;
        if (!this.WriteSection(channel)) {
            console.error(`[RecordFileWriter] Write section fail`);
            return false;
        }
        this.header_.setChannelNumber(this.header_.getChannelNumber() + 1);

        const singleIndex = this.index_.addIndexes();
        singleIndex.setType(SectionType.SECTION_CHANNEL);
        singleIndex.setPosition(pos);
        const channelCache = new ChannelCache();
        channelCache.setName(channel.getName());
        channelCache.setMessageNumber(0);
        channelCache.setMessageType(channel.getMessageType());
        channelCache.setProtoDesc("");
        singleIndex.setChannelCache(channelCache);
        return true;
    }

    WriteMessage(singleMessage) {
        this.chunkActive.add(singleMessage);
        if (!this.channelMessageNumberMap.hasOwnProperty(singleMessage.getChannelName())) {
            this.channelMessageNumberMap[singleMessage.getChannelName()] = 1;
        } else {
            this.channelMessageNumberMap[singleMessage.getChannelName()] += 1;
        }
        let needFlush = false;
        if (this.header_.getChunkInterval() > 0 &&
            singleMessage.getTime() - this.chunkActive.header.getBeginTime() > this.header_.getChunkInterval()) {
            needFlush = true;
        }

        if (this.header_.getChunkRawSize() > 0 &&
            this.chunkActive.header.getRawSize() > this.header_.getChunkRawSize()) {
            needFlush = true;
        }
        if (!needFlush) {
            return true;
        }

        if (!this.Flush()) {
            console.error(`[RecordFileWriter] Write chunk failed`);
            return false;
        }
    }

    WriteChunk(chunkHeader, chunkBody) {
        let pos = this.currentPosition;
        if (!this.WriteSection(chunkHeader)) {
            console.error(`[RecordFileWriter] write chunk header failed`);
            return false;
        }
        let singleIndex = this.index_.addIndexes();
        singleIndex.setType(SectionType.SECTION_CHUNK_HEADER);
        singleIndex.setPosition(pos);

        const chunkHeaderCache = new ChunkHeaderCache();
        chunkHeaderCache.setBeginTime(chunkHeader.getBeginTime());
        chunkHeaderCache.setEndTime(chunkHeader.getEndTime());
        chunkHeaderCache.setMessageNumber(chunkHeader.getMessageNumber());
        chunkHeaderCache.setRawSize(chunkHeader.getRawSize());
        singleIndex.setChunkHeaderCache(chunkHeaderCache);

        pos = this.currentPosition;
        if (!this.WriteSection(chunkBody)) {
            console.error(`[RecordFileWriter] Write chunk body failed`);
            return false;
        }
        this.header_.setChunkNumber(this.header_.getChunkNumber() + 1);
        if (this.header_.getBeginTime() === 0) {
            this.header_.setBeginTime(chunkHeader.getBeginTime());
        }
        this.header_.setEndTime(chunkHeader.getEndTime());
        this.header_.setMessageNumber(this.header_.getMessageNumber() + chunkHeader.getMessageNumber());
        singleIndex = this.index_.addIndexes();
        singleIndex.setType(SectionType.SECTION_CHUNK_BODY);
        singleIndex.setPosition(pos);

        const chunkBodyCache = new ChunkBodyCache();
        chunkBodyCache.setMessageNumber(chunkBody.getMessagesList().length);
        singleIndex.setChunkBodyCache(chunkBodyCache);
        return true;
    }

    WriteIndex() {
        const indexList = this.index_.getIndexesList();
        for (const singleIndex of indexList) {
            if (singleIndex.getType() === SectionType.SECTION_CHANNEL) {
                const channelCache = singleIndex.getChannelCache();
                if (this.channelMessageNumberMap.hasOwnProperty(channelCache.getName())) {
                    channelCache.setMessageNumber(this.channelMessageNumberMap[channelCache.getName()]);
                }
            }
        }
        this.header_.setIndexPosition(this.currentPosition);
        if (!this.WriteSection(this.index_)) {
            console.error(`[RecordFileWriter] Write index section failed`);
            return false;
        }
        return true;
    }

    Flush() {
        return this.WriteChunk(this.chunkActive.header, this.chunkActive.body);
    }

    padBytes(size) {
        const padBuf = Buffer.alloc(size, 0);
        return this.writeBytes(padBuf);
    }

    writeBytes(buffer) {
        const count = fs.writeSync(this.fd_, buffer, 0, buffer.length, this.currentPosition);
        if (count !== buffer.length) {
            console.error(`[RecordFileWriter] write bytes failed`);
            return false;
        }
        this.currentPosition += buffer.length;
        return true;
    }

    SetPosition(position) {
        this.currentPosition = position;
        return true;
    }

    Close() {
        if (!this.fd_) {
            return;
        }
        this.Flush();

        if (!this.WriteIndex()) {
            console.error(`[RecordFileWriter] Write Index Section failed, file: ${this.path_}`);
            return false;
        }

        this.header_.setIsComplete(true);
        if (!this.WriteHeader(this.header_)) {
            console.error(`[RecordFileWriter] Override header section failed, file: ${this.path_}`);
            return false;
        }
        fs.closeSync(this.fd_);
        this.fd_ = null;
    }
}

module.exports = RecordFileWriter;