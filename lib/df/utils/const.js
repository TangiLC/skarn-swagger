//update ES6
const Syntax = {
	NullableLiteral: "NullableLiteral",
	AllLiteral: "AllLiteral",
	NullLiteral: "NullLiteral",
	UndefinedLiteral: "UndefinedLiteral",
	VoidLiteral: "VoidLiteral",
	UnionType: "UnionType",
	ArrayType: "ArrayType",
	RecordType: "RecordType",
	FieldType: "FieldType",
	FunctionType: "FunctionType",
	ParameterType: "ParameterType",
	RestType: "RestType",
	NonNullableType: "NonNullableType",
	OptionalType: "OptionalType",
	NullableType: "NullableType",
	NameExpression: "NameExpression",
	TypeApplication: "TypeApplication",
	StringLiteralType: "StringLiteralType",
	NumericLiteralType: "NumericLiteralType",
	BooleanLiteralType: "BooleanLiteralType",
};

const Token = {
	ILLEGAL: 0, // ILLEGAL
	DOT_LT: 1, // .<
	REST: 2, // ...
	LT: 3, // <
	GT: 4, // >
	LPAREN: 5, // (
	RPAREN: 6, // )
	LBRACE: 7, // {
	RBRACE: 8, // }
	LBRACK: 9, // [
	RBRACK: 10, // ]
	COMMA: 11, // ,
	COLON: 12, // :
	STAR: 13, // *
	PIPE: 14, // |
	QUESTION: 15, // ?
	BANG: 16, // !
	EQUAL: 17, // =
	NAME: 18, // name token
	STRING: 19, // string
	NUMBER: 20, // number
	EOF: 21,
};

module.exports = { Syntax, Token };
