"use strict";

exports.__esModule = true;
exports.default = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _Extractor = _interopRequireDefault(require("./Extractor"));

function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj };
}

/* eslint-disable no-param-reassign */
var _default = (file, options, callback) => {
	if (!callback && typeof options === "function") {
		callback = options;
		options = null;
	}

	const collected = [];

	_fs.default
		.createReadStream(file, {
			encoding: "utf8",
		})
		.on("error", callback)
		.pipe(new _Extractor.default(options))
		.on("error", callback)
		.on("data", (data) => collected.push(data))
		.on("finish", () => callback(null, collected));
};

exports.default = _default;
