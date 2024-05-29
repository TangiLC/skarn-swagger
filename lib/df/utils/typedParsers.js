//update ES6
"use strict";

const { scanString, scanNumber } = require("./typedScanner");
const { advance, isTypeName } = require("./typedUtils");
const Context = require("./typedContext");
const esutils = require("./es/index");
const utility = require("./utility");
const { Syntax, Token } = require("./const");

const scanTypeName = (source, index, length, value, Token) => {
	value = advance(source, index).ch;
	while (index < length && isTypeName(source.charCodeAt(index))) {
		let ch = source.charCodeAt(index);
		if (ch === 0x2e) {
			// '.'
			if (index + 1 >= length) return { token: Token.ILLEGAL, index };
			let ch2 = source.charCodeAt(index + 1);
			if (ch2 === 0x3c) break; // '<'
		}
		({ ch, index } = advance(source, index));
		value += ch;
	}
	return { token: Token.NAME, index, value };
};

const next = (source, length, index, value, token) => {
	while (
		index < length &&
		esutils.code.isWhiteSpace(source.charCodeAt(index))
	) {
		({ ch: value, index } = advance(source, index));
	}
	if (index >= length) return { token: Token.EOF, index };

	const ch = source.charCodeAt(index);
	const simpleTokens = {
		0x27: Token.STRING,
		0x22: Token.STRING,
		0x3a: Token.COLON,
		0x2c: Token.COMMA,
		0x28: Token.LPAREN,
		0x29: Token.RPAREN,
		0x5b: Token.LBRACK,
		0x5d: Token.RBRACK,
		0x7b: Token.LBRACE,
		0x7d: Token.RBRACE,
		0x3c: Token.LT,
		0x3e: Token.GT,
		0x2a: Token.STAR,
		0x7c: Token.PIPE,
		0x3f: Token.QUESTION,
		0x21: Token.BANG,
		0x3d: Token.EQUAL,
	};
	if (ch in simpleTokens) {
		({ value, index } = advance(source, index));
		return { token: simpleTokens[ch], index };
	}
	if (ch === 0x2e) {
		// '.'
		if (index + 1 < length) {
			const ch1 = source.charCodeAt(index + 1);
			if (
				ch1 === 0x3c ||
				(ch1 === 0x2e &&
					index + 2 < length &&
					source.charCodeAt(index + 2) === 0x2e)
			) {
				index += ch1 === 0x3c ? 1 : 2;
				return { token: ch1 === 0x3c ? Token.DOT_LT : Token.REST, index };
			}
			if (esutils.code.isDecimalDigit(ch1))
				return scanNumber(source, index, length, value, Token);
		}
		return { token: Token.ILLEGAL, index };
	}
	if (esutils.code.isDecimalDigit(ch))
		return scanNumber(source, index, length, value, Token);

	utility.assert(isTypeName(ch));
	return scanTypeName(source, index, length, value, Token);
};

const maybeAddRange = (node, range, addRange, rangeOffset) => {
	if (addRange) node.range = [range[0] + rangeOffset, range[1] + rangeOffset];
	return node;
};

const consume = (source, length, target, token, index, value, text) => {
	utility.assert(token === target, text || "consumed token not matched");
	({ token, index, value } = next(source, length, index, value, token));
	return { token, index, value };
};

const expect = (source, length, target, token, index, value, message) => {
	if (token !== target) utility.throwError(message || "unexpected token");
	({ token, index, value } = next(source, length, index, value, token));
	return { token, index, value };
};

const parseFieldName = (token, value) => {
	if (token === Token.NAME || token === Token.STRING) return value;
	if (token === Token.NUMBER) return String(value);
	utility.throwError("unexpected token");
};

const parseFieldType = (source, length, index, value, token) => {
	const key = value;
	const startIndex = index - value.length;
	({ token, index, value } = next(source, length, index, value, token));
	if (token === Token.COLON) {
		({ token, index, value } = next(source, length, index, value, token));
		return maybeAddRange(
			{
				type: Syntax.FieldType,
				key,
				value: parseTypeExpression(source, length, index, value, token),
			},
			[startIndex, index],
			true,
			0
		);
	}
	return maybeAddRange(
		{ type: Syntax.FieldType, key, value: null },
		[startIndex, index],
		true,
		0
	);
};

const parseRecordType = (source, length, index, value, token) => {
	const fields = [];
	const startIndex = index - 1;
	({ token, index, value } = next(source, length, index, value, token));
	while (token !== Token.RBRACE) {
		fields.push(parseFieldType(source, length, index, value, token));
		if (token !== Token.RBRACE)
			({ token, index, value } = next(source, length, index, value, token));
	}
	({ token, index, value } = next(source, length, index, value, token));
	return maybeAddRange(
		{ type: Syntax.RecordType, fields },
		[startIndex, index],
		true,
		0
	);
};

const parseNameExpression = (source, length, index, value, token) => {
	let name = value;
	const startIndex = index - name.length;
	({ token, index, value } = next(source, length, index, value, token));
	if (
		token === Token.COLON &&
		(name === "module" || name === "external" || name === "event")
	) {
		({ token, index, value } = next(source, length, index, value, token));
		name += ":" + value;
		({ token, index, value } = next(source, length, index, value, token));
	}
	return maybeAddRange(
		{ type: Syntax.NameExpression, name },
		[startIndex, index],
		true,
		0
	);
};

const parseTypeExpressionList = (source, length, index, value, token) => {
	const elements = [parseTop(source, length, index, value, token)];
	while (token === Token.COMMA) {
		({ token, index, value } = consume(
			source,
			length,
			Token.COMMA,
			token,
			index,
			value
		));
		elements.push(parseTop(source, length, index, value, token));
	}
	return elements;
};

const parseTypeName = (source, length, index, value, token) => {
	const expr = parseNameExpression(source, length, index, value, token);
	if (token === Token.DOT_LT || token === Token.LT) {
		({ token, index, value } = next(source, length, index, value, token));
		const applications = parseTypeExpressionList(
			source,
			length,
			index,
			value,
			token
		);
		({ token, index, value } = expect(
			source,
			length,
			Token.GT,
			token,
			index,
			value
		));
		return maybeAddRange(
			{ type: Syntax.TypeApplication, expression: expr, applications },
			[0, index],
			true,
			0
		);
	}
	return expr;
};

const parseResultType = (source, length, index, value, token) => {
	({ token, index, value } = consume(
		source,
		length,
		Token.COLON,
		token,
		index,
		value
	));
	if (token === Token.NAME && value === "void") {
		({ token, index, value } = next(source, length, index, value, token));
		return { type: Syntax.VoidLiteral };
	}
	return parseTypeExpression(source, length, index, value, token);
};

const parseParametersType = (source, length, index, value, token) => {
	const params = [];
	let optionalSequence = false;
	let rest = false;

	while (token !== Token.RPAREN) {
		if (token === Token.REST) {
			rest = true;
			({ token, index, value } = next(source, length, index, value, token));
		}
		let expr = parseTypeExpression(source, length, index, value, token);
		if (expr.type === Syntax.NameExpression && token === Token.COLON) {
			({ token, index, value } = next(source, length, index, value, token));
			expr = maybeAddRange(
				{
					type: Syntax.ParameterType,
					name: expr.name,
					expression: parseTypeExpression(source, length, index, value, token),
				},
				[0, index],
				true,
				0
			);
		}
		if (token === Token.EQUAL) {
			({ token, index, value } = next(source, length, index, value, token));
			expr = maybeAddRange(
				{ type: Syntax.OptionalType, expression: expr },
				[0, index],
				true,
				0
			);
			optionalSequence = true;
		} else if (optionalSequence) {
			utility.throwError("unexpected token");
		}
		if (rest)
			expr = maybeAddRange(
				{ type: Syntax.RestType, expression: expr },
				[0, index],
				true,
				0
			);
		params.push(expr);
		if (token !== Token.RPAREN)
			({ token, index, value } = expect(
				source,
				length,
				Token.COMMA,
				token,
				index,
				value
			));
	}
	return params;
};

const parseFunctionType = (source, length, index, value, token) => {
	utility.assert(
		token === Token.NAME && value === "function",
		"FunctionType should start with 'function'"
	);
	({ token, index, value } = consume(
		source,
		length,
		Token.NAME,
		token,
		index,
		value
	));
	({ token, index, value } = expect(
		source,
		length,
		Token.LPAREN,
		token,
		index,
		value
	));

	let params = [];
	let thisBinding = null;
	let isNew = false;

	if (token !== Token.RPAREN) {
		if (token === Token.NAME && (value === "this" || value === "new")) {
			isNew = value === "new";
			({ token, index, value } = consume(
				source,
				length,
				Token.NAME,
				token,
				index,
				value
			));
			({ token, index, value } = expect(
				source,
				length,
				Token.COLON,
				token,
				index,
				value
			));
			thisBinding = parseTypeName(source, length, index, value, token);
			if (token === Token.COMMA) {
				({ token, index, value } = next(source, length, index, value, token));
				params = parseParametersType(source, length, index, value, token);
			}
		} else {
			params = parseParametersType(source, length, index, value, token);
		}
	}

	({ token, index, value } = expect(
		source,
		length,
		Token.RPAREN,
		token,
		index,
		value
	));
	let result = null;
	if (token === Token.COLON)
		result = parseResultType(source, length, index, value, token);

	const fnType = maybeAddRange(
		{ type: Syntax.FunctionType, params, result },
		[0, index],
		true,
		0
	);
	if (thisBinding) {
		fnType["this"] = thisBinding;
		if (isNew) fnType["new"] = true;
	}
	return fnType;
};

const parseUnionType = (source, length, index, value, token) => {
	const elements = [];
	const startIndex = index - 1;
	({ token, index, value } = consume(
		source,
		length,
		Token.LPAREN,
		token,
		index,
		value,
		"UnionType should start with ("
	));
	if (token !== Token.RPAREN) {
		while (true) {
			elements.push(parseTypeExpression(source, length, index, value, token));
			if (token === Token.RPAREN) break;
			({ token, index, value } = expect(
				source,
				length,
				Token.PIPE,
				token,
				index,
				value
			));
		}
	}
	({ token, index, value } = consume(
		source,
		length,
		Token.RPAREN,
		token,
		index,
		value,
		"UnionType should end with )"
	));
	return maybeAddRange(
		{ type: Syntax.UnionType, elements },
		[startIndex, index],
		true,
		0
	);
};

const parseArrayType = (source, length, index, value, token) => {
	const elements = [];
	const startIndex = index - 1;
	({ token, index, value } = consume(
		source,
		length,
		Token.LBRACK,
		token,
		index,
		value,
		"ArrayType should start with ["
	));
	while (token !== Token.RBRACK) {
		if (token === Token.REST) {
			const restStartIndex = index - 3;
			({ token, index, value } = consume(
				source,
				length,
				Token.REST,
				token,
				index,
				value
			));
			elements.push(
				maybeAddRange(
					{
						type: Syntax.RestType,
						expression: parseTypeExpression(
							source,
							length,
							index,
							value,
							token
						),
					},
					[restStartIndex, index],
					true,
					0
				)
			);
			break;
		} else {
			elements.push(parseTypeExpression(source, length, index, value, token));
		}
		if (token !== Token.RBRACK)
			({ token, index, value } = expect(
				source,
				length,
				Token.COMMA,
				token,
				index,
				value
			));
	}
	({ token, index, value } = expect(
		source,
		length,
		Token.RBRACK,
		token,
		index,
		value
	));
	return maybeAddRange(
		{ type: Syntax.ArrayType, elements },
		[startIndex, index],
		true,
		0
	);
};

const parseBasicTypeExpression = (source, length, index, value, token) => {
	const startIndex = index - (value ? value.length : 0);
	const basicTypeTokens = {
		[Token.STAR]: { type: Syntax.AllLiteral },
		[Token.LPAREN]: () => parseUnionType(source, length, index, value, token),
		[Token.LBRACK]: () => parseArrayType(source, length, index, value, token),
		[Token.LBRACE]: () => parseRecordType(source, length, index, value, token),
		[Token.NAME]: () => {
			if (value === "null") return { type: Syntax.NullLiteral };
			if (value === "undefined") return { type: Syntax.UndefinedLiteral };
			if (value === "true" || value === "false")
				return { type: Syntax.BooleanLiteralType, value: value === "true" };
			const context = Context.save();
			if (value === "function") {
				try {
					return parseFunctionType(source, length, index, value, token);
				} catch (e) {
					context.restore();
				}
			}
			return parseTypeName(source, length, index, value, token);
		},
		[Token.STRING]: () => ({ type: Syntax.StringLiteralType, value }),
		[Token.NUMBER]: () => ({ type: Syntax.NumericLiteralType, value }),
	};

	if (token in basicTypeTokens) {
		const typeNode = basicTypeTokens[token];
		return typeof typeNode === "function"
			? typeNode()
			: maybeAddRange(typeNode, [startIndex, index], true, 0);
	}

	utility.throwError("unexpected token");
};

const parseTypeExpression = (source, length, index, value, token) => {
	const rangeStart = index;
	const nullableOrNonNullableType = (type, prefix) =>
		maybeAddRange(
			{
				type,
				expression: parseBasicTypeExpression(
					source,
					length,
					index,
					value,
					token
				),
				prefix,
			},
			[rangeStart, index],
			true,
			0
		);

	if (token === Token.QUESTION) {
		({ token, index, value } = consume(
			source,
			length,
			Token.QUESTION,
			token,
			index,
			value
		));
		return nullableOrNonNullableType(Syntax.NullableType, true);
	} else if (token === Token.BANG) {
		({ token, index, value } = consume(
			source,
			length,
			Token.BANG,
			token,
			index,
			value
		));
		return nullableOrNonNullableType(Syntax.NonNullableType, true);
	}

	const expr = parseBasicTypeExpression(source, length, index, value, token);
	if (token === Token.BANG) {
		({ token, index, value } = consume(
			source,
			length,
			Token.BANG,
			token,
			index,
			value
		));
		return nullableOrNonNullableType(Syntax.NonNullableType, false);
	} else if (token === Token.QUESTION) {
		({ token, index, value } = consume(
			source,
			length,
			Token.QUESTION,
			token,
			index,
			value
		));
		return nullableOrNonNullableType(Syntax.NullableType, false);
	} else if (token === Token.LBRACK) {
		({ token, index, value } = consume(
			source,
			length,
			Token.LBRACK,
			token,
			index,
			value
		));
		({ token, index, value } = expect(
			source,
			length,
			Token.RBRACK,
			token,
			index,
			value
		));
		return maybeAddRange(
			{
				type: Syntax.TypeApplication,
				expression: { type: Syntax.NameExpression, name: "Array" },
				applications: [expr],
			},
			[rangeStart, index],
			true,
			0
		);
	}

	return expr;
};

const parseTop = (source, length, index, value, token) => {
	const expr = parseTypeExpression(source, length, index, value, token);
	if (token !== Token.PIPE) return expr;

	const elements = [expr];
	({ token, index, value } = consume(
		source,
		length,
		Token.PIPE,
		token,
		index,
		value
	));
	while (token === Token.PIPE) {
		elements.push(parseTypeExpression(source, length, index, value, token));
		({ token, index, value } = consume(
			source,
			length,
			Token.PIPE,
			token,
			index,
			value
		));
	}

	return maybeAddRange(
		{ type: Syntax.UnionType, elements },
		[0, index],
		true,
		0
	);
};

const parseTopParamType = (source, length, index, value, token) => {
	if (token === Token.REST) {
		({ token, index, value } = consume(
			source,
			length,
			Token.REST,
			token,
			index,
			value
		));
		return maybeAddRange(
			{
				type: Syntax.RestType,
				expression: parseTop(source, length, index, value, token),
			},
			[0, index],
			true,
			0
		);
	}

	const expr = parseTop(source, length, index, value, token);
	if (token === Token.EQUAL) {
		({ token, index, value } = consume(
			source,
			length,
			Token.EQUAL,
			token,
			index,
			value
		));
		return maybeAddRange(
			{ type: Syntax.OptionalType, expression: expr },
			[0, index],
			true,
			0
		);
	}

	return expr;
};

const parseType = (src, opt = {}) => {
	const { range: addRange, startIndex: rangeOffset = 0, midstream } = opt;
	const source = src;
	const length = source.length;
	let index = 0;
	let previous = 0;
	let token, value;

	({ token, index, value } = next(source, length, index, value, token));
	const expr = parseTop(source, length, index, value, token);

	if (midstream) return { expression: expr, index: previous };
	if (token !== Token.EOF) utility.throwError("not reach to EOF");

	return expr;
};

const parseParamType = (src, opt = {}) => {
	const { range: addRange, startIndex: rangeOffset = 0, midstream } = opt;
	const source = src;
	const length = source.length;
	let index = 0;
	let previous = 0;
	let token, value;

	({ token, index, value } = next(source, length, index, value, token));
	const expr = parseTopParamType(source, length, index, value, token);

	if (midstream) return { expression: expr, index: previous };
	if (token !== Token.EOF) utility.throwError("not reach to EOF");

	return expr;
};

const stringifyImpl = (node, compact, topLevel) => {
	const joinWith = compact ? "|" : " | ";
	const joinElements = (elements) =>
		elements.map((el) => stringifyImpl(el, compact)).join(compact ? "," : ", ");

	switch (node.type) {
		case Syntax.NullableLiteral:
			return "?";
		case Syntax.AllLiteral:
			return "*";
		case Syntax.NullLiteral:
			return "null";
		case Syntax.UndefinedLiteral:
			return "undefined";
		case Syntax.VoidLiteral:
			return "void";
		case Syntax.UnionType:
			return `${topLevel ? "" : "("}${joinElements(node.elements)}${topLevel ? "" : ")"}`;
		case Syntax.ArrayType:
			return `[${joinElements(node.elements)}]`;
		case Syntax.RecordType:
			return `{${joinElements(node.fields)}}`;
		case Syntax.FieldType:
			return `${node.key}${node.value ? (compact ? ":" : ": ") + stringifyImpl(node.value, compact) : ""}`;
		case Syntax.FunctionType: {
			let result = compact ? "function(" : "function (";
			if (node["this"]) {
				result += compact
					? node["new"]
						? "new:"
						: "this:"
					: node["new"]
						? "new: "
						: "this: ";
				result += stringifyImpl(node["this"], compact);
				if (node.params.length) result += compact ? "," : ", ";
			}
			result +=
				node.params
					.map((param) => stringifyImpl(param, compact))
					.join(compact ? "," : ", ") + ")";
			if (node.result)
				result += (compact ? ":" : ": ") + stringifyImpl(node.result, compact);
			return result;
		}
		case Syntax.ParameterType:
			return `${node.name}${compact ? ":" : ": "}${stringifyImpl(node.expression, compact)}`;
		case Syntax.RestType:
			return `...${node.expression ? stringifyImpl(node.expression, compact) : ""}`;
		case Syntax.NonNullableType:
			return node.prefix
				? `!${stringifyImpl(node.expression, compact)}`
				: `${stringifyImpl(node.expression, compact)}!`;
		case Syntax.OptionalType:
			return `${stringifyImpl(node.expression, compact)}=`;
		case Syntax.NullableType:
			return node.prefix
				? `?${stringifyImpl(node.expression, compact)}`
				: `${stringifyImpl(node.expression, compact)}?`;
		case Syntax.NameExpression:
			return node.name;
		case Syntax.TypeApplication:
			return `${stringifyImpl(node.expression, compact)}.<${joinElements(node.applications)}>`;
		case Syntax.StringLiteralType:
			return `"${node.value}"`;
		case Syntax.NumericLiteralType:
			return String(node.value);
		case Syntax.BooleanLiteralType:
			return String(node.value);
		default:
			utility.throwError(`Unknown type ${node.type}`);
	}
};

const stringify = (node, options = {}) =>
	stringifyImpl(node, options.compact, options.topLevel);

module.exports = {
	parseType,
	parseParamType,
	next,
	scanTypeName,
	scanString,
	scanNumber,
	stringify,
};
