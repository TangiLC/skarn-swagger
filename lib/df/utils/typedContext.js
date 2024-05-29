//update ES6
"use strict";

class Context {
	constructor(previous, index, token, value) {
		this._previous = previous;
		this._index = index;
		this._token = token;
		this._value = value;
	}

	restore() {
		return {
			previous: this._previous,
			index: this._index,
			token: this._token,
			value: this._value,
		};
	}

	static save(previous, index, token, value) {
		return new Context(previous, index, token, value);
	}
}

module.exports = Context;
