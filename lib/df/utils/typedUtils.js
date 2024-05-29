//update ES6
"use strict";

const esutils = require("./es/index");

const isTypeName = (ch) =>
	!"><(){}[],:*|?!=".includes(String.fromCharCode(ch)) &&
	!esutils.code.isWhiteSpace(ch) &&
	!esutils.code.isLineTerminator(ch);

const advance = (source, index) => ({
	ch: source.charAt(index),
	index: index + 1,
});

const scanHexEscape = (prefix, source, index) => {
	const len = prefix === "u" ? 4 : 2;
	let code = 0;
	let ch;

	for (let i = 0; i < len; ++i) {
		if (
			index < source.length &&
			esutils.code.isHexDigit(source.charCodeAt(index))
		) {
			({ ch, index } = advance(source, index));
			code = code * 16 + "0123456789abcdef".indexOf(ch.toLowerCase());
		} else {
			return { code: "", index };
		}
	}

	return { code: String.fromCharCode(code), index };
};

module.exports = { isTypeName, advance, scanHexEscape };
