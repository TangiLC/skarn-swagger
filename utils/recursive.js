"use strict";

/**
 * Recursively iterate through an object to find specified properties.
 * @function
 * @param {object} obj - Object to iterate
 * @param {function} callback - Function to call on each property
 */
function recursiveIterate(obj, callback, path = []) {
	if (obj && typeof obj === "object") {
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				callback({ path: [...path, key], value: obj[key], key: key });
				recursiveIterate(obj[key], callback, [...path, key]);
			}
		}
	}
}

module.exports = {
	recursiveIterate,
};
