const inputTextArea = document.getElementById('input');
const outputTextArea = document.getElementById('output');
const encodeButton = document.querySelector('.encode');
const decodeButton = document.querySelector('.decode');
const swapButton = document.querySelector('.swap');
const clearButton = document.querySelector('.clear');

encodeButton.addEventListener('click', () => {
    outputTextArea.value = btoa(inputTextArea.value);
});

decodeButton.addEventListener('click', () => {
   outputTextArea.value = atob(inputTextArea.value);
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