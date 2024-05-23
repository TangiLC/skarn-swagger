"use strict";

const Extractor = require("./Extractor").default;

const parseFileContent = (content, options) => {
  const extractor = new Extractor(options);
  return extractor.extract(content);
};

exports.default = parseFileContent;
