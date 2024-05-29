//update ES6

"use strict";

import Extractor from "./Extractor";

const parseFileContent = (content, options) => {
	const extractor = new Extractor(options);
	return extractor.extract(content);
};

export default parseFileContent;
