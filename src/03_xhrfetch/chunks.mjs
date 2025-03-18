const xhr = new XMLHttpRequest();

let image = null;

xhr.open('GET', '/api/test/chunked');
xhr.onreadystatechange = (ev) => {
    console.log(xhr.readyState);
    console.log(xhr.responseText);

    if (image === null) {
        image = new Image();
        image.src = '/static/js.png';
        document.body.append(image);
    }
}

xhr.send();