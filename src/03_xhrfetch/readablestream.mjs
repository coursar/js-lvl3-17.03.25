const readableStream = new ReadableStream({
    start(controller) {
        setTimeout(() => {
            controller.enqueue('a');
        }, 5_000);

        setTimeout(() => {
            controller.enqueue('b');
        }, 10_000);

        setTimeout(() => {
            controller.enqueue('c');
        }, 15_000);

        setTimeout(() => {
            controller.enqueue('d');
        }, 20_000);

        setTimeout(() => {
            controller.close();
        }, 25_000);
    }
});

// const reader = readableStream.getReader();
// while(true) {
//     // {value, done}
//     const {value, done} = await reader.read();
//     console.log(value, done);
//     if (done) {
//         break;
//     }
// }

for await (const value of readableStream) {
    console.log(value);
}
