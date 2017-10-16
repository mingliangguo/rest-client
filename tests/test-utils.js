const chai = require('chai'),
    expect = chai.expect, // we are using the "expect" style of Chai
    assert = chai.assert, // we are using the "expect" style of Chai
    utils = require('./../lib/utils.js');

describe('utils provides a collection of utility methods', function () {
    it('replacePathParams() should replace params in url path with parameters in provided params', function () {
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

    it('mixin() should merge properties in the from object to the to object. And it should not overwrite unless overrite is set to true', function () {
        var from = {
            'cid': 'test_abc',
            'pid': 'parent'
            },
            to = {};

        utils.mixin(to, from);
        expect(to.cid).to.equal('test_abc');

        to = {
            'pid': 'pid'
        };
        utils.mixin(to, from);
        expect(to.cid).to.equal('test_abc');
        expect(to.pid).to.equal('pid');

        to = {
            'pid': 'pid'
        };
        utils.mixin(to, from, true);
        expect(to.cid).to.equal('test_abc');
        expect(to.pid).to.equal('parent');

        let toArray = [undefined, null, {}];
        toArray.forEach(to => {
            to = utils.mixin(to, from);
            expect(to.cid).to.equal('test_abc');
            expect(to.pid).to.equal('parent');
        });
    });

    it('appendTimeStapm() should append the timestamp at the end of the file name,  before the extension.', () => {
        let filename = 'test.txt';

        let updated_name = utils.appendTimestamp(filename, 'yyyy-mm-dd');
        console.log('updated_name:' + updated_name);
        let regex = /\d{4}-\d{2}-\d{2}/;
        expect(regex.test(updated_name)).to.eq(true);
        expect(updated_name.length).to.eq(filename.length + 1 + 'yyyy-mm-dd'.length);
    });

    it('argbGen() should generate a random argb value which represent a color code.', () => {
        let color = utils.argbGen();
        console.log('color:' + color);
        expect(color.length).to.eq(8);
    });

    it('padding() should prepend "0" in front of a given string to make up the expected length.', () => {
        let num = 26;
        let result = utils.padding(num, 5);
        expect(result).to.eq('00026');
    });



});
