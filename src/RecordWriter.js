const fs = require("fs");
const {Header, SectionType, Index, Channel, ChunkHeader, ChunkBody} = require("../protobuf_out/cyber/proto/record_pb");
const {SECTION_LENGTH, HEADER_LENGTH} = require("./common");


class RecordWriter {
    constructor() {
        this.filePath = null;
        this.fd = null;
        this.parsers = null;
    }

    reset() {
        this.fd = null;
        this.filePath = null;
        this.parsers = null;
    }

    write(filePath, messages, parsers) {
        this.close();
        this.reset();

        this.filePath = filePath;
        this.messages = messages;
        this.parsers = parsers;

        if (!this.openFile()) {
            return false;
        }

        if (!this.writeHeader()) {
            return false;
        }
    }

    openFile() {
        try {
            this.fd = fs.openSync(this.filePath, "w");
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    writeHeader() {
        console.log(`writing header`);
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