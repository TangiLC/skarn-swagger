"use strict";

const {parse} = require("comment-parser");
const { Transform } = require("stream");

const jsdoc = {
	singleLine: /^\s*(\/\*{2}.*\*\/)\s*$/,
	start: /^\s*\/\*{2}\s*$/,
	line: /^\s*\*.*$/,
	end: /^\s*\*\/\s*$/,
};

class Extractor extends Transform {
	constructor(opts = {}) {
		super({ objectMode: true });
		this.unfinishedChunk = [];
		this.opts = opts;
	}

	resetChunk() {
		this.unfinishedChunk = [];
	}

	addLine(line, reset = false) {
		if (reset) this.resetChunk();
		this.unfinishedChunk.push(line);
	}

	getRawCommentAndReset() {
		const comment = this.unfinishedChunk.join("\n");
		this.resetChunk();
		return comment;
	}

	consumeLine(line) {
		const match = line.match(jsdoc.singleLine);

		if (match) {
			// single line
			return this.addDoc(match[1].trim());
		} else if (line.match(jsdoc.start)) {
			// start multiline
			this.addLine(line, true);
		} else if (this.unfinishedChunk.length) {
			if (line.match(jsdoc.end)) {
				// end multiline
				this.addLine(line);
				return this.addDoc(this.getRawCommentAndReset());
			} else if (line.match(jsdoc.line)) {
				// line multiline
				this.addLine(line);
			} else {
				// invalid line in between jsdoc
				this.resetChunk();
			}
		}
		return null;
	}

	addDoc(docBlock) {
		const comment = parse(docBlock);
		this.push(comment);
		return comment;
	}

	_transform(chunk, encoding, callback) {
		const lines = chunk.toString().split(/\r?\n/);

		for (const line of lines) {
			this.consumeLine(line);
		}

		callback();
	}

	extract(content) {
		const comments = [];
		const lines = content.toString().split(/\r?\n/);

		for (const line of lines) {
			const comment = this.consumeLine(line);
			if (comment) comments.push(comment);
		}

		return comments;
	}
}

module.exports = Extractor;
