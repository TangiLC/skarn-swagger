//update ES6

"use strict";

const Extractor = require("./Extractor");

const parseFileContent = (content, options) => {
	const extractor = new Extractor(options);
	return extractor.extract(content);
};

module.exports = { parseFileContent };
