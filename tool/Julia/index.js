class JuliaFractalExplorer {
    constructor() {
        this.canvas = document.getElementById('fractal-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.status = document.getElementById('status');
        this.zoomInfo = document.getElementById('zoom-info');

        this.setupCanvas();
        this.setupControls();
        this.setupEventListeners();

        // 视图参数
        this.centerX = 0;
        this.centerY = 0;
        this.zoom = 1;
        this.maxZoom = 1e15;

        // Julia参数
        this.cReal = -0.75;
        this.cImag = 0.1;
        this.maxIterations = 200;
        this.colorScheme = 'rainbow';
        this.smoothColoring = true;

        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };

        this.renderlock = false;

        this.setupIterationFunctions();
        this.setupWorders();

        this.render();
    }

    setupWorders() {
        this.workerCount = navigator.hardwareConcurrency || 4; // 获取CPU核心数，或默认为4
        this.workers = [];
        for (let i = 0; i < this.workerCount; i++) {
            this.workers.push(new Worker('fractal.worker.js'));
        }
        this.renderRequestCounter = 0; // 用于取消过时的渲染
    }

    setupCanvas() {
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.render();
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
    }

    setupControls() {
        const controls = {
            'c-real': (v) => { this.cReal = parseFloat(v); this.render(); },
            'c-imag': (v) => { this.cImag = parseFloat(v); this.render(); },
            'max-iterations': (v) => { this.maxIterations = parseInt(v); this.render(); },
            'color-scheme': (v) => { this.colorScheme = v; this.render(); },
            'smooth-coloring': (v) => { this.smoothColoring = v; this.render(); },
            'iteration-function': (v) => {
                this.iterationFn = this.ITERATION_FUNCTIONS[v];
                this.render();
            }
        };

        Object.keys(controls).forEach(id => {
            const element = document.getElementById(id);
            const handler = controls[id];

            if (element.type === 'checkbox') {
                element.addEventListener('change', () => handler(element.checked));
            } else {
                element.addEventListener('input', () => handler(element.value));
            }
        });
    }

    setIterationFunction(fnName) {
        if (!this.ITERATION_FUNCTIONS[fnName]) {
            console.warn(`[JuliaFractalExplorer] 尝试设置一个无效的迭代函数: "${fnName}"`);
            return; // 如果函数名无效，则不执行任何操作
        }

        const selectElement = document.getElementById('iteration-function');
        if (selectElement) {
            selectElement.value = fnName;
        }

        this.iterationFn = this.ITERATION_FUNCTIONS[fnName];

        console.log(`迭代函数已更改为: ${this.iterationFn.name}`);
        // this.render();
    }

    setupEventListeners() {
        // 為了更清晰地管理狀態，在 constructor 中先定義 this.isPanning = false;

        // 舊的點擊縮放事件監聽器（保持不變）
        this.canvas.addEventListener('click', (e) => {
            if (this.isDragging) return; // 如果是拖曳，則不觸發點擊縮放
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const factor = e.shiftKey ? 0.5 : 2;
            this.zoomAt(x, y, factor);
        });

        // 1. 滑鼠按下：準備開始拖曳
        this.canvas.addEventListener('mousedown', (e) => {
            this.isPanning = true;  // 開始平移狀態
            this.isDragging = false; // 重置拖曳標記，因為還沒移動
            this.dragStart.x = e.clientX;
            this.dragStart.y = e.clientY;
        });

        // 2. 滑鼠移動：僅更新座標，不重繪
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return; // 如果不是平移狀態，直接返回

            const dx = e.clientX - this.dragStart.x;
            const dy = e.clientY - this.dragStart.y;

            // 只有移動超過一個小閾值，才認定為「拖曳」
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                this.isDragging = true; // 標記為正在拖曳

                // 更新中心點座標
                const scale = 4 / (this.canvas.width * this.zoom);
                this.centerX -= dx * scale;
                this.centerY += dy * scale;

                // 更新下一次計算的起始點
                this.dragStart.x = e.clientX;
                this.dragStart.y = e.clientY;

                // 💡 **關鍵改動：移除了 this.render()**
                // 我們可以選擇性地在這裡做一些輕量級的預覽，例如移動一張低解析度的快照，
                // 但為了簡單起見，我們這裡什麼都不做，只更新數據。
            }
        });

        // 3. 滑鼠抬起：結束拖曳並觸發一次重繪
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isPanning) {
                this.isPanning = false; // 結束平移狀態
                if (this.isDragging) {
                    // 只有在確實發生了拖曳後，才進行重繪
                    this.render();
                }
            }
        });

        // 如果滑鼠移出畫布，也應停止拖曳
        this.canvas.addEventListener('mouseleave', (e) => {
            if (this.isPanning) {
                this.isPanning = false;
                if (this.isDragging) {
                    this.render();
                }
            }
        });


        // 滾輪縮放（保持不變）
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoomAt(x, y, factor);
        });
    }

    zoomAt(x, y, factor) {
        if (this.zoom * factor > this.maxZoom) return;

        // 将屏幕坐标转换为复数坐标
        const scale = 4 / (this.canvas.width * this.zoom);
        const complexX = this.centerX + (x - this.canvas.width / 2) * scale;
        const complexY = this.centerY - (y - this.canvas.height / 2) * scale;

        // 缩放
        this.zoom *= factor;

        // 调整中心点以保持缩放点不变
        const newScale = 4 / (this.canvas.width * this.zoom);
        this.centerX = complexX - (x - this.canvas.width / 2) * newScale;
        this.centerY = complexY + (y - this.canvas.height / 2) * newScale;

        this.updateZoomInfo();
        this.render();
    }

    updateZoomInfo() {
        let zoomStr;
        if (this.zoom >= 1e9) {
            zoomStr = (this.zoom / 1e9).toFixed(1) + 'B';
        } else if (this.zoom >= 1e6) {
            zoomStr = (this.zoom / 1e6).toFixed(1) + 'M';
        } else if (this.zoom >= 1e3) {
            zoomStr = (this.zoom / 1e3).toFixed(1) + 'K';
        } else {
            zoomStr = this.zoom.toFixed(1);
        }
        this.zoomInfo.textContent = `缩放: ${zoomStr}x`;
    }

    // <script> 標籤內，class 定義之前

    setupIterationFunctions() {
        this.ITERATION_FUNCTIONS = {
            // 经典的 Z^2 + C
            'z-squared': {
                name: 'z² + c (經典)',
                description: '經典的二次多項式 Julia 集。',
                // z_n+1 = z_n^2 + c
                // z = x + yi => z^2 = (x^2 - y^2) + (2xy)i
                calculate: (x, y, cReal, cImag) => {
                    const newX = x * x - y * y + cReal;
                    const newY = 2 * x * y + cImag;
                    return { x: newX, y: newY };
                }
            },
            // Z^3 + C
            'z-cubed': {
                name: 'z³ + c',
                description: '三次多項式，通常產生三臂旋轉對稱的圖形。',
                // z^3 = (x^3 - 3xy^2) + (3x^2y - y^3)i
                calculate: (x, y, cReal, cImag) => {
                    const x2 = x * x;
                    const y2 = y * y;
                    const newX = x * (x2 - 3 * y2) + cReal;
                    const newY = y * (3 * x2 - y2) + cImag;
                    return { x: newX, y: newY };
                }
            },
            'inv-z': {
                name: '1/z + c (反函數)',
                description: '反函數在原點有一個奇點，常產生環狀、島嶼或塵埃狀分形。',
                // 迭代公式: z_n+1 = 1/z_n + c
                calculate: (x, y, cReal, cImag) => {
                    // 計算 1/z = (x - yi) / (x² + y²)
                    const denominator = x * x + y * y;

                    // 處理 z=0 的情況，此時分母為0，結果趨向無窮大
                    // 我們可以直接返回一個很大的數，確保它立即 "逃逸"
                    if (denominator === 0) {
                        return { x: 1e9, y: 1e9 }; // 返回一個極大的值
                    }

                    const invX = x / denominator;
                    const invY = -y / denominator;

                    // 加上常數 c
                    const newX = invX + cReal;
                    const newY = invY + cImag;

                    return { x: newX, y: newY };
                }
            },
            'logistic-map': {
                name: 'c z(1-z) (邏輯斯蒂)',
                description: '邏輯斯蒂映射，混沌理論中的經典方程，產生被稱為\'Mandelbugs\'的獨特分形。',
                // 迭代公式: z_n+1 = c * z_n * (1 - z_n)
                calculate: (x, y, cReal, cImag) => {
                    // 我們分兩步計算：
                    // 1. 先計算 w = z * (1 - z)
                    //    1 - z = (1 - x) - yi
                    //    z * (1 - z) = (x + yi) * ((1 - x) - yi)
                    const w_real = x * (1 - x) - y * (-y); // 實部: x(1-x) + y²
                    const w_imag = x * (-y) + y * (1 - x); // 虛部: -xy + y(1-x)

                    // 2. 再計算 c * w
                    const newX = cReal * w_real - cImag * w_imag;
                    const newY = cReal * w_imag + cImag * w_real;

                    return { x: newX, y: newY };
                }
            },
            'z-sqrt': {
                name: 'c * √z (根号)',
                description: '平方根函數，常產生類似葉脈或閃電的有機分岔圖形。',
                // 迭代公式: z_n+1 = c * sqrt(z_n)
                calculate: (x, y, cReal, cImag) => {
                    // 計算 z = x + yi 的主平方根 (結果為 u + vi)
                    // 這裡使用直角坐標系公式以提高效率，避免三角函數的換算
                    const r = Math.sqrt(x * x + y * y);
                    const u = Math.sqrt((r + x) / 2);
                    // v 的符號需要與 y 的符號保持一致，以確保是主平方根
                    const v = (y < 0 ? -1 : 1) * Math.sqrt((r - x) / 2);

                    // 執行複數乘法 c * (u + vi)
                    const newX = cReal * u - cImag * v;
                    const newY = cReal * v + cImag * u;

                    return { x: newX, y: newY };
                }
            },
            'z-fourth': {
                name: 'z⁴ + c',
                description: '四次多項式，通常產生具有四重旋轉對稱性的圖形。',
                // 迭代公式: z_n+1 = z_n^4 + c
                calculate: (x, y, cReal, cImag) => {
                    // 計算 z⁴ = (z²)²
                    const z2_real = x * x - y * y;
                    const z2_imag = 2 * x * y;

                    const z4_real = z2_real * z2_real - z2_imag * z2_imag;
                    const z4_imag = 2 * z2_real * z2_imag;

                    // 加上常數 c
                    const newX = z4_real + cReal;
                    const newY = z4_imag + cImag;

                    return { x: newX, y: newY };
                }
            },
            'z-fifth': {
                name: 'z⁵ + c',
                description: '五次多項式，通常產生具有五重旋轉對稱性的精美圖形。',
                // 迭代公式: z_n+1 = z_n^5 + c
                calculate: (x, y, cReal, cImag) => {
                    // 計算 z⁵ = z⁴ * z
                    const z2_real = x * x - y * y;
                    const z2_imag = 2 * x * y;

                    const z4_real = z2_real * z2_real - z2_imag * z2_imag;
                    const z4_imag = 2 * z2_real * z2_imag;

                    const z5_real = z4_real * x - z4_imag * y;
                    const z5_imag = z4_real * y + z4_imag * x;

                    // 加上常數 c
                    const newX = z5_real + cReal;
                    const newY = z5_imag + cImag;

                    return { x: newX, y: newY };
                }
            },
            'exp-z': {
                name: 'c * e^z (指數)',
                description: '指數函數，產生具有週期性的獨特羽毛狀圖形。',
                // c * e^z = (cReal + cImag*i) * (e^x * (cos(y) + sin(y)i))
                calculate: (x, y, cReal, cImag) => {
                    const expX = Math.exp(x);
                    const cosY = Math.cos(y);
                    const sinY = Math.sin(y);
                    // 實部: cReal * expX * cosY - cImag * expX * sinY
                    const newX = expX * (cReal * cosY - cImag * sinY);
                    // 虛部: cReal * expX * sinY + cImag * expX * cosY
                    const newY = expX * (cReal * sinY + cImag * cosY);
                    return { x: newX, y: newY };
                }
            },
            'exp-z2': {
                name: 'c * e^(-z)',
                description: '指數函數，產生具有週期性的獨特羽毛狀圖形。',
                calculate: (x, y, cReal, cImag) => {
                    const expX = Math.exp(-x);
                    const cosY = Math.cos(-y);
                    const sinY = Math.sin(-y);
                    // 實部: cReal * expX * cosY - cImag * expX * sinY
                    const newX = expX * (cReal * cosY - cImag * sinY);
                    // 虛部: cReal * expX * sinY + cImag * expX * cosY
                    const newY = expX * (cReal * sinY + cImag * cosY);
                    return { x: newX, y: newY };
                }
            },
            'log-z': {
                name: 'c * Log(z) (對數)',
                description: '對數函數，由於其主分支特性，常產生帶狀或螺線形的結構。',
                // 迭代公式: z_n+1 = c * Log(z_n)
                calculate: (x, y, cReal, cImag) => {
                    // 計算 z = x + yi 的主對數 (結果為 u + vi)
                    // 數學公式: Log(z) = ln(|z|) + i * Arg(z)
                    // |z| 是模長，Arg(z) 是輻角
                    const r = Math.sqrt(x * x + y * y);

                    // 處理 z=0 的特殊情況，因為 Log(0) 是未定義的 (趨向負無窮)
                    if (r === 0) {
                        return { x: 0, y: 0 }; // 直接返回一個穩定點以避免計算錯誤
                    }

                    const u = Math.log(r);      // u (新實部) 是模長的自然對數
                    const v = Math.atan2(y, x); // v (新虛部) 是 z 的主輻角

                    // 執行複數乘法 c * (u + vi)
                    const newX = cReal * u - cImag * v;
                    const newY = cReal * v + cImag * u;

                    return { x: newX, y: newY };
                }
            },
            'sin-z': {
                name: 'c * sin(z) (正弦)',
                description: '正弦函數，常產生格子狀的重複結構或朦朧的霧狀圖案。',
                // 迭代公式: z_n+1 = c * sin(z_n)
                calculate: (x, y, cReal, cImag) => {
                    // 計算複數正弦 sin(z)，其中 z = x + yi
                    // 公式: sin(z) = sin(x)cosh(y) + i * cos(x)sinh(y)
                    const sinX = Math.sin(x);
                    const cosX = Math.cos(x);
                    const sinhY = Math.sinh(y);
                    const coshY = Math.cosh(y);

                    const u = sinX * coshY; // sin(z) 的實部
                    const v = cosX * sinhY; // sin(z) 的虛部

                    // 執行複數乘法 c * (u + vi)
                    const newX = cReal * u - cImag * v;
                    const newY = cReal * v + cImag * u;

                    return { x: newX, y: newY };
                }
            },
            'cos-z': {
                name: 'c * cos(z) (餘弦)',
                description: '三角函數，產生美麗的網格和重複結構。',
                // cos(z) = cos(x)cosh(y) - i * sin(x)sinh(y)
                calculate: (x, y, cReal, cImag) => {
                    const cosX = Math.cos(x);
                    const sinX = Math.sin(x);
                    const coshY = Math.cosh(y);
                    const sinhY = Math.sinh(y);
                    const realPart = cosX * coshY;
                    const imagPart = -sinX * sinhY;
                    // 複數乘法 (c * cos(z))
                    const newX = cReal * realPart - cImag * imagPart;
                    const newY = cReal * imagPart + cImag * realPart;
                    return { x: newX, y: newY };
                }
            }
        };

        this.iterationFn = this.ITERATION_FUNCTIONS['z-squared'];
    }


    juliaIteration(zx, zy) {
        let x = zx;
        let y = zy;
        let iteration = 0;
        let bailout = 256;

        // 记录轨道信息用于着色
        let orbitTrap = Infinity;
        let minDistance = Infinity;
        let sumMagnitude = 0;

        const currentIterFn = this.iterationFn.calculate;

        while (x * x + y * y <= bailout && iteration < this.maxIterations) {
            const nextPoint = currentIterFn(x, y, this.cReal, this.cImag);
            x = nextPoint.x;
            y = nextPoint.y;
            iteration++;

            // 轨道陷阱着色 - 记录到原点的最小距离
            const dist = Math.sqrt(x * x + y * y);
            minDistance = Math.min(minDistance, dist);
            sumMagnitude += dist;

            // 记录轨道陷阱
            orbitTrap = Math.min(orbitTrap, Math.abs(x) + Math.abs(y));
        }

        // 返回多种信息用于着色
        return {
            iterations: iteration,
            escaped: iteration < this.maxIterations,
            finalMagnitude: Math.sqrt(x * x + y * y),
            orbitTrap: orbitTrap,
            minDistance: minDistance,
            avgMagnitude: sumMagnitude / iteration,
            finalX: x,
            finalY: y
        };
    }

    getColor(result) {
        const { iterations, escaped, finalMagnitude, orbitTrap, minDistance, avgMagnitude } = result;

        // 多层着色策略 - 即使是收敛点也有丰富的颜色
        if (!escaped) {
            // 对于收敛点（Julia集内部），使用轨道信息着色
            return this.getInteriorColor(orbitTrap, minDistance, avgMagnitude, iterations);
        } else {
            // 对于发散点，使用传统的逃逸时间着色
            let smoothIterations = iterations;
            if (this.smoothColoring) {
                const nu = Math.log(Math.log(finalMagnitude) / Math.log(Math.sqrt(256))) / Math.log(2);
                smoothIterations = iterations + 1 - nu;
            }
            return this.getExteriorColor(smoothIterations);
        }
    }

    getInteriorColor(orbitTrap, minDistance, avgMagnitude, iterations) {
        // 为Julia集内部创建丰富的颜色
        const trapFactor = Math.min(1, orbitTrap / 2);
        const distFactor = Math.min(1, minDistance / 10);
        const avgFactor = Math.min(1, avgMagnitude / 20);
        const iterFactor = iterations / this.maxIterations;

        switch (this.colorScheme) {
            case 'rainbow':
                const hue = (trapFactor * 360 + distFactor * 180) % 360;
                const sat = 0.6 + avgFactor * 0.4;
                const light = 0.3 + iterFactor * 0.4;
                return this.hslToRgb(hue, sat, light);

            case 'fire':
                return [
                    Math.min(255, 80 + trapFactor * 175),
                    Math.min(255, 20 + distFactor * 150),
                    Math.min(255, 5 + avgFactor * 100)
                ];

            case 'ocean':
                return [
                    Math.min(255, 10 + trapFactor * 100),
                    Math.min(255, 50 + distFactor * 150),
                    Math.min(255, 100 + avgFactor * 155)
                ];

            case 'electric':
                return [
                    Math.min(255, 20 + trapFactor * 150),
                    Math.min(255, 30 + distFactor * 200),
                    Math.min(255, 150 + avgFactor * 105)
                ];

            case 'monochrome':
                const intensity = 50 + (trapFactor + distFactor + avgFactor) * 70;
                return [intensity, intensity, intensity];

            case 'sunset':
                return [
                    Math.min(255, 100 + trapFactor * 155),
                    Math.min(255, 50 + distFactor * 120),
                    Math.min(255, 20 + avgFactor * 80)
                ];

            default:
                return [80, 40, 120]; // 默认深紫色
        }
    }

    getExteriorColor(smoothIterations) {
        // 增强对比度和饱和度的着色
        const t = Math.min(1, smoothIterations / (this.maxIterations * 0.8));

        switch (this.colorScheme) {
            case 'rainbow':
                return this.rainbowColor(t);
            case 'fire':
                return this.fireColor(t);
            case 'ocean':
                return this.oceanColor(t);
            case 'electric':
                return this.electricColor(t);
            case 'monochrome':
                return this.monochromeColor(t);
            case 'sunset':
                return this.sunsetColor(t);
            default:
                return this.rainbowColor(t);
        }
    }

    hslToRgb(h, s, l) {
        h /= 360;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;

        let r, g, b;
        if (h < 1 / 6) [r, g, b] = [c, x, 0];
        else if (h < 2 / 6) [r, g, b] = [x, c, 0];
        else if (h < 3 / 6) [r, g, b] = [0, c, x];
        else if (h < 4 / 6) [r, g, b] = [0, x, c];
        else if (h < 5 / 6) [r, g, b] = [x, 0, c];
        else[r, g, b] = [c, 0, x];

        return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    }

    rainbowColor(t) {
        // 增强的彩虹色，更高饱和度和亮度
        const frequency = 6; // 增加频率获得更多色彩变化
        const r = Math.sin(frequency * t * Math.PI) * 127 + 128;
        const g = Math.sin(frequency * t * Math.PI + 2) * 127 + 128;
        const b = Math.sin(frequency * t * Math.PI + 4) * 127 + 128;

        // 增加亮度
        const boost = 1.2;
        return [Math.min(255, r * boost), Math.min(255, g * boost), Math.min(255, b * boost)];
    }

    fireColor(t) {
        // 更丰富的火焰色阶
        const r = Math.min(255, Math.pow(t, 0.4) * 255);
        const g = Math.max(50, Math.min(255, Math.pow(Math.max(0, t - 0.2), 0.8) * 255));
        const b = Math.max(20, Math.min(255, Math.pow(Math.max(0, t - 0.6), 1.2) * 255));
        return [r, g, b];
    }

    oceanColor(t) {
        // 更鲜艳的海洋色
        const r = Math.max(30, Math.min(255, Math.pow(Math.max(0, t - 0.3), 1.5) * 255));
        const g = Math.min(255, 100 + Math.pow(t, 0.7) * 155);
        const b = Math.min(255, 150 + Math.pow(t, 0.5) * 105);
        return [r, g, b];
    }

    electricColor(t) {
        // 更炫酷的电子色
        const pulse = Math.sin(t * Math.PI * 8) * 0.3 + 0.7; // 添加脉冲效果
        const r = t < 0.3 ? 20 : Math.pow((t - 0.3) / 0.7, 0.5) * 255;
        const g = Math.pow(Math.sin(t * Math.PI), 2) * 255;
        const b = Math.min(255, (255 - t * 100) * pulse);
        return [r, g, b];
    }

    monochromeColor(t) {
        // 更有层次的单色
        const intensity = 50 + Math.pow(t, 0.6) * 205; // 避免纯黑色
        const variation = Math.sin(t * Math.PI * 4) * 20; // 添加细微变化
        const final = Math.min(255, Math.max(50, intensity + variation));
        return [final, final, final];
    }

    sunsetColor(t) {
        // 更温暖的夕阳色
        const r = Math.min(255, 150 + Math.pow(t, 0.4) * 105);
        const g = Math.max(40, Math.min(255, 80 + Math.pow(t, 0.8) * 175));
        const b = Math.max(20, Math.min(255, 30 + Math.pow(t, 1.5) * 100));
        return [r, g, b];
    }

    // async render() {
    //     this.status.textContent = '计算中...';

    //     const width = this.canvas.width;
    //     const height = this.canvas.height;

    //     // 创建离屏Canvas避免闪烁
    //     const offscreenCanvas = document.createElement('canvas');
    //     offscreenCanvas.width = width;
    //     offscreenCanvas.height = height;
    //     const offscreenCtx = offscreenCanvas.getContext('2d');
    //     const imageData = offscreenCtx.createImageData(width, height);
    //     const data = imageData.data;

    //     const scale = 4 / (width * this.zoom);

    //     // 使用requestAnimationFrame进行分批渲染
    //     let currentRow = 0;
    //     const batchSize = 10; // 每批处理10行

    //     const renderBatch = () => {
    //         const endRow = Math.min(currentRow + batchSize, height);

    //         for (let y = currentRow; y < endRow; y++) {
    //             for (let x = 0; x < width; x++) {
    //                 const zx = this.centerX + (x - width / 2) * scale;
    //                 const zy = this.centerY - (y - height / 2) * scale;

    //                 const result = this.juliaIteration(zx, zy);
    //                 const color = this.getColor(result);

    //                 const index = (y * width + x) * 4;
    //                 data[index] = color[0];
    //                 data[index + 1] = color[1];
    //                 data[index + 2] = color[2];
    //                 data[index + 3] = 255;
    //             }
    //         }

    //         currentRow = endRow;

    //         // 更新进度
    //         const progress = Math.floor((currentRow / height) * 100);
    //         this.status.textContent = `计算中... ${progress}%`;

    //         if (currentRow < height) {
    //             // 继续下一批
    //             requestAnimationFrame(renderBatch);
    //         } else {
    //             // 渲染完成，一次性绘制到主Canvas
    //             offscreenCtx.putImageData(imageData, 0, 0);
    //             this.ctx.clearRect(0, 0, width, height);
    //             this.ctx.drawImage(offscreenCanvas, 0, 0);

    //             this.status.textContent = '渲染完成';
    //             setTimeout(() => {
    //                 this.status.textContent = '';
    //             }, 2000);
    //         }
    //     };

    //     // 开始渲染
    //     requestAnimationFrame(renderBatch);
    // }

    async delay(ms) {
        return new Promise((res, rej) => {
            setTimeout(() => {
                res();
            }, ms);
        })
    }

    async getRenderLock() {
        while(true) {
            if (this.renderlock) {
                await this.delay(100);
            } else {
                return;
            }
        }
    }

    async render() {
        await this.getRenderLock();
        this.renderlock = true;
        this.status.textContent = '计算中...';

        // 增加一个请求计数器，防止快速操作（如拖动）时，旧的渲染结果覆盖新的
        const currentRenderId = ++this.renderRequestCounter;

        const width = this.canvas.width;
        const height = this.canvas.height;

        // 创建离屏Canvas和图像数据
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;
        const offscreenCtx = offscreenCanvas.getContext('2d');
        const finalImageData = offscreenCtx.createImageData(width, height);

        const promises = [];
        const rowsPerWorker = Math.ceil(height / this.workerCount);

        // 将迭代函数转换为字符串，以便传递给 Worker
        const iterationFnStr = this.iterationFn.calculate.toString();


        for (let i = 0; i < this.workerCount; i++) {
            const startY = i * rowsPerWorker;
            const endY = Math.min(startY + rowsPerWorker, height);

            if (startY >= height) continue;

            const promise = new Promise((resolve, reject) => {
                const worker = this.workers[i];

                worker.onmessage = e => {
                    if (currentRenderId !== this.renderRequestCounter) {
                        // 如果新的渲染请求已经开始，则忽略这个旧的结果
                        resolve();
                        return;
                    }
                    const { imageDataChunk, startY: chunkStartY } = e.data;
                    finalImageData.data.set(imageDataChunk, chunkStartY * width * 4);
                    resolve();
                };

                worker.onerror = reject;

                worker.postMessage({
                    startY,
                    endY,
                    width,
                    height,
                    centerX: this.centerX,
                    centerY: this.centerY,
                    zoom: this.zoom,
                    cReal: this.cReal,
                    cImag: this.cImag,
                    maxIterations: this.maxIterations,
                    iterationFnStr: `(function() { return ${this.iterationFn.calculate.toString()}; })()`,
                    colorScheme: this.colorScheme,
                    smoothColoring: this.smoothColoring
                });
            });
            promises.push(promise);
        }

        // 等待所有 workers 完成
        await Promise.all(promises);
        this.renderlock = false;

        // 如果在等待期间没有新的渲染请求，则更新画布
        if (currentRenderId === this.renderRequestCounter) {
            this.ctx.putImageData(finalImageData, 0, 0);
            this.status.textContent = '渲染完成';
            setTimeout(() => {
                this.status.textContent = '';
            }, 1500);
        }
    }

    async renderChunk(startY, endY, width, scale) {
        return new Promise(resolve => {
            setTimeout(() => {
                const chunk = [];

                for (let y = startY; y < endY; y++) {
                    const row = [];
                    for (let x = 0; x < width; x++) {
                        const zx = this.centerX + (x - width / 2) * scale;
                        const zy = this.centerY - (y - this.canvas.height / 2) * scale;

                        const iteration = this.juliaIteration(zx, zy);
                        const color = this.getColor(iteration);
                        row.push(color);
                    }
                    chunk.push(row);
                }

                resolve(chunk);
            }, 0);
        });
    }

    loadPreset(real, imag, resetFunction = false) {

        if (resetFunction) {
            this.setIterationFunction('z-squared');
        }
        
        this.cReal = real;
        this.cImag = imag;
        document.getElementById('c-real').value = real;
        document.getElementById('c-imag').value = imag;
        this.render();
    }

    generateRandom() {
        // 生成在合理范围内的随机Julia集参数
        // 大多数有趣的Julia集都在单位圆附近
        const methods = ['uniform', 'circular', 'mandelbrot', 'golden'];
        const method = methods[Math.floor(Math.random() * methods.length)];

        let real, imag;

        switch (method) {
            case 'uniform':
                // 均匀分布在 [-1.5, 1.5] 范围内
                real = (Math.random() - 0.5) * 3;
                imag = (Math.random() - 0.5) * 3;
                break;

            case 'circular':
                // 在单位圆内生成，大多数有趣的Julia集都在这里
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * 1.2;
                real = radius * Math.cos(angle);
                imag = radius * Math.sin(angle);
                break;

            case 'mandelbrot':
                // 从Mandelbrot集边界附近选择点
                const mandelbrotPoints = [
                    [-0.8, 0.156], [-0.75, 0.1], [-0.123, 0.745],
                    [0.285, 0.01], [-0.4, 0.6], [0.3, 0.5],
                    [-0.235, 0.827], [0.45, 0.1428], [-0.62772, 0.42193],
                    [-0.79269, 0.15195], [0.11031, -0.67037]
                ];
                const basePoint = mandelbrotPoints[Math.floor(Math.random() * mandelbrotPoints.length)];
                // 在基点附近添加小的随机偏移
                real = basePoint[0] + (Math.random() - 0.5) * 0.2;
                imag = basePoint[1] + (Math.random() - 0.5) * 0.2;
                break;

            case 'golden':
                // 使用黄金比例生成有趣的参数
                const phi = (1 + Math.sqrt(5)) / 2;
                const t = Math.random() * 2 * Math.PI;
                real = Math.cos(t) / phi;
                imag = Math.sin(t) / phi;
                break;
        }

        // 确保参数在合理范围内
        real = Math.max(-2, Math.min(2, real));
        imag = Math.max(-2, Math.min(2, imag));

        // 四舍五入到三位小数
        real = Math.round(real * 1000) / 1000;
        imag = Math.round(imag * 1000) / 1000;

        this.loadPreset(real, imag, false);

        // 显示生成的参数类型
        this.status.textContent = `随机参数 (${method}): ${real} + ${imag}i`;
        setTimeout(() => {
            if (this.status.textContent.includes('随机参数')) {
                this.status.textContent = '';
            }
        }, 3000);
    }

    resetView() {
        this.centerX = 0;
        this.centerY = 0;
        this.zoom = 1;
        this.updateZoomInfo();
        this.render();
    }

    saveImage() {
        const link = document.createElement('a');
        link.download = `julia-fractal-${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }
}

// 全局函数
let fractalExplorer;

function loadPreset(real, imag) {
    fractalExplorer.loadPreset(real, imag, true);
}

function render() {
    fractalExplorer.render();
}

function resetView() {
    fractalExplorer.resetView();
}

function generateRandom() {
    fractalExplorer.generateRandom();
}

function saveImage() {
    fractalExplorer.saveImage();
}

// 初始化
window.addEventListener('load', () => {
    fractalExplorer = new JuliaFractalExplorer();
});