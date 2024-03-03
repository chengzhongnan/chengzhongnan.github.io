let grid = [];
const GRID_SIZE = 5;

function initGrid() {
  grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  addNumber();
  addNumber();
  updateGrid();
}

function addNumber() {
  let emptyCells = getEmptyCells(); 
  if (emptyCells.length) {
    let randomIndex = Math.floor(Math.random() * emptyCells.length); 
    let [row, col] = emptyCells[randomIndex];
    grid[row][col] = 2; 
  }
}

function getEmptyCells() {
  let emptyCells = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] === 0) {
        emptyCells.push([i, j]);
      }
    }
  }
  return emptyCells;
}

function updateGrid() {
  let gridContainer = document.querySelector('.grid-container');
  gridContainer.innerHTML = ''; 

  grid.forEach(row => {
    row.forEach(cellValue => {
      let cell = document.createElement('div');
      cell.classList.add('grid-cell');
      if (cellValue) {
        cell.textContent = cellValue; 
      }
      gridContainer.appendChild(cell);
    })
  })
}

// (Incomplete) Example for movement
function moveUp(key) {
  // ...implementation for moving numbers up
  switch(key) {
    case 'ArrowUp':
      alignUp();
      break;
    case 'ArrowDown':
      alignDown();
      break;
    case 'ArrowLeft':
      alignLeft();
      break;
    case 'ArrowRight':
      alignRight();
      break;
  }
  mergeCells();
  randomNewNumber();
  updateGrid();
}

function _alignLeft(row) {
  let newRow = new Array(GRID_SIZE).fill(0); // Create a new row with zeros
  let nonZeroIndex = 0; // Tracks the index for non-zero values

  for (let i = 0; i < GRID_SIZE; i++) {
    if (row[i] !== 0) { // Check if current cell has a value
      newRow[nonZeroIndex] = row[i]; // Place non-zero value in new row
      nonZeroIndex++; // Increment non-zero index
    }
  }

  return newRow;
}

function alignLeft() {
  grid = grid.map(row => _alignLeft(row));
}

function _alignRight(row) {
  let newRow = new Array(GRID_SIZE).fill(0); 
  let nonZeroIndex = GRID_SIZE - 1; // Start tracking from the right

  for (let i = GRID_SIZE - 1; i >= 0; i--) { // Iterate from right to left
    if (row[i] !== 0) { 
      newRow[nonZeroIndex] = row[i]; 
      nonZeroIndex--; // Decrement non-zero index for right shifting
    }
  }

  return newRow;
}

function alignRight() {
  grid = grid.map(row => _alignRight(row));
}

function _alignUp(grid) {
  let newGrid = [];

  for (let col = 0; col < GRID_SIZE; col++) {
    let column = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      column.push(grid[row][col]); // Extract a column 
    }
    newGrid.push(_alignLeft(column)); // Align it left (which aligns numbers upwards) 
  }

  // Transpose the grid back for proper orientation
  return newGrid.map((row, rowIndex) => row.map((val, colIndex) => newGrid[colIndex][rowIndex]));
}

function alignUp() {
  grid = _alignUp(grid);
}

function _alignDown(grid) {
  let newGrid = [];

  for (let col = 0; col < GRID_SIZE; col++) {
    let column = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      column.push(grid[row][col]); 
    }
    newGrid.push(_alignRight(column)); // Align it right (which aligns numbers downwards)
  }

  // Transpose (similar to alignUp)
  return newGrid.map((row, rowIndex) => row.map((val, colIndex) => newGrid[colIndex][rowIndex]));
}

function alignDown() {
  grid = _alignDown(grid);
}

function mergeCells() {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      // left cell value equals right value
      if (j + 1 < GRID_SIZE && grid[i][j] === grid[i][j + 1] && grid[i][j] !== 0) {
        grid[i][j] *= 2; // Double the value (merge)
        grid[i][j + 1] = 0; // Empty the merged cell
        // Add to the score (e.g., score += grid[i][j]) 
      }
      // up cell value equals down cell value
      if (i + 1 < GRID_SIZE && grid[i][j] === grid[i + 1][j] && grid[i][j] !== 0) {
        grid[i][j] *= 2;
        grid[i + 1][j] = 0;
      }
    }
  }
}

// Helper to find the maximum cell value
function findMaxCellValue() {
  let max = 0;
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      max = Math.max(max, grid[i][j]);
    }
  }
  return max;
}

function getEmptyCells() {
  let emptyCells = [];

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] === 0) {
        emptyCells.push([i, j]); // Store the row, column index
      }
    }
  }

  return emptyCells;
}

function randomNewNumber() {
  let emptyCells = getEmptyCells();

  if (emptyCells.length > 0) {
    let randomIndex = Math.floor(Math.random() * emptyCells.length);
    let [row, col] = emptyCells[randomIndex];

    // Options for new number generation:

    let maxCellValue = findMaxCellValue();
    let randomNumber = 1; 
    while (randomNumber * 2 <= maxCellValue) {
      randomNumber *= 2;
      if (Math.random() > 0.8) {
        break;
      }
    }

    grid[row][col] = randomNumber;
  }
}

// Event Listener
document.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
       moveUp(event.key); 
       break;
  }
});

initGrid(); 