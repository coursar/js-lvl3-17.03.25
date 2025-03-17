import {suite, test} from 'node:test';
import assert from 'node:assert';
import './polyfills.mjs';

suite('hex encoding', () => {
    test('should encode empty', () => {
        const array = new Uint8Array();
        const expected = '';
        const actual = array.toHex();

        assert.equal(actual, expected);
    });

    test('should encode single', () => {
        const array = new Uint8Array([0xCA]); // .buffer = ArrayBuffer(1)
        const expected = 'ca';
        const actual = array.toHex();

        assert.equal(actual, expected);
    });

    test('should encode multiple', () => {
        const array = new Uint8Array([0xCA, 0xFE, 0xBA, 0xBE]); // .buffer = ArrayBuffer(1)
        const expected = 'cafebabe';
        const actual = array.toHex();

        assert.equal(actual, expected);
    });

    test('should encode (MDN samples)', () => {
        const array = new Uint8Array([202, 254, 208, 13]); // .buffer = ArrayBuffer(1)
        const expected = 'cafed00d';
        const actual = array.toHex();

        assert.equal(actual, expected);
    });
});

// suite + test
// describe + it