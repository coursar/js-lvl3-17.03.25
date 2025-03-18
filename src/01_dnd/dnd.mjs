const draggableEl = document.querySelector('#draggable');
const dropzoneEl = document.querySelector('#dropzone');

// draggableEl.addEventListener('dragstart', (ev) => {
//     console.log('dragstart');
// });
// draggableEl.addEventListener('drag', (ev) => {
//     console.log('drag');
// });
// draggableEl.addEventListener('dragend', (ev) => {
//     console.log('dragend');
// });

dropzoneEl.addEventListener('dragenter', (ev) => {
    console.log('dragenter');
    ev.currentTarget.classList.add('active');
});

dropzoneEl.addEventListener('dragover', (ev) => {
    console.log('dragover');
    ev.preventDefault(); // allow to drop
});

dropzoneEl.addEventListener('dragleave', (ev) => {
    console.log('dragleave');
    ev.currentTarget.classList.remove('active');
});

dropzoneEl.addEventListener('drop',

    /** @param {DragEvent} ev  */
    async (ev) => {
        ev.preventDefault(); // don't open
        ev.currentTarget.classList.remove('active');
        console.log('drop');
        const [file] = ev.dataTransfer.files;
        const response = await fetch('/api/test/blob', {
            method: 'POST',
            body: file
        });
        console.log(response.status);
    });