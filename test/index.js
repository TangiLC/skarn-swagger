const express = require("express");
const app = express();
const swagger = require("../lib/swagger").generateSpecAndMount(app);
const outputFile = `${__dirname}/swagger.json`;

let options = {
	swaggerDefinition: {
		info: {
			description: "This is swagger is a test to evolve skarn-swagger.",
			title: "Swagger Skarn test API",
			version: "1.0.0",
		},
		servers: [{ url: "http://localhost:3000/", description: "localhost" }],
	},
	basedir: __dirname,
	files: ["./routes/**/*.js", "./models/**/*.js"], //Path to the API handle folder
	responseFormats: ["application/json", "application/xml"],
};

swagger(options, outputFile);

const testsRoutes = require("./routes/tests_r");

app.use("/", testsRoutes);

app.listen(3000, function () {
	console.log("Example app listening on port 3000.");
});
