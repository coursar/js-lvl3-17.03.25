/** @type {HTMLInputElement} */
const fileEl = document.querySelector('#file');

fileEl.addEventListener('change',
    /**
     * @param {Event} ev 
     */
    async (ev) => {
        /** @type {[File]} */
        const [file] = Array.from(ev.currentTarget.files);

        const arrayBuffer = await file.arrayBuffer();
        // CA FE BA BE
        const uint8View = new Uint8Array(arrayBuffer);
        if (uint8View[0] === 0xCA && uint8View[1] === 0xFE && uint8View[2] === 0xBA && uint8View[3] === 0xBE) {
            console.log('uint8 CAFEBABE');
        }
        // const uint32View = new Uint32Array(arrayBuffer, 0, 4); // machine byte-order - little endian
        // if (uint32View[0] === 0xCAFEBABE) {
        //     console.log('uint32 CAFEBABE');
        // }
        const dataView = new DataView(arrayBuffer);
        const magic = dataView.getUint32(0); // big-endian by default
        if (magic === 0xCAFEBABE) {
            console.log('dataview CAFEBABE');
        }

        const minor = dataView.getUint16(4);
        const major = dataView.getUint16(6);
    }
);