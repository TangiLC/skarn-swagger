"use strict";

exports.__esModule = true;
exports.default = void 0;

var _doctrine = require("./utils/doctrine");

var _stream = require("stream");

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    var ownKeys = Object.keys(source);
    if (typeof Object.getOwnPropertySymbols === "function") {
      ownKeys = ownKeys.concat(
        Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }),
      );
    }
    ownKeys.forEach(function (key) {
      _defineProperty(target, key, source[key]);
    });
  }
  return target;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    obj[key] = value;
  }
  return obj;
}

const jsdoc = {
  singleLine: /^\s*(\/\*{2}.*\*\/)\s*$/,
  start: /^\s*\/\*{2}\s*$/,
  line: /^\s*\*.*$/,
  end: /^\s*\*\/\s*$/,
};

class Extractor extends _stream.Transform {
  constructor(opts = {}) {
    super({
      objectMode: true,
    });

    _defineProperty(this, "unfinishedChunk", []);

    _defineProperty(this, "opts", {});

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
      // singleline
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
        // invalid line inbetween jsdoc
        this.resetChunk();
      }
    }

    return null;
  }

  addDoc(docBlock) {
    const comment = (0, _doctrine.parse)(
      docBlock,
      _objectSpread({}, this.opts, {
        unwrap: true,
      }),
    ); // $FlowIssue This is correct as objectMode === true

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
