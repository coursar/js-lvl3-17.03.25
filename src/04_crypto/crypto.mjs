import * as secret from './secret.mjs';
import '../polyfills.mjs';

// alice call
// old school byte handling
const xorEncrypt = (plaintext, key) => {
    // ^ - xor
    // plaintext ^ key == ciphertext ^ key
    const ciphertext = new Array(plaintext.length);

    for (let i = 0; i <= plaintext.length; i++) {
        const p = plaintext.charCodeAt(i);
        const k = Array.isArray(key) ? key[i] : key.charCodeAt(i);
        const c = p ^ k;
        ciphertext[i] = c;
    }

    return String.fromCharCode(...ciphertext);
};

// bob call
const xorDecrypt = (ciphertext, key) => {
    const plaintext = new Array(ciphertext.length);

    for (let i = 0; i <= ciphertext.length; i++) {
        const c = ciphertext.charCodeAt(i);
        const k = Array.isArray(key) ? key[i] : key.charCodeAt(i);
        const p = c ^ k;
        plaintext[i] = p;
    }

    return String.fromCharCode(...plaintext);
};

{
    // // v1: alice & bob
    // const plaintext = 'mama papa';
    // const key = '0000 0000';

    // const ciphertext = xorEncrypt(plaintext, key);
    // console.log(ciphertext);

    // const decrypted = xorDecrypt(ciphertext, key);
    // console.log(decrypted);
}

{
    // // v2: alice & eve
    // const plaintext = secret.plaintext;
    // const key = secret.xorKey;

    // // alice
    // const ciphertext = xorEncrypt(plaintext, key);
    // console.log('ciphertext', ciphertext);

    // // eve -> brute force
    // const crackedKey = [10, 14, 2, 77, 80, 12, 29, 5, 8]
    // const cracked = xorDecrypt(ciphertext, crackedKey);
    // console.log('cracked', cracked);

    // // bob
    // const decrypted = xorDecrypt(ciphertext, key);
    // console.log('decrypted', decrypted);
}


// One-Time Pad => key - only one time + key size = message size

// keys size = messages size

// Historical reasons
// window.crypto.subtle

const decodeUint8Array = (array, encoding = 'utf-8') => {
    const decoder = new TextDecoder(encoding);
    return decoder.decode(array);
}

{
    const genAesSecretKeyCBC = async () => {
        return await crypto.subtle.generateKey({
            name: 'AES-CBC',
            length: 256,
        }, true, ['encrypt', 'decrypt']);
    };

    const secretEncrypt = async (key, iv, plaintext) => {
        if (typeof plaintext === 'string') {
            const encoder = new TextEncoder();
            plaintext = encoder.encode(plaintext);
        }

        return await crypto.subtle.encrypt({
            name: 'AES-CBC',
            iv
        }, key, plaintext);
    };

    const secretDecrypt = async (key, iv, ciphertext) => {
        return await crypto.subtle.decrypt({
            name: 'AES-CBC',
            iv
        }, key, ciphertext);
    };

    // alice part
    const key = await genAesSecretKeyCBC();
    const iv = new Uint8Array(16);
    // no Math.random() => crypto.random
    crypto.getRandomValues(iv);
    const data = 'hello, world!';
    const encrypted = await secretEncrypt(key, iv, data);

    const exportedKey = await crypto.subtle.exportKey('raw', key);
    // console.log('key:', new Uint8Array(exportedKey).toHex());
    // console.log('iv:', new Uint8Array(iv).toHex());
    // console.log('encrypted:', new Uint8Array(encrypted).toHex());

    // trusted: key
    // not-trusted: iv, encrypted

    // bob part
    const decrypted = decodeUint8Array(await secretDecrypt(key, iv, encrypted));

    // // eve part
    // const eveKey = await genAesSecretKeyCBC();
    // const cracked = decodeUint8Array(await secretDecrypt(eveKey, iv, encrypted));

    /*
    crypto.mjs:115 key: 1300af40d13f8279cf0c4217ca5c910a28f5f57c68ed44de887585974d0d9b93
    crypto.mjs:116 iv: a99140ab084cf33ab51e35e612f050e9
    crypto.mjs:117 encrypted: 4e99b91760b0293c39dd1685f448e115
    */
}

{
    // digest, hash, checksum
    const digest = async (data) => {
        if (typeof data === 'string') {
            const encoder = new TextEncoder();
            data = encoder.encode(data);
        }

        // not-secure:
        //  - SHA1, MD5
        // secure:
        //  - SHA-256
        //  - SHA-384
        //  - SHA-512
        return await crypto.subtle.digest('SHA-256', data);
    }

    const hash = await digest('secret');
    console.log('hash', new Uint8Array(hash).toHex());
}

{ // MAC -> HMAC
    const genHmacSecretKey = async () => {
        return await crypto.subtle.generateKey({
            name: 'HMAC',
            hash: 'SHA-256',
        }, true, ['sign', 'verify']);
    };

    const getMac = async (key, data) => {
        if (typeof data === 'string') {
            const encoder = new TextEncoder();
            data = encoder.encode(data);
        }

        return await crypto.subtle.sign('HMAC', key, data);
    }

    const checkMac = async (key, data, mac) => {
        if (typeof data === 'string') {
            const encoder = new TextEncoder();
            data = encoder.encode(data);
        }

        return await crypto.subtle.verify('HMAC', key, mac, data);
    };

    const secretKey = await genHmacSecretKey();
    const data = 'secret';
    // 'alternative' sha256(secret + data): sign
    const mac = await getMac(secretKey, data);
    // Mallory attack
    // const view = new DataView(mac);
    // view.setUint8(0, 0x41);
    // console.log('mac:', new Uint8Array(mac).toHex());
    const valid = await checkMac(secretKey, data, mac);
    // console.log('valid:', valid);
}

// later: AES-GCM: confidentiality + integrity
{
    // RSA
    const genRsaKeyPair = async () => {
        return await crypto.subtle.generateKey({
            name: 'RSA-OAEP',
            modulusLength: 4096, // 1024 -> not secure
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
            true,
            ['encrypt', 'decrypt'],
        );
    };

    const publicEncrypt = async (publicKey, plaintext) => {
        if (typeof plaintext === 'string') {
            const encoder = new TextEncoder();
            plaintext = encoder.encode(plaintext);
        }

        return await crypto.subtle.encrypt({
            name: 'RSA-OAEP',
        }, publicKey, plaintext);
    };

    const privateDecrypt = async (privateKey, ciphertext) => {
        return await crypto.subtle.decrypt({
            name: 'RSA-OAEP',
        }, privateKey, ciphertext);
    };

    const keyPair = await genRsaKeyPair();
    const data = 'secret';

    const ciphertext = await publicEncrypt(keyPair.publicKey, data);
    console.log(new Uint8Array(ciphertext).toHex());

    const plaintext = await privateDecrypt(keyPair.privateKey, ciphertext);
    console.log(decodeUint8Array(new Uint8Array(plaintext)));
}

{
    // RSA
    const genRsaKeyPair = async () => {
        return await crypto.subtle.generateKey({
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 4096, // 1024 -> not secure
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
            true,
            ['sign', 'verify'],
        );
    };

    const makeSign = async (privateKey, data) => {
        if (typeof data === 'string') {
            const encoder = new TextEncoder();
            data = encoder.encode(data);
        }

        return await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, data);
    }

    const verifySign = async (publicKey, data, sign) => {
        if (typeof data === 'string') {
            const encoder = new TextEncoder();
            data = encoder.encode(data);
        }

        return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, sign, data);
    };

    const keyPair = await genRsaKeyPair();

    const data = 'non-secret document';
    const sign = await makeSign(keyPair.privateKey, data);
    console.log('sign:', new Uint8Array(sign).toHex());

    const verified = await verifySign(keyPair.publicKey, data, sign);
    console.log('verified:', verified);
}

{
    const genEcdhKeyPair = async () => {
        return await crypto.subtle.generateKey({
            name: 'ECDH',
            namedCurve: 'P-384',
        },
            true,
            ['deriveKey'],
        );
    }

    const deriveSecretKey = async (myPrivateKey, otherPublicKey) => {
        return await crypto.subtle.deriveKey(
            {
                name: 'ECDH',
                public: otherPublicKey,
            },
            myPrivateKey,
            {
                name: 'AES-GCM',
                length: 256,
            },
            true,
            ['encrypt', 'decrypt'],
        );
    };

    const secretEncrypt = async (key, iv, plaintext) => {
        if (typeof plaintext === 'string') {
            const encoder = new TextEncoder();
            plaintext = encoder.encode(plaintext);
        }

        return await crypto.subtle.encrypt({
            name: 'AES-GCM',
            iv
        }, key, plaintext);
    };

    const secretDecrypt = async (key, iv, ciphertext) => {
        return await crypto.subtle.decrypt({
            name: 'AES-GCM',
            iv
        }, key, ciphertext);
    };

    const aliceKeyPair = await genEcdhKeyPair();
    const bobKeyPair = await genEcdhKeyPair();

    const aliceSecret = await deriveSecretKey(aliceKeyPair.privateKey, bobKeyPair.publicKey);
    const bobSecret = await deriveSecretKey(bobKeyPair.privateKey, aliceKeyPair.publicKey);

    // alice part
    const iv = new Uint8Array(16);
    // no Math.random() => crypto.random
    crypto.getRandomValues(iv);
    const data = 'hello, world!';
    const encrypted = await secretEncrypt(aliceSecret, iv, data);
    console.log('encrypted:', new Uint8Array(encrypted).toHex());

    const decrypted = await secretDecrypt(bobSecret, iv, encrypted);
    console.log('decrypted:', decodeUint8Array(new Uint8Array(decrypted)));
}