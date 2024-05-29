//update ES6
"use strict";

import * as formatParsers from "./formatParsers";

function fileFormat(comments, responseFormats) {
	let route,
		parameters = {},
		params = [],
		tags = [],
		components = {},
		schemas = {};
	for (let i in comments) {
		let desc = formatParsers.parseDescription(comments);
		if (i === "tags") {
			if (
				comments[i].length > 0 &&
				comments[i][0]["title"] &&
				comments[i][0]["title"] === "typedef"
			) {
				const typedefParsed = formatParsers.parseTypedef(comments[i]);
				components[typedefParsed.typeName] = typedefParsed.details;
				continue;
			}
			for (let j in comments[i]) {
				let title = comments[i][j]["title"];
				let type = comments[i][j]["type"];

				if (title === "route") {
					route = formatParsers.parseRoute(comments[i][j]["description"]);
					let tag = formatParsers.parseTag(comments[i]);
					parameters[route.uri] = parameters[route.uri] || {};
					parameters[route.uri][route.method] =
						parameters[route.uri][route.method] || {};
					if (route.method === "get" || route.method === "delete") {
						parameters[route.uri][route.method]["parameters"] = [];
						parameters[route.uri][route.method]["responses"] =
							formatParsers.parseReturn(comments[i], responseFormats);
					}
					if (route.method.charAt(0) === "p") {
						// PUT POST PATCH Route RequestBody
						let schema = {
							type: "object",
							properties: {},
							required: [],
						};

						let modelName = null;
						comments[i].forEach((comment) => {
							if (
								comment.title === "param" &&
								comment.type &&
								comment.type.name
							) {
								modelName = comment.type.name;
							}
						});

						if (modelName) {
							schema = { $ref: `#/components/schemas/${modelName}` };
						}

						parameters[route.uri][route.method]["requestBody"] = {
							content: {
								"application/json": {
									schema: schema,
								},
							},
						};
						parameters[route.uri][route.method]["responses"] =
							formatParsers.parseReturn(comments[i], responseFormats);
					}
					parameters[route.uri][route.method]["description"] = desc;
					parameters[route.uri][route.method]["tags"] = [tag[0].trim()];
					tags.push({
						name: typeof tag[0] === "string" ? tag[0].trim() : "",
						description: typeof tag[1] === "string" ? tag[1].trim() : "",
					});
				}
				if (title === "param") {
					let field = formatParsers.parseField(comments[i][j]["name"]),
						properties = {
							name: field.name,
							in: field.parameter_type,
							description: comments[i][j]["description"],
							required: field.required,
						},
						schema = formatParsers.parseSchema(comments[i][j]["type"]);
					// we only want a type if there is no referenced schema
					if (!schema) {
						properties.schema = {
							type: formatParsers.parseType(comments[i][j]["type"]),
							default: comments[i][j]["default"],
						};
						if (properties.schema.type === "enum") {
							let parsedEnum = formatParsers.parseEnums(
								comments[i][j]["description"]
							);
							properties.schema.type = parsedEnum.type;
							properties.schema.enum = parsedEnum.enums;
						} else if (properties.schema.type === "boolean") {
							let boolean = [true, false];
							properties.schema.enum = boolean;
						}
					} else if (schema) {
						properties.schema = schema;
						if (type && type.name === "enum") {
							let parsedEnum = formatParsers.parseEnums(
								comments[i][j]["description"]
							);
							properties.schema.type = parsedEnum.type;
							properties.schema.enum = parsedEnum.enums;
						}
					}
					params.push(properties);
				}

				if (title === "operationId" && route) {
					parameters[route.uri][route.method]["operationId"] =
						comments[i][j]["description"];
				}

				if (title === "summary" && route) {
					parameters[route.uri][route.method]["summary"] =
						comments[i][j]["description"];
				}

				if (title === "produces" && route) {
					parameters[route.uri][route.method]["produces"] =
						formatParsers.parseProduces(comments[i][j]["description"]);
				}

				if (title === "consumes" && route) {
					parameters[route.uri][route.method]["consumes"] =
						formatParsers.parseConsumes(comments[i][j]["description"]);
				}

				if (title === "security" && route) {
					parameters[route.uri][route.method]["security"] =
						formatParsers.parseSecurity(comments[i][j]["description"]);
				}

				if (title === "deprecated" && route) {
					parameters[route.uri][route.method]["deprecated"] = true;
				}

				if (route) {
					parameters[route.uri][route.method]["parameters"] = params;
					parameters[route.uri][route.method]["responses"] =
						formatParsers.parseReturn(comments[i], responseFormats);
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

export { fileFormat };
