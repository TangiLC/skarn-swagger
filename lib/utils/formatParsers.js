/** @module formatParsers */
'use strict';

function parseRoute(str) {
	let split = str.split(' ');

	return {
		method: split[0].toLowerCase() || 'get',
		uri: split[1] || '',
	};
}

function parseField(str) {
	let split = str.split('.');
	return {
		name: split[0],
		parameter_type: split[1] || 'get',
		required: (split[2] && split[2] === 'required') || false,
	};
}

function parseType(obj) {
	if (!obj) return undefined;
	if (obj.name) {
		const spl = obj.name.split('.');
		if (spl.length > 1 && spl[1] == 'model') {
			return spl[0];
		} else return obj.name;
	} else if (obj.expression && obj.expression.name) {
		return obj.expression.name.toLowerCase();
	} else {
		return 'string';
	}
}

function parseSchema(obj) {
	let nativeSchemas = ['object', 'string', 'integer', 'boolean', 'number', 'error', 'enum'];
	if (!(obj.name || obj.applications)) return undefined;

	if (obj.name && nativeSchemas.indexOf(obj.name.toLowerCase()) === -1) {
		const spl = obj.name.split('.');
		return { $ref: '#/components/schemas/' + spl[0] };
	}
}

function parseItems(obj) {
	if (obj.applications && obj.applications.length > 0 && obj.applications[0].name) {
		const type = obj.applications[0].name;
		if (type == 'object' || type == 'string' || type == 'integer' || type == 'boolean' || type == 'number') {
			return { type: type };
		} else return { $ref: '#/components/schemas/' + type };
	} else return undefined;
}

function parseReturn(tags, responseFormats) {
	let rets = {};
	let headers = parseHeaders(tags);
	for (let i in tags) {
		if (tags[i]['title'] == 'returns' || tags[i]['title'] == 'return') {
			let description = tags[i]['description'].split('-'),
				key = description[0].trim();

			rets[key] = {
				description: description[1] ? description[1].trim() : '',
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
	const description = obj.description || '';
	const sanitizedDescription = description.replace('/**', '');
	return sanitizedDescription;
}

function parseTag(tags) {
	for (let i in tags) {
		if (tags[i]['title'] == 'group') {
			return tags[i]['description'].split('-');
		}
	}
	return ['default', ''];
}

function parseProduces(str) {
	return str.split(/\s+/);
}

function parseConsumes(str) {
	return str.split(/\s+/);
}

function parseTypedef(tags) {
	const typeName = tags[0]['name'];
	let details = {
		required: [],
		properties: {},
	};
	// if (tags[0].type && tags[0].type.name) {
	//     details.allOf = [{"$ref": '#/components/schemas/' + tags[0].type.name}]
	// }
	for (let i = 1; i < tags.length; i++) {
		if (tags[i].title == 'property') {
			let propName = tags[i].name;
			let propNameArr = propName.split('.');

			let props = propNameArr.slice(1, propNameArr.length);
			let required = props.indexOf('required') > -1;
			let readOnly = props.indexOf('readOnly') > -1;

			if (required) {
				if (details.required == null) details.required = [];
				propName = propName.split('.')[0];
				details.required.push(propName);
			}
			var schema = parseSchema(tags[i].type);

			if (schema) {
				details.properties[propName] = schema;
			} else {
				const type = parseType(tags[i].type);
				const parsedDescription = (tags[i].description || '').split(/-\s*eg:\s*/);
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
				if (prop.type == 'enum') {
					let parsedEnum = parseEnums('-eg:' + example);
					prop.type = parsedEnum.type;
					prop.enum = parsedEnum.enums;
				}

				if (example) {
					switch (type) {
						case 'boolean':
							details.properties[propName].example = example === 'true';
							break;
						case 'integer':
							details.properties[propName].example = +example;
							break;
						case 'number':
							details.properties[propName].example = +example;
							break;
						case 'enum':
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
		if (comments[i]['title'] === 'headers' || comments[i]['title'] === 'header') {
			let description = comments[i]['description'].split(/\s+-\s+/);

			if (description.length < 1) {
				break;
			}
			let code2name = description[0].split('.');

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
	let enums = ('' + description).split(/-\s*eg:\s*/);
	if (enums.length < 2) {
		return [];
	}
	let parseType = enums[1].split(':');
	if (parseType.length === 1) {
		parseType = ['string', parseType[0]];
	}
	return {
		type: parseType[0],
		enums: parseType[1].split(',').map((el) => el.trim()),
	};
}

module.exports = {
	parseRoute,
	parseField,
	parseType,
	parseSchema,
	parseItems,
	parseReturn,
	parseDescription,
	parseTag,
	parseProduces,
	parseConsumes,
	parseTypedef,
	parseSecurity,
	parseHeaders,
	parseEnums,
};
