import { generateSudoku, solveSudoku } from './sudoku.js';

// Configuration constants
const CANVAS_ID = 'sudokuCanvas';
const NOTES_BUTTON_ID = 'notes';
const UNDO_BUTTON_ID = 'undo';
const ERASE_BUTTON_ID = 'erase';
const HINT_BUTTON_ID = 'hint';
const NEW_GAME_BUTTON_ID = 'newGame';
const HIT_TREE_BUTTON_ID = 'hitTree';
const RESET_BUTTON_ID = 'reset';
const CELL_SIZE = 50;
const GRID_SIZE = 9;
const SELECTED_CELL_COLOR = '#a0d3e8';
const DEFAULT_FONT = '20px Arial';
const DEFAULT_FONT_COLOR = '#000';
const ANIMATION_DURATION = 500;
const START_COLOR = '#ffffff';
const END_COLOR = '#ff0000';
const ERROR_COLOR = '#cf0000';
const NOTE_ACTIVE_TEXT = '提示树: 开';
const NOTE_INACTIVE_TEXT = '提示树: 关';

const animationDuration = 1000; // 提示动画持续时间
const fontSizeIncrement = 0.5; // 字体大小增加的步幅

const canvas = document.getElementById(CANVAS_ID);
const ctx = canvas.getContext('2d');

let selectedCell = null;
let puzzleMatrix = [];  // 2D array to store the puzzle values
let fillGridOrder = [];
let solveMatrix = [];  // 2D array to store the solution values

let isShowHitTree = false;
let isShowHitAnimate = false;

function drawCanvas() {
    drawGrid();
    fillNumbers();
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
        ctx.lineWidth = (i % 3 === 0) ? 3 : 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
        ctx.lineWidth = (i % 3 === 0) ? 3 : 1;
        ctx.stroke();
    }
}

function drawSelectedCell(x, y) {
    ctx.fillStyle = SELECTED_CELL_COLOR;
    ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    ctx.fillStyle = DEFAULT_FONT_COLOR;
}

function getCellFromCoords(x, y) {
    return {
        row: Math.floor(y / CELL_SIZE),
        col: Math.floor(x / CELL_SIZE)
    };
}

function initMatrix(puzzle, solution) {
    puzzleMatrix = puzzle;
    solveMatrix = solution;
    fillGridOrder = [];
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (puzzleMatrix[i][j] !== 0) {
                fillGridOrder.push({index: fillGridOrder.length, row: i, col: j, fixed: true, isValid: true });
            }
        }
    }
}

function resetMatrixValue(row, col, value) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
    const { isValid, conflictCells } = checkForDuplicates(row, col, value);

    let existingIndex = fillGridOrder.findIndex(item => item.row === row && item.col === col);
    if (existingIndex === -1) {
        fillGridOrder.push({index: 0, row, col, fixed: false, isValid });
        existingIndex = fillGridOrder.findIndex(item => item.row === row && item.col === col);
    } else if (fillGridOrder[existingIndex].fixed) {
        return false;
    }

    puzzleMatrix[row][col] = value;
    fillGridOrder[existingIndex].isValid = isValid;
    let maxOrder = fillGridOrder.reduce((max, item) => max > item.index ? max : item.index, 0);
    fillGridOrder[existingIndex].index = maxOrder + 1;
    drawCanvas();
    
    if (!isValid) {
        conflictCells.forEach(([r, c]) => animateCell(r, c, ANIMATION_DURATION, START_COLOR, END_COLOR, value));
    } else {
        checkSudokuCompletion();
    }

    return true;
}

function checkForDuplicates(row, col, value) {
    const conflictCells = [];
    for (let c = 0; c < 9; c++) {
        if (c !== col && puzzleMatrix[row][c] == value) conflictCells.push([row, c]);
    }
    for (let r = 0; r < 9; r++) {
        if (r !== row && puzzleMatrix[r][col] == value) conflictCells.push([r, col]);
    }

    const boxRowStart = Math.floor(row / 3) * 3;
    const boxColStart = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const currentRow = boxRowStart + r;
            const currentCol = boxColStart + c;
            if ((currentRow !== row || currentCol !== col) && puzzleMatrix[currentRow][currentCol] == value) {
                conflictCells.push([currentRow, currentCol]);
            }
        }
    }

    if (conflictCells.length > 0) conflictCells.push([row, col]);

    return { isValid: conflictCells.length === 0, conflictCells };
}

function fillCell(row, col, value) {
    ctx.font = DEFAULT_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const oldStyle = ctx.fillStyle;
    const existingIndex = fillGridOrder.findIndex(item => item.row === row && item.col === col);
    if (existingIndex !== -1) {
        if (fillGridOrder[existingIndex].isValid) {
            ctx.fillStyle = DEFAULT_FONT_COLOR;
        }
        else {
            ctx.fillStyle = ERROR_COLOR;
        }
        ctx.fillText(value, col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2);
        ctx.fillStyle = oldStyle;
    }
    
}

/**
 * 检查在给定行、列和方块中不存在的数字
 * @param {number} row - 要检查的行索引
 * @param {number} col - 要检查的列索引
 * @param {number[][]} puzzleMatrix - 数独矩阵
 * @returns {number[]} - 在行、列和方块中都不存在的数字数组
 */
function getPossibleValues(row, col) {
    const possibleValues = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    // 检查行
    for (let c = 0; c < 9; c++) {
        const findIndex = fillGridOrder.findIndex(item => item.row === row && item.col === c);
        if (findIndex !== -1 && fillGridOrder[findIndex].isValid) {
            possibleValues.delete(puzzleMatrix[row][c]);
        }
    }

    // 检查列
    for (let r = 0; r < 9; r++) {
        const findIndex = fillGridOrder.findIndex(item => item.row === r && item.col === col);
        if (findIndex !== -1 && fillGridOrder[findIndex].isValid) {
            possibleValues.delete(puzzleMatrix[r][col]);
        }
        
    }

    // 检查3x3方块
    const boxRowStart = Math.floor(row / 3) * 3;
    const boxColStart = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const findIndex = fillGridOrder.findIndex(item => item.row === boxRowStart + r && item.col === boxColStart + c);
            if (findIndex !== -1 && fillGridOrder[findIndex].isValid) {
                possibleValues.delete(puzzleMatrix[boxRowStart + r][boxColStart + c]);
            }
        }
    }

    return Array.from(possibleValues);
}

function fillProbabilityValue(row, col, values) {
    const subCellSize = CELL_SIZE / 3;

    // Fill the values in the 3x3 subgrid
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (value < 1 || value > 9) continue;

        const subRow = Math.floor((value - 1) / 3);
        const subCol = (value - 1) % 3;

        const x = col * CELL_SIZE + subCol * subCellSize + subCellSize / 2;
        const y = row * CELL_SIZE + subRow * subCellSize + subCellSize / 2;

        ctx.fillText(value, x, y);
    }
}

function fillNumbers() {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
                drawSelectedCell(col, row);
            }
            if (puzzleMatrix[row][col] !== 0) {
                fillCell(row, col, puzzleMatrix[row][col]);
            } else {
                if (isShowHitTree) {
                    const possibleValues = getPossibleValues(row, col);
                    fillProbabilityValue(row, col, possibleValues);
                }
            }
        }
    }
}

function animateCell(row, col, duration, startColor, endColor, text) {
    const startTime = performance.now();

    function animate(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentColor = interpolateColor(startColor, endColor, progress);

        ctx.fillStyle = currentColor;
        ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.strokeRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        fillCell(row, col, text);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            setTimeout(() => {
                reverseAnimateCell(row, col, duration, endColor, startColor, text);
            }, 500);
        }
    }

    requestAnimationFrame(animate);
}

function reverseAnimateCell(row, col, duration, startColor, endColor, text) {
    const startTime = performance.now();

    function animate(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentColor = interpolateColor(startColor, endColor, progress);

        ctx.fillStyle = currentColor;
        ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.strokeRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        fillCell(row, col, text);

        drawCanvas();

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}

function interpolateColor(startColor, endColor, factor) {
    const result = startColor.slice(1).match(/.{2}/g).map((hex, index) => {
        const startValue = parseInt(hex, 16);
        const endValue = parseInt(endColor.slice(1).match(/.{2}/g)[index], 16);
        const value = Math.round(startValue + (endValue - startValue) * factor).toString(16);
        return value.padStart(2, '0');
    }).join('');
    return `#${result}`;
}

function isSudokuCompletedAndCorrect(board) {
    for (let i = 0; i < 9; i++) {
        let rowSet = new Set();
        let colSet = new Set();
        let boxSet = new Set();
        
        for (let j = 0; j < 9; j++) {
            let rowNum = board[i][j];
            let colNum = board[j][i];
            let boxNum = board[Math.floor(i / 3) * 3 + Math.floor(j / 3)][(i % 3) * 3 + (j % 3)];

            if (rowNum === 0 || colNum === 0 || boxNum === 0) return false;
            if (rowSet.has(rowNum) || colSet.has(colNum) || boxSet.has(boxNum)) return false;
            
            rowSet.add(rowNum);
            colSet.add(colNum);
            boxSet.add(boxNum);
        }
    }
    return true;
}

function checkSudokuCompletion() {
    if (isSudokuCompletedAndCorrect(puzzleMatrix)) {
        document.getElementById('completionGif').style.display = 'block';
        alert('恭喜！您已正确完成数独谜题！')
    }
}

function resetNonFixedCells() {
    // 遍历 fillGridOrder 并筛选出非固定的单元格
    fillGridOrder = fillGridOrder.filter(cell => {
        if (!cell.fixed) {
            // 将非固定单元格在 puzzleMatrix 中的值设置为0
            puzzleMatrix[cell.row][cell.col] = 0;
            return false; // 过滤掉非固定单元格
        }
        return true; // 保留固定单元格
    });
}

function showHint() {
    // 获取所有未填充的单元格位置
    const emptyCells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (puzzleMatrix[row][col] === 0) {
                emptyCells.push({ row, col });
            }
        }
    }

    if (emptyCells.length === 0) {
        return; // 如果没有空白单元格，则返回
    }

    // 从未填充的位置中随机选择一个
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];

    // 获取解中的对应数字
    const hintValue = solveMatrix[row][col];

    // 播放动画
    animateHint(row, col, hintValue);
}

function animateHint(row, col, value) {
    const startTime = performance.now();
    const cellX = col * CELL_SIZE;
    const cellY = row * CELL_SIZE;

    const oldStyle = ctx.fillStyle; // 保存原始填充样式

    function animate(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // 计算当前字体大小
        const fontSize = Math.floor(CELL_SIZE * progress);

        ctx.clearRect(cellX + 1, cellY + 1, CELL_SIZE - 2, CELL_SIZE - 2); // 清空单元格背景
        // ctx.strokeRect(cellX, cellY, CELL_SIZE, CELL_SIZE); // 绘制单元格边框

        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff00ff'; // 设置文本颜色
        ctx.fillText(value, cellX + CELL_SIZE / 2, cellY + CELL_SIZE / 2);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // 确保动画结束时字体大小完全匹配
            ctx.font = `${CELL_SIZE}px Arial`;
            ctx.fillText(value, cellX + CELL_SIZE / 2, cellY + CELL_SIZE / 2);
            ctx.fillStyle = oldStyle; // 恢复原始填充样式
            drawCanvas();
            isShowHitAnimate = false; // 重置 isShowHitAnimate 标志
        }
    }

    requestAnimationFrame(animate);
}

function startNewGame(difficulty) {
    // Initialize the game based on difficulty
    // Adjust this function according to your implementation of difficulty levels
    const { puzzle, solution } = generateSudokuGame(difficulty);
    puzzleMatrix = puzzle;
    solveMatrix = solution;
    fillGridOrder = [];
    initMatrix(puzzle, solution); // Ensure to reset or initialize any other necessary data
    drawCanvas();
}

function generateSudokuGame(difficulty) {
    // Modify this function to generate Sudoku based on difficulty
    // Example implementation of difficulty-based generation
    let cellsToRemove;
    switch (difficulty) {
        case 'easy':
          cellsToRemove = 20; // Easy
          break;
        case 'medium':
          cellsToRemove = 40; // Medium
          break;
        case 'hard':
          cellsToRemove = 54; // Hard
          break;
        case 'expert':
          cellsToRemove = 62; // Very Hard
          break;
        default:
          cellsToRemove = 20; // Default to easy
      }
    
    return generateSudoku(cellsToRemove); // This function should generate a Sudoku puzzle with the specified number of clues
}

function initGameEvents() {
    const hitTreeButton = document.getElementById(HIT_TREE_BUTTON_ID);

    hitTreeButton.addEventListener('click', () => {
        if (isShowHitTree) {
            isShowHitTree = false;
            hitTreeButton.textContent = NOTE_INACTIVE_TEXT;
            drawCanvas();
        } else {
            isShowHitTree = true;
            hitTreeButton.textContent = NOTE_ACTIVE_TEXT;
            drawCanvas();
        }
    });

    document.getElementById(UNDO_BUTTON_ID).addEventListener('click', () => {
        if (fillGridOrder.length === 0) {
            return; // 如果没有更多的操作可以撤销，则直接返回
        }
    
        // 找到 index 最大的元素
        let maxIndex = -1;
        let maxIndexElement = null;
        let maxIndexPosition = -1;
    
        fillGridOrder.forEach((element, index) => {
            if (element.index > maxIndex && !element.fixed) {
                maxIndex = element.index;
                maxIndexElement = element;
                maxIndexPosition = index;
            }
        });
    
        if (maxIndexElement) {
            // 更新 puzzleMatrix
            puzzleMatrix[maxIndexElement.row][maxIndexElement.col] = 0;
    
            // 从 fillGridOrder 中删除该元素
            fillGridOrder.splice(maxIndexPosition, 1);
    
            // 重新绘制数独网格
            drawCanvas();
        }
    });

    document.getElementById(HINT_BUTTON_ID).addEventListener('click', () => {
        if (isShowHitAnimate) return; // 如果已经有提示动画在播放，则直接返回
        isShowHitAnimate = true; // 设置标志，表示提示动画正在播放
        showHint(); // 显示提示动画
    });

    document.getElementById(RESET_BUTTON_ID).addEventListener('click', () => {
        resetNonFixedCells();
        drawCanvas();
    });

    const dialog = document.getElementById('dialog');
    const closeDialogButton = document.getElementById('close-dialog');
    const difficultyButtons = document.querySelectorAll('.difficulty-button');

    document.getElementById(NEW_GAME_BUTTON_ID).addEventListener('click', () => {
        document.getElementById('completionGif').style.display = 'none'; // 隐藏完成动画
        dialog.classList.remove('hidden');
    })

    closeDialogButton.addEventListener('click', () => {
        // Hide the dialog
        dialog.classList.add('hidden');
    });
    
    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const difficulty = button.getAttribute('data-difficulty');
            startNewGame(difficulty);
            // Hide the dialog
            dialog.classList.add('hidden');
        });
    });

    const cells = document.querySelectorAll('.cell');
    let selectedValue = null;

    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            // 移除之前选中格子的选中状态
            cells.forEach(c => c.classList.remove('selected'));

            // 更新全局变量的值
            selectedValue = cell.getAttribute('data-value');

            // 改变当前格子的背景色
            cell.classList.add('selected');

            if (selectedCell != null) {
                // 重绘Canvase，以显示选中的格子
                resetMatrixValue(selectedCell.row, selectedCell.col, parseInt(selectedValue, 10) || 0);
            }
        });
    });

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const cell = getCellFromCoords(x, y);

        selectedCell = cell;
        drawCanvas();
    });
}

function main() {
    initGameEvents();
}

main();
