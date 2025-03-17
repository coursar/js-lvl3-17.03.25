/** @type {HTMLInputElement} */
const fileEl = document.querySelector('#file');

fileEl.addEventListener('change',
    /**
     * @param {Event} ev 
     */
    async (ev) => {
        /** @type {[File]} */
        const [file] = Array.from(ev.currentTarget.files);
        // fetch/xhr -> body:
        //  - FormData
        //  - URLSearchParams
        //  - Text -> JSON.stringify()
        //  - Document (XHR only)
        //  - Blob (File too)

        const partSize = 1024;
        const totalParts = Math.ceil(file.size / partSize);

        for (let i = 0; i < totalParts; i++) {
            const slice = file.slice(partSize * i, partSize * (i + 1));
            // with await -> sequential
            // without await -> concurrent vs parallel
            const response = await fetch('/api/test/blob', {
                method: 'POST',
                headers: {
                    'x-total-size': file.size,
                    'x-part-no': i,
                    'x-total-parts': totalParts,
                },
                body: slice
            });
            console.log(response.status);
        }
    }
);