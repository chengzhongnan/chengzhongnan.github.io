// 点击的时候判断状态，如果格子状态与点击状态相同就正确，否则错误
let clickState = 1;
// 错误数量
let errorCount = 0;
// 等级: 1初级，2中级，3高级
let level = 1;
// 难度等级：1菜鸟，2普通，3专家
let difficultyLevel = 2;
// 提示等级：1智能，2普通，3无
let promptLevel = 2;
// 自动空白填充
let autoOpenBlank = true;
// 背景音效
let backgroundMusic = true;

let ROWS = 10;
let COLS = 10;
// 左边和上面的数字显示框
const ROW_START_INDEX = 110;
const COL_START_INDEX = 110;
const ROW_STEP = 20;
const COL_STEP = 20;

// 点击区域
const CELL_SIZE = 30;
const CELL_BORDER_SIZE = 1;
let GRID_SIZE = ROWS * CELL_SIZE;
const CORNER_RADIUS = 5;

// 配色
const color = {
    grid: '#F0EDDA',
    bigGrid: '#FF7F7F',
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
    u2705: null,
    u274e: null
}

async function loadSVG(src) {
    return new Promise((resolve, reject) => {
        let res = new Image();
        res.onload = function () {
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

function initializeGridState() {
    let gridState = []; // 初始化格子状态数组
    let gridData = [];

    // 根据难度设置的目标百分比
    let targetPercentage;
    switch (difficultyLevel) {
        case 1:
            targetPercentage = 0.80; // 难度等级1的时候为30%
            break;
        case 2:
            targetPercentage = 0.50; // 难度等级2的时候为50%
            break;
        case 3:
            targetPercentage = 0.30; // 难度等级3的时候为80%
            break;
        default:
            targetPercentage = 0.80; // 默认等级设置为30%
    }

    // 初始化格子，根据难度百分比来设置格子为1的概率
    for (let i = 0; i < ROWS; i++) {
        gridState[i] = [];
        gridData[i] = [];
        for (let j = 0; j < COLS; j++) {
            // 使用随机数与目标百分比比较，决定是否将格子设置为1
            gridState[i][j] = Math.random() < targetPercentage ? 1 : 0;
        }
    }

    // 返回初始化好的数组
    return {
        gridState,
        gridData
    };
}

// Initialize grid
function initGrid() {
    // 清空错误数量
    errorCount = 0;
    // 重置格子
    let initData = initializeGridState();
    gridData = initData.gridData;
    gridState = initData.gridState;

    checkGrid();
    chechGridData();

    drawGrid();
    drawCountBox();
}

function chechGridData() {

    for (let i = 0 ; i < ROWS; i++) {
        for (let j = 0 ; j < COLS; j++) {
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
        }
    }


}

function checkGrid() {
    let changed = false;
    for (let i = 0; i < ROWS; i++) {
        let ret = checkGridRow(i);
        changed = changed || ret;
    }

    for (let i = 0; i < COLS; i++) {
        let ret = checkGridCol(i);
        changed = changed || ret;
    }

    if (changed) {
        checkGrid();
    }
}

function countConsecutiveOnesSimple(arr) {
    let counts = [];
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === 1) {
            count++;
        } else if (count > 0) {
            counts.push(count);
            count = 0;
        }
    }
    if (count > 0) {
        counts.push(count);
    }
    return counts;
}

function getRowZeroIndex(rows) {
    let results = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i] == 0) {
            results.push(i);
        }
    }

    return results;
}

// check one row has only 5 numbers
function checkGridRow(row) {
    let ret = false;
    while (true) {
        let rowDatas = gridState[row];
        let rowOnes = countConsecutiveOnesSimple(rowDatas);
        if (rowOnes.length <= 5) {
            break;
        }
        let zeroIndexs = getRowZeroIndex(rowDatas);
        let randomIndex = Math.floor(Math.random() * zeroIndexs.length);
        gridState[row][zeroIndexs[randomIndex]] = 1;
        ret = true;
    }

    return ret;
}

// check one col has only 5 numbers
function checkGridCol(col) {
    let ret = false;
    while (true) {
        let rowDatas = [];
        for (let i = 0; i < ROWS; i++) {
            rowDatas[i] = gridState[i][col];
        }
        let rowOnes = countConsecutiveOnesSimple(rowDatas);
        if (rowOnes.length <= 5) {
            break;
        }
        let zeroIndexs = getRowZeroIndex(rowDatas);
        let randomIndex = Math.floor(Math.random() * zeroIndexs.length);
        gridState[zeroIndexs[randomIndex]][col] = 1;
        ret = true;
    }

    return ret;
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
        x: x + width / 2,
        y: y + height / 2
    }
}

function rectCenterToLeft(x, y, width, height) {
    return {
        x: x - width / 2,
        y: y - height / 2
    }
}

function drawStateSwitchRadioButton(x, y, width, height, radius) {
    // 先在水平居中位置画一个圆角矩形，高度为1/4，宽度为2/3
    const rectWidth = width * 2 / 3;
    const rectHeight = height / 4;
    const center = rectLeftToCenter(x, y, width, height);
    const left = rectCenterToLeft(center.x, center.y, rectWidth, rectHeight);
    left.y -= rectHeight / 3;

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
        ctx.drawImage(svg.u2705, left.x, left.y, rectWidth / 2, rectHeight)
    } else {
        drawRoundedRect(left.x + rectWidth / 2, left.y, rectWidth / 2, rectHeight, radius, '#00B86B')
        // 在居中位置写上×
        ctx.drawImage(svg.u274e, left.x + rectWidth / 2, left.y, rectWidth / 2, rectHeight)
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

        for (let i = 0; i < textArray.length; i++) {
            let x_pos = x + (maxCount - textArray.length + i) * ROW_STEP;
            if (textArray[i].full) {
                options.fillStyle = color.textFull
            } else {
                options.fillStyle = color.textRaw
            }

            drawText(textArray[i].count, x_pos, y + COL_STEP / 2, options);
        }

    } else if (direction == 'h' || direction == 'H') {
        let maxCount = COL_START_INDEX / COL_STEP;
        if (textArray.length > maxCount) {
            throw new Error('text is invalid');
        }

        for (let i = 0; i < textArray.length; i++) {
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
    let from = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].state === 1) {
            if (count == 0) {
                from = i;
            }
            count++;
            full = (full && arr[i].isOpen);
            if (full) {
                console.log(arr[i].row + ',' + arr[i].col + ': ' + i);
            }
        } else if (count > 0) {
            counts.push({
                count: count,
                full: full,
                from: from,
                to: i
            });
            count = 0;
            full = true;
        }
    }
    if (count > 0) {
        counts.push({
            count: count,
            full: full,
            from: from,
            to: arr.length
        });
    }
    return counts;
}

function getRowData(row) {
    let rowData = [];
    for (let i = 0; i < COLS; i++) {
        rowData.push({
            state: gridState[row][i],
            row: row,
            col: i,
            isOpen: gridData[row][i].isOpen
        })
    }
    return rowData;
}

function getColData(col) {
    let colData = [];
    for (let i = 0; i < ROWS; i++) {
        colData.push({
            state: gridState[i][col],
            row: i,
            col: col,
            isOpen: gridData[i][col].isOpen
        });
    }

    return colData;
}

function drawCountBox() {
    drawRoundedRect(0, 0, ROW_START_INDEX, COL_START_INDEX, CORNER_RADIUS, color.radio);
    drawStateSwitchRadioButton(0, 0, ROW_START_INDEX, COL_START_INDEX, CORNER_RADIUS);
    for (let col = 0; col < COLS; col++) {
        drawRoundedRect(COL_START_INDEX + col * CELL_SIZE, 0,
            CELL_SIZE - CELL_BORDER_SIZE, ROW_START_INDEX - CELL_BORDER_SIZE, CORNER_RADIUS, color.label);

        let colData = getColData(col);
        let colArray = countConsecutiveOnes(colData);
        drawTextArray(colArray, ROW_START_INDEX + col * CELL_SIZE + CELL_BORDER_SIZE * 3, 0, 'h');
        checkFullColGrid(col, colArray);
    }

    for (let row = 0; row < ROWS; row++) {
        drawRoundedRect(0, ROW_START_INDEX + row * CELL_SIZE,
            COL_START_INDEX - CELL_BORDER_SIZE, CELL_SIZE - CELL_BORDER_SIZE, CORNER_RADIUS, color.label);

        let rowData = getRowData(row);
        let rowArray = countConsecutiveOnes(rowData);
        drawTextArray(rowArray, 0, COL_START_INDEX + row * CELL_SIZE + CELL_SIZE / 2, 'v');
        checkFullRowGrid(row, rowArray);
    }
}

function openCol(col, start, end) {
    for (let i = start; i < end; i++) {
        gridData[i][col].isOpen = true;
    }
}

function openRow(row, start, end) {
    for (let i = start; i < end; i++) {
        gridData[row][i].isOpen = true;
    }
}

function intelligentCheckFullColGrid(col, colArray) {
    // 第一个
    if (colArray[0].full) {
        openCol(col, 0, colArray[0].from);
        if (colArray.length == 1) {
            openCol(col, colArray[0].to, ROWS);
        } else {
            if (colArray[1].full) {
                openCol(col, colArray[0].to, colArray[1].from);
            } else {
                openCol(col, colArray[0].to, colArray[0].to + 1);
            }
        }
    }

    let last = colArray.length - 1;
    // 最后一个
    if (last != 0 && colArray[last].full) {
        if (colArray[last - 1].full) {
            openCol(col, colArray[last - 1].to, colArray[last].from);
        } else {
            openCol(col, colArray[last].from - 1, colArray[last].from);
        }

        openCol(col, colArray[last].to, ROWS);
    }

    // 其他
    for (let i = 1; i < last; i++) {
        if (colArray[i].full) {
            if (colArray[i - 1].full) {
                openCol(col, colArray[i - 1].to, colArray[i].from);
            } else {
                openCol(col, colArray[i].from - 1, colArray[i].from);
            }

            if (colArray[i + 1].full) {
                openCol(col, colArray[i].to, colArray[i + 1].from);
            } else {
                openCol(col, colArray[i].to, colArray[i].to + 1);
            }
        }
    }
}

function normalCheckFullColGrid(col, colArray) {

    let isAllOpen = true;
    for (let colData of colArray) {
        if (!colData.full) {
            isAllOpen = false;
            break;
        }
    }

    if (isAllOpen) {
        for (let i = 0; i < ROWS; i++) {
            gridData[i][col].isOpen = true;
        }
    }
}

/**
 * 
 * @param {number} col 
 * @param {{count: number, full: boolean, from: number, to: number}[]} colArray 
 * @returns 
 */
function checkFullColGrid(col, colArray) {
    if (promptLevel == 3 || colArray.length <= 0) {
        return;
    }

    if (promptLevel == 1) {
        intelligentCheckFullColGrid(col, colArray);
    } else if (promptLevel == 2) {
        normalCheckFullColGrid(col, colArray);
    }
}

function intelligentCheckFullRowGrid(row, rowArray) {
    // 第一个
    if (rowArray[0].full) {
        openRow(row, 0, rowArray[0].from);
        if (rowArray.length == 1) {
            openRow(row, rowArray[0].to, COLS);
        } else {
            if (rowArray[1].full) {
                openRow(row, rowArray[0].to, rowArray[1].from);
            } else {
                openRow(row, rowArray[0].to, rowArray[0].to + 1);
            }
        }
    }

    let last = rowArray.length - 1;
    // 最后一个
    if (last != 0 && rowArray[last].full) {
        if (rowArray[last - 1].full) {
            openRow(row, rowArray[last - 1].to, rowArray[last].from);
        } else {
            openRow(row, rowArray[last].from - 1, rowArray[last].from);
        }

        openRow(row, rowArray[last].to, COLS);
    }

    // 其他
    for (let i = 1; i < last; i++) {
        if (rowArray[i].full) {
            if (rowArray[i - 1].full) {
                openRow(row, rowArray[i - 1].to, rowArray[i].from);
            } else {
                openRow(row, rowArray[i].from - 1, rowArray[i].from);
            }

            if (rowArray[i + 1].full) {
                openRow(row, rowArray[i].to, rowArray[i + 1].from);
            } else {
                openRow(row, rowArray[i].to, rowArray[i].to + 1);
            }

        }
    }
}

function normalCheckFullRowGrid(row, rowArray) {
    let isAllOpen = true;
    for (let rowData of rowArray) {
        if (!rowData.full) {
            isAllOpen = false;
            break;
        }
    }

    if (isAllOpen) {
        for (let i = 0; i < COLS; i++) {
            gridData[row][i].isOpen = true;
        }
    }
}

/**
 * 
 * @param {number} col 
 * @param {{count: number, full: boolean, from: number, to: number}[]} rowArray 
 * @returns 
 */
function checkFullRowGrid(row, rowArray) {

    if (promptLevel == 3 || rowArray.length <= 0) {
        return;
    }

    if (promptLevel == 1) {
        intelligentCheckFullRowGrid(row, rowArray);
    } else if (promptLevel == 2) {
        normalCheckFullRowGrid(row, rowArray);
    }
}

function drawGridCell(i, j) {
    const x = j * CELL_SIZE + ROW_START_INDEX;
    const y = i * CELL_SIZE + COL_START_INDEX;

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
    ctx.clearRect(ROW_START_INDEX, COL_START_INDEX, GRID_SIZE + ROW_START_INDEX, GRID_SIZE + COL_START_INDEX);

    const rowCounts = Array.from({
        length: ROWS
    }, () => 0);
    const colCounts = Array.from({
        length: COLS
    }, () => 0);

    for (let i = 0 ; i <= ROWS / 5; i++) {
        for (let j = 0 ; j < COLS / 5; j++) {
            let x = 5 * j * CELL_SIZE + ROW_START_INDEX;
            let y = 5 * i * CELL_SIZE + COL_START_INDEX;
            drawRoundedRect(x, y, CELL_SIZE * 5, CELL_SIZE * 5, CORNER_RADIUS, null, color.bigGrid);
        }
    }

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
            if (cell.left <= posX && cell.right >= posX &&
                cell.top <= posY && cell.bottom >= posY) {
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

    if (cell.isOpen) {
        return;
    }

    if (clickState == cell.state) {
        cell.isOpen = true;
    } else {
        cell.isError = true;
        cell.isOpen = true;
        errorCount += 1;
    }
    // 这里先画上面和左边的数字，是为了在里面同时智能开启空格
    drawCountBox();
    drawGrid();
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
    for (let i = 0; i < ROWS; i++) {
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
            setTimeout(() => {
                alert('恭喜你，完美过关');
                main();
            }, 500);

        } else {
            setTimeout(() => {
                alert(`游戏结束，本局中你一共失误${errorCount}次`);
                main();
            }, 500)
        }
    }
}

let isVueInit = false;

function initVue() {
    if (isVueInit) {
        return;
    }

    isVueInit = true;

    new Vue({
        el: '#app',
        data() {
            return {
                radio1: '10',
                radio2: '普通',
                radio3: '普通',
                radio4: '开',
            };
        },
        methods: {
            onGridLevelChanged(value) {
                if (value == '10') {
                    level = 1;
                    main();
                } else if (value == '15') {
                    level = 2;
                    main();
                } else if (value == '20') {
                    level = 3;
                    main();
                } else {
                    console.log(value)
                }
            },
            onFlagLevelChanged(value) {
                if (value == '菜鸟') {
                    difficultyLevel = 1;
                    main();
                } else if (value == '普通') {
                    difficultyLevel = 2;
                    main();
                } else if (value == '专家') {
                    difficultyLevel = 3;
                    main();
                } else {
                    console.log(value);
                }
            },
            OnAutoOpenChanged(value) {
                if (value == '智能') {
                    promptLevel = 1;
                } else if (value == '普通') {
                    promptLevel = 2;
                } else if (value == '无') {
                    promptLevel = 3;
                } else {
                    console.log(value);
                }
            },
            onMusicChanged(value) {
                if (value == '开') {
                    backgroundMusic = true;
                    playMusic(true);
                } else {
                    backgroundMusic = false;
                    playMusic(false);
                }
            }
        }
    });
}

function initConfig() {
    clickState = 1;
    errorCount = 0;

    gridState = [];
    gridData = [];

    if (level == 1) {
        ROWS = 10;
        COLS = 10;
        GRID_SIZE = ROWS * CELL_SIZE;
    } else if (level == 2) {
        ROWS = 15;
        COLS = 15;
        GRID_SIZE = ROWS * CELL_SIZE;
    } else if (level == 3) {
        ROWS = 20;
        COLS = 20;
        GRID_SIZE = ROWS * CELL_SIZE;
    }

    let canvas = document.getElementById('gridCanvas');
    let width = COL_START_INDEX + CELL_SIZE * COLS;
    let height = ROW_START_INDEX + CELL_SIZE * ROWS;

    canvas.setAttribute('width', width + 'px');
    canvas.setAttribute('height', height + 'px');
}

let isSetAutoPlayEvent = false;

function autoPlaySound() {
    if (isSetAutoPlayEvent) {
        return;
    }
    isSetAutoPlayEvent = true;
    document.addEventListener('click', () => {
        if (backgroundMusic) {
            document.querySelector("audio").play();
        }

    });
    // 监听鼠标移动的事件
    document.addEventListener('mousemove', () => {
        if (backgroundMusic) {
            document.querySelector("audio").play();
        }
    });
}

function playMusic(isPlay) {
    if (isPlay) {
        document.querySelector("audio").play();
    } else {
        document.querySelector("audio").pause();
    }
}

async function main() {

    initConfig();

    await loadResource();
    // Initialize grid
    initGrid();
    initVue();
    autoPlaySound();

    canvas.addEventListener('click', onCanvasClick);
}

main();