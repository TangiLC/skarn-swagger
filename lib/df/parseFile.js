//update ES6
"use strict";

const fs = require("fs");
const Extractor = require("./Extractor");

const parseFile = (file, options, callback) => {
	if (!callback && typeof options === "function") {
		callback = options;
		options = null;
	}

	const collected = [];

	fs.createReadStream(file, { encoding: "utf8" })
		.on("error", callback)
		.pipe(new Extractor(options))
		.on("error", callback)
		.on("data", (data) => collected.push(data))
		.on("finish", () => callback(null, collected));
};

module.exports = { parseFile };
