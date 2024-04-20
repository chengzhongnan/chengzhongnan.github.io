// 获取Canvas元素
var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');

// 绘制正多边形
function drawPolygon(x, y, sides, size) {
    ctx.beginPath();
    const rotatoAngle = Math.PI / 4;
    ctx.moveTo(x + size * Math.cos(0 + rotatoAngle), y + size * Math.sin(0 + rotatoAngle));

    for (var i = 1; i <= sides; i++) {
        ctx.lineTo(x + size * Math.cos(i * 2 * Math.PI / sides + rotatoAngle), y + size * Math.sin(i * 2 * Math.PI / sides + rotatoAngle));
    }

    ctx.closePath();
    ctx.stroke();
}

// 生成随机点集
function generateRandomPoints(x, y, sides, size, numPoints) {
    var gridSize = Math.floor(Math.sqrt(numPoints) + 1);
    var step = size / gridSize;

    var points = [];
    for (var i = 0; i < gridSize; i++) {
        for (var j = 0; j < gridSize; j++) {
            var newX = x - size / 2 + step * i + Math.random() * step;
            var newY = y - size / 2 + step * j + Math.random() * step;
            points.push({
                x: newX,
                y: newY,
                fixed: false
            });
        }
    }

    // 添加正多边形的顶点
    const rotatoAngle = Math.PI / 4;
    for (var j = 0; j < sides; j++) {

        const startPoint = {
            x: x + size * Math.cos(j * 2 * Math.PI / sides + rotatoAngle),
            y: y + size * Math.sin(j * 2 * Math.PI / sides + rotatoAngle)
        };

        const endPoint = {
            x: x + size * Math.cos((j + 1) * 2 * Math.PI / sides + rotatoAngle),
            y: y + size * Math.sin((j + 1) * 2 * Math.PI / sides + rotatoAngle)
        };

        const dx = (endPoint.x - startPoint.x) / gridSize;
        const dy = (endPoint.y - startPoint.y) / gridSize;

        for (var k = 0; k < gridSize; k++) {
            points.push({
                x: startPoint.x + dx * k,
                y: startPoint.y + dy * k,
                fixed: true
            });
        }
    }

    return points;
}

// 生成Delaunay三角剖分
function delaunayTriangulation(points) {
    // 实现Delaunay三角剖分的算法
    // 这里你可以使用现有的库，比如Delaunator.js
    const coords = [];
    for (let pt of points) {
        coords.push(pt.x);
        coords.push(pt.y);
    }

    const delaunay = new Delaunator(coords);
    console.log(delaunay.triangles);
    return delaunay.triangles;
}

// 绘制Delaunay三角剖分
function drawDelaunayTriangulation(triangles, points) {
    ctx.strokeStyle = '#000'; // 设置线段颜色为黑色

    for (var i = 0; i < triangles.length; i += 3) {
        var p1 = points[triangles[i]];
        var p2 = points[triangles[i + 1]];
        var p3 = points[triangles[i + 2]];

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.stroke();
    }
}

// 清空Canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 计算两点之间的距离
function distance(point1, point2) {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}


// 去掉距离小于L的点
function removeClosePoints(points, L) {
    for (var i = 0; i < points.length; i++) {
        for (var j = i + 1; j < points.length; j++) {
            if (distance(points[i], points[j]) < L) {
                if (points[i].fixed) {
                    points.splice(j);    
                } else if (points[j].fixed) {
                    points.splice(i);
                } else {
                    points.splice(Math.random() < 0.5 ? i : j, 1);
                }
            }
        }
    }

    return points;
}

// 主函数
function main() {
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;
    var sides = 4; // 正多边形的边数
    var size = 300;
    if (sides == 4) {
        size = centerX * Math.sqrt(2); // 正多边形的大小
    }
        
    var numPoints = 10; // 随机点的数量
    var minLineLength = 50; // 两个点之间最小间隔

    clearCanvas();
    drawPolygon(centerX, centerY, sides, size);

    var points = generateRandomPoints(centerX, centerY, sides, size, numPoints);
    points = removeClosePoints(points, minLineLength);
    var triangles = delaunayTriangulation(points);
    drawDelaunayTriangulation(triangles, points);
}

// 调用主函数
main();