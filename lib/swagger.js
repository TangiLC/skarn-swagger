﻿/**
 * Created by GROOT on 3/27 0027.
 */
/** @module index */
"use strict";

// Dependencies
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const parser = require("swagger-parser");
const swaggerHelpers = require("./swagger-helpers");
const parsedFile = require("../utils/parser");
const fileFormat = require('../utils/fileFormat');
const swaggerUi = require("swagger-ui-express");
//const swaggerUi = require('express-swaggerize-ui');

/**
 * Parses the provided API file for JSDoc comments.
 * @function
 * @param {string} file - File to be parsed
 * @returns {object} JSDoc comments
 * @requires comment-parser
 */
async function parseApiFile(file) {
	const content = fs.readFileSync(file, "utf-8");
	console.log("File content read:", content);

	return new Promise((resolve, reject) => {
		parsedFile.parseFileContent(
			content,
			{
				unwrap: true,
				sloppy: true,
				tags: null,
				recoverable: true,
			},
			(err, comments) => {
				if (err) {
					console.error("Error parsing file content:", err);
					reject(err);
				} else {
					console.log("Parsed comments:", comments);
					resolve(comments);
				}
			}
		);
	});
}

function parseRoute(str) {
	let split = str.split(" ");

	return {
		method: split[0].toLowerCase() || "get",
		uri: split[1] || "",
	};
}

function parseField(str) {
	let split = str.split(".");
	return {
		name: split[0],
		parameter_type: split[1] || "get",
		required: (split[2] && split[2] === "required") || false,
	};
}

function parseType(obj) {
	if (!obj) return undefined;
	if (obj.name) {
		const spl = obj.name.split(".");
		if (spl.length > 1 && spl[1] == "model") {
			return spl[0];
		} else return obj.name;
	} else if (obj.expression && obj.expression.name) {
		return obj.expression.name.toLowerCase();
	} else {
		return "string";
	}
}

function parseSchema(obj) {
	let nativeSchemas = [
		"object",
		"string",
		"integer",
		"boolean",
		"number",
		"error",
		"enum",
	];
	if (!(obj.name || obj.applications)) return undefined;

	if (obj.name && nativeSchemas.indexOf(obj.name.toLowerCase()) === -1) {
		const spl = obj.name.split(".");
		return { $ref: "#/components/schemas/" + spl };
	}
}

function parseItems(obj) {
	if (
		obj.applications &&
		obj.applications.length > 0 &&
		obj.applications[0].name
	) {
		const type = obj.applications[0].name;
		if (
			type == "object" ||
			type == "string" ||
			type == "integer" ||
			type == "boolean" ||
			type == "number"
		) {
			return { type: type };
		} else return { $ref: "#/components/schemas/" + type };
	} else return undefined;
}

function parseReturn(tags, responseFormats) {
	let rets = {};
	let headers = parseHeaders(tags);
	for (let i in tags) {
		if (tags[i]["title"] == "returns" || tags[i]["title"] == "return") {
			let description = tags[i]["description"].split("-"),
				key = description[0].trim();

			rets[key] = {
				description: description[1] ? description[1].trim() : "",
				headers: headers[key],
			};
			const type = parseType(tags[i].type);
			if (type) {
				rets[key].content = {};
				responseFormats.forEach((responseFormat) => {
					rets[key].content[responseFormat] = {
						schema: parseSchema(tags[i].type),
					};
				});
			}
		}
	}
	return rets;
}

function parseDescription(obj) {
	const description = obj.description || "";
	const sanitizedDescription = description.replace("/**", "");
	return sanitizedDescription;
}

function parseTag(tags) {
	for (let i in tags) {
		if (tags[i]["title"] == "group") {
			return tags[i]["description"].split("-");
		}
	}
	return ["default", ""];
}

function parseProduces(str) {
	return str.split(/\s+/);
}

function parseConsumes(str) {
	return str.split(/\s+/);
}

function parseTypedef(tags) {
	const typeName = tags[0]["name"];
	let details = {
		required: [],
		properties: {},
	};
	// if (tags[0].type && tags[0].type.name) {
	//     details.allOf = [{"$ref": '#/components/schemas/' + tags[0].type.name}]
	// }
	for (let i = 1; i < tags.length; i++) {
		if (tags[i].title == "property") {
			let propName = tags[i].name;
			let propNameArr = propName.split(".");

			let props = propNameArr.slice(1, propNameArr.length);
			let required = props.indexOf("required") > -1;
			let readOnly = props.indexOf("readOnly") > -1;

			if (required) {
				if (details.required == null) details.required = [];
				propName = propName.split(".")[0];
				details.required.push(propName);
			}
			var schema = parseSchema(tags[i].type);

			if (schema) {
				details.properties[propName] = schema;
			} else {
				const type = parseType(tags[i].type);
				const parsedDescription = (tags[i].description || "").split(
					/-\s*eg:\s*/
				);
				const description = parsedDescription[0];
				const example = parsedDescription[1];

				let prop = {
					type: type,
					description: description,
					items: parseItems(tags[i].type),
				};
				if (readOnly) {
					prop.readOnly = true;
				}
				details.properties[propName] = prop;
				if (prop.type == "enum") {
					let parsedEnum = parseEnums("-eg:" + example);
					prop.type = parsedEnum.type;
					prop.enum = parsedEnum.enums;
				}

				if (example) {
					switch (type) {
						case "boolean":
							details.properties[propName].example = example === "true";
							break;
						case "integer":
							details.properties[propName].example = +example;
							break;
						case "number":
							details.properties[propName].example = +example;
							break;
						case "enum":
							break;
						default:
							details.properties[propName].example = example;
							break;
					}
				}
			}
		}
	}
	return { typeName, details };
}

function parseSecurity(comments) {
	let security;
	try {
		security = JSON.parse(comments);
	} catch (e) {
		let obj = {};
		obj[comments] = [];
		security = [obj];
	}
	return security;
}

function parseHeaders(comments) {
	let headers = {};
	for (let i in comments) {
		if (
			comments[i]["title"] === "headers" ||
			comments[i]["title"] === "header"
		) {
			let description = comments[i]["description"].split(/\s+-\s+/);

			if (description.length < 1) {
				break;
			}
			let code2name = description[0].split(".");

			if (code2name.length < 2) {
				break;
			}

			let type = code2name[0].match(/\w+/);
			let code = code2name[0].match(/\d+/);

			if (!type || !code) {
				break;
			}
			let code0 = code[0].trim();
			if (!headers[code0]) {
				headers[code0] = {};
			}

			headers[code0][code2name[1]] = {
				type: type[0],
				description: description[1],
			};
		}
	}
	return headers;
}

function parseEnums(description) {
	let enums = ("" + description).split(/-\s*eg:\s*/);
	if (enums.length < 2) {
		return [];
	}
	let parseType = enums[1].split(":");
	if (parseType.length === 1) {
		parseType = ["string", parseType[0]];
	}
	return {
		type: parseType[0],
		enums: parseType[1].split(",").map((el) => el.trim()),
	};
}

/*function fileFormat(comments, responseFormats) {
	let route,
		parameters = {},
		params = [],
		tags = [],
		components = {},
		schemas = {};

	console.log(
		"Starting fileFormat with comments:",
		JSON.stringify(comments, null, 2)
	);

	for (let commentIndex in comments) {
		let comment = comments[commentIndex];
		console.log("Processing comment:", JSON.stringify(comment, null, 2));

		if (comment.tags && Array.isArray(comment.tags)) {
			for (let tagIndex in comment.tags) {
				let tag = comment.tags[tagIndex];
				console.log("Processing tag:", JSON.stringify(tag, null, 2));

				switch (tag.tag) {
					case "typedef":
						if (tag.name) {
							const typedefParsed = parseTypedef(tag);
							components[typedefParsed.typeName] = typedefParsed.details;
							console.log(
								"Parsed typedef:",
								JSON.stringify(typedefParsed, null, 2)
							);
						}
						break;
					case "route":
						if (tag.name) {
							route = parseRoute(tag.description);
							let tagParsed = parseTag(tag);
							parameters[route.uri] = parameters[route.uri] || {};
							parameters[route.uri][route.method] =
								parameters[route.uri][route.method] || {};
							parameters[route.uri][route.method]["parameters"] = [];
							parameters[route.uri][route.method]["description"] =
								comment.description;
							parameters[route.uri][route.method]["tags"] = [
								tagParsed[0].trim(),
							];
							tags.push({
								name:
									typeof tagParsed[0] === "string" ? tagParsed[0].trim() : "",
								description:
									typeof tagParsed[1] === "string" ? tagParsed[1].trim() : "",
							});
							console.log("Parsed route:", JSON.stringify(route, null, 2));
						}
						break;
					case "param":
						if (tag.name) {
							let field = parseField(tag.name),
								properties = {
									name: field.name,
									in: field.parameter_type,
									description: tag.description,
									required: field.required,
								},
								schema = parseSchema(tag.type);

							console.log(
								"Parsed param field:",
								JSON.stringify(field, null, 2)
							);

							if (!schema) {
								properties.schema = {
									type: parseType(tag.type),
									default: tag.default,
								};
								if (properties.schema.type == "enum") {
									let parsedEnum = parseEnums(tag.description);
									properties.schema.type = parsedEnum.type;
									properties.schema.enum = parsedEnum.enums;
								} else if (properties.schema.type == "boolean") {
									let boolean = [true, false];
									properties.schema.enum = boolean;
								}
							} else {
								properties.schema = schema;
								if (tag.type && tag.type.name == "enum") {
									let parsedEnum = parseEnums(tag.description);
									properties.schema.type = parsedEnum.type;
									properties.schema.enum = parsedEnum.enums;
								}
							}
							params.push(properties);
							console.log(
								"Parsed param properties:",
								JSON.stringify(properties, null, 2)
							);
						}
						break;
					case "operationId":
						if (route) {
							parameters[route.uri][route.method]["operationId"] =
								tag.description;
						}
						break;
					case "summary":
						if (route) {
							parameters[route.uri][route.method]["summary"] = tag.description;
						}
						break;
					case "produces":
						if (route) {
							parameters[route.uri][route.method]["produces"] = parseProduces(
								tag.description
							);
						}
						break;
					case "consumes":
						if (route) {
							parameters[route.uri][route.method]["consumes"] = parseConsumes(
								tag.description
							);
						}
						break;
					case "security":
						if (route) {
							parameters[route.uri][route.method]["security"] = parseSecurity(
								tag.description
							);
						}
						break;
					case "deprecated":
						if (route) {
							parameters[route.uri][route.method]["deprecated"] = true;
						}
						break;
				}
			}
		}

		if (route) {
			switch (route.method) {
				case "get":
				case "delete":
					parameters[route.uri][route.method]["parameters"] = params;
					parameters[route.uri][route.method]["responses"] = parseReturn(
						comment,
						responseFormats
					);
					break;
				default:
					if (route.method.charAt(0) === "p") {
						let schema = {};
						params.forEach((param) => {
							schema = param.schema;
						});
						parameters[route.uri][route.method]["requestBody"] = {
							content: {
								"application/json": {
									schema: schema,
								},
							},
						};
						parameters[route.uri][route.method]["responses"] = parseReturn(
							comment,
							responseFormats
						);
					}
					break;
			}
		}
	}
	return {
		parameters: parameters,
		tags: tags,
		components: components,
		schemas: schemas,
	};
}*/

/**
 * Filters JSDoc comments
 * @function
 * @param {object} jsDocComments - JSDoc comments
 * @returns {object} JSDoc comments
 * @requires js-yaml
 */
function filterJsDocComments(jsDocComments) {
	console.log("Filtering comments:", JSON.stringify(jsDocComments, null, 2));

	// Flatten the comments if they are nested arrays
	const flattenedComments = jsDocComments.flat();
	/*console.log(
		"Flattened comments:",
		JSON.stringify(flattenedComments, null, 2)
	);*/

	if (!Array.isArray(flattenedComments)) {
		console.error("flattenedComments is not an array:", flattenedComments);
		return [];
	}

	return flattenedComments.filter(function (item) {
		if (item && item.tags && Array.isArray(item.tags)) {
			// Log the structure of the tags in detail
			console.log(
				"Inspecting tags structure:",
				JSON.stringify(item.tags, null, 2)
			);

			// Check if each tag is an object with the expected properties
			const validTags = item.tags.every((tag) => {
				// Log each tag for debugging
				console.log("Inspecting tag:", JSON.stringify(tag, null, 2));
				return (
					tag &&
					typeof tag === "object" &&
					typeof tag.tag === "string" &&
					typeof tag.name === "string" &&
					tag.type !== undefined
				);
			});

			if (!validTags) {
				console.warn(
					"Invalid tag structure found:",
					JSON.stringify(item.tags, null, 2)
				);
				return false;
			}

			return item.tags.length > 0;
		} else {
			console.warn(
				"Invalid jsDocComment item encountered:",
				JSON.stringify(item, null, 2)
			);
			return false;
		}
	});
}

/**
 * Converts an array of globs to full paths
 * @function
 * @param {array} globs - Array of globs and/or normal paths
 * @return {array} Array of fully-qualified paths
 * @requires glob
 */
function convertGlobPaths(base, globs) {
	return globs.reduce(function (acc, globString) {
		let globFiles = glob.sync(path.resolve(base, globString));
		return acc.concat(globFiles);
	}, []);
}

/**
 * Generates the swagger spec
 * @function
 * @param {object} options - Configuration options
 * @returns {array} Swagger spec
 * @requires swagger-parser
 */
function generateSpecAndMount(app) {
	return async function (options, outputFile) {
		if (!options) {
			throw new Error("'options' is required.");
		} else if (!options.swaggerDefinition) {
			throw new Error("'swaggerDefinition' is required.");
		} else if (!options.files) {
			throw new Error("'files' is required.");
		}

		let swaggerObject = swaggerHelpers.swaggerizeObj(options.swaggerDefinition);
		let apiFiles = convertGlobPaths(options.basedir, options.files);
		let responseFormats = options.responseFormats;

		for (let i = 0; i < apiFiles.length; i++) {
			try {
				console.log(`Parsing file: ${apiFiles[i]}`);
				let parsedFile = await parseApiFile(apiFiles[i]);
				let comments = filterJsDocComments(parsedFile);
				//console.log(`Filtered comments for file ${apiFiles[i]}:`, comments);

				for (let j in comments) {
					try {
						console.log(
							`Processing comment: ${JSON.stringify(comments[j], null, 2)}`
						);
						let parsed = fileFormat(comments[j], responseFormats);
						swaggerHelpers.addDataToSwaggerObject(swaggerObject, [
							{
								paths: parsed.parameters,
								tags: parsed.tags,
								components: {
									schemas: parsed.components,
								},
							},
						]);
					} catch (e) {
						console.log(
							`Incorrect comment format. Method was not documented.\nFile: ${apiFiles[i]}\nComment:`,
							comments[j]
						);
					}
				}
			} catch (error) {
				console.error(`Error parsing file ${apiFiles[i]}:`, error);
			}
		}

		await new Promise((resolve, reject) => {
			parser.parse(swaggerObject, function (err, api) {
				if (err) {
					reject(err);
				} else {
					swaggerObject = api;
					resolve();
				}
			});
		});

		let url = options.route ? options.route.url : "/api-docs";
		let docs = options.route ? options.route.docs : "/api-docs.json";

		app.use(docs, function (req, res) {
			res.json(swaggerObject);
		});
		app.use(
			url,
			swaggerUi.serve,
			swaggerUi.setup({
				route: url,
				docs: docs,
			})
		);
		if (outputFile) {
			fs.writeFileSync(outputFile, JSON.stringify(swaggerObject, null, 2));
			console.log(`Swagger JSON file has been saved to ${outputFile}`);
		}

		return swaggerObject;
	};
}

module.exports = {
	generateSpecAndMount,
	fileFormat,
	parseApiFile,
};
