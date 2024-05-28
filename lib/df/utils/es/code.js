//updated ES6
"use strict";

import { ES5Regex, ES6Regex, NON_ASCII_WHITESPACES } from "./regex";

const isDecimalDigit = (ch) => 0x30 <= ch && ch <= 0x39; // 0..9

const isHexDigit = (ch) =>
	(0x30 <= ch && ch <= 0x39) || // 0..9
	(0x61 <= ch && ch <= 0x66) || // a..f
	(0x41 <= ch && ch <= 0x46); // A..F

const isOctalDigit = (ch) => ch >= 0x30 && ch <= 0x37; // 0..7

const isWhiteSpace = (ch) =>
	[0x20, 0x09, 0x0b, 0x0c, 0xa0].includes(ch) ||
	(ch >= 0x1680 && NON_ASCII_WHITESPACES.includes(ch));

// 7.3 Line Terminators
const isLineTerminator = (ch) => [0x0a, 0x0d, 0x2028, 0x2029].includes(ch);

// 7.6 Identifier Names and Identifiers
const fromCodePoint = (cp) => {
	if (cp <= 0xffff) {
		return String.fromCharCode(cp);
	}
	const cu1 = String.fromCharCode(Math.floor((cp - 0x10000) / 0x400) + 0xd800);
	const cu2 = String.fromCharCode(((cp - 0x10000) % 0x400) + 0xdc00);
	return cu1 + cu2;
};

const IDENTIFIER_START = new Array(0x80).fill(false).map(
	(_, ch) =>
		(ch >= 0x61 && ch <= 0x7a) || // a..z
		(ch >= 0x41 && ch <= 0x5a) || // A..Z
		ch === 0x24 ||
		ch === 0x5f // $ (dollar) and _ (underscore)
);

const IDENTIFIER_PART = new Array(0x80).fill(false).map(
	(_, ch) => IDENTIFIER_START[ch] || (ch >= 0x30 && ch <= 0x39) // 0..9
);

const isIdentifierStartES5 = (ch) =>
	ch < 0x80
		? IDENTIFIER_START[ch]
		: ES5Regex.NonAsciiIdentifierStart.test(fromCodePoint(ch));

const isIdentifierPartES5 = (ch) =>
	ch < 0x80
		? IDENTIFIER_PART[ch]
		: ES5Regex.NonAsciiIdentifierPart.test(fromCodePoint(ch));

const isIdentifierStartES6 = (ch) =>
	ch < 0x80
		? IDENTIFIER_START[ch]
		: ES6Regex.NonAsciiIdentifierStart.test(fromCodePoint(ch));

const isIdentifierPartES6 = (ch) =>
	ch < 0x80
		? IDENTIFIER_PART[ch]
		: ES6Regex.NonAsciiIdentifierPart.test(fromCodePoint(ch));

export {
	isDecimalDigit,
	isHexDigit,
	isOctalDigit,
	isWhiteSpace,
	isLineTerminator,
	isIdentifierStartES5,
	isIdentifierPartES5,
	isIdentifierStartES6,
	isIdentifierPartES6,
};
