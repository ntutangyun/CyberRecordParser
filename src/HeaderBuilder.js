const {
    Header,
    SectionType,
    Index,
    Channel,
    ChunkHeader,
    ChunkBody,
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
//
// proto::Header;
// HeaderBuilder::GetHeader();
// {
//     proto::Header;
//     header;
//     header.set_major_version(MAJOR_VERSION_);
//     header.set_minor_version(MINOR_VERSION_);
//     header.set_compress(COMPRESS_TYPE_);
//     header.set_chunk_interval(CHUNK_INTERVAL_);
//     header.set_segment_interval(SEGMENT_INTERVAL_);
//     header.set_index_position(0);
//     header.set_chunk_number(0);
//     header.set_channel_number(0);
//     header.set_begin_time(0);
//     header.set_end_time(0);
//     header.set_message_number(0);
//     header.set_size(0);
//     header.set_is_complete(false);
//     header.set_chunk_raw_size(CHUNK_RAW_SIZE_);
//     header.set_segment_raw_size(SEGMENT_RAW_SIZE_);
//     return header;
// }
//
// proto::Header;
// HeaderBuilder::GetHeaderWithSegmentParams(
// const uint64_t;
// segment_interval,
// const uint64_t;
// segment_raw_size;
// )
// {
//     proto::Header;
//     header;
//     header.set_major_version(MAJOR_VERSION_);
//     header.set_minor_version(MINOR_VERSION_);
//     header.set_compress(COMPRESS_TYPE_);
//     header.set_chunk_interval(CHUNK_INTERVAL_);
//     header.set_chunk_raw_size(CHUNK_RAW_SIZE_);
//     header.set_index_position(0);
//     header.set_chunk_number(0);
//     header.set_channel_number(0);
//     header.set_begin_time(0);
//     header.set_end_time(0);
//     header.set_message_number(0);
//     header.set_size(0);
//     header.set_is_complete(false);
//     header.set_segment_raw_size(segment_raw_size);
//     header.set_segment_interval(segment_interval);
//     return header;
// }
//
// proto::Header;
// HeaderBuilder::GetHeaderWithChunkParams(
// const uint64_t;
// chunk_interval,
// const uint64_t;
// chunk_raw_size;
// )
// {
//     proto::Header;
//     header;
//     header.set_major_version(MAJOR_VERSION_);
//     header.set_minor_version(MINOR_VERSION_);
//     header.set_compress(COMPRESS_TYPE_);
//     header.set_segment_interval(SEGMENT_INTERVAL_);
//     header.set_segment_raw_size(SEGMENT_RAW_SIZE_);
//     header.set_index_position(0);
//     header.set_chunk_number(0);
//     header.set_channel_number(0);
//     header.set_begin_time(0);
//     header.set_end_time(0);
//     header.set_message_number(0);
//     header.set_size(0);
//     header.set_is_complete(false);
//     header.set_chunk_interval(chunk_interval);
//     header.set_chunk_raw_size(chunk_raw_size);
//     return header;
// }

// console.log(HeaderBuilder.GetHeader());