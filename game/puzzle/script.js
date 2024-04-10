const canvas = document.getElementById('puzzle-canvas');
const canvasCtx = canvas.getContext('2d');

const sideLength = 50; // 六边形大小
const hexGap = 0; // 六边形间距

const rawImageWidth = 600;
const rawImageHeight = 600;

const splitImageWidth = 120;
const splitImageHeight = 100;

const xAlignLength = 1 - Math.sqrt(3) / 2
const xMarginLength = 15

const hexCoordinates = [
    [1, 1],
    [3, 1],
    [5, 1],
    [7, 1],
    [9, 1],
    [11, 1],
    [2, 5 / 2],
    [4, 5 / 2],
    [6, 5 / 2],
    [8, 5 / 2],
    [10, 5 / 2],
    [12, 5 / 2],
    [1, 4],
    [3, 4],
    [5, 4],
    [7, 4],
    [9, 4],
    [11, 4],
    [2, 11 / 2],
    [4, 11 / 2],
    [6, 11 / 2],
    [8, 11 / 2],
    [10, 11 / 2],
    [12, 11 / 2],
    [1, 7],
    [3, 7],
    [5, 7],
    [7, 7],
    [9, 7],
    [11, 7],
    [2, 17 / 2],
    [4, 17 / 2],
    [6, 17 / 2],
    [8, 17 / 2],
    [10, 17 / 2],
    [12, 17 / 2],
    [1, 10],
    [3, 10],
    [5, 10],
    [7, 10],
    [9, 10],
    [11, 10],
];

let chipState = [];

// 绘制六边形
function drawHexagon(ctx, centerX, centerY, index, isFill) {
    // console.log(`中心点：x = ${centerX}, y = ${centerY}`);

    if (chipState[index] != 0) {
        return;
    }

    // 开始绘制六边形
    ctx.beginPath();
    ctx.moveTo(centerX + sideLength * Math.cos(Math.PI / 6),
        centerY + sideLength * Math.sin(Math.PI / 6));
    for (var i = 0; i <= 6; i++) {
        var angle = Math.PI * i / 3 + Math.PI / 6;
        var x = centerX + sideLength * Math.cos(angle);
        var y = centerY + sideLength * Math.sin(angle);
        ctx.lineTo(x, y);
    }
    ctx.closePath();

    // ctx.arc(centerX, centerY, sideLength, 0, 2 * Math.PI);

    // 绘制六边形边框
    ctx.strokeStyle = "#9F4fFF";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (isFill) {
        ctx.fillStyle = '#238973'; // 设置填充颜色和透明度
        ctx.fill(); // 填充六边形区域
    }
}

// 绘制图片
function InitImage(ctx, width, height) {
    const img = new Image();
    img.onload = function () {
        // 挂载图片到ctx上去
        ctx.RawImage = img;
        // 采用居中绘制
        drawImage(ctx, width, height);
        drawPuzzle(ctx, false);
        initChipState();
        copySplitPolygon();
        drawPuzzle(ctx, true);
    };
    img.src = 'https://cdn.seovx.com/?mom=302'; // 替换为你的图片路径
}

function initChipState() {
    chipState = [];
    for (let i = 0; i < hexCoordinates.length; i++) {
        chipState[i] = 0;
    }
}

// sw / sh = w / h

function drawImage(ctx, width, height) {
    let min = Math.min(ctx.RawImage.width, ctx.RawImage.height);
    let sx = 0,
        sy = 0,
        swidth = 0,
        sheight = 0;
    if (min >= width && min >= height) {
        if (ctx.RawImage.width > min) {
            sy = 0,
                sheight = ctx.RawImage.height;

            // 宽度裁剪，按照宽度中心点对齐
            swidth = min * width / height;
            sx = (ctx.RawImage.width - swidth) / 2;

        } else {
            sx = 0,
                swidth = ctx.RawImage.width;

            // 高度裁剪，按照高度中心点对齐
            sheight = min * height / width;
            sy = (ctx.RawImage.height - sheight) / 2;
        }
        ctx.drawImage(ctx.RawImage, sx, sy, swidth, sheight, 0, 0, width, height);
    } else {
        ctx.drawImage(ctx.RawImage, 0, 0, width, height);
    }

}

function redrawCanvas(ctx, width, height, isDrawPuzzle = true) {
    if (ctx.RawImage == null) {
        return;
    }

    drawImage(ctx, width, height);
    if (isDrawPuzzle) {
        drawPuzzle(ctx, isDrawPuzzle);
    }
}

function copySplitPolygon() {
    clearPuzzles();

    let targetVertices = [];
    let coordZero = hexCoordinates[0]
    let pointZero = convertCoordToPoint(coordZero);
    for (let i = 0; i < 6; i++) {
        var angle = Math.PI * i / 3 + Math.PI / 6;
        var x = pointZero.x + sideLength * Math.cos(angle);
        var y = pointZero.y + sideLength * Math.sin(angle);

        targetVertices.push([x, y]);
    }

    for (let index = 0; index < hexCoordinates.length; index++) {
        let coord = hexCoordinates[index];

        let center = convertCoordToPoint(coord);

        const newCanvas = createNewPuzzleCanvas(index);
        const newCanvasCtx = newCanvas.getContext('2d');
        copyPolygonArea(canvas, center.x - pointZero.x, center.y - pointZero.y, newCanvasCtx, targetVertices);
    }
}

function convertCoordToPoint(coord) {
    const x = (coord[0] - (coord[0] - 1) * xAlignLength) * (sideLength + hexGap) + xMarginLength;
    const y = coord[1] * (sideLength + hexGap);

    return {
        x,
        y
    }
}

function clearPuzzles() {
    let element = document.getElementById('split-canvas-id');
    while (element.firstChild) {
        element.removeChild(element.firstChild); // 循环删除第一个子节点，直到没有子节点为止
    }
}

function createNewPuzzleCanvas(index) {
    let canvasDom = document.createElement('canvas');
    canvasDom.setAttribute('width', splitImageWidth);
    canvasDom.setAttribute('height', splitImageHeight);
    canvasDom.setAttribute('id', 'chip-' + index);
    canvasDom.draggable = true;
    canvasDom.setAttribute('class', 'split-canvas')

    canvasDom.addEventListener('dragover', (e) => {
        // 阻止默认行为以允许放置
        e.preventDefault();
    });

    canvasDom.addEventListener('dragstart', (e) => {
        // console.log("dragStart");
        e.currentTarget.classList.add("dragging");
        e.dataTransfer.clearData();

        e.dataTransfer.setData("text/plain", 'chip' + index);
    })


    let dom = document.getElementById('split-canvas-id');

    let childCanvas = dom.getElementsByTagName('canvas');

    if (childCanvas == null || childCanvas.length <= 0) {
        dom.insertBefore(canvasDom, null);
    } else {
        let rand = Math.floor(Math.random() * childCanvas.length);
        dom.insertBefore(canvasDom, childCanvas[rand]);
    }

    return canvasDom;
}

// 绘制拼图
function drawPuzzle(ctx, isFill) {
    hexCoordinates.forEach((coord, index) => {
        const x = (coord[0] - (coord[0] - 1) * xAlignLength) * (sideLength + hexGap) + xMarginLength;
        const y = coord[1] * (sideLength + hexGap);
        drawHexagon(ctx, x, y, index, isFill);
    });
}

function copyPolygonArea(sourceCanvas, sx, sy, destinationCtx, vertices) {

    // Save the current state of the destination context
    destinationCtx.save();

    // Create a clipping region based on the polygon vertices
    destinationCtx.beginPath();
    destinationCtx.moveTo(vertices[0][0], vertices[0][1]);
    for (let i = 1; i < vertices.length; i++) {
        destinationCtx.lineTo(vertices[i][0], vertices[i][1]);
    }
    destinationCtx.closePath();
    destinationCtx.clip();

    // Draw the clipped area onto the destination canvas
    destinationCtx.drawImage(sourceCanvas, sx, sy, splitImageWidth, splitImageHeight, 0, 0, splitImageWidth, splitImageHeight);

    // Restore the state of the destination context
    destinationCtx.restore();
}

function calcPointDistance(pt1, pt2) {
    return Math.sqrt((pt1.x - pt2.x) * (pt1.x - pt2.x) + (pt1.y - pt2.y) * (pt1.y - pt2.y))
}

function removeChipCanvas(id) {
    let dom = document.getElementById('chip-' + id);
    if (dom != null) {
        dom.parentElement.removeChild(dom);
    }
}

function onDropItem(id, pointX, pointY) {
    // 根据id取得坐标
    let coord = hexCoordinates[id];
    let pt = convertCoordToPoint(coord);
    let distance = calcPointDistance(pt, {
        x: pointX,
        y: pointY
    });
    if (distance < sideLength * 2 / 3) {
        // 正确匹配到目标图片
        // 设置状态
        chipState[id] = 1;

        // 重新绘制canvas
        redrawCanvas(canvasCtx, rawImageWidth, rawImageHeight);

        let audio = document.querySelector("audio");
        audio.play();

        // 从下面的碎片堆中删除对应的canvas
        removeChipCanvas(id);
    }
}

function initDownloadLink() {
    // 点击链接下载图片
    const downloadLink = document.getElementById('download-link');
    const now = Date.now() / 1000;
    downloadLink.setAttribute('download', 'puzzle_image_' + now + '.png');
    downloadLink.addEventListener('click', function (event) {

        redrawCanvas(canvasCtx, rawImageWidth, rawImageHeight, false);
        const dataURL = canvas.toDataURL('image/png'); // 将 Canvas 转换为 Data URL
        redrawCanvas(canvasCtx, rawImageWidth, rawImageHeight, true);
        downloadLink.href = dataURL; // 设置链接的 URL

        // 阻止默认行为和事件传播
        event.preventDefault();
        event.stopPropagation();
    });
}

let showRaw = false;
function showRawPicture() {
    let domButton = document.getElementById('showRaw');
    if (!showRaw) {
        domButton.textContent = '隐藏图片';
        redrawCanvas(canvasCtx, rawImageWidth, rawImageHeight, false);    
    } else {
        domButton.textContent = '显示图片';
        redrawCanvas(canvasCtx, rawImageWidth, rawImageHeight, true);    
    }

    showRaw = !showRaw;
}

function resetPicture() {
    InitImage(canvasCtx, rawImageWidth, rawImageHeight);
}

function initButtonEvent() {
    let showButton = document.getElementById('showRaw');
    showButton.addEventListener('click', showRawPicture);
    let resetButton = document.getElementById('reset');
    resetButton.addEventListener('click', resetPicture);
}

function main() {

    initButtonEvent();

    canvas.width = rawImageWidth; // 修改为你的画布宽度
    canvas.height = rawImageHeight; // 修改为你的画布高度

    InitImage(canvasCtx, rawImageWidth, rawImageHeight);

    // 拖动事件处理函数
    canvas.addEventListener('dragover', (e) => {
        // 阻止默认行为以允许放置
        e.preventDefault();
    });

    canvas.addEventListener('drop', (e) => {
        // 阻止默认行为
        e.preventDefault();
        // 获取拖动数据
        const dropData = e.dataTransfer.getData('text/plain');
        // console.log(id);

        let reg = /chip\d+/;
        if (reg.test(dropData)) {
            let id = dropData.substring(4);
            onDropItem(id, e.offsetX, e.offsetY);
            e.dataTransfer.clearData();
        }
    });
}

main();