// parsers.js

function parseDescription(comments) {
	// Logic to parse the description from comments
	if (comments.description) {
		return comments.description.trim();
	}
	return "";
}

function parseTypedef(tag) {
	// Logic to parse typedefs
	return {
		typeName: tag.name,
		details: {
			type: tag.type,
			properties: parseProperties(tag),
		},
	};
}

function parseProperties(tag) {
	let properties = {};
	tag.source.forEach((source) => {
		if (source.tokens.tag === "@property") {
			properties[source.tokens.name] = {
				type: source.tokens.type.replace(/[{}]/g, ""),
				description: source.tokens.description,
			};
		}
	});
	return properties;
}

function parseRoute(description) {
	// Logic to parse route from description
	let [method, uri] = description.split(" ");
	return {
		method: method.toLowerCase(),
		uri: uri,
	};
}

function parseTag(tag) {
	// Logic to parse tags
	return tag.name.split(".");
}

function parseField(name) {
	// Logic to parse fields
	let parts = name.split(".");
	return {
		name: parts[0],
		parameter_type: parts[1],
		required: parts.includes("required"),
	};
}

function parseSchema(type) {
	// Logic to parse schemas
	if (type && type.name) {
		return {
			$ref: `#/components/schemas/${type.name}`,
		};
	}
	return null;
}

function parseType(type) {
	// Logic to parse types
	if (type && type.names && type.names.length > 0) {
		return type.names[0];
	}
	return "string";
}

function parseEnums(description) {
	// Logic to parse enums
	let enums = description.split(",").map((item) => item.trim());
	return {
		type: "string",
		enums: enums,
	};
}

function parseProduces(description) {
	// Logic to parse produces
	return description.split(",").map((item) => item.trim());
}

function parseConsumes(description) {
	// Logic to parse consumes
	return description.split(",").map((item) => item.trim());
}

function parseSecurity(description) {
	// Logic to parse security
	return description.split(",").map((item) => item.trim());
}

function parseReturn(comment, responseFormats) {
	// Logic to parse return
	let responses = {};
	responseFormats.forEach((format) => {
		responses[format.status] = {
			description: format.description,
			content: {
				"application/json": {
					schema: {
						type: format.type,
						example: format.example,
					},
				},
			},
		};
	});
	return responses;
}

module.exports = {
	parseDescription,
	parseTypedef,
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
};
