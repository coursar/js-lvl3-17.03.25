document.addEventListener('paste',
    /** @type {ClipboardEvent} */
    async (ev) => {
        const [file] = ev.clipboardData.files;

        const response = await fetch('/api/test/progress', {
            method: 'POST',
            body: file
        });

        const total = Number.parseInt(response.headers.get('Content-Length'), 10);
        let loaded = 0;

        // response.body -> Readable Stream
        for await (const value of response.body) {
            loaded += value.byteLength;
            console.log('download progress: ', Math.round(100 * loaded / total, 2));
        }
    });
