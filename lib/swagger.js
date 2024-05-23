/** @module main */
"use strict";

// Dependencies
const fs = require("fs");
const { globSync } = require("glob");
const parser = require("swagger-parser");
const doctrineFile = require("./df");
const swaggerUi = require("swagger-ui-express");

const swaggerHelpers = require("./helpers");
const { fileFormat } = require("./utils/fileFormat");
const {
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
} = require("./utils/formatParsers");

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
 * Converts an array of globs to full paths
 * @function
 * @param {array} globs - Array of globs and/or normal paths
 * @return {array} Array of fully-qualified paths
 * @requires glob
 */
function convertGlobPaths(base, globs) {
	return globs.reduce(function (acc, globString) {
		let globFiles = globSync(globs);
		return acc.concat(globFiles);
	}, []);
}

/**
 * Concatenates the current date to the description in the swagger definition
 * @function
 * @param {object} options - Configuration options
 */
function concatenateCurrentDate(options) {
	const currentDate = new Date();
	const formattedDate = currentDate.toISOString().slice(0, 16);
	if (!options.swaggerDefinition.info) {
		options.swaggerDefinition.info = {};
	}
	if (!options.swaggerDefinition.info.description) {
		options.swaggerDefinition.info.description = "";
	}
	options.swaggerDefinition.info.description += `\n\nUpdate: ${formattedDate}utc`;
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
		concatenateCurrentDate(options);
		let swaggerObject = swaggerHelpers.swaggerizeObj(options.swaggerDefinition);
		let apiFiles = convertGlobPaths(options.basedir, options.files);

		let responseFormats = options.responseFormats;

		// Parse the documentation in the APIs array.
		for (let i = 0; i < apiFiles.length; i = i + 1) {
			let parsedFile = parseApiFile(apiFiles[i]);
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
		app.use(url, swaggerUi.serve, swaggerUi.setup(docs));

		if (outputFile) {
			fs.writeFileSync(outputFile, JSON.stringify(swaggerObject, null, 2));
			console.log(`Swagger JSON file has been saved to ${outputFile}`);
		}

		return swaggerObject;
	};
}

module.exports = {
	generateSpecAndMount,
	parseApiFile,
	convertGlobPaths,
};
