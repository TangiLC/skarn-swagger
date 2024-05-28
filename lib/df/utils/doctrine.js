//update ES6
"use strict";

const esutils = require("./es");
const typed = require("./typed");
const utility = require("./utility");
const Rules = require("./rules");

function sliceSource(source, index, last) {
	return source.slice(index, last);
}

const hasOwnProperty = (obj, name) =>
	Object.prototype.hasOwnProperty.call(obj, name);

function shallowCopy(obj) {
	return { ...obj };
}

function isASCIIAlphanumeric(ch) {
	return (
		(ch >= 0x61 && ch <= 0x7a) ||
		(ch >= 0x41 && ch <= 0x5a) ||
		(ch >= 0x30 && ch <= 0x39)
	);
}

function isParamTitle(title) {
	return ["param", "argument", "arg"].includes(title);
}

function isReturnTitle(title) {
	return ["return", "returns"].includes(title);
}

function isProperty(title) {
	return ["property", "prop"].includes(title);
}

function isNameParameterRequired(title) {
	return [
		"param",
		"argument",
		"arg",
		"property",
		"prop",
		"alias",
		"this",
		"mixes",
		"requires",
	].includes(title);
}

function isAllowedName(title) {
	return (
		isNameParameterRequired(title) || ["const", "constant"].includes(title)
	);
}

function isAllowedNested(title) {
	return isProperty(title) || isParamTitle(title);
}

function isAllowedOptional(title) {
	return isProperty(title) || isParamTitle(title);
}

function isTypeParameterRequired(title) {
	return [
		"param",
		"argument",
		"arg",
		"return",
		"returns",
		"define",
		"enum",
		"implements",
		"this",
		"type",
		"typedef",
		"property",
		"prop",
	].includes(title);
}

function isAllowedType(title) {
	return (
		isTypeParameterRequired(title) ||
		[
			"throws",
			"const",
			"constant",
			"namespace",
			"member",
			"var",
			"module",
			"constructor",
			"class",
			"extends",
			"augments",
			"public",
			"private",
			"protected",
		].includes(title)
	);
}

const WHITESPACE =
	"[ \\f\\t\\v\\u00a0\\u1680\\u180e\\u2000-\\u200a\\u202f\\u205f\\u3000\\ufeff]";
const STAR_MATCHER = `(${WHITESPACE}*(?:\\*${WHITESPACE}?)?)(.+|[\r\n\u2028\u2029])`;

function unwrapComment(doc) {
	return doc
		.replace(/^\/\*\*?/, "")
		.replace(/\*\/$/, "")
		.replace(new RegExp(STAR_MATCHER, "g"), "$2")
		.replace(/\s*$/, "");
}

function convertUnwrappedCommentIndex(originalSource, unwrappedIndex) {
	const replacedSource = originalSource.replace(/^\/\*\*?/, "");
	let numSkippedChars = 0;
	const matcher = new RegExp(STAR_MATCHER, "g");
	let match;

	while ((match = matcher.exec(replacedSource))) {
		numSkippedChars += match[1].length;

		if (match.index + match[0].length > unwrappedIndex + numSkippedChars) {
			return (
				unwrappedIndex +
				numSkippedChars +
				originalSource.length -
				replacedSource.length
			);
		}
	}

	return originalSource.replace(/\*\/$/, "").replace(/\s*$/, "").length;
}

(function (exports) {
	let index,
		lineNumber,
		length,
		source,
		originalSource,
		recoverable,
		sloppy,
		strict;

	function advance() {
		const ch = source.charCodeAt(index);
		index += 1;
		if (
			esutils.code.isLineTerminator(ch) &&
			!(ch === 0x0d && source.charCodeAt(index) === 0x0a)
		) {
			lineNumber += 1;
		}
		return String.fromCharCode(ch);
	}

	function scanTitle() {
		let title = "";
		advance();

		while (index < length && isASCIIAlphanumeric(source.charCodeAt(index))) {
			title += advance();
		}

		return title;
	}

	function seekContent() {
		let ch,
			waiting,
			last = index;
		waiting = false;

		while (last < length) {
			ch = source.charCodeAt(last);
			if (
				esutils.code.isLineTerminator(ch) &&
				!(ch === 0x0d && source.charCodeAt(last + 1) === 0x0a)
			) {
				waiting = true;
			} else if (waiting) {
				if (ch === 0x40) {
					break;
				}
				if (!esutils.code.isWhiteSpace(ch)) {
					waiting = false;
				}
			}
			last += 1;
		}
		return last;
	}

	function parseType(title, last, addRange) {
		let ch,
			brace,
			type,
			startIndex,
			direct = false;

		while (index < last) {
			ch = source.charCodeAt(index);
			if (esutils.code.isWhiteSpace(ch)) {
				advance();
			} else if (ch === 0x7b) {
				advance();
				break;
			} else {
				direct = true;
				break;
			}
		}

		if (direct) {
			return null;
		}

		brace = 1;
		type = "";
		while (index < last) {
			ch = source.charCodeAt(index);
			if (esutils.code.isLineTerminator(ch)) {
				advance();
			} else {
				if (ch === 0x7d) {
					brace -= 1;
					if (brace === 0) {
						advance();
						break;
					}
				} else if (ch === 0x7b) {
					brace += 1;
				}
				if (type === "") {
					startIndex = index;
				}
				type += advance();
			}
		}

		if (brace !== 0) {
			return utility.throwError("Braces are not balanced");
		}

		if (isAllowedOptional(title)) {
			return typed.parseParamType(type, {
				startIndex: convertIndex(startIndex),
				range: addRange,
			});
		}

		return typed.parseType(type, {
			startIndex: convertIndex(startIndex),
			range: addRange,
		});
	}

	function scanIdentifier(last) {
		let identifier;
		if (
			!esutils.code.isIdentifierStartES5(source.charCodeAt(index)) &&
			!source[index].match(/[0-9]/)
		) {
			return null;
		}
		identifier = advance();
		while (
			index < last &&
			esutils.code.isIdentifierPartES5(source.charCodeAt(index))
		) {
			identifier += advance();
		}
		return identifier;
	}

	function skipWhiteSpace(last) {
		while (
			index < last &&
			(esutils.code.isWhiteSpace(source.charCodeAt(index)) ||
				esutils.code.isLineTerminator(source.charCodeAt(index)))
		) {
			advance();
		}
	}

	function parseName(last, allowBrackets, allowNestedParams) {
		let name = "",
			useBrackets,
			insideString;

		skipWhiteSpace(last);

		if (index >= last) {
			return null;
		}

		if (source.charCodeAt(index) === 0x5b) {
			if (allowBrackets) {
				useBrackets = true;
				name = advance();
			} else {
				return null;
			}
		}

		name += scanIdentifier(last);

		if (allowNestedParams) {
			if (
				source.charCodeAt(index) === 0x3a &&
				["module", "external", "event"].includes(name)
			) {
				name += advance();
				name += scanIdentifier(last);
			}
			if (
				source.charCodeAt(index) === 0x5b &&
				source.charCodeAt(index + 1) === 0x5d
			) {
				name += advance();
				name += advance();
			}
			while (
				[0x2e, 0x2f, 0x23, 0x2d, 0x7e].includes(source.charCodeAt(index))
			) {
				name += advance();
				name += scanIdentifier(last);
			}
		}

		if (useBrackets) {
			skipWhiteSpace(last);
			if (source.charCodeAt(index) === 0x3d) {
				name += advance();
				skipWhiteSpace(last);

				let ch;
				let bracketDepth = 1;

				while (index < last) {
					ch = source.charCodeAt(index);

					if (esutils.code.isWhiteSpace(ch)) {
						if (!insideString) {
							skipWhiteSpace(last);
							ch = source.charCodeAt(index);
						}
					}

					if (ch === 0x27) {
						insideString = insideString ? "" : "'";
					}

					if (ch === 0x22) {
						insideString = insideString ? "" : '"';
					}

					if (ch === 0x5b) {
						bracketDepth++;
					} else if (ch === 0x5d && --bracketDepth === 0) {
						break;
					}

					name += advance();
				}
			}

			skipWhiteSpace(last);

			if (index >= last || source.charCodeAt(index) !== 0x5d) {
				return null;
			}

			name += advance();
		}

		return name;
	}

	function skipToTag() {
		while (index < length && source.charCodeAt(index) !== 0x40) {
			advance();
		}
		return index < length;
	}

	function convertIndex(rangeIndex) {
		if (source === originalSource) {
			return rangeIndex;
		}
		return convertUnwrappedCommentIndex(originalSource, rangeIndex);
	}

	class TagParser {
		constructor(options, title) {
			this._options = options;
			this._title = title.toLowerCase();
			this._tag = {
				title: title,
				description: null,
			};
			if (this._options.lineNumbers) {
				this._tag.lineNumber = lineNumber;
			}
			this._first = index - title.length - 1;
			this._last = 0;
			this._extra = {};
		}

		addError(errorText, ...args) {
			const msg = errorText.replace(/%(\d)/g, (whole, index) => {
				utility.assert(
					index < args.length,
					"Message reference must be in range"
				);
				return args[index];
			});

			if (!this._tag.errors) {
				this._tag.errors = [];
			}
			if (strict) {
				utility.throwError(msg);
			}
			this._tag.errors.push(msg);
			return recoverable;
		}

		parseType() {
			if (isTypeParameterRequired(this._title)) {
				try {
					this._tag.type = parseType(
						this._title,
						this._last,
						this._options.range
					);
					if (!this._tag.type) {
						if (!isParamTitle(this._title) && !isReturnTitle(this._title)) {
							if (!this.addError("Missing or invalid tag type")) {
								return false;
							}
						}
					}
				} catch (error) {
					this._tag.type = null;
					if (!this.addError(error.message)) {
						return false;
					}
				}
			} else if (isAllowedType(this._title)) {
				try {
					this._tag.type = parseType(
						this._title,
						this._last,
						this._options.range
					);
				} catch (e) {
					//For optional types, lets drop the thrown error when we hit the end of the file
				}
			}
			return true;
		}

		_parseNamePath(optional) {
			const name = parseName(
				this._last,
				sloppy && isAllowedOptional(this._title),
				true
			);
			if (!name) {
				if (!optional) {
					if (!this.addError("Missing or invalid tag name")) {
						return false;
					}
				}
			}
			this._tag.name = name;
			return true;
		}

		parseNamePath() {
			return this._parseNamePath(false);
		}

		parseNamePathOptional() {
			return this._parseNamePath(true);
		}

		parseName() {
			let assign, name;

			if (isAllowedName(this._title)) {
				this._tag.name = parseName(
					this._last,
					sloppy && isAllowedOptional(this._title),
					isAllowedNested(this._title)
				);
				if (!this._tag.name) {
					if (!isNameParameterRequired(this._title)) {
						return true;
					}

					if (
						isParamTitle(this._title) &&
						this._tag.type &&
						this._tag.type.name
					) {
						this._extra.name = this._tag.type;
						this._tag.name = this._tag.type.name;
						this._tag.type = null;
					} else {
						if (!this.addError("Missing or invalid tag name")) {
							return false;
						}
					}
				} else {
					name = this._tag.name;
					if (name.startsWith("[") && name.endsWith("]")) {
						assign = name.substring(1, name.length - 1).split("=");
						if (assign.length > 1) {
							this._tag.default = assign.slice(1).join("=");
						}
						this._tag.name = assign[0];

						if (this._tag.type && this._tag.type.type !== "OptionalType") {
							this._tag.type = {
								type: "OptionalType",
								expression: this._tag.type,
							};
						}
					}
				}
			}

			return true;
		}

		parseDescription() {
			let description = sliceSource(source, index, this._last).trim();
			if (description) {
				if (/^-\s+/.test(description)) {
					description = description.substring(2);
				}
				this._tag.description = description;
			}
			return true;
		}

		parseCaption() {
			let description = sliceSource(source, index, this._last).trim();
			const captionStartTag = "<caption>";
			const captionEndTag = "</caption>";
			const captionStart = description.indexOf(captionStartTag);
			const captionEnd = description.indexOf(captionEndTag);
			if (captionStart >= 0 && captionEnd >= 0) {
				this._tag.caption = description
					.substring(captionStart + captionStartTag.length, captionEnd)
					.trim();
				this._tag.description = description
					.substring(captionEnd + captionEndTag.length)
					.trim();
			} else {
				this._tag.description = description;
			}
			return true;
		}

		parseKind() {
			const kind = sliceSource(source, index, this._last).trim();
			this._tag.kind = kind;
			const validKinds = [
				"class",
				"constant",
				"event",
				"external",
				"file",
				"function",
				"member",
				"mixin",
				"module",
				"namespace",
				"typedef",
			];
			if (!validKinds.includes(kind)) {
				if (!this.addError("Invalid kind name '%0'", kind)) {
					return false;
				}
			}
			return true;
		}

		parseAccess() {
			const access = sliceSource(source, index, this._last).trim();
			this._tag.access = access;
			if (!["private", "protected", "public"].includes(access)) {
				if (!this.addError("Invalid access name '%0'", access)) {
					return false;
				}
			}
			return true;
		}

		parseThis() {
			const value = sliceSource(source, index, this._last).trim();
			if (value && value.startsWith("{")) {
				const gotType = this.parseType();
				if (
					gotType &&
					["NameExpression", "UnionType"].includes(this._tag.type.type)
				) {
					this._tag.name = this._tag.type.name;
					return true;
				} else {
					return this.addError("Invalid name for this");
				}
			} else {
				return this.parseNamePath();
			}
		}

		parseVariation() {
			const text = sliceSource(source, index, this._last).trim();
			const variation = parseFloat(text, 10);
			this._tag.variation = variation;
			if (isNaN(variation)) {
				if (!this.addError("Invalid variation '%0'", text)) {
					return false;
				}
			}
			return true;
		}

		ensureEnd() {
			const shouldBeEmpty = sliceSource(source, index, this._last).trim();
			if (shouldBeEmpty) {
				if (!this.addError("Unknown content '%0'", shouldBeEmpty)) {
					return false;
				}
			}
			return true;
		}

		epilogue() {
			let description = this._tag.description;
			if (
				isAllowedOptional(this._title) &&
				!this._tag.type &&
				description &&
				description.startsWith("[")
			) {
				this._tag.type = this._extra.name;
				if (!this._tag.name) {
					this._tag.name = undefined;
				}

				if (!sloppy) {
					if (!this.addError("Missing or invalid tag name")) {
						return false;
					}
				}
			}
			return true;
		}

		parse() {
			const sequences = Rules[this._title] || [
				"parseType",
				"parseName",
				"parseDescription",
				"epilogue",
			];
			for (const method of sequences) {
				if (!this[method]()) {
					return null;
				}
			}
			return this._tag;
		}
	}

	function parseTag(options) {
		if (!skipToTag()) {
			return null;
		}

		const title = scanTitle();
		const parser = new TagParser(options, title);
		const tag = parser.parse();

		while (index < parser._last) {
			advance();
		}

		return tag;
	}

	function scanJSDocDescription(preserveWhitespace) {
		let description = "",
			ch,
			atAllowed = true;
		while (index < length) {
			ch = source.charCodeAt(index);

			if (atAllowed && ch === 0x40) {
				break;
			}

			if (esutils.code.isLineTerminator(ch)) {
				atAllowed = true;
			} else if (atAllowed && !esutils.code.isWhiteSpace(ch)) {
				atAllowed = false;
			}

			description += advance();
		}

		return preserveWhitespace ? description : description.trim();
	}

	function parse(comment, options = {}) {
		const tags = [];
		let tag, description, interestingTags;

		source =
			typeof options.unwrap === "boolean" && options.unwrap
				? unwrapComment(comment)
				: comment;
		originalSource = comment;

		if (options.tags) {
			if (Array.isArray(options.tags)) {
				interestingTags = Object.fromEntries(
					options.tags.map((tag) => [tag, true])
				);
			} else {
				utility.throwError('Invalid "tags" parameter: ' + options.tags);
			}
		}

		length = source.length;
		index = 0;
		lineNumber = 0;
		recoverable = options.recoverable;
		sloppy = options.sloppy;
		strict = options.strict;

		description = scanJSDocDescription(options.preserveWhitespace);

		while ((tag = parseTag(options))) {
			if (!interestingTags || interestingTags[tag.title]) {
				tags.push(tag);
			}
		}

		return {
			description: description,
			tags: tags,
		};
	}

	exports.parse = parse;
	exports.parseType = typed.parseType;
	exports.parseParamType = typed.parseParamType;
	exports.unwrapComment = unwrapComment;
	exports.Syntax = shallowCopy(typed.Syntax);
	exports.Error = utility.DoctrineError;
	exports.type = {
		Syntax: exports.Syntax,
		parseType: typed.parseType,
		parseParamType: typed.parseParamType,
		stringify: typed.stringify,
	};
})(exports);
