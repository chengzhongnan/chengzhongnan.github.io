const display = document.querySelector('.display');
const numbers = document.querySelectorAll('.number');
const operators = document.querySelectorAll('.operator');
const equalButton = document.querySelector('.equal');
const clearButton = document.querySelector('.clear');

let firstNumber = 0;
let secondNumber = 0;
let operator = '+';

let isUseFirstNumber = true;
let isChangeNumber = false;

numbers.forEach(button => {
    button.addEventListener('click', () => {
        const value = button.textContent;

        if (isChangeNumber) {
            isChangeNumber = false;
            if (value === '.') {
                display.textContent += value;
            }
            else {
                display.textContent = value;
            }
            return;
        }

        if (value == '.') {
            if (display.textContent.indexOf('.') === -1) {
                display.textContent += '.';
            }
        }
        else {
            if (display.textContent === '0') {
                display.textContent = value;
            }
            else if (display.textContent.length <= 11) {
                display.textContent += value;
            }
        }
    })
})

operators.forEach(button => {
    button.addEventListener('click', () => {
        if (isUseFirstNumber) {
            const value = button.textContent;
            
            isUseFirstNumber = false;
            firstNumber = display.textContent;
            isChangeNumber = true;

            switch(value) {
                case '+':
                    operator = '+';
                    break;
                case '-':
                    operator = '-';
                    break;
                case '×':
                    operator = '*';
                    break;
                case '÷':
                    operator = '/';
                    break;
            }
        }
    })
})

equalButton.addEventListener('click', () => {
    if (!isUseFirstNumber) {
        secondNumber = display.textContent;
        let expression = `${firstNumber}${operator}${secondNumber}`;
        try {
            let result = eval(expression);
            display.textContent = result;
        }
        catch(err) {
            display.textContent = 'NaN';
        }

        firstNumber = 0;
        secondNumber = 0;
        operator = '+';
        isUseFirstNumber = true;
        isChangeNumber = true;
    }
})

clearButton.addEventListener('click', () => {
    firstNumber = 0;
    secondNumber = 0;
    operator = '+';
    isUseFirstNumber = true;
    display.textContent = '0';
})