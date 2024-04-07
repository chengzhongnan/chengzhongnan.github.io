const ROWS = 10;
const COLS = 10;

// 点击的时候判断状态，如果格子状态与点击状态相同就正确，否则错误
let clickState = 1;
let errorCount = 0;

// 左边和上面的数字显示框
const ROW_START_INDEX = 110;
const COL_START_INDEX = 110;
const ROW_STEP = 20;
const COL_STEP = 20;

// 点击区域
const CELL_SIZE = 30;
const CELL_BORDER_SIZE = 1;
const GRID_SIZE = ROWS * CELL_SIZE;
const CORNER_RADIUS = 5;

// 配色
const color = {
    grid: '#F0EDDA',
    label: '#C8AD5E',
    textRaw: '#FFFF5E',
    textFull: '#00FF00',
    textError: '#FF0000',
    radio: '#CCCCCC'
}

// Canvas element and 2D context
const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');

// 2D array to store grid state
let gridState = [];
let gridData = [];

const svg = {
    u2705 : null,
    u274e : null
}

async function loadSVG(src) {
    return new Promise((resolve, reject) => {
        let res = new Image();
        res.onload = function() {
            resolve(res);
        }
        res.src = src;
    })
}

async function loadResource() {
    
    let u2705 = await loadSVG('./res/Fxemoji_u2705.svg');
    svg.u2705 = u2705;

    let u274e = await loadSVG('./res/Emoji_u274e.svg');
    svg.u274e = u274e;
}

// Initialize grid
function initGrid() {
    errorCount = 0;
    for (let i = 0; i < ROWS; i++) {
        gridState.push([]);
        gridData.push([]);
        for (let j = 0; j < COLS; j++) {
            gridState[i][j] = Math.round(Math.random());
        }
    }
    drawGrid();
    drawCountBox();
}

// Draw rounded rectangle
function drawRoundedRect(x, y, width, height, radius, fillStyle, strokeStyle) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }
    if (strokeStyle) {
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
    }
}

function rectLeftToCenter(x, y, width, height) {
    return {
        x : x + width / 2,
        y : y + height / 2
    }
}

function rectCenterToLeft(x, y, width, height) {
    return {
        x : x - width / 2,
        y : y - height / 2
    }
}

function drawStateSwitchRadioButton(x, y, width, height, radius) {
    // 先在水平居中位置画一个圆角矩形，高度为1/4，宽度为2/3
    const rectWidth = width * 2 / 3;
    const rectHeight = height / 4;
    const center = rectLeftToCenter(x, y, width, height);
    const left = rectCenterToLeft(center.x, center.y, rectWidth, rectHeight);
    left.y  -= rectHeight / 3;

    drawRoundedRect(left.x, left.y, rectWidth, rectHeight, radius, '#FFFFFF');

    // 再在下面的位置写上错误数量
    drawText(`错误次数：${errorCount}`, left.x + rectWidth / 2, left.y + rectHeight * 2, {
        fillStyle: color.textError,
        font: '16px Arial'
    });
    
    // 画切换按钮
    if (clickState == 1) {
        // drawRoundedRect(left.x, left.y, rectWidth / 2 - radius, rectHeight - radius, radius, '#00B86B')
        // 在居中位置写上√
        ctx.drawImage(svg.u2705, left.x , left.y , rectWidth / 2, rectHeight )
    } else {
        drawRoundedRect(left.x + rectWidth / 2, left.y, rectWidth / 2, rectHeight, radius, '#00B86B')
        // 在居中位置写上×
        ctx.drawImage(svg.u274e, left.x + rectWidth / 2 , left.y , rectWidth / 2, rectHeight)
    }
}

// Draw text
function drawText(text, x, y, options) {
    ctx.save();
    if (options != null && options.font != null) {
        ctx.font = options.font;
    } else {
        ctx.font = '20px Arial';
    }

    // if (options != null && options.textBaseline != null) {
    //     ctx.textBaseline = options.textBaseline;
    // }
    // else {
    //     ctx.textBaseline = 'middle';
    // }
    
    if (options != null && options.textAlign != null) {
        ctx.textAlign = options.textAlign;
    } else {
        ctx.textAlign = 'center';
    }

    if (options != null && options.fillStyle != null) {
        ctx.fillStyle = options.fillStyle;
    } else {
        ctx.fillStyle = color.text;
    }
    
    ctx.fillText(text, x, y);
    ctx.restore();
}

function drawTextArray(textArray, x, y, direction) {

    let options = {
        fillStyle: color.textRaw
    }
    if (direction == 'v' || direction == 'V') {
        let maxCount = ROW_START_INDEX / ROW_STEP;
        if (textArray.length > maxCount) {
            throw new Error('text is invalid');
        }

        for (let i = 0 ; i < textArray.length; i++) {
            let x_pos = x + (maxCount - textArray.length + i) * ROW_STEP ;
            if (textArray[i].full) {
                options.fillStyle = color.textFull
            } else {
                options.fillStyle = color.textRaw
            }
            
            drawText(textArray[i].count, x_pos, y + COL_STEP / 2, options);
        }

    }
    else if (direction == 'h' || direction == 'H') {
        let maxCount = COL_START_INDEX / COL_STEP;
        if (textArray.length > maxCount) {
            throw new Error('text is invalid');
        }

        for (let i = 0 ; i < textArray.length; i++) {
            let y_pos = y + (maxCount - textArray.length + i) * COL_STEP;
            if (textArray[i].full) {
                options.fillStyle = color.textFull
            } else {
                options.fillStyle = color.textRaw
            }
            drawText(textArray[i].count, x + ROW_STEP / 2, y_pos + COL_STEP / 2, options);
        }
    }
}

function countConsecutiveOnes(arr) {
    let counts = [];
    let count = 0;
    let full = true;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].state === 1) {
            count++;
            full = (full && arr[i].isOpen);
            if (full) {
                console.log(arr[i].row + ',' + arr[i].col + ': ' + i);
            }
        } else if (count > 0) {
            counts.push({
                count: count,
                full: full
            });
            count = 0;
            full = true;
        }
    }
    if (count > 0) {
        counts.push({
            count: count,
            full: full
        });
    }
    return counts;
}

function getRowTextArray(row) {
    let rowData = [];
    for (let i = 0 ; i < COLS; i++) {
        rowData.push({
            state: gridState[row][i],
            row: row,
            col: i,
            isOpen: gridData[row][i].isOpen
        })
    }
    return countConsecutiveOnes(rowData); 
}

function getColTextArray(col) {
    let colData = [];
    for (let i = 0; i < ROWS; i++) {
        colData.push({
            state: gridState[i][col],
            row: i,
            col: col,
            isOpen: gridData[i][col].isOpen
        });
    }

    return countConsecutiveOnes(colData);
}

function drawCountBox() {
    drawRoundedRect(0, 0, ROW_START_INDEX, COL_START_INDEX, CORNER_RADIUS, color.radio);
    drawStateSwitchRadioButton(0, 0, ROW_START_INDEX, COL_START_INDEX, CORNER_RADIUS);
    for (let col = 0; col < COLS; col++) {
        drawRoundedRect(COL_START_INDEX + col * CELL_SIZE, 0,
            CELL_SIZE - CELL_BORDER_SIZE, ROW_START_INDEX - CELL_BORDER_SIZE, CORNER_RADIUS, color.label);
        
            drawTextArray(getColTextArray(col), ROW_START_INDEX + col * CELL_SIZE + CELL_BORDER_SIZE * 3, 0, 'h')        
    }

    for (let row = 0; row < ROWS; row++) {
        drawRoundedRect(0, ROW_START_INDEX + row * CELL_SIZE,
            COL_START_INDEX - CELL_BORDER_SIZE, CELL_SIZE - CELL_BORDER_SIZE, CORNER_RADIUS, color.label);

        drawTextArray(getRowTextArray(row), 0, COL_START_INDEX + row * CELL_SIZE + CELL_SIZE / 2, 'v')
    }
}

function drawGridCell(i, j) {
    const x = j * CELL_SIZE + ROW_START_INDEX;
    const y = i * CELL_SIZE + COL_START_INDEX;

    if (gridData[i][j] == null) {
        gridData[i][j] = {
            row: i,
            col: j,
            left: x,
            top: y,
            right: x + CELL_SIZE - CELL_BORDER_SIZE,
            bottom: y + CELL_SIZE - CELL_BORDER_SIZE,
            state: gridState[i][j],
            isOpen: false,
            isError: false
        }
    }

    drawRoundedRect(x, y, CELL_SIZE - CELL_BORDER_SIZE, CELL_SIZE - CELL_BORDER_SIZE, CORNER_RADIUS, color.grid);
    
    const cell = gridData[i][j]
    if (cell.isOpen) {
        if (cell.state == 1) {
            ctx.drawImage(svg.u2705, cell.left + CORNER_RADIUS / 2, cell.top + CORNER_RADIUS / 2, 
                cell.right - cell.left - CORNER_RADIUS, cell.bottom - cell.top - CORNER_RADIUS)
        } else {
            ctx.drawImage(svg.u274e, cell.left + CORNER_RADIUS / 2, cell.top + CORNER_RADIUS / 2, 
                cell.right - cell.left - CORNER_RADIUS, cell.bottom - cell.top - CORNER_RADIUS)
        }
    }
}

// Draw grid and update counts
function drawGrid() {
    ctx.clearRect(0, 0, GRID_SIZE + ROW_START_INDEX, GRID_SIZE + COL_START_INDEX);

    const rowCounts = Array.from({
        length: ROWS
    }, () => 0);
    const colCounts = Array.from({
        length: COLS
    }, () => 0);

    gridState.forEach((row, i) => {
        let count = 0;
        row.forEach((cell, j) => {
            if (cell === 1) {
                count++;
                colCounts[j]++;
            } else {
                count = 0;
            }
            rowCounts[i] = Math.max(rowCounts[i], count);

            drawGridCell(i, j);
        });
    });
}

function isSwitchButtonClick(x, y) {
    return x <= ROW_START_INDEX && y <= COL_START_INDEX;
}

function findClickedCell(posX, posY) {
    for (let row of gridData) {
        for (let cell of row) {
            if (cell.left <= posX && cell.right >= posX 
                && cell.top <= posY && cell.bottom >= posY) {
                    return cell;
                }
        }
    }

    return null;
}

function onChangeSwitchState() {
    if (clickState == 1) {
        clickState = 0;
    } else {
        clickState = 1;
    }

    drawCountBox();
}

function onGridCellClick(cell) {
    console.log(cell);
    if (clickState == cell.state) {
        cell.isOpen = true;
    } else {
        cell.isError = true;
        cell.isOpen = true;
        errorCount += 1;
    }

    drawGrid();
    drawCountBox();
}

// Canvas点击事件
function onCanvasClick(ev) {
    const isSwitchButtonClicked = isSwitchButtonClick(ev.offsetX, ev.offsetY);
    if (isSwitchButtonClicked) {
        onChangeSwitchState();
        return;
    }

    const clickedCell = findClickedCell(ev.offsetX, ev.offsetY);
    if (clickedCell == null) {
        return;
    }

    onGridCellClick(clickedCell);
    checkGameOver();
}

// Check game status
function checkGameOver() {
    let isOver = true;
    for (let i = 0 ; i <ROWS; i++ ) {
        for (let j = 0; j < COLS; j++) {
            if (!gridData[i][j].isOpen) {
                isOver = false;
                break;
            }
        }
        if (!isOver) {
            break;
        }
    }

    if (isOver) {
        if (errorCount == 0) {
            alert ('恭喜你，完美通关');
        } else {
            alert (`游戏结束，本局中你一共失误${errorCount}次`);
        }

        main();
    }
}

async function main() {
    clickState = 1;
    errorCount = 0;
    
    gridState = [];
    gridData = [];

    await loadResource();
    // Initialize grid
    initGrid();
    
    canvas.addEventListener('click', onCanvasClick);
}

main();
