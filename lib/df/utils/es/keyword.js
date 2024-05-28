//update ES6
"use strict";

import * as code from "./code";

const isStrictModeReservedWordES6 = (id) => {
	const strictModeReservedWords = [
		"implements",
		"interface",
		"package",
		"private",
		"protected",
		"public",
		"static",
		"let",
	];
	return strictModeReservedWords.includes(id);
};

const isKeywordES5 = (id, strict) => {
	if (!strict && id === "yield") {
		return false;
	}
	return isKeywordES6(id, strict);
};

const isKeywordES6 = (id, strict) => {
	if (strict && isStrictModeReservedWordES6(id)) {
		return true;
	}

	const keywordLengths = {
		2: ["if", "in", "do"],
		3: ["var", "for", "new", "try"],
		4: ["this", "else", "case", "void", "with", "enum"],
		5: ["while", "break", "catch", "throw", "const", "yield", "class", "super"],
		6: ["return", "typeof", "delete", "switch", "export", "import"],
		7: ["default", "finally", "extends"],
		8: ["function", "continue", "debugger"],
		10: ["instanceof"],
	};

	return keywordLengths[id.length]
		? keywordLengths[id.length].includes(id)
		: false;
};

const isReservedWordES5 = (id, strict) =>
	id === "null" || id === "true" || id === "false" || isKeywordES5(id, strict);

const isReservedWordES6 = (id, strict) =>
	id === "null" || id === "true" || id === "false" || isKeywordES6(id, strict);

const isRestrictedWord = (id) => id === "eval" || id === "arguments";

const isIdentifierNameES5 = (id) => {
	if (id.length === 0) {
		return false;
	}

	for (let i = 0; i < id.length; ++i) {
		const ch = id.charCodeAt(i);
		if (!code.isIdentifierStartES5(ch) && !code.isIdentifierPartES5(ch)) {
			return false;
		}
	}
	return true;
};

const decodeUtf16 = (lead, trail) =>
	(lead - 0xd800) * 0x400 + (trail - 0xdc00) + 0x10000;

const isIdentifierNameES6 = (id) => {
	if (id.length === 0) {
		return false;
	}

	let check = code.isIdentifierStartES6;
	for (let i = 0; i < id.length; ++i) {
		let ch = id.charCodeAt(i);
		if (0xd800 <= ch && ch <= 0xdbff) {
			++i;
			if (i >= id.length) {
				return false;
			}
			const lowCh = id.charCodeAt(i);
			if (!(0xdc00 <= lowCh && lowCh <= 0xdfff)) {
				return false;
			}
			ch = decodeUtf16(ch, lowCh);
		}
		if (!check(ch)) {
			return false;
		}
		check = code.isIdentifierPartES6;
	}
	return true;
};

const isIdentifierES5 = (id, strict) =>
	isIdentifierNameES5(id) && !isReservedWordES5(id, strict);

const isIdentifierES6 = (id, strict) =>
	isIdentifierNameES6(id) && !isReservedWordES6(id, strict);

export {
	isKeywordES5,
	isKeywordES6,
	isReservedWordES5,
	isReservedWordES6,
	isRestrictedWord,
	isIdentifierNameES5,
	isIdentifierNameES6,
	isIdentifierES5,
	isIdentifierES6,
};
