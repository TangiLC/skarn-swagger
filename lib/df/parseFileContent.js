"use strict";

exports.__esModule = true;
exports.default = void 0;

var _Extractor = _interopRequireDefault(require("./Extractor"));

function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj };
}

var _default = (content, options) => {
	const extractor = new _Extractor.default(options);
	return extractor.extract(content);
};

exports.default = _default;
