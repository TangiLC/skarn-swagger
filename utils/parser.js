"use strict";

const fs = require("fs");
const Extractor = require("./Extractor");

const validateCallback = (options, callback) => {
	if (!callback && typeof options === "function") {
		return { options: null, callback: options };
	}

	if (typeof callback !== "function") {
		throw new TypeError("Callback must be a function");
	}

	return { options, callback };
};

const parse = (file, options, callback, content = false) => {
	const { options: opts, callback: cb } = validateCallback(options, callback);

	const collected = [];
	fs.createReadStream(file, { encoding: "utf8" })
		.on("error", cb)
		.pipe(new Extractor(opts))
		.on("error", cb)
		.on("data", (data) => collected.push(data))
		.on("finish", () => cb(null, collected));
};

const parseFile = (file, options, callback) => parse(file, options, callback);
const parseFileContent = (file, options, callback) =>
	parse(file, options, callback, true);

module.exports = {
	parseFile,
	parseFileContent,
	Extractor,
};
