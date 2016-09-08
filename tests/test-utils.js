// tests/part1/cart-summary-test.js
var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var utils = require('./../lib/utils.js');

describe('utils replace params for response file', function() {
    it('replacePathParams() should replace params in url path with parameters in provided params', function() {
        var params = {
            'cid': 'test_abc'
        };
        var value = utils.replacePathParams('/calendar/:cid/test', params);
        expect(value).to.equal('/calendar/test_abc/test');
    });
});
