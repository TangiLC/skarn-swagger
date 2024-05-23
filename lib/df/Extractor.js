"use strict";

const { parse: doctrineParse } = require('./utils/doctrine');
const { Transform } = require('stream');

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
    const comment = this.unfinishedChunk.join('\n');
    this.resetChunk();
    return comment;
  }

  consumeLine(line) {
    const match = line.match(jsdoc.singleLine);
    if (match) {
      return this.addDoc(match[1].trim());
    } else if (line.match(jsdoc.start)) {
      this.addLine(line, true);
    } else if (this.unfinishedChunk.length) {
      if (line.match(jsdoc.end)) {
        this.addLine(line);
        return this.addDoc(this.getRawCommentAndReset());
      } else if (line.match(jsdoc.line)) {
        this.addLine(line);
      } else {
        this.resetChunk();
      }
    }
    return null;
  }

  addDoc(docBlock) {
    const comment = doctrineParse(docBlock, { ...this.opts, unwrap: true });
    this.push(comment);
    return comment;
  }

  _transform(chunk, encoding, callback) {
    const lines = chunk.toString().split(/\r?\n/);
    while (lines.length) {
      this.consumeLine(lines.shift());
    }
    callback();
  }

  extract(content) {
    const comments = [];
    const lines = content.toString().split(/\r?\n/);
    while (lines.length) {
      const comment = this.consumeLine(lines.shift());
      if (comment) comments.push(comment);
    }
    return comments;
  }
}

exports.default = Extractor;
