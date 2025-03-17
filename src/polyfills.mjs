if (!('toHex' in Uint8Array.prototype)) {
    const alphabet = '0123456789abcdef';

    Uint8Array.prototype.toHex = function() {
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