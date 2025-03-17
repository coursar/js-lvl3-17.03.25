/** @type {HTMLInputElement} */
const fileEl = document.querySelector('#file');

fileEl.addEventListener('change',
    /**
     * @param {Event} ev 
     */
    (ev) => {
        /** @type {[File]} */
        const [file] = Array.from(ev.currentTarget.files);

        // "XHR Analogue (no promises, only callbacks & events)"
        const fileReader = new FileReader();
        fileReader.onload = (ev) => {
            const {result} = ev.currentTarget;
            const imgEl = document.createElement('img');
            imgEl.src = result;
            document.body.append(imgEl);
        };
        // fileReader.readAsText(file); // await file.text()
        // fileReader.readAsArrayBuffer(file); // await file.arrayBuffer()
        fileReader.readAsDataURL(file);
    }
);