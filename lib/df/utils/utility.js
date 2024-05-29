//update ES6
"use strict";

const assert = require("assert");

class DoctrineError extends Error {
	constructor(message) {
		super(message);
		this.name = "DoctrineError";
	}
}

const throwError = (message) => {
	throw new DoctrineError(message);
};

module.exports = {
	DoctrineError,
	throwError,
	assert,
};
