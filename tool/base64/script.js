const inputTextArea = document.getElementById('input');
const outputTextArea = document.getElementById('output');
const encodeButton = document.querySelector('.encode');
const decodeButton = document.querySelector('.decode');
const swapButton = document.querySelector('.swap');
const clearButton = document.querySelector('.clear');

function base64Encode(str) {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    utf8Bytes.forEach(b => binary += String.fromCharCode(b));
    return base64EncodeBinary(binary);
}

function base64Decode(base64) {
    const binary = base64DecodeBinary(base64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function base64EncodeBinary(binary) {
    let result = '';
    let i = 0;

    while (i < binary.length) {
        const a = binary.charCodeAt(i++) || 0;
        const b = binary.charCodeAt(i++) || 0;
        const c = binary.charCodeAt(i++) || 0;

        const triple = (a << 16) | (b << 8) | c;

        result += BASE64_CHARS[(triple >> 18) & 63];
        result += BASE64_CHARS[(triple >> 12) & 63];
        result += i - 2 < binary.length ? BASE64_CHARS[(triple >> 6) & 63] : '=';
        result += i - 1 < binary.length ? BASE64_CHARS[triple & 63] : '=';
    }

    return result;
}

function base64DecodeBinary(base64) {
    let result = '';
    let i = 0;

    base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');

    while (i < base64.length) {
        const a = BASE64_CHARS.indexOf(base64[i++]);
        const b = BASE64_CHARS.indexOf(base64[i++]);
        const c = BASE64_CHARS.indexOf(base64[i++]);
        const d = BASE64_CHARS.indexOf(base64[i++]);

        const triple = (a << 18) | (b << 12) | ((c & 63) << 6) | (d & 63);

        if (c !== 64) result += String.fromCharCode((triple >> 16) & 255);
        if (d !== 64) result += String.fromCharCode((triple >> 8) & 255);
        if (d !== 64) result += String.fromCharCode(triple & 255);
    }

    return result;
}

encodeButton.addEventListener('click', () => {
    outputTextArea.value = base64Encode(inputTextArea.value);
});

decodeButton.addEventListener('click', () => {
   outputTextArea.value = base64Decode(inputTextArea.value);
});

swapButton.addEventListener('click', () => {
    let tmpText = inputTextArea.value;
    inputTextArea.value = outputTextArea.value;
    outputTextArea.value = tmpText;
})

clearButton.addEventListener('click', () => {
    inputTextArea.value = '';
    outputTextArea.value = '';
})

const editor = document.getElementById('editor');
const layoutToggle = document.getElementById('layoutToggle');

layoutToggle.addEventListener('click', () => {
    editor.classList.toggle('horizontal');
    editor.classList.toggle('vertical');

    layoutToggle.textContent =
        editor.classList.contains('horizontal')
            ? '⇅ Vertical Layout'
            : '⇆ Horizontal Layout';
});