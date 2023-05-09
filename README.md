### Express Swagger Generator

> This is `express-swagger-generator@1.1.17` with an improvement to Openapi 3.0.0

#### Installation

```
npm i skarn-swagger --save-dev
```

#### Usage

```
const express = require('express');
const app = express();
const expressSwagger = require('skarn-swagger')(app);

let options = {
	swaggerDefinition: {
		info: {
			description: 'This is a sample server',
			title: 'Swagger',
			version: '1.0.0',
		},
		servers: [
			{ url: 'http://localhost/v1', description: 'localhost' },
			{ url: 'https://yourUrlDev/v1', description: 'dev' },
			{ url: 'https://yourUrlProd/v1', description: 'prod' },
		],
		components: {
			securitySchemes: {
				BasicAuth: {
					type: 'http',
					scheme: 'basic',
				},
			},
		},
	},
	basedir: __dirname,
	files: ['./routes/**/*.js'], //Path to the API handle folder
	responsFormat : ["application/json", "application/xml", ...]
};

expressSwagger(options)
app.listen(3000);
```

Open http://<app_host>:<app_port>/api-docs in your browser to view the documentation.

#### How to document the API

```
/**
 * This function comment is parsed by doctrine
 * @route GET /api
 * @group foo - Operations about user
 * @param {string} email.query.required - username or email
 * @param {string} password.query.required - user's password.
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 */
exports.foo = function() {}
```

#### More

This module is based on [express-swaggerize-ui](https://github.com/pgroot/express-swaggerize-ui) and [Doctrine-File](https://github.com/researchgate/doctrine-file)