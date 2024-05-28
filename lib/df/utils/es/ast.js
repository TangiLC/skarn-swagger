//update ES6
"use strict";

const isExpression = (node) => {
	if (!node) return false;
	const expressionTypes = [
		"ArrayExpression",
		"AssignmentExpression",
		"BinaryExpression",
		"CallExpression",
		"ConditionalExpression",
		"FunctionExpression",
		"Identifier",
		"Literal",
		"LogicalExpression",
		"MemberExpression",
		"NewExpression",
		"ObjectExpression",
		"SequenceExpression",
		"ThisExpression",
		"UnaryExpression",
		"UpdateExpression",
	];
	return expressionTypes.includes(node.type);
};

const isIterationStatement = (node) => {
	if (!node) return false;
	const iterationTypes = [
		"DoWhileStatement",
		"ForInStatement",
		"ForStatement",
		"WhileStatement",
	];
	return iterationTypes.includes(node.type);
};

const isStatement = (node) => {
	if (!node) return false;
	const statementTypes = [
		"BlockStatement",
		"BreakStatement",
		"ContinueStatement",
		"DebuggerStatement",
		"DoWhileStatement",
		"EmptyStatement",
		"ExpressionStatement",
		"ForInStatement",
		"ForStatement",
		"IfStatement",
		"LabeledStatement",
		"ReturnStatement",
		"SwitchStatement",
		"ThrowStatement",
		"TryStatement",
		"VariableDeclaration",
		"WhileStatement",
		"WithStatement",
	];
	return statementTypes.includes(node.type);
};

const isSourceElement = (node) =>
	isStatement(node) || (node != null && node.type === "FunctionDeclaration");

const trailingStatement = (node) => {
	switch (node.type) {
		case "IfStatement":
			return node.alternate ? node.alternate : node.consequent;
		case "LabeledStatement":
		case "ForStatement":
		case "ForInStatement":
		case "WhileStatement":
		case "WithStatement":
			return node.body;
	}
	return null;
};

const isProblematicIfStatement = (node) => {
	if (node.type !== "IfStatement" || !node.alternate) return false;
	let current = node.consequent;
	while (current) {
		if (current.type === "IfStatement" && !current.alternate) {
			return true;
		}
		current = trailingStatement(current);
	}
	return false;
};

export {
	isExpression,
	isStatement,
	isIterationStatement,
	isSourceElement,
	isProblematicIfStatement,
	trailingStatement,
};
