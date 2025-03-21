document.addEventListener('paste',
    /** @type {ClipboardEvent} */
    (ev) => {
        const [file] = ev.clipboardData.files;

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/test/progress');
        // xhr.onreadystatechange = (ev) => {
        //     console.log(xhr.readyState);
        //     console.log(xhr.responseText);

        //     if (image === null) {
        //         image = new Image();
        //         image.src = '/static/js.png';
        //         document.body.append(image);
        //     }
        // }

        // upload progress
        xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
                console.log('upload progress: ', Math.round(100 * ev.loaded / ev.total, 2));
            } else {
                console.log('upload progress: not computable');
            }
        };

        // download progress
        xhr.onprogress = (ev) => {
            // no progress if no content-length
            if (ev.lengthComputable) {
                console.log('download progress: ', Math.round(100 * ev.loaded / ev.total, 2));
            } else {
                console.log('download progress: not computable');
            }
        };

        // blob and multipart - preffered way
        xhr.send(file);
});
