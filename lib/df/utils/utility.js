//update ES6

"use strict";

class DoctrineError extends Error {
	constructor(message) {
		super(message);
		this.name = "DoctrineError";
	}
}

function throwError(message) {
	throw new DoctrineError(message);
}

import assert from "assert";

export { DoctrineError, throwError, assert };
