const TestClass = require('../models/test');

exports.test = (req, res) => {
	try {
		res.send(new TestClass());
	} catch (error) {
		res.status(500).send('Server error. Please retry later.');
	}
};
