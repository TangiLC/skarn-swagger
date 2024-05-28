//update ES6
"use strict";

import { advance, scanHexEscape } from "./utils";
import esutils from "./es/index";
import utility from "./utility";
import { Token } from "./const";

const scanString = (source, index, length, value) => {
	let str = "";
	let quote = source.charAt(index);
	++index;

	while (index < length) {
		let { ch } = advance(source, index);
		index++;
		if (ch === quote) {
			quote = "";
			break;
		} else if (ch === "\\") {
			({ ch } = advance(source, index));
			index++;
			if (!esutils.code.isLineTerminator(ch.charCodeAt(0))) {
				switch (ch) {
					case "n":
						str += "\n";
						break;
					case "r":
						str += "\r";
						break;
					case "t":
						str += "\t";
						break;
					case "u":
					case "x":
						const restore = index;
						let unescaped;
						({ code: unescaped, index } = scanHexEscape(ch, source, index));
						str += unescaped || ch;
						if (!unescaped) {
							index = restore;
						}
						break;
					case "b":
						str += "\b";
						break;
					case "f":
						str += "\f";
						break;
					case "v":
						str += "\v";
						break;
					default:
						if (esutils.code.isOctalDigit(ch.charCodeAt(0))) {
							let code = "01234567".indexOf(ch);
							if (
								index < length &&
								esutils.code.isOctalDigit(source.charCodeAt(index))
							) {
								({ ch } = advance(source, index));
								index++;
								code = code * 8 + "01234567".indexOf(ch);
								if (
									"0123".indexOf(ch) >= 0 &&
									index < length &&
									esutils.code.isOctalDigit(source.charCodeAt(index))
								) {
									({ ch } = advance(source, index));
									index++;
									code = code * 8 + "01234567".indexOf(ch);
								}
							}
							str += String.fromCharCode(code);
						} else {
							str += ch;
						}
						break;
				}
			} else if (ch === "\r" && source.charCodeAt(index) === 0x0a) {
				++index;
			}
		} else if (esutils.code.isLineTerminator(ch.charCodeAt(0))) {
			break;
		} else {
			str += ch;
		}
	}

	if (quote !== "") {
		utility.throwError("unexpected quote");
	}

	value = str;
	return { token: Token.STRING, index, value };
};

const scanNumber = (source, index, length, value) => {
	let number = "";
	let ch = source.charCodeAt(index);

	if (ch !== 0x2e) {
		({ ch } = advance(source, index));
		index++;
		number += ch;
		ch = source.charCodeAt(index);

		if (number === "0") {
			if (ch === 0x78 || ch === 0x58) {
				({ number, index } = scanHexDigits(source, index, length, number));
				value = parseInt(number, 16);
				return { token: Token.NUMBER, index, value };
			}

			if (esutils.code.isOctalDigit(ch)) {
				({ number, index } = scanOctalDigits(source, index, length, number));
				value = parseInt(number, 8);
				return { token: Token.NUMBER, index, value };
			}

			if (esutils.code.isDecimalDigit(ch)) {
				utility.throwError("unexpected token");
			}
		}

		while (index < length) {
			ch = source.charCodeAt(index);
			if (!esutils.code.isDecimalDigit(ch)) {
				break;
			}
			({ ch } = advance(source, index));
			index++;
			number += ch;
		}
	}

	if (ch === 0x2e) {
		({ number, index } = scanFractionDigits(source, index, length, number));
	}

	if (ch === 0x65 || ch === 0x45) {
		({ number, index } = scanExponentDigits(source, index, length, number));
	}

	if (index < length) {
		ch = source.charCodeAt(index);
		if (esutils.code.isIdentifierStartES5(ch)) {
			utility.throwError("unexpected token");
		}
	}

	value = parseFloat(number);
	return { token: Token.NUMBER, index, value };
};

const scanHexDigits = (source, index, length, number) => {
	let ch;
	while (index < length) {
		ch = source.charCodeAt(index);
		if (!esutils.code.isHexDigit(ch)) {
			break;
		}
		({ ch } = advance(source, index));
		index++;
		number += ch;
	}

	if (number.length <= 2) {
		utility.throwError("unexpected token");
	}

	if (index < length) {
		ch = source.charCodeAt(index);
		if (esutils.code.isIdentifierStartES5(ch)) {
			utility.throwError("unexpected token");
		}
	}
	return { number, index };
};

const scanOctalDigits = (source, index, length, number) => {
	let ch;
	while (index < length) {
		ch = source.charCodeAt(index);
		if (!esutils.code.isOctalDigit(ch)) {
			break;
		}
		({ ch } = advance(source, index));
		index++;
		number += ch;
	}

	if (index < length) {
		ch = source.charCodeAt(index);
		if (
			esutils.code.isIdentifierStartES5(ch) ||
			esutils.code.isDecimalDigit(ch)
		) {
			utility.throwError("unexpected token");
		}
	}
	return { number, index };
};

const scanFractionDigits = (source, index, length, number) => {
	let ch;
	number += ".";
	({ ch } = advance(source, index));
	index++;
	while (index < length) {
		ch = source.charCodeAt(index);
		if (!esutils.code.isDecimalDigit(ch)) {
			break;
		}
		({ ch } = advance(source, index));
		index++;
		number += ch;
	}
	return { number, index };
};

const scanExponentDigits = (source, index, length, number) => {
	let ch;
	({ ch } = advance(source, index));
	index++;
	number += ch;

	ch = source.charCodeAt(index);
	if (ch === 0x2b || ch === 0x2d) {
		({ ch } = advance(source, index));
		index++;
		number += ch;
	}

	while (index < length) {
		ch = source.charCodeAt(index);
		if (!esutils.code.isDecimalDigit(ch)) {
			break;
		}
		({ ch } = advance(source, index));
		index++;
		number += ch;
	}

	return { number, index };
};

export {
	scanString,
	scanNumber,
	scanHexDigits,
	scanOctalDigits,
	scanFractionDigits,
	scanExponentDigits,
};
