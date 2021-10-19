const {
    Header,
    CompressType
} = require("../protobuf_out/cyber/proto/record_pb");

const MAJOR_VERSION_ = 1;
const MINOR_VERSION_ = 0;
const COMPRESS_TYPE_ = CompressType.COMPRESS_NONE;
const CHUNK_INTERVAL_ = 20 * 1000 * 1000 * 1000;    // 20s
const SEGMENT_INTERVAL_ = 60 * 1000 * 1000 * 1000;  // 60s
const CHUNK_RAW_SIZE_ = 200 * 1024 * 1024;     // 200MB
const SEGMENT_RAW_SIZE_ = 2048 * 1024 * 1024;  // 2GB

class HeaderBuilder {
    static GetHeader() {
        const header = new Header();
        header.setMajorVersion(MAJOR_VERSION_);
        header.setMinorVersion(MINOR_VERSION_);
        header.setCompress(COMPRESS_TYPE_);
        header.setChunkInterval(CHUNK_INTERVAL_);
        header.setSegmentInterval(SEGMENT_INTERVAL_);
        header.setIndexPosition(0);
        header.setChunkNumber(0);
        header.setChannelNumber(0);
        header.setBeginTime(0);
        header.setEndTime(0);
        header.setMessageNumber(0);
        header.setSize(0);
        header.setIsComplete(false);
        header.setChunkRawSize(CHUNK_RAW_SIZE_);
        header.setSegmentRawSize(SEGMENT_RAW_SIZE_);
        return header;
    }
}

module.exports = HeaderBuilder;