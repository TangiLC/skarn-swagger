"use strict";

const fs = require("fs");

/**
 * Parse a JSDoc comment block from a file content
 * @function
 * @param {string} content - File content
 * @returns {object} Parsed JSDoc comments
 */
function parseFileContent(content, options) {
    const commentBlocks = [];
    const commentPattern = /\/\*\*([\s\S]*?)\*\//g;
    let match;

    while ((match = commentPattern.exec(content)) !== null) {
        const comment = match[1];
        const parsedComment = parseCommentBlock(comment, options);
        if (parsedComment) {
            commentBlocks.push(parsedComment);
        }
    }

    return commentBlocks;
}

/**
 * Parse a single JSDoc comment block
 * @function
 * @param {string} comment - JSDoc comment block
 * @param {object} options - Parsing options
 * @returns {object} Parsed JSDoc comment
 */
function parseCommentBlock(comment, options) {
    const lines = comment.split('\n').map(line => line.trim().replace(/^\* ?/, ''));
    const parsedComment = { description: '', tags: [] };
    let currentTag = null;

    lines.forEach(line => {
        if (line.startsWith('@')) {
            const tagMatch = line.match(/^@(\w+)\s*(.*)/);
            if (tagMatch) {
                currentTag = { title: tagMatch[1], description: tagMatch[2] || '' };
                parsedComment.tags.push(currentTag);
            }
        } else {
            if (currentTag) {
                currentTag.description += ` ${line}`;
            } else {
                parsedComment.description += ` ${line}`;
            }
        }
    });

    return parsedComment;
}

/**
 * Read a file and parse its JSDoc comments
 * @function
 * @param {string} file - Path to the file
 * @returns {object} Parsed JSDoc comments
 */
function parseFile(file) {
    const content = fs.readFileSync(file, "utf-8");
    return parseFileContent(content, { unwrap: true, sloppy: true, tags: null, recoverable: true });
}

/**
 * Recursively iterate through an object to find specified properties.
 * @function
 * @param {object} obj - Object to iterate
 * @param {function} callback - Function to call on each property
 */
function recursiveIterate(obj, callback, path = []) {
    if (obj && typeof obj === 'object') {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                callback({ path: [...path, key], value: obj[key], key: key });
                recursiveIterate(obj[key], callback, [...path, key]);
            }
        }
    }
}

module.exports = {
    parseFileContent,
    parseFile,
    recursiveIterate
};
