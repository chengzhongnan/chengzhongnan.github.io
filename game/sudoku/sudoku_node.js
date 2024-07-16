const dlxlib = require('dlxlib');

const ROWS = Array.from({ length: 9 }, (_, i) => i);
const COLS = Array.from({ length: 9 }, (_, i) => i);
const DIGITS = Array.from({ length: 9 }, (_, i) => i + 1);

const solvePuzzle = (puzzle) => {
  const rows = buildRows(puzzle);
  const matrix = buildMatrix(rows);
  return dlxlib.solve(matrix, () => {}, () => {}, 1).map((rowIndices) =>
    rowIndices.map((rowIndex) => rows[rowIndex])
  );
};

const buildRows = (puzzle) => {
  const cells = ROWS.flatMap((row) => COLS.map((col) => ({ row, col })));
  return cells.flatMap((coords) => buildRowsForCell(puzzle)(coords));
};

const lookupInitialValue = (puzzle, { row, col }) => {
  const ch = puzzle[row][col];
  const n = Number(ch);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const buildRowsForCell = (puzzle) => (coords) => {
  const initialValue = lookupInitialValue(puzzle, coords);
  return initialValue
    ? [{ coords, value: initialValue, isInitialValue: true }]
    : DIGITS.map((digit) => ({ coords, value: digit, isInitialValue: false }));
};

const buildMatrix = (rows) => rows.map(buildMatrixRow);

const buildMatrixRow = ({ coords: { row, col }, value }) => {
  const box = Math.floor(row - (row % 3) + col / 3);
  const posColumns = oneHot(row, col);
  const rowColumns = oneHot(row, value - 1);
  const colColumns = oneHot(col, value - 1);
  const boxColumns = oneHot(box, value - 1);
  return [...posColumns, ...rowColumns, ...colColumns, ...boxColumns];
};

const oneHot = (major, minor) => {
  const array = Array(81).fill(0);
  array[major * 9 + minor] = 1;
  return array;
};

const generateSudoku = () => {
  const puzzle = Array(9).fill().map(() => Array(9).fill(0));

  // Randomly fill 9 numbers
  let filledCount = 0;
  while (filledCount < 9) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    const num = Math.floor(Math.random() * 9) + 1;

    if (puzzle[row][col] === 0 && isValid(puzzle, row, col, num)) {
      puzzle[row][col] = num;
      filledCount++;
    }
  }

  const solutions = solvePuzzle(puzzle);
  return { puzzle, solution: solutions[0] };
};

// Helper function to check if a number is valid in a given position
const isValid = (puzzle, row, col, num) => {
  for (let i = 0; i < 9; i++) {
    if (puzzle[row][i] === num || puzzle[i][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (puzzle[boxRow + i][boxCol + j] === num) return false;
    }
  }
  return true;
};

const printSudoku = (solution) => {
  const sudokuMatrix = Array(9).fill().map(() => Array(9).fill(0));
  solution.forEach(({ coords: { row, col }, value }) => {
    sudokuMatrix[row][col] = value;
  });
  sudokuMatrix.forEach((row) => console.log(row.join(' ')));
};

const { puzzle, solution } = generateSudoku(); // Generate a new puzzle
puzzle.forEach((row) => console.log(row.join(' ').replace(/0/g, '*'))) // Print the puzzle
console.log('-------------------')
printSudoku(solution);
