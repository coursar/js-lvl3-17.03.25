// old school:
// Send -> new Ajax (XHR, fetch)
// Updates ->
//  1. Polling -> small interactivity
if (false) {
    const poll = async() => {
        try {
            const response = await fetch('/api/test/poll');
            const body = await response.text();
            console.log(body);
        } catch (e) {

        } finally {
            setTimeout(poll, 5000);
        }
    };
    poll();
}
//  2. Long-polling 
if (false) {
    const longPolling = async() => {
        try {
            const response = await fetch('/api/test/long-poll');
            const body = await response.text();
            console.log(body);
        } catch (e) {

        } finally {
            setTimeout(longPolling, 0);
        }
    };
    longPolling();
}

// 3. Modern: SSE -> Server-Sent Events
// Unidirectional client <- server
// Text-only (base64 as hack)
if (false) {
    const sse = new EventSource('/api/test/sse');
    sse.addEventListener('message', (ev) => {
        // debugger;
        // ev.data
        console.log('sse:', ev.data);
    });

    // without SSE direct fetch call (так не делают)
    // const response = await fetch('/api/test/sse');
    // // response.body -> Readable Stream
    // for await (const value of response.body) {
    //     const decoder = new TextDecoder();
    //     const text = decoder.decode(value);
    //     console.log(value, text);
    // }
}

// 4. WebSocket => TCP/TLS
// Bidirectional client <-> server
// Text/Binary

// Upgrade (h2c analogue) -> WebSockets
{
    const ws = new WebSocket('ws://server.local:9999'); // wss:
    ws.onmessage = (ev) => {
        console.log(ev);
        ws.send('ok!');
    };
    ws.onopen = (ev) => {
        ws.send('welcome');
    };
    ws.onerror = (ev) => {
        console.warn('error', ev);
    };
    ws.onclose = (ev) => {
        console.warn('connection closed');
    };
}