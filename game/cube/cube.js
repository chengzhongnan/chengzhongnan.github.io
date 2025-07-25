import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import Cube from 'cubejs';

let scene, camera, renderer, controls;
let cubes = [];
const cubeSize = 3;
const pieceSize = 1;
const gap = 0.05;

// --- 交互相关参数 ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDraggingForRotation = false;
let dragStart = new THREE.Vector2();
let intersected;

// --- 旋转相关参数 ---
let pivot = new THREE.Object3D();
let isAnimating = false;
let activeGroup = [];

// --- 打乱/还原/回退/复制 ---
let isScrambling = false;
let isSolving = false;
let initBtn, scrambleBtn, resetBtn, undoBtn, solveBtn, copyBtn, modeToggle;
let moveHistory = [];

// --- 日志 ---
let logContainer, infoMode;

function log(message) {
    if (!logContainer) return;
    const p = document.createElement('p');
    p.textContent = `> ${message}`;
    logContainer.appendChild(p);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// --- 初始化场景 ---
function init() {
    logContainer = document.getElementById('log-container');
    infoMode = document.getElementById('info_mode');
    log('Initializing scene...');

    scene = new THREE.Scene();
    scene.add(pivot);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(scene.position);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 20, 5);
    scene.add(directionalLight);

    controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 12.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = true;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;

    const faceletString = getInitFaceletString();
    createRubiksCube(faceletString);

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousedown', onMouseDown, false);
    window.addEventListener('mouseup', onMouseUp, false);
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchend', onTouchEnd, false);

    initBtn = document.getElementById('init-btn');
    scrambleBtn = document.getElementById('scramble-btn');
    resetBtn = document.getElementById('reset-btn');
    undoBtn = document.getElementById('undo-btn');
    solveBtn = document.getElementById('solve-btn');
    copyBtn = document.getElementById('copy-btn');
    modeToggle = document.getElementById('mode-toggle');
    initBtn.addEventListener('click', initPage);
    scrambleBtn.addEventListener('click', scrambleCube);
    resetBtn.addEventListener('click', resetCube);
    undoBtn.addEventListener('click', undoMove);
    solveBtn.addEventListener('click', solveCube);
    copyBtn.addEventListener('click', copyCube);
    modeToggle.addEventListener('change', onModeToggleChange);

    updateUndoButtonState();
    log('Initialization complete.');
    animate();
}

function initPage() {
    window.location = window.location.origin + window.location.pathname;
}

function getInitFaceletString() {
    const r = /cube=([A-Za-z]+)/i
    const searchString = window.location.search;
    if (r.test(searchString)) {
        return r.exec(searchString)[1];
    } else {
        return '';
    }
}

function createRubiksCube(faceletString) {
    log('Creating Rubik\'s Cube with rounded corners...');
    const offset = (cubeSize - 1) / 2;
    const totalPieceSize = pieceSize + gap;
    const materials = {
        front: new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.2 }), // Red
        back: new THREE.MeshStandardMaterial({ color: 0xffa500, roughness: 0.2 }),  // Orange
        up: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }),    // White
        down: new THREE.MeshStandardMaterial({ color: 0xffff00, roughness: 0.2 }),  // Yellow
        right: new THREE.MeshStandardMaterial({ color: 0x0000ff, roughness: 0.2 }), // Blue
        left: new THREE.MeshStandardMaterial({ color: 0x008000, roughness: 0.2 })   // Green
    };

    // 颜色映射：faceletString中的字符 -> 颜色值
    const colorMap = {
        'U': 0xffffff, // White
        'R': 0x0000ff, // Blue  
        'F': 0xff0000, // Red
        'D': 0xffff00, // Yellow
        'L': 0x008000, // Green
        'B': 0xffa500  // Orange
    };

    // 创建动态材质的函数
    function createMaterial(colorChar) {
        if (!colorChar || !colorMap[colorChar]) {
            return innerMaterial;
        }
        return new THREE.MeshStandardMaterial({
            color: colorMap[colorChar],
            roughness: 0.2
        });
    }

    // 解析faceletString，构建每个面的颜色数据
    function parseFaceletString(faceletString) {
        if (!faceletString || faceletString.length !== 54) {
            return null;
        }

        return {
            U: faceletString.slice(0, 9),   // Up face (0-8)
            R: faceletString.slice(9, 18),  // Right face (9-17)
            F: faceletString.slice(18, 27), // Front face (18-26)
            D: faceletString.slice(27, 36), // Down face (27-35)
            L: faceletString.slice(36, 45), // Left face (36-44)
            B: faceletString.slice(45, 54)  // Back face (45-53)
        };
    }

    // 获取方块在特定面上的索引
    function getFaceIndex(x, y, z, face) {
        // 根据面的不同，计算在该面3x3网格中的位置
        switch (face) {
            case 'U': // Up face (y = cubeSize-1)
                if (y !== cubeSize - 1) return -1;
                return (cubeSize - 1 - z) * 3 + x;

            case 'D': // Down face (y = 0)  
                if (y !== 0) return -1;
                return z * 3 + x;

            case 'R': // Right face (x = cubeSize-1)
                if (x !== cubeSize - 1) return -1;
                return (cubeSize - 1 - y) * 3 + z;

            case 'L': // Left face (x = 0)
                if (x !== 0) return -1;
                return (cubeSize - 1 - y) * 3 + (cubeSize - 1 - z);

            case 'F': // Front face (z = cubeSize-1)
                if (z !== cubeSize - 1) return -1;
                return (cubeSize - 1 - y) * 3 + x;

            case 'B': // Back face (z = 0)
                if (z !== 0) return -1;
                return (cubeSize - 1 - y) * 3 + (cubeSize - 1 - x);

            default:
                return -1;
        }
    }

    // 解析faceletString
    const faceColors = parseFaceletString(faceletString);

    const innerMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });

    // 清空现有的魔方
    cubes.forEach(cube => scene.remove(cube));
    cubes.length = 0;

    for (let x = 0; x < cubeSize; x++) {
        for (let y = 0; y < cubeSize; y++) {
            for (let z = 0; z < cubeSize; z++) {
                // 跳过内部方块
                if (x > 0 && x < cubeSize - 1 && y > 0 && y < cubeSize - 1 && z > 0 && z < cubeSize - 1) continue;

                const geometry = new RoundedBoxGeometry(pieceSize, pieceSize, pieceSize, 6, 0.1);

                // 根据faceletString确定每个面的材质
                let pieceMaterials;

                if (faceColors) {
                    // 获取每个面在faceletString中对应的颜色字符
                    const rightIndex = getFaceIndex(x, y, z, 'R');
                    const leftIndex = getFaceIndex(x, y, z, 'L');
                    const upIndex = getFaceIndex(x, y, z, 'U');
                    const downIndex = getFaceIndex(x, y, z, 'D');
                    const frontIndex = getFaceIndex(x, y, z, 'F');
                    const backIndex = getFaceIndex(x, y, z, 'B');

                    pieceMaterials = [
                        // Right face (x+)
                        x === cubeSize - 1 && rightIndex >= 0 ?
                            createMaterial(faceColors.R[rightIndex]) : innerMaterial,
                        // Left face (x-)
                        x === 0 && leftIndex >= 0 ?
                            createMaterial(faceColors.L[leftIndex]) : innerMaterial,
                        // Up face (y+)
                        y === cubeSize - 1 && upIndex >= 0 ?
                            createMaterial(faceColors.U[upIndex]) : innerMaterial,
                        // Down face (y-)
                        y === 0 && downIndex >= 0 ?
                            createMaterial(faceColors.D[downIndex]) : innerMaterial,
                        // Front face (z+)
                        z === cubeSize - 1 && frontIndex >= 0 ?
                            createMaterial(faceColors.F[frontIndex]) : innerMaterial,
                        // Back face (z-)
                        z === 0 && backIndex >= 0 ?
                            createMaterial(faceColors.B[backIndex]) : innerMaterial
                    ];
                } else {
                    // 如果没有提供faceletString或格式错误，使用默认材质
                    pieceMaterials = [
                        x === cubeSize - 1 ? materials.right : innerMaterial, // Right face
                        x === 0 ? materials.left : innerMaterial,             // Left face
                        y === cubeSize - 1 ? materials.up : innerMaterial,    // Up face
                        y === 0 ? materials.down : innerMaterial,             // Down face
                        z === cubeSize - 1 ? materials.front : innerMaterial, // Front face
                        z === 0 ? materials.back : innerMaterial              // Back face
                    ];
                }

                const piece = new THREE.Mesh(geometry, pieceMaterials);
                const position = new THREE.Vector3(
                    (x - offset) * totalPieceSize,
                    (y - offset) * totalPieceSize,
                    (z - offset) * totalPieceSize
                );
                piece.position.copy(position);
                piece.userData.originalPosition = position.clone();
                piece.userData.originalQuaternion = piece.quaternion.clone();
                cubes.push(piece);
                scene.add(piece);
            }
        }
    }

    log('Cube created.');
}

function cubePositionEqual(a, b) {
    return Math.abs(a - b) < 0.1;
}

function getFaceletString() {
    const faceNames = ['U', 'R', 'F', 'D', 'L', 'B'];
    const faceNormals = {
        U: new THREE.Vector3(0, 1, 0), R: new THREE.Vector3(1, 0, 0),
        F: new THREE.Vector3(0, 0, 1), D: new THREE.Vector3(0, -1, 0),
        L: new THREE.Vector3(-1, 0, 0), B: new THREE.Vector3(0, 0, -1)
    };
    const localNormals = {
        R: new THREE.Vector3(1, 0, 0), L: new THREE.Vector3(-1, 0, 0),
        U: new THREE.Vector3(0, 1, 0), D: new THREE.Vector3(0, -1, 0),
        F: new THREE.Vector3(0, 0, 1), B: new THREE.Vector3(0, 0, -1)
    };

    let faceletString = '';

    for (const face of faceNames) {
        const worldNormal = faceNormals[face];
        const facelets = [];
        // 找出該面的所有方塊
        cubes.forEach(cube => {
            if (face === 'U' && cubePositionEqual(cube.position.y, 1)) facelets.push(cube);
            if (face === 'D' && cubePositionEqual(cube.position.y, -1)) facelets.push(cube);
            if (face === 'R' && cubePositionEqual(cube.position.x, 1)) facelets.push(cube);
            if (face === 'L' && cubePositionEqual(cube.position.x, -1)) facelets.push(cube);
            if (face === 'F' && cubePositionEqual(cube.position.z, 1)) facelets.push(cube);
            if (face === 'B' && cubePositionEqual(cube.position.z, -1)) facelets.push(cube);
        });

        // 排序以確保順序一致
        facelets.sort((a, b) => {
            if (face === 'U' || face === 'D') {
                if (Math.abs(a.position.z - b.position.z) > 0.1) return a.position.z - b.position.z;
                return a.position.x - b.position.x;
            }
            if (face === 'R' || face === 'L') {
                if (Math.abs(a.position.y - b.position.y) > 0.1) return b.position.y - a.position.y;
                return a.position.z - b.position.z;
            }
            if (face === 'F' || face === 'B') {
                if (Math.abs(a.position.y - b.position.y) > 0.1) return b.position.y - a.position.y;
                return a.position.x - b.position.x;
            }
        });

        // 對於 U, R, B 面，需要反轉順序以符合 cubejs 的預期
        if (face === 'U' || face === 'R' || face === 'B') {
            facelets.reverse();
        }

        facelets.forEach(cube => {
            const invRotation = cube.quaternion.clone().invert();
            const localFaceNormal = worldNormal.clone().applyQuaternion(invRotation).round();

            for (const localFaceName in localNormals) {
                if (localNormals[localFaceName].equals(localFaceNormal)) {
                    faceletString += localFaceName;
                    break;
                }
            }
        });
    }
    return faceletString;
}

function onKeyDown(event) {
    if (event.key === 'Control' && !isAnimating && !isScrambling) {
        if (controls.enabled) {
            log('Ctrl Down: Rotation mode ACTIVATED.');
            controls.enabled = false;
            infoMode.textContent = '放开 Ctrl 键或取消勾选以旋转视角';
            infoMode.style.color = '#ff6347';
        }
    }
}

function onKeyUp(event) {
    if (event.key === 'Control') {
        if (!controls.enabled) {
            log('Ctrl Up: Camera mode ACTIVATED.');
            controls.enabled = true;
            infoMode.textContent = '按住 Ctrl 键或勾选以转动方块';
            infoMode.style.color = '#66bfff';
        }
    }
}

function onModeToggleChange() {
    if (modeToggle.checked) {
        if (controls.enabled) {
            log('Checkbox ON: Rotation mode ACTIVATED.');
            controls.enabled = false;
            infoMode.textContent = '放开 Ctrl 键或取消勾选以旋转视角';
            infoMode.style.color = '#ff6347';
        }
    } else {
        if (!controls.enabled) {
            log('Checkbox OFF: Camera mode ACTIVATED.');
            controls.enabled = true;
            infoMode.textContent = '按住 Ctrl 键或勾选以转动方块';
            infoMode.style.color = '#66bfff';
        }
    }
}

function onMouseDown(event) {
    if (controls.enabled) return;
    if (event.target !== renderer.domElement) return;
    if (isAnimating || isScrambling) {
        log(`Action blocked: animation/scramble in progress.`);
        return;
    }
    log('Mouse Down in Rotation Mode.');
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cubes);
    if (intersects.length > 0) {
        log('Cube intersected.');
        isDraggingForRotation = true;
        dragStart.set(event.clientX, event.clientY);
        intersected = { object: intersects[0].object, face: intersects[0].face };
    } else {
        log('No cube intersected.');
    }
}

function onMouseUp(event) {
    if (!isDraggingForRotation) return;
    log('Mouse Up: Drag for rotation ended.');
    isDraggingForRotation = false;
    if (isAnimating || isScrambling || !intersected) {
        log('Rotation aborted (animation in progress or no intersection).');
        return;
    }
    startRotation(event);
}

function onTouchStart(event) {
    if (event.target !== renderer.domElement) return;
    event.preventDefault();
    log('Touch Start: Entering rotation mode.');
    controls.enabled = false;
    const touch = event.touches[0];
    onMouseDown({ target: event.target, clientX: touch.clientX, clientY: touch.clientY });
}

function onTouchEnd(event) {
    if (!isDraggingForRotation) return;
    log('Touch End: Exiting rotation mode.');
    controls.enabled = true;
    const touch = event.changedTouches[0];
    onMouseUp({ clientX: touch.clientX, clientY: touch.clientY });
}

/**
 * 开始旋转操作
 * @param {Event} event 鼠标事件
 */
function startRotation(event) {
    isAnimating = true;
    const dragEnd = new THREE.Vector2(event.clientX, event.clientY);
    const dragVector = dragEnd.clone().sub(dragStart);

    // 检查拖拽距离是否足够
    if (dragVector.lengthSq() < 100) {
        log('Drag too short. Cancelling rotation.');
        isAnimating = false;
        return;
    }

    // 将屏幕坐标转换为标准化设备坐标
    mouse.x = (dragEnd.x / window.innerWidth) * 2 - 1;
    mouse.y = -(dragEnd.y / window.innerHeight) * 2 + 1;

    // 使用射线检测结束位置的立方体
    raycaster.setFromCamera(mouse, camera);
    const endIntersects = raycaster.intersectObjects(cubes);
    const startCube = intersected.object;
    const endCube = endIntersects.length > 0 ? endIntersects[0].object : null;

    // 根据拖拽情况选择不同的旋转策略
    if (endCube && startCube !== endCube) {
        // 情况1：拖拽跨越了不同的立方体
        log('Rotation Case 1: Drag across different cubes.');
        rotateByDragAcross(startCube, endCube);
    } else {
        // 情况2：在单个立方体上拖拽，需要延长向量找到目标
        log('Rotation Case 2: Drag on a single cube. Extending vector...');
        const extendedPoint = dragEnd.clone().add(dragVector);
        mouse.x = (extendedPoint.x / window.innerWidth) * 2 - 1;
        mouse.y = -(extendedPoint.y / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const extendedIntersects = raycaster.intersectObjects(cubes);
        const extendedEndCube = extendedIntersects.length > 0 ? extendedIntersects[0].object : null;

        if (extendedEndCube && startCube !== extendedEndCube) {
            log('Extended drag hit a new cube. Using Case 1 logic.');
            rotateByDragAcross(startCube, extendedEndCube);
        } else {
            log('Extended drag failed. Using Case 2 fallback logic.');
            rotateByDragOnCube(startCube, dragStart, dragEnd);
        }
    }
}

/**
 * 通过跨立方体拖拽进行旋转
 * @param {THREE.Object3D} startCube 起始立方体
 * @param {THREE.Object3D} endCube 结束立方体
 */
function rotateByDragAcross(startCube, endCube) {

    // 两个坐标的（x,y,z）中必须有两个值是相等的，否则不做任何操作
    const equalsAxis = cubePositionEqual(startCube.position.x, endCube.position.x) 
                    + cubePositionEqual(startCube.position.y, endCube.position.y) 
                    + cubePositionEqual(startCube.position.z, endCube.position.z) ;
    
    if (equalsAxis !== 2) {
        isAnimating = false;
        return false;
    }

    // 计算起始和结束位置的世界坐标
    const startPos = startCube.getWorldPosition(new THREE.Vector3());
    const endPos = endCube.getWorldPosition(new THREE.Vector3());
    const moveVec = endPos.sub(startPos);

    // 量化移动向量，只保留主要方向
    const absX = Math.abs(moveVec.x), absY = Math.abs(moveVec.y), absZ = Math.abs(moveVec.z);
    const cleanMoveVec = new THREE.Vector3();

    if (absX > absY && absX > absZ) {
        cleanMoveVec.x = Math.sign(moveVec.x);
    } else if (absY > absX && absY > absZ) {
        cleanMoveVec.y = Math.sign(moveVec.y);
    } else {
        cleanMoveVec.z = Math.sign(moveVec.z);
    }

    // 获取被点击面的法向量
    const faceNormal = intersected.face.normal.clone()
        .transformDirection(startCube.matrixWorld).round();

    // 计算旋转轴（法向量与移动向量的叉积）
    const rotationAxis = new THREE.Vector3()
        .crossVectors(cleanMoveVec, faceNormal)
        .normalize()
        .round();

    // 检查旋转轴是否有效
    if (rotationAxis.lengthSq() < 0.5) {
        log('Rotation failed: Ambiguous drag across cubes.');
        isAnimating = false;
        return false;
    }

    const angle = 0 - Math.PI / 2; // 90度旋转
    log(`Rotation (Across): Axis=${rotationAxis.x},${rotationAxis.y},${rotationAxis.z}`);

    // 获取需要旋转的立方体组
    activeGroup = getRotationGroup(startCube, rotationAxis);

    // 记录移动历史用于撤销功能
    moveHistory.push({
        axis: rotationAxis.clone(),
        angle: angle,
        group: activeGroup.slice()
    });
    updateUndoButtonState();

    // 将立方体组附加到旋转轴心并开始动画
    activeGroup.forEach(cube => pivot.attach(cube));
    animateRotation(rotationAxis, angle);
}

/**
 * 通过在单个立方体上拖拽进行旋转
 * @param {THREE.Object3D} startCube 起始立方体
 * @param {THREE.Vector2} dragStart 拖拽起始位置
 * @param {THREE.Vector2} dragEnd 拖拽结束位置
 */
function rotateByDragOnCube(startCube, dragStart, dragEnd) {
    // 参数验证
    if (startCube == null || dragStart == null || dragEnd == null) {
        log('Invalid parameters for rotateByDragOnCube');
        isAnimating = false;
        return;
    }

    // 计算拖拽向量
    const dragVector = dragEnd.clone().sub(dragStart);

    // 获取起始格子的网格坐标
    const startGridPos = getGridPosition(startCube);
    log(`Start grid position: ${startGridPos.x}, ${startGridPos.y}, ${startGridPos.z}`);

    // 尝试确定目标格子位置
    let endCube = getCubeAtScreenPosition(dragEnd);
    let endGridPos = null;
    let isReversed = false;

    if (endCube && endCube !== startCube) {
        // 情况1：拖拽到了不同的格子
        endGridPos = getGridPosition(endCube);
        log(`Drag to different cube. End grid: ${endGridPos.x}, ${endGridPos.y}, ${endGridPos.z}`);
    } else {
        // 情况2：拖拽在同一格子内，需要延长向量寻找目标
        log('Drag within same cube, extending vector...');
        const extensionResult = extendDragToFindTargetGrid(startGridPos, dragStart, dragVector);

        if (!extensionResult) {
            log('Could not find target grid by extending vector. Cancelling rotation.');
            isAnimating = false;
            return;
        }

        endGridPos = extensionResult.gridPos;
        isReversed = extensionResult.isReversed;

        if (isReversed) {
            log(`Extended to grid (reversed): ${endGridPos.x}, ${endGridPos.y}, ${endGridPos.z}`);
        } else {
            log(`Extended to grid: ${endGridPos.x}, ${endGridPos.y}, ${endGridPos.z}`);
        }
    }

    // 根据起始和目标格子计算旋转参数
    const rotationResult = calculateRotationFromGrids(startGridPos, endGridPos, isReversed);

    if (!rotationResult) {
        log('Could not determine rotation axis. Cancelling rotation.');
        isAnimating = false;
        return;
    }

    const { axis, angle } = rotationResult;
    log(`Rotation (OnCube): Axis=${axis.x},${axis.y},${axis.z}, Angle=${(angle * 180 / Math.PI).toFixed(0)}°, Reversed=${isReversed}`);

    // 获取需要旋转的立方体组并执行旋转
    activeGroup = getRotationGroup(startCube, axis);

    // 记录移动历史用于撤销功能
    moveHistory.push({
        axis: axis.clone(),
        angle: angle,
        group: activeGroup.slice()
    });
    updateUndoButtonState();

    activeGroup.forEach(cube => pivot.attach(cube));
    animateRotation(axis, angle);
}

/**
 * 获取魔方格子在网格中的位置坐标
 * @param {THREE.Object3D} cube 立方体对象
 * @returns {THREE.Vector3} 网格坐标 (-1, 0, 1)
 */
function getGridPosition(cube) {
    const worldPos = new THREE.Vector3();
    cube.getWorldPosition(worldPos);
    const totalPieceSize = pieceSize + gap;

    return new THREE.Vector3(
        Math.round(worldPos.x / totalPieceSize),
        Math.round(worldPos.y / totalPieceSize),
        Math.round(worldPos.z / totalPieceSize)
    );
}

/**
 * 根据屏幕坐标获取对应的魔方格子
 * @param {THREE.Vector2} screenPos 屏幕坐标
 * @returns {THREE.Object3D|null} 对应的立方体对象或null
 */
function getCubeAtScreenPosition(screenPos) {
    const mouse = new THREE.Vector2();
    mouse.x = (screenPos.x / window.innerWidth) * 2 - 1;
    mouse.y = -(screenPos.y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cubes);

    return intersects.length > 0 ? intersects[0].object : null;
}

/**
 * 延长拖拽向量直到找到目标格子
 * @param {THREE.Vector3} startGridPos 起始网格位置
 * @param {THREE.Vector2} dragStart 拖拽起始屏幕位置
 * @param {THREE.Vector2} dragVector 拖拽向量
 * @returns {Object|null} 包含目标网格位置和是否反向的对象
 */
function extendDragToFindTargetGrid(startGridPos, dragStart, dragVector) {
    const maxExtension = 5; // 最大延伸倍数
    const step = 0.5; // 延伸步长

    // 首先尝试正向延长
    for (let multiplier = step; multiplier <= maxExtension; multiplier += step) {
        const extendedPos = dragStart.clone().add(dragVector.clone().multiplyScalar(multiplier));
        const targetCube = getCubeAtScreenPosition(extendedPos);

        if (targetCube) {
            const targetGridPos = getGridPosition(targetCube);

            // 检查是否到达了不同的格子
            if (!targetGridPos.equals(startGridPos)) {
                log(`Found target grid by forward extension: ${targetGridPos.x}, ${targetGridPos.y}, ${targetGridPos.z}`);
                return { gridPos: targetGridPos, isReversed: false };
            }
        }
    }

    log('Forward extension failed, trying reverse extension...');

    // 正向延长失败，尝试反向延长
    for (let multiplier = step; multiplier <= maxExtension; multiplier += step) {
        const extendedPos = dragStart.clone().add(dragVector.clone().multiplyScalar(-multiplier));
        const targetCube = getCubeAtScreenPosition(extendedPos);

        if (targetCube) {
            const targetGridPos = getGridPosition(targetCube);

            // 检查是否到达了不同的格子
            if (!targetGridPos.equals(startGridPos)) {
                log(`Found target grid by reverse extension: ${targetGridPos.x}, ${targetGridPos.y}, ${targetGridPos.z}`);
                return { gridPos: targetGridPos, isReversed: true };
            }
        }
    }

    // 如果延长向量没有找到合适的目标，使用拖拽方向推测
    log('Both extensions failed, using direction inference...');
    const inferredGrid = inferTargetGridFromDragDirection(startGridPos, dragVector);
    return inferredGrid ? { gridPos: inferredGrid, isReversed: false } : null;
}

/**
 * 根据拖拽方向推测目标格子
 * @param {THREE.Vector3} startGridPos 起始网格位置
 * @param {THREE.Vector2} dragVector 拖拽向量
 * @returns {THREE.Vector3|null} 推测的目标网格位置
 */
function inferTargetGridFromDragDirection(startGridPos, dragVector) {
    // 将屏幕拖拽向量转换为3D方向
    const direction3D = screenVectorTo3D(dragVector);

    if (!direction3D) return null;

    // 根据最强的方向分量确定目标格子
    const targetGridPos = startGridPos.clone();
    const absX = Math.abs(direction3D.x);
    const absY = Math.abs(direction3D.y);
    const absZ = Math.abs(direction3D.z);

    if (absX > absY && absX > absZ) {
        targetGridPos.x += Math.sign(direction3D.x);
    } else if (absY > absX && absY > absZ) {
        targetGridPos.y += Math.sign(direction3D.y);
    } else {
        targetGridPos.z += Math.sign(direction3D.z);
    }

    // 确保目标格子在魔方范围内 (-1 到 1)
    targetGridPos.clamp(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));

    // 检查目标格子是否与起始格子不同
    if (targetGridPos.equals(startGridPos)) {
        return null;
    }

    return targetGridPos;
}

/**
 * 将屏幕拖拽向量转换为3D方向
 * @param {THREE.Vector2} screenVector 屏幕向量
 * @returns {THREE.Vector3|null} 3D方向向量或null
 */
function screenVectorTo3D(screenVector) {
    // 获取相机的右向量和上向量
    const cameraMatrix = camera.matrixWorld;
    const right = new THREE.Vector3().setFromMatrixColumn(cameraMatrix, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(cameraMatrix, 1);

    // 归一化屏幕向量
    const normalizedScreen = screenVector.clone().normalize();

    // 将屏幕向量转换为3D向量
    const direction3D = new THREE.Vector3();
    direction3D.addScaledVector(right, normalizedScreen.x);
    direction3D.addScaledVector(up, -normalizedScreen.y); // 注意Y轴翻转

    // 检查方向强度是否足够
    const threshold = 0.3; // 最小方向强度阈值
    if (Math.abs(direction3D.x) < threshold &&
        Math.abs(direction3D.y) < threshold &&
        Math.abs(direction3D.z) < threshold) {
        return null;
    }

    return direction3D;
}

/**
 * 根据起始和目标格子计算旋转参数
 * @param {THREE.Vector3} startGrid 起始网格位置
 * @param {THREE.Vector3} endGrid 目标网格位置
 * @param {boolean} isReversed 是否为反向延长找到的目标
 * @returns {Object|null} 包含旋转轴和角度的对象
 */
function calculateRotationFromGrids(startGrid, endGrid, isReversed = false) {
    const moveVector = endGrid.clone().sub(startGrid);

    // 如果是反向延长找到的目标，需要反转移动向量
    if (isReversed) {
        moveVector.negate();
        log(`Move vector reversed: ${moveVector.x}, ${moveVector.y}, ${moveVector.z}`);
    }

    // 量化移动向量，确保只在一个轴向移动
    const absX = Math.abs(moveVector.x);
    const absY = Math.abs(moveVector.y);
    const absZ = Math.abs(moveVector.z);

    // 找出主要移动方向
    const cleanMoveVec = new THREE.Vector3();
    if (absX > absY && absX > absZ) {
        cleanMoveVec.x = Math.sign(moveVector.x);
    } else if (absY > absX && absY > absZ) {
        cleanMoveVec.y = Math.sign(moveVector.y);
    } else if (absZ > absX && absZ > absY) {
        cleanMoveVec.z = Math.sign(moveVector.z);
    } else {
        // 对角线移动，选择最接近的轴
        if (absX >= absY && absX >= absZ) {
            cleanMoveVec.x = Math.sign(moveVector.x);
        } else if (absY >= absX && absY >= absZ) {
            cleanMoveVec.y = Math.sign(moveVector.y);
        } else {
            cleanMoveVec.z = Math.sign(moveVector.z);
        }
    }

    // 获取起始面的法向量
    let faceNormal;
    if (intersected && intersected.face) {
        faceNormal = intersected.face.normal.clone()
            .transformDirection(intersected.object.matrixWorld).round();
    } else {
        // 备用方案：根据相机视角选择最可能的面
        const viewDirection = camera.position.clone().normalize();
        faceNormal = new THREE.Vector3();
        const absViewX = Math.abs(viewDirection.x);
        const absViewY = Math.abs(viewDirection.y);
        const absViewZ = Math.abs(viewDirection.z);

        if (absViewX > absViewY && absViewX > absViewZ) {
            faceNormal.x = Math.sign(viewDirection.x);
        } else if (absViewY > absViewX && absViewY > absViewZ) {
            faceNormal.y = Math.sign(viewDirection.y);
        } else {
            faceNormal.z = Math.sign(viewDirection.z);
        }
    }

    // 计算旋转轴（面法向量与移动向量的叉积）
    const rotationAxis = new THREE.Vector3()
        .crossVectors(faceNormal, cleanMoveVec)
        .normalize()
        .round();

    // 检查旋转轴是否有效
    if (rotationAxis.lengthSq() < 0.5) {
        log(`Invalid rotation axis. Face normal: ${faceNormal.x},${faceNormal.y},${faceNormal.z}, Move: ${cleanMoveVec.x},${cleanMoveVec.y},${cleanMoveVec.z}`);
        return null;
    }

    // 90度旋转
    const angle = 0 - Math.PI / 2;

    return { axis: rotationAxis, angle: angle };
}

/**
 * 获取需要一起旋转的立方体组
 * @param {THREE.Object3D} clickedObject 被点击的立方体
 * @param {THREE.Vector3} axis 旋转轴
 * @returns {Array} 需要旋转的立方体数组
 */
function getRotationGroup(clickedObject, axis) {
    const group = [];
    const epsilon = 0.01; // 浮点数比较的容差
    const clickedPosition = new THREE.Vector3();
    clickedObject.getWorldPosition(clickedPosition);

    // 遍历所有立方体，找出在同一旋转平面上的立方体
    cubes.forEach(cube => {
        const cubePosition = new THREE.Vector3();
        cube.getWorldPosition(cubePosition);

        // 根据旋转轴确定哪些立方体需要一起旋转
        if ((Math.abs(axis.x) > 0.5 && Math.abs(cubePosition.x - clickedPosition.x) < epsilon) ||
            (Math.abs(axis.y) > 0.5 && Math.abs(cubePosition.y - clickedPosition.y) < epsilon) ||
            (Math.abs(axis.z) > 0.5 && Math.abs(cubePosition.z - clickedPosition.z) < epsilon)) {
            group.push(cube);
        }
    });

    return group;
}

/**
 * 执行旋转动画
 * @param {THREE.Vector3} axis 旋转轴
 * @param {number} angle 旋转角度
 * @param {Function} onComplete 完成回调函数
 * @param {number} duration 动画持续时间（毫秒）
 */
function animateRotation(axis, angle, onComplete, duration = 300) {
    log('Rotation animation started.');
    const start = { rotation: 0 };
    const end = { rotation: angle };
    const startTime = Date.now();

    /**
     * 递归执行旋转动画帧
     */
    function rotate() {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用缓动函数实现平滑动画
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        // 应用旋转
        pivot.rotation.setFromVector3(
            axis.clone().multiplyScalar(start.rotation + (end.rotation - start.rotation) * easeProgress)
        );

        if (progress < 1) {
            // 继续动画
            requestAnimationFrame(rotate);
        } else {
            // 动画完成，清理和重置
            pivot.rotation.setFromVector3(axis.clone().multiplyScalar(angle));
            pivot.updateMatrixWorld();

            // 将旋转后的立方体从pivot中分离并重新添加到场景
            while (activeGroup.length > 0) {
                const cube = activeGroup.pop();
                cube.getWorldPosition(cube.position);
                cube.getWorldQuaternion(cube.quaternion);
                scene.add(cube);
            }

            // 重置pivot
            pivot.rotation.set(0, 0, 0);
            pivot.updateMatrixWorld();

            log('Rotation animation finished.');

            if (onComplete) {
                onComplete();
            } else {
                isAnimating = false;
                intersected = null;
            }
        }
    }

    rotate();
}

/**
 * 撤销上一步操作
 */
function undoLastMove() {
    if (moveHistory.length === 0 || isAnimating) {
        log('Cannot undo: no moves in history or animation in progress.');
        return;
    }

    // 获取最后一步操作
    const lastMove = moveHistory.pop();
    const { axis, angle, group } = lastMove;

    log(`Undoing move: Axis=${axis.x},${axis.y},${axis.z}, Angle=${(angle * 180 / Math.PI).toFixed(0)}°`);

    // 设置活动组并执行反向旋转
    activeGroup = group.slice(); // 复制数组
    activeGroup.forEach(cube => pivot.attach(cube));

    // 执行反向旋转（负角度）
    animateRotation(axis, -angle, () => {
        isAnimating = false;
        intersected = null;
        updateUndoButtonState(); // 修复：撤销完成后更新按钮状态
        log('Undo completed.');
    });

    // 立即更新按钮状态
    updateUndoButtonState();
}

/**
 * 更新撤销按钮的状态
 */
function updateUndoButtonState() {
    if (undoBtn) {
        undoBtn.disabled = moveHistory.length === 0;
        log(`Undo button state updated: ${undoBtn.disabled ? 'disabled' : 'enabled'}, History length: ${moveHistory.length}`);
    }
}

function undoMove() {
    if (isAnimating || isScrambling || moveHistory.length === 0) return;
    isAnimating = true;
    log('Undo button clicked.');
    const lastMove = moveHistory.pop();
    updateUndoButtonState();
    activeGroup = lastMove.group;
    const oppositeAngle = -lastMove.angle;
    log(`Undoing move. Axis=${lastMove.axis.x},${lastMove.axis.y},${lastMove.axis.z}, Angle=${oppositeAngle}`);
    activeGroup.forEach(cube => pivot.attach(cube));
    animateRotation(lastMove.axis, oppositeAngle, () => {
        isAnimating = false;
    });
}

function resetCube() {
    if (isAnimating || isScrambling) return;
    log('Reset button clicked. Resetting cube and history.');
    isAnimating = true;
    moveHistory = [];
    updateUndoButtonState();
    cubes.forEach(cube => {
        cube.position.copy(cube.userData.originalPosition);
        cube.quaternion.copy(cube.userData.originalQuaternion);
    });
    setTimeout(() => { isAnimating = false; log('Cube reset complete.'); }, 100);
}

function scrambleCube() {
    if (isAnimating || isScrambling) return;
    log('Scramble button clicked. Starting scramble...');
    resetCube(); // resetCube also clears history
    isScrambling = true;
    scrambleBtn.disabled = true;
    resetBtn.disabled = true;
    undoBtn.disabled = true;
    const moves = [];
    const movesToMake = 20;
    const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    const layers = [-1, 0, 1];
    const angles = [Math.PI / 2, -Math.PI / 2];
    for (let i = 0; i < movesToMake; i++) {
        moves.push({
            axis: axes[Math.floor(Math.random() * axes.length)],
            layerIndex: layers[Math.floor(Math.random() * layers.length)],
            angle: angles[Math.floor(Math.random() * angles.length)]
        });
    }
    executeScrambleMove(moves, 0);
}

function executeScrambleMove(moves, index) {
    if (index >= moves.length) {
        log('Scramble complete.');
        isScrambling = false;
        scrambleBtn.disabled = false;
        resetBtn.disabled = false;
        updateUndoButtonState();
        isAnimating = false;
        return;
    }
    isAnimating = true;
    const move = moves[index];
    log(`Scramble move ${index + 1}/${moves.length}`);
    const totalPieceSize = pieceSize + gap;
    const layerPosition = move.layerIndex * totalPieceSize;
    const epsilon = 0.01;
    activeGroup = [];
    cubes.forEach(cube => {
        const pos = new THREE.Vector3();
        cube.getWorldPosition(pos);
        if ((Math.abs(move.axis.x) > 0.5 && Math.abs(pos.x - layerPosition) < epsilon) ||
            (Math.abs(move.axis.y) > 0.5 && Math.abs(pos.y - layerPosition) < epsilon) ||
            (Math.abs(move.axis.z) > 0.5 && Math.abs(pos.z - layerPosition) < epsilon)) {
            activeGroup.push(cube);
        }
    });
    activeGroup.forEach(cube => pivot.attach(cube));
    animateRotation(move.axis, move.angle, () => {
        executeScrambleMove(moves, index + 1);
    }, 100);
}

function solveCube() {
    if (isAnimating || isScrambling || isSolving) return;
    log('Solve button clicked.');
    isSolving = true;
    setButtonsDisabled(true);
    moveHistory = []; // Solving creates a new history

    const faceletString = getFaceletString();
    log(`Current state: ${faceletString}`);

    try {
        const solution = Cube.fromString(faceletString).solve();
        log(`Solver found solution: ${solution}`);
        const moves = parseSolution(solution);
        executeSolutionMoves(moves, 0);
    } catch (e) {
        log(`Error solving cube: ${e}`);
        isSolving = false;
        setButtonsDisabled(false);
    }
}

function parseSolution(solutionString) {
    const moves = [];
    const moveRegex = /([URFDLB])([2']?)/g;
    let match;
    while ((match = moveRegex.exec(solutionString)) !== null) {
        const face = match[1];
        const modifier = match[2];
        let angle = Math.PI / 2;
        if (modifier === "'") angle = -Math.PI / 2;
        if (modifier === '2') angle = Math.PI;

        let axis;
        switch (face) {
            case 'U': axis = new THREE.Vector3(0, -1, 0); break;
            case 'D': axis = new THREE.Vector3(0, 1, 0); break;
            case 'R': axis = new THREE.Vector3(-1, 0, 0); break;
            case 'L': axis = new THREE.Vector3(1, 0, 0); break;
            case 'F': axis = new THREE.Vector3(0, 0, -1); break;
            case 'B': axis = new THREE.Vector3(0, 0, 1); break;
        }
        moves.push({ axis, angle });
    }
    return moves;
}

function executeSolutionMoves(moves, index) {
    if (index >= moves.length) {
        log('Solve complete.');
        isSolving = false;
        setButtonsDisabled(false);
        return;
    }
    isAnimating = true;
    const move = moves[index];
    log(`Solving move ${index + 1}/${moves.length}`);

    const layerNormal = move.axis.clone().multiplyScalar(-1);
    const layerPosition = 1 * (pieceSize + gap);
    const epsilon = 0.01;

    activeGroup = [];
    cubes.forEach(cube => {
        if (Math.abs(cube.position.dot(layerNormal) - layerPosition) < epsilon) {
            activeGroup.push(cube);
        }
    });

    activeGroup.forEach(cube => pivot.attach(cube));
    animateRotation(move.axis, move.angle, () => {
        executeSolutionMoves(moves, index + 1);
    }, 250); // Faster animation for solving
}

function setButtonsDisabled(disabled) {
    scrambleBtn.disabled = disabled;
    resetBtn.disabled = disabled;
    undoBtn.disabled = disabled;
    solveBtn.disabled = disabled;
}

function copyCube() {
    const faceString = getFaceletString();
    const url = `${window.location.origin}${window.location.pathname}?cube=${faceString}`;

    setTimeout(async () => {
        await navigator.clipboard.writeText(url);

        log(`copy facelet string ${faceString} to clipboard`);
    }, 0);

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

init();