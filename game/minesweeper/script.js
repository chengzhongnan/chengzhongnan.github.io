const board = document.getElementById('board');
const container = document.getElementById('container');

let minesweeperBoard = [];

let rowCount = 15;
let colCount = 15;
let landmineCount = 40;
let isGameOver = false;

function setContainerAttribute() {
    board.style.gridTemplateColumns = `repeat(${colCount}, 40px)`;
    board.style.gridTemplateRows = `repeat(${rowCount}, 40px)`;

    container.style.gridTemplateColumns = `repeat(${colCount + 2}, 40px)`;
    container.style.gridTemplateRows = `repeat(${rowCount}, 40px)`;
}

function randomLandmine(row, col, mineCount) {
    // Create a 2D array representing the Minesweeper board
    const boardMine = new Array(row).fill(0).map(() => new Array(col).fill(0));
    
    // Randomly place mines on the board
    let minesPlaced = 0;
    while (minesPlaced < mineCount) {
        const randomRow = Math.floor(Math.random() * row);
        const randomCol = Math.floor(Math.random() * col);
        
        if (boardMine[randomRow][randomCol] !== 'M') {
            boardMine[randomRow][randomCol] = 'M';
            minesPlaced++;
        }
    }
    
    return boardMine;
}

function calcAroundMineCount(boardMine, row, col) {
    const numRows = boardMine.length;
    const numCols = boardMine[0].length;
    let count = 0;

    // Check all surrounding cells
    for (let i = Math.max(0, row - 1); i <= Math.min(numRows - 1, row + 1); i++) {
        for (let j = Math.max(0, col - 1); j <= Math.min(numCols - 1, col + 1); j++) {
            if (i !== row || j !== col) { // Exclude the current cell
                if (boardMine[i][j] === 'M') {
                    count++;
                }
            }
        }
    }

    return count;
}

function createBoard() {
    const boardMine = randomLandmine(rowCount, colCount, landmineCount);
    for (let i = 0; i < rowCount; i++) {
        let row = [];
        for (let j = 0; j < colCount; j++) {
            if (boardMine[i][j] == 'M') {
                row.push('M');
            }
            else {
                row.push(calcAroundMineCount(boardMine, i, j));
            }

            const cell = document.createElement('div');
            cell.classList.add('cell', 'unopened');
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', handleClick);
            cell.addEventListener('contextmenu', handleRightClick);
            
            board.appendChild(cell);
        }
        minesweeperBoard.push(row);
    }

    setContainerAttribute();
}

function handleClick(event) {
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    if (event.target.classList.contains('flagged')) {
        return;
    }

    revealCell(row, col);
}

function handleRightClick(event) {
    event.preventDefault();
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    if (event.target.classList.contains('open')) {
        return;
    }

    if (event.target.classList.contains('flagged')) {
        event.target.classList.remove('flagged');
    } else {
        event.target.classList.add('flagged');
    }
}

function revealCell(row, col) {
    if (minesweeperBoard[row][col] === 'M') {
        // Failed: Mine revealed
        if (!isGameOver) {
            isGameOver = true;
            openAllCell();
            setTimeout(() => {
                alert("Boom! You revealed a mine.");
            }, 1000);
        }
        
        // Additional actions for game over (e.g., display all mines, end game)
    } else if (minesweeperBoard[row][col] === 0) {
        // Open all adjacent cells with zeros
        openAdjacentCells(row, col);
    } else {
        // Open the cell with number
        openCell(row, col);
    }
}

function openAdjacentCells(row, col) {
    const numRows = minesweeperBoard.length;
    const numCols = minesweeperBoard[0].length;
    const visited = new Set();

    function dfs(r, c) {
        if (r < 0 || r >= numRows || c < 0 || c >= numCols || visited.has(`${r},${c}`)) {
            return;
        }
        visited.add(`${r},${c}`);
        if (minesweeperBoard[r][c] === 0) {
            openCell(r, c);
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    dfs(r + i, c + j);
                }
            }
        } else {
            openCell(r, c);
        }
    }

    dfs(row, col);
}

function openCell(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

    if (minesweeperBoard[row][col] === 'M') {
        cell.classList.add('boomed');
    }
    else if (minesweeperBoard[row][col] === 0) {
        // Change the style of the cell if it contains 0
        cell.classList.remove('unopened');
        cell.classList.add('open');
    } else {
        // Write the number in the cell
        cell.classList.remove('unopened');
        cell.classList.add('open');
        cell.textContent = minesweeperBoard[row][col];
    }

    if (allCellIsOpen() && !isGameOver) {
        isGameOver = true;
        openAllCell();
        setTimeout(() => {
            alert('Congratulations! You won the game!');
        }, 1000) 
    }
}

function allCellIsOpen() {
    const numRows = minesweeperBoard.length;
    const numCols = minesweeperBoard[0].length;

    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            if (minesweeperBoard[i][j] !== 'M' && !isCellOpen(i, j)) {
                return false;
            }
        }
    }

    return true;
}

function isCellOpen(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    return cell.classList.contains('open');
}

function openAllCell() {
    const numRows = minesweeperBoard.length;
    const numCols = minesweeperBoard[0].length;

    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            openCell(i, j);
        }
    }
}

createBoard();