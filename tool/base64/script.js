const inputTextArea = document.getElementById('input');
const outputTextArea = document.getElementById('output');
const encodeButton = document.querySelector('.encode');
const decodeButton = document.querySelector('.decode');
const swapButton = document.querySelector('.swap');
const clearButton = document.querySelector('.clear');

function base64Encode(str) {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    utf8Bytes.forEach(b => binary += String.fromCharCode(b));
    return base64EncodeBinary(binary);
}

function base64Decode(base64) {
    const binary = base64DecodeBinary(base64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function base64EncodeBinary(binary) {
    let result = '';
    let i = 0;

    while (i < binary.length) {
        const a = binary.charCodeAt(i++) || 0;
        const b = binary.charCodeAt(i++) || 0;
        const c = binary.charCodeAt(i++) || 0;

        const triple = (a << 16) | (b << 8) | c;

        result += BASE64_CHARS[(triple >> 18) & 63];
        result += BASE64_CHARS[(triple >> 12) & 63];
        result += i - 2 < binary.length ? BASE64_CHARS[(triple >> 6) & 63] : '=';
        result += i - 1 < binary.length ? BASE64_CHARS[triple & 63] : '=';
    }

    return result;
}

function base64DecodeBinary(base64) {
    let result = '';
    let i = 0;

    base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');

    while (i < base64.length) {
        const a = BASE64_CHARS.indexOf(base64[i++]);
        const b = BASE64_CHARS.indexOf(base64[i++]);
        const c = BASE64_CHARS.indexOf(base64[i++]);
        const d = BASE64_CHARS.indexOf(base64[i++]);

        const triple = (a << 18) | (b << 12) | ((c & 63) << 6) | (d & 63);

        if (c !== 64) result += String.fromCharCode((triple >> 16) & 255);
        if (d !== 64) result += String.fromCharCode((triple >> 8) & 255);
        if (d !== 64) result += String.fromCharCode(triple & 255);
    }

    return result;
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input');
    const output = document.getElementById('output');
    const editor = document.getElementById('editor');
    
    // 按钮
    const btnEncode = document.getElementById('btnEncode');
    const btnDecode = document.getElementById('btnDecode');
    const btnSwap = document.getElementById('btnSwap');
    const btnClear = document.getElementById('btnClear');
    const layoutToggle = document.getElementById('layoutToggle');

    // ============================
    // 核心功能 (支持 UTF-8 中文)
    // ============================
    
    // Encode
    btnEncode.addEventListener('click', () => {
        if (!input.value.trim()) return;
        output.value = base64Encode(input.value);
    });

    // Decode
    btnDecode.addEventListener('click', () => {
        if (!input.value.trim()) return;
        output.value = base64Decode(input.value);
    });

    // Clear
    btnClear.addEventListener('click', () => {
        input.value = '';
        output.value = '';
        input.focus();
    });

    // Swap (交换输入输出)
    btnSwap.addEventListener('click', () => {
        const temp = input.value;
        input.value = output.value;
        output.value = temp;
    });

    // ============================
    // 布局切换
    // ============================
    layoutToggle.addEventListener('click', () => {
        if (editor.classList.contains('horizontal')) {
            editor.classList.remove('horizontal');
            editor.classList.add('vertical');
            // 更新箭头方向文字
            btnEncode.innerHTML = 'Encode &darr;';
            btnDecode.innerHTML = '&uarr; Decode';
        } else {
            editor.classList.remove('vertical');
            editor.classList.add('horizontal');
            // 更新箭头方向文字
            btnEncode.innerHTML = 'Encode &rarr;';
            btnDecode.innerHTML = '&larr; Decode';
        }
    });

    // ============================
    //  高度同步逻辑 (Resize Sync)
    // ============================
    
    // 使用 ResizeObserver 监听尺寸变化
    let isResizing = false; //防止无限循环的锁

    const syncHeight = (source, target) => {
        // 如果当前正在由代码调整高度，则忽略本次触发
        if (isResizing) return;

        // 获取源元素的高度
        const newHeight = source.offsetHeight;
        
        // 如果目标高度已经一样（允许1px误差），就不需要调整，避免抖动
        if (Math.abs(target.offsetHeight - newHeight) < 2) return;

        // 开启锁，防止目标元素改变时反过来触发源元素
        isResizing = true;
        
        requestAnimationFrame(() => {
            target.style.height = newHeight + 'px';
            // 样式应用后，稍后释放锁
            setTimeout(() => { isResizing = false; }, 0);
        });
    };

    // 创建观察者
    const ro = new ResizeObserver(entries => {
        for (let entry of entries) {
            if (entry.target === input) {
                syncHeight(input, output);
            } else if (entry.target === output) {
                syncHeight(output, input);
            }
        }
    });

    // 开始观察两个输入框
    ro.observe(input);
    ro.observe(output);
});