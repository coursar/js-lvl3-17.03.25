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
        const response = await fetch('/api/test/blob', {
            method: 'POST',
            body: file
        });
        debugger;
        console.log(response.status);
    }
);