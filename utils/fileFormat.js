const {
	parseDescription,
	parseTypedef,
	parseProperties,
	parseRoute,
	parseTag,
	parseField,
	parseSchema,
	parseType,
	parseEnums,
	parseProduces,
	parseConsumes,
	parseSecurity,
	parseReturn,
} = require("./formatParsers");

function fileFormat(comments, responseFormats) {
	let route,
		parameters = {},
		params = [],
		tags = [],
		components = {},
		schemas = {};

	comments.forEach((comment) => {
		let desc = parseDescription(comment);
		if (comment.tags) {
			comment.tags.forEach((tag) => {
				if (tag.title === "typedef") {
					const typedefParsed = parseTypedef(tag);
					components[typedefParsed.typeName] = typedefParsed.details;
				} else if (tag.title === "route") {
					route = parseRoute(tag.description);
					let parsedTag = parseTag(tag);
					parameters[route.uri] = parameters[route.uri] || {};
					parameters[route.uri][route.method] =
						parameters[route.uri][route.method] || {};
					parameters[route.uri][route.method]["parameters"] = [];
					parameters[route.uri][route.method]["description"] = desc;
					parameters[route.uri][route.method]["tags"] = [parsedTag[0].trim()];
					tags.push({
						name: typeof parsedTag[0] === "string" ? parsedTag[0].trim() : "",
						description:
							typeof parsedTag[1] === "string" ? parsedTag[1].trim() : "",
					});
				} else if (tag.title === "param") {
					let field = parseField(tag.name),
						properties = {
							name: field.name,
							in: field.parameter_type,
							description: tag.description,
							required: field.required,
						},
						schema = parseSchema(tag.type);

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
							properties.schema.enum = [true, false];
						}
					} else {
						properties.schema = schema;
						if (tag.type && tag.type.name === "enum") {
							let parsedEnum = parseEnums(tag.description);
							properties.schema.type = parsedEnum.type;
							properties.schema.enum = parsedEnum.enums;
						}
					}
					params.push(properties);
				} else if (tag.title === "operationId" && route) {
					parameters[route.uri][route.method]["operationId"] = tag.description;
				} else if (tag.title === "summary" && route) {
					parameters[route.uri][route.method]["summary"] = tag.description;
				} else if (tag.title === "produces" && route) {
					parameters[route.uri][route.method]["produces"] = parseProduces(
						tag.description
					);
				} else if (tag.title === "consumes" && route) {
					parameters[route.uri][route.method]["consumes"] = parseConsumes(
						tag.description
					);
				} else if (tag.title === "security" && route) {
					parameters[route.uri][route.method]["security"] = parseSecurity(
						tag.description
					);
				} else if (tag.title === "deprecated" && route) {
					parameters[route.uri][route.method]["deprecated"] = true;
				}

				if (route) {
					if (route.method === "get" || route.method === "delete") {
						parameters[route.uri][route.method]["parameters"] = params;
						parameters[route.uri][route.method]["responses"] = parseReturn(
							comment,
							responseFormats
						);
					} else if (route.method.charAt(0) === "p") {
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
				}
			});
		}
	});
	return {
		parameters: parameters,
		tags: tags,
		components: components,
		schemas: schemas,
	};
}

module.exports = fileFormat;
