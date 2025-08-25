// fractal.worker.js

// 全局变量，用于存储从主线程传来的迭代函数
let currentIterFn;

// ========================================================
// 1. 核心计算逻辑
//    这个版本的 juliaIteration 返回一个包含所有细节的对象
// ========================================================

function juliaIteration(zx, zy, cReal, cImag, maxIterations) {
    let x = zx;
    let y = zy;
    let iteration = 0;
    const bailout = 256; // 逃逸半径的平方 (4^2)

    // 用于内部着色的轨道陷阱变量
    let orbitTrap = Infinity;
    let minDistance = Infinity;
    let sumMagnitude = 0;

    const currentIterFn = self.currentIterFn; // 引用全局作用域的函数

    while (x * x + y * y <= bailout && iteration < maxIterations) {
        const nextPoint = currentIterFn(x, y, cReal, cImag);
        x = nextPoint.x;
        y = nextPoint.y;
        iteration++;

        // 更新轨道陷阱信息
        const dist = Math.sqrt(x * x + y * y);
        minDistance = Math.min(minDistance, dist);
        sumMagnitude += dist;
        orbitTrap = Math.min(orbitTrap, Math.abs(x) + Math.abs(y));
    }

    return {
        iterations: iteration,
        escaped: iteration < maxIterations,
        finalMagnitude: Math.sqrt(x * x + y * y),
        orbitTrap: orbitTrap,
        minDistance: minDistance,
        avgMagnitude: sumMagnitude / (iteration || 1), // 防止除以0
        finalX: x,
        finalY: y
    };
}


// ========================================================
// 2. 完整的着色逻辑 (你提供的所有函数)
// ========================================================

function getColor(result) {
    const { iterations, maxIterations, escaped, finalMagnitude, orbitTrap, minDistance, avgMagnitude, colorScheme, smoothColoring } = result;

    if (!escaped) {
        return getInteriorColor(colorScheme, orbitTrap, minDistance, avgMagnitude, iterations, maxIterations);
    } else {
        let smoothIterations = iterations;
        if (smoothColoring && finalMagnitude > 1) { // 增加保护，防止log(log(1))出现NaN
            const log_zn = Math.log(finalMagnitude);
            const nu = Math.log(log_zn / Math.log(2)) / Math.log(2);
            smoothIterations = iterations + 1 - nu;
        }
        return getExteriorColor(smoothIterations, maxIterations, colorScheme);
    }
}

function getInteriorColor(colorScheme, orbitTrap, minDistance, avgMagnitude, iterations, maxIterations) {
    const trapFactor = Math.min(1, orbitTrap / 2);
    const distFactor = Math.min(1, minDistance / 10);
    const avgFactor = Math.min(1, avgMagnitude / 20);
    const iterFactor = iterations / maxIterations;

    switch (colorScheme) {
        case 'rainbow':
            const hue = (trapFactor * 360 + distFactor * 180) % 360;
            const sat = 0.6 + avgFactor * 0.4;
            const light = 0.3 + iterFactor * 0.4;
            return hslToRgb(hue / 360, sat, light);
        case 'fire':
            return [Math.min(255, 80 + trapFactor * 175), Math.min(255, 20 + distFactor * 150), Math.min(255, 5 + avgFactor * 100)];
        case 'ocean':
            return [Math.min(255, 10 + trapFactor * 100), Math.min(255, 50 + distFactor * 150), Math.min(255, 100 + avgFactor * 155)];
        case 'electric':
            return [Math.min(255, 20 + trapFactor * 150), Math.min(255, 30 + distFactor * 200), Math.min(255, 150 + avgFactor * 105)];
        case 'monochrome':
            const intensity = 50 + (trapFactor + distFactor + avgFactor) * 70 / 3;
            return [intensity, intensity, intensity];
        case 'sunset':
            return [Math.min(255, 100 + trapFactor * 155), Math.min(255, 50 + distFactor * 120), Math.min(255, 20 + avgFactor * 80)];
        default: return [80, 40, 120];
    }
}

function getExteriorColor(smoothIterations, maxIterations, colorScheme) {
    const t = Math.min(1, smoothIterations / (maxIterations * 0.9)); // 调整分母使颜色变化更平滑
    switch (colorScheme) {
        case 'rainbow': return rainbowColor(t);
        case 'fire': return fireColor(t);
        case 'ocean': return oceanColor(t);
        case 'electric': return electricColor(t);
        case 'monochrome': return monochromeColor(t);
        case 'sunset': return sunsetColor(t);
        default: return rainbowColor(t);
    }
}

// ... (hslToRgb, rainbowColor, fireColor, etc. 所有颜色函数都复制到这里) ...
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
function rainbowColor(t) { const f=6; const r=Math.sin(f*t*Math.PI)*127+128,g=Math.sin(f*t*Math.PI+2)*127+128,b=Math.sin(f*t*Math.PI+4)*127+128; const boost=1.2; return [Math.min(255,r*boost),Math.min(255,g*boost),Math.min(255,b*boost)]; }
function fireColor(t) { const r=Math.min(255,t**0.4*255),g=Math.max(50,Math.min(255,Math.max(0,t-0.2)**0.8*255)),b=Math.max(20,Math.min(255,Math.max(0,t-0.6)**1.2*255)); return [r,g,b]; }
function oceanColor(t) { const r=Math.max(30,Math.min(255,Math.max(0,t-0.3)**1.5*255)),g=Math.min(255,100+t**0.7*155),b=Math.min(255,150+t**0.5*105); return [r,g,b]; }
function electricColor(t) { const p=Math.sin(t*Math.PI*8)*0.3+0.7,r=t<0.3?20:((t-0.3)/0.7)**0.5*255,g=Math.sin(t*Math.PI)**2*255,b=Math.min(255,(255-t*100)*p); return [r,g,b]; }
function monochromeColor(t) { const i=50+t**0.6*205,v=Math.sin(t*Math.PI*4)*20,f=Math.min(255,Math.max(50,i+v)); return [f,f,f]; }
function sunsetColor(t) { const r=Math.min(255,150+t**0.4*105),g=Math.max(40,Math.min(255,80+t**0.8*175)),b=Math.max(20,Math.min(255,30+t**1.5*100)); return [r,g,b]; }


// ========================================================
// 3. Worker 消息处理器
// ========================================================

self.onmessage = function (e) {
    const {
        startY, endY, width, height,
        centerX, centerY, zoom,
        cReal, cImag, maxIterations,
        iterationFnStr,
        // 接收新增的参数
        colorScheme,
        smoothColoring
    } = e.data;

    // 关键：将字符串转换回函数并存储在全局
    self.currentIterFn = new Function('x', 'y', 'cReal', 'cImag', `return ${iterationFnStr}`)();

    const scale = 4 / (width * zoom);
    const imageDataChunk = new Uint8ClampedArray((endY - startY) * width * 4);

    let offset = 0;
    for (let y = startY; y < endY; y++) {
        for (let x = 0; x < width; x++) {
            const zx = centerX + (x - width / 2) * scale;
            const zy = centerY - (y - height / 2) * scale;

            // 1. 调用详细的迭代函数
            const result = juliaIteration(zx, zy, cReal, cImag, maxIterations);

            // 2. 将从主线程收到的参数附加到 result 对象上
            result.maxIterations = maxIterations;
            result.colorScheme = colorScheme;
            result.smoothColoring = smoothColoring;

            // 3. 调用完整的 getColor 函数
            const color = getColor(result);

            imageDataChunk[offset]     = color[0];
            imageDataChunk[offset + 1] = color[1];
            imageDataChunk[offset + 2] = color[2];
            imageDataChunk[offset + 3] = 255;
            offset += 4;
        }
    }

    // 将计算好的图像数据块和起始行号发回主线程
    self.postMessage({
        imageDataChunk,
        startY
    }, [imageDataChunk.buffer]);
};