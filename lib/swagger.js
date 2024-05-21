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
const doctrineFile = require("doctrine-file");
//const swaggerUi = require('swagger-ui-express');
const swaggerUi = require("express-swaggerize-ui");

/**
 * Parses the provided API file for JSDoc comments.
 * @function
 * @param {string} file - File to be parsed
 * @returns {object} JSDoc comments
 * @requires doctrine
 */
function parseApiFile(file) {
	const content = fs.readFileSync(file, "utf-8");

	let comments = doctrineFile.parseFileContent(content, {
		unwrap: true,
		sloppy: true,
		tags: null,
		recoverable: true,
	});
	return comments;
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
		...(split[2] && split[2] === "required" && { required: true }),
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

function fileFormat(comments, responseFormats) {
	let route,
		parameters = {},
		params = [],
		tags = [],
		components = {},
		schemas = {};
	for (let i in comments) {
		let desc = parseDescription(comments);
		if (i == "tags") {
			if (
				comments[i].length > 0 &&
				comments[i][0]["title"] &&
				comments[i][0]["title"] == "typedef"
			) {
				const typedefParsed = parseTypedef(comments[i]);
				components[typedefParsed.typeName] = typedefParsed.details;
				continue;
			}
			for (let j in comments[i]) {
				let title = comments[i][j]["title"];
				let type = comments[i][j]["type"];

				if (title == "route") {
					route = parseRoute(comments[i][j]["description"]);
					let tag = parseTag(comments[i]);
					parameters[route.uri] = parameters[route.uri] || {};
					parameters[route.uri][route.method] =
						parameters[route.uri][route.method] || {};
					if (route.method == "get") {
						parameters[route.uri][route.method]["parameters"] = [];
						parameters[route.uri][route.method]["responses"] = parseReturn(
							comments[i],
							responseFormats
						);
					}
					if (route.method.charAt(0) == "p") {
						//put post patch
						const schema = {
							type: "object",
							properties: {},
						};

						params.forEach((param) => {
							schema.properties[param.name] = param.schema;
							if (param.required) {
								schema.required = schema.required || [];
								schema.required.push(param.name);
							}
						});
						parameters[route.uri][route.method]["requestBody"] = {
							content: {
								"application/json": {
									schema: schema,
								},
							},
						};
						parameters[route.uri][route.method]["responses"] = parseReturn(
							comments[i],
							responseFormats
						);
					}
					parameters[route.uri][route.method]["description"] = desc;
					parameters[route.uri][route.method]["tags"] = [tag[0].trim()];
					tags.push({
						name: typeof tag[0] === "string" ? tag[0].trim() : "",
						description: typeof tag[1] === "string" ? tag[1].trim() : "",
					});
				}
				if (title == "param") {
					let field = parseField(comments[i][j]["name"]),
						properties = {
							name: field.name,
							in: field.parameter_type,
							description: comments[i][j]["description"],
							...(field.required && { required: true }),
						},
						schema = parseSchema(comments[i][j]["type"]);

					if (!schema) {
						properties.schema = {
							type: parseType(comments[i][j]["type"]),
							default: comments[i][j]["default"],
						};
						if (properties.schema.type == "enum") {
							let parsedEnum = parseEnums(comments[i][j]["description"]);
							properties.schema.type = parsedEnum.type;
							properties.schema.enum = parsedEnum.enums;
						} else if (properties.schema.type == "boolean") {
							let boolean = [true, false];
							properties.schema.enum = boolean;
						}
					} else if (schema) {
						properties.schema = schema;
						if (type && type.name == "enum") {
							let parsedEnum = parseEnums(comments[i][j]["description"]);
							properties.schema.type = parsedEnum.type;
							properties.schema.enum = parsedEnum.enums;
						}
					}
					params.push(properties);
				}

				if (title == "operationId" && route) {
					parameters[route.uri][route.method]["operationId"] =
						comments[i][j]["description"];
				}

				if (title == "summary" && route) {
					parameters[route.uri][route.method]["summary"] =
						comments[i][j]["description"];
				}

				if (title == "produces" && route) {
					parameters[route.uri][route.method]["produces"] = parseProduces(
						comments[i][j]["description"]
					);
				}

				if (title == "consumes" && route) {
					parameters[route.uri][route.method]["consumes"] = parseConsumes(
						comments[i][j]["description"]
					);
				}

				if (title == "security" && route) {
					parameters[route.uri][route.method]["security"] = parseSecurity(
						comments[i][j]["description"]
					);
				}

				if (title == "deprecated" && route) {
					parameters[route.uri][route.method]["deprecated"] = true;
				}

				if (route && route.method == "get") {
					parameters[route.uri][route.method]["parameters"] = params;
					parameters[route.uri][route.method]["responses"] = parseReturn(
						comments[i],
						responseFormats
					);
				}
				if (route && route.method == "delete") {
					parameters[route.uri][route.method]["parameters"] = params;
					parameters[route.uri][route.method]["responses"] = parseReturn(
						comments[i],
						responseFormats
					);
				}
				if (route && route.method.charAt(0) == "p") {
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
						comments[i],
						responseFormats
					);
				}
			}
		}
	}
	return {
		parameters: parameters,
		tags: tags,
		components: components,
		schemas: schemas,
	};
}

/**
 * Filters JSDoc comments
 * @function
 * @param {object} jsDocComments - JSDoc comments
 * @returns {object} JSDoc comments
 * @requires js-yaml
 */
function filterJsDocComments(jsDocComments) {
	return jsDocComments.filter(function (item) {
		return item.tags.length > 0;
	});
}

/**
 * Resolves a relative or absolute path based on the given base path and glob string.
 *
 * @param {string} base - Base directory path (absolute/relative)
 * @param {string} globString - Glob pattern string
 * @returns {string} - Resolved absolute path
 */

function resolvePath(base, globString) {
	if (globString.startsWith("/")) {
		return globString;
	}
	if (base.startsWith("/")) {
		return `${base}/${globString}`;
	}
	return `${__dirname}/${base}/${globString}`;
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
		let globFiles = glob.sync(resolvePath(base, globString));
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
	return function (options, outputFile) {
		/* istanbul ignore if */
		if (!options) {
			throw new Error("'options' is required.");
		} /* istanbul ignore if */ else if (!options.swaggerDefinition) {
			throw new Error("'swaggerDefinition' is required.");
		} /* istanbul ignore if */ else if (!options.files) {
			throw new Error("'files' is required.");
		}

		// Build basic swagger json
		let swaggerObject = swaggerHelpers.swaggerizeObj(options.swaggerDefinition);
		let apiFiles = convertGlobPaths(options.basedir, options.files);
		let responseFormats = options.responseFormats;

		// Parse the documentation in the APIs array.
		for (let i = 0; i < apiFiles.length; i = i + 1) {
			let parsedFile = parseApiFile(apiFiles[i]);
			//console.log(JSON.stringify(parsedFile))
			let comments = filterJsDocComments(parsedFile);

			for (let j in comments) {
				try {
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
		}
		parser.parse(swaggerObject, function (err, api) {
			if (!err) {
				swaggerObject = api;
			}
		});

		let url = options.route ? options.route.url : "/api-docs";
		let docs = options.route ? options.route.docs : "/api-docs.json";

		app.use(docs, function (req, res) {
			res.json(swaggerObject);
		});
		app.use(
			url,
			swaggerUi({
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
