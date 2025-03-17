/** @type {HTMLInputElement} */
const fileEl = document.querySelector('#file');

/** @type {HTMLCanvasElement} */
const canvasEl = document.querySelector('#canvas');
const context = canvasEl.getContext('2d');

const promisifyResource = (resource, accessor = () => {}) => {
    const {promise, resolve, reject} = Promise.withResolvers();

    resource.onload = (ev) => resolve(accessor(ev));
    resource.onerror = () => reject(new Error('can\'t load'));

    return promise;
};

fileEl.addEventListener('change',
    /**
     * @param {Event} ev 
     */
    async (ev) => {
        /** @type {[File]} */
        const [file] = Array.from(ev.currentTarget.files);

        const fileReader = new FileReader();
        const resultPromise = promisifyResource(fileReader, (ev) => ev.currentTarget.result);
        fileReader.readAsDataURL(file);
        const dataURL = await resultPromise;

        const image = new Image();
        const imagePromise = promisifyResource(image);
        image.src = dataURL;

        await imagePromise;
        // context.filter = 'grayscale(1)';
        context.drawImage(image, 0, 0);

        const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
        const clampedArray = imageData.data; // Uint8...Array
        // [r, g, b, alpha -> first, ...]
        // r, g, b = x * r + y * g + z * b // x = y = z = 0.5
        for (let i = 0; i < clampedArray.length; i += 4) {
            const red = clampedArray[i]; 
            const green = clampedArray[i + 1]; 
            const blue = clampedArray[i + 2]; 
            const alpha = clampedArray[i + 3]; 

            const grey = red * 0.5 + green * 0.5 + blue * 0.5;

            clampedArray[i] = grey;
            clampedArray[i + 1] = grey;
            clampedArray[i + 2] = grey;
        }
        context.putImageData(imageData, 0, 0);
    }
);