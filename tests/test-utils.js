var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var utils = require('./../lib/utils.js');

describe('utils provides a collection of utility methods', function() {
    it('replacePathParams() should replace params in url path with parameters in provided params', function() {
        var params = {
            'cid': 'test_abc',
            'pid': 'parent'
        };
        var value = utils.replacePathParams('/calendar/:cid/test', params);
        expect(value).to.equal('/calendar/test_abc/test');

        value = utils.replacePathParams('/calendar/:cid', params);
        expect(value).to.equal('/calendar/test_abc');

        value = utils.replacePathParams('/calendar/:cid', params);
        expect(value).to.equal('/calendar/test_abc');

        value = utils.replacePathParams('/:pid/calendar/:cid', params);
        expect(value).to.equal('/parent/calendar/test_abc');
    });

    it('mixin() should merge properties in the from object to the to object. And it should not overwrite unless overrite is set to true', function() {
        var from = {
            'cid': 'test_abc',
            'pid': 'parent'
        }, to = {};

        utils.mixin(from, to);
        expect(to.cid).to.equal('test_abc');

        to = {'pid': 'pid'};
        utils.mixin(from, to);
        expect(to.cid).to.equal('test_abc');
        expect(to.pid).to.equal('pid');

        to = {'pid': 'pid'};
        utils.mixin(from, to, true);
        expect(to.cid).to.equal('test_abc');
        expect(to.pid).to.equal('parent');

        let toArray = [undefined, null, {}];
        toArray.forEach(to => {
            to = utils.mixin(from, to);
            expect(to.cid).to.equal('test_abc');
            expect(to.pid).to.equal('parent');
        });
    });
});
