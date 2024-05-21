"use strict";

const _fs = require("fs");
const Extractor = require("./Extractor");

/* eslint-disable no-param-reassign */
const parseFile = (file, options, callback) => {
	if (!callback && typeof options === "function") {
		callback = options;
		options = null;
	}

	if (typeof callback !== "function") {
		throw new TypeError("Callback must be a function");
	}

	const collected = [];

	_fs
		.createReadStream(file, {
			encoding: "utf8",
		})
		.on("error", callback)
		.pipe(new Extractor(options))
		.on("error", callback)
		.on("data", (data) => collected.push(data))
		.on("finish", () => callback(null, collected));
};

module.exports = parseFile;
