/** @type {HTMLInputElement} */
const fileEl = document.querySelector('#file');

fileEl.addEventListener('change',
    /**
     * @param {Event} ev 
     */
    async (ev) => {
        /** @type {[File]} */
        const [file] = Array.from(ev.currentTarget.files);
        const text = await file.text();
        const textareaEl = document.createElement('textarea');
        textareaEl.value = text;
        document.body.append(textareaEl);
    }
);