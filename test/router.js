const express = require('express');
const app = express();
const swagger = require('../lib/swagger').generateSpecAndMount(app);

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
	files: ['./routes/**/*.js', './models/**/*.js'] 
};

swagger(options);

/* GET users listing. */
app.get('/', function(req, res, next) {
    res.send('respond with a resource');
});


/**
 * JSON parameters require a model. This one just has "name"
 * @typedef ReqNameJSON
 * @property {string} name.required - name of person making request - eg: John Doe
 */
/**
 * This route will respond greetings to name in json request body.
 * @route POST /hello/
 * @group hello - Test Demo
 * @param {ReqNameJSON.model} name.body.required - username or email
 * @returns {object} 200 - An object with the key 'msg'
 * @returns {Error}  default - Unexpected error
 * @headers {integer} 200.X-Rate-Limit - calls per hour allowed by the user
 * @headers {string} 200.X-Expires-After - 	date in UTC when token expires
 * @produces application/json
 * @consumes application/json
 */
app.post("/", function() {});



/**
 * @typedef Product
 * @property {integer} id
 * @property {string} name.required - Some description for product
 * @property {Array.<Point>} Point
 */

/**
 * @typedef Point
 * @property {integer} x.required
 * @property {integer} y.required - Some description for point - eg: 1234
 * @property {Array.<Color>} Color
 */

/**
 * @typedef Color
 * @property {string} blue
 */

/**
 * @route GET /test/
 * @returns {Array.<Point>} Point - Some description for point
 */
app.get('/test', function() {});

app.listen(8090, function () {
    console.log('Example app listening on port 8090.');
});