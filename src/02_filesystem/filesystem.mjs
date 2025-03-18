const fileEl = document.querySelector('#file');
const buttonEl = document.querySelector('#clickme');

buttonEl.addEventListener('click', async (ev) => {
    // fileEl.click(); // fielEl.dispatchEvent()
    // only in Chrome!
    const [file] = await window.showOpenFilePicker();
    debugger;
});