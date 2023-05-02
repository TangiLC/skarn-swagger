const express = require('express');
const router = express.Router();

const TestsC = require('../controllers/tests_c');

/**
 * Function used to get a test class.
 * @route GET /
 * @group test - test operations
 * @param {enum} media.path - le type de média faisant la requête - eg: website,mobile,appletv,worldwide
 * @returns {TestClass} 200 - A specific response.
 */
router.get('/', TestsC.test);

module.exports = router;