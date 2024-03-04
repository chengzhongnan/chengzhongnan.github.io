const boardWidth = 10;
const boardHeight = 20;
const blockSize = 30;
const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
let board = Array.from({ length: boardHeight }, () => Array(boardWidth).fill(0));
let currentPiece = generatePiece();
let score = 0;

function generatePiece() {
  const pieces = [
    [[1, 1, 1, 1]],   // I
    [[1, 1, 1], [0, 1, 0]],   // T
    [[1, 1, 1], [1, 0, 0]],   // L
    [[1, 1, 1], [0, 0, 1]],   // J
    [[0, 1, 1], [1, 1, 0]],   // S
    [[1, 1], [1, 1]],   // O
    [[1, 1, 0], [0, 1, 1]]    // Z
  ];
  const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
  const piece = {
    shape: randomPiece,
    x: Math.floor((boardWidth - randomPiece[0].length) / 2),
    y: 0
  };
  return piece;
}

function drawPiece() {
  currentPiece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 1) {
        const block = document.createElement('div');
        block.classList.add('block');
        block.style.top = `${(currentPiece.y + y) * blockSize}px`;
        block.style.left = `${(currentPiece.x + x) * blockSize}px`;
        gameBoard.appendChild(block);
      }
    });
  });
}

function clearBoard() {
  const blocks = document.querySelectorAll('.block');
  blocks.forEach(block => block.parentNode.removeChild(block));
}

function canMove(dx, dy) {
  return currentPiece.shape.every((row, y) => {
    return row.every((value, x) => {
      const newX = currentPiece.x + x + dx;
      const newY = currentPiece.y + y + dy;
      return (
        value === 0 ||
        (newX >= 0 && newX < boardWidth && newY < boardHeight && (newY < 0 || board[newY][newX] === 0))
      );
    });
  });
}

function movePiece(dx, dy) {
  if (canMove(dx, dy)) {
    currentPiece.x += dx;
    currentPiece.y += dy;
    clearBoard();
    drawPiece();
    drawBoard();
  } else if (dy) {
    mergePiece();
    currentPiece = generatePiece();
    if (!canMove(0, 0)) {
      // Game over
      alert('Game Over! Your score: ' + score);
      score = 0;
      board = Array.from({ length: boardHeight }, () => Array(boardWidth).fill(0));
      clearBoard();
      drawBoard();
    }
  }
}

function mergePiece() {
  currentPiece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 1) {
        if (currentPiece.y + y >= 0) {
          board[currentPiece.y + y][currentPiece.x + x] = 1;
        }
      }
    });
  });
  clearLines();
  drawBoard();
}

function clearLines() {
  let linesCleared = 0;
  for (let y = boardHeight - 1; y >= 0; y--) {
    if (board[y].every(cell => cell === 1)) {
      board.splice(y, 1);
      linesCleared++;
      score += 100;
    }
  }
  if (linesCleared > 0) {
    for (let k = 0 ; k < linesCleared; k++) {
        board.unshift(Array(boardWidth).fill(0));
    }

    // Increase score based on lines cleared
    score += Math.pow(2, linesCleared) * 100;
    scoreElement.textContent = score;
  }
}

function rotatePiece() {
  const oldShape = currentPiece.shape;
  currentPiece.shape = currentPiece.shape[0].map((val, index) =>
    currentPiece.shape.map((row) => row[index]).reverse()
  );
  if (!canMove(0, 0)) {
    currentPiece.shape = oldShape;
  }
  clearBoard();
  drawPiece();
  drawBoard();
}

function drawBoard() {
    board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 1) {
          const block = document.createElement('div');
          block.classList.add('block');
          block.style.top = `${y * blockSize}px`;
          block.style.left = `${x * blockSize}px`;
          gameBoard.appendChild(block);
        }
      });
    });
  }

document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowLeft':
      movePiece(-1, 0);
      break;
    case 'ArrowRight':
      movePiece(1, 0);
      break;
    case 'ArrowDown':
      movePiece(0, 1);
      break;
    case 'ArrowUp':
      rotatePiece();
      break;
  }
});

function update() {
  movePiece(0, 1);
  setTimeout(update, 1000);
}

update();