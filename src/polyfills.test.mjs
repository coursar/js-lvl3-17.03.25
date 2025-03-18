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

suite('concat', () => {
    // minimal cases:
    // 1. empty
    // 2. signle 
    // 3. multiple
    test('should concat empty', () => {
        const array = []; // Uint8Array.concat([]);
        const expected = new Uint8Array(); // buffer(0)
        const actual = Uint8Array.concat(array);

        assert.deepEqual(actual, expected);
    });

    test('should concat single item', () => {
        const array = [new Uint8Array([13])];
        const expected = new Uint8Array([13]); // buffer(1)
        const actual = Uint8Array.concat(array);

        assert.deepEqual(actual, expected);
    });

    test('should concat multiple item', () => {
        const array = [Uint8Array.of(10, 13, 15), Uint8Array.of(13), Uint8Array.of(13, 10)];
        const expected = Uint8Array.of(10, 13, 15, 13, 13, 10);
        const actual = Uint8Array.concat(array);

        assert.deepEqual(actual, expected);
    });
});
