const display = document.querySelector('.display');
const buttons = document.querySelectorAll('.button');

buttons.forEach(button => {
  button.addEventListener('click', () => {
    const value = button.textContent;
    // Update the display based on the clicked button value
    // Implement logic for handling numbers, operators, decimal, clear, and equals
  });
});