const SubTestClass = require("./subtest");

/**
  * @typedef {object} TestClass
  * @property {integer} id.required - id de la class test
  * @property {string} name.required - name de la class test
  * @property {SubTestClass} sub.required - sub de la class test
  */
class TestClass{
	constructor() {
        this.id = Math.floor((Math.random() * 10) + 1);
        this.sub = new SubTestClass(10)
        this.name = "SuperName" + this.id;
    }  
}

module.exports = TestClass;