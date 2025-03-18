if (!('toHex' in Uint8Array.prototype)) {
    const alphabet = '0123456789abcdef';

    Uint8Array.prototype.toHex = function () {
        // this
        if (this.length === 0) {
            return '';
        }

        const chars = [];
        for (const element of this) {
            const hi = element >> 4;
            const lo = element & 0b0000_1111; // 0x0F
            chars.push(
                alphabet.charAt(hi),
                alphabet.charAt(lo),
            );
        }

        return chars.join('');
    };
}

if (!('concat' in Uint8Array)) {
    Uint8Array.concat = (list) => {
        if (list.length === 0) {
            return new Uint8Array();
        }
        const length = list.reduce((acc, o) => acc + o.length, 0);
        const result = new Uint8Array(length);

        let offset = 0;
        for (const element of list) {
            result.set(element, offset);
            offset += element.length;
        }
        return result;
    };
}

// dirty hack
Uint8Array.prototype.toString = function (encoding = 'utf-8') {
    const decoder = new TextDecoder(encoding);
    return decoder.decode(this);
};