const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const guideCanvas = document.getElementById('guideCanvas');
const gCtx = guideCanvas.getContext('2d');

// UI Controls
const symmetryMode = document.getElementById('symmetryMode');
const slicesContainer = document.getElementById('slicesContainer');
const slicesPicker = document.getElementById('slicesPicker');
const slicesVal = document.getElementById('slicesVal');
const mirrorSlices = document.getElementById('mirrorSlices');
const brushType = document.getElementById('brushType');
const colorMode = document.getElementById('colorMode');
const colorPicker = document.getElementById('colorPicker');
const neonGlow = document.getElementById('neonGlow');
const showGuides = document.getElementById('showGuides');
const sizePicker = document.getElementById('sizePicker');
const opacityPicker = document.getElementById('opacityPicker');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const bgColorPicker = document.getElementById('bgColorPicker');
const canvasWrapper = document.querySelector('.canvas-wrapper');
const resetOriginBtn = document.getElementById('resetOriginBtn');
const tipBar = document.getElementById('tipBar');
const tipText = document.getElementById('tipText');
const toggleMoveCenterBtn = document.getElementById('toggleMoveCenterBtn');

// Drawing Variables
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentStrokeColor = `hsl(${Math.floor(360 * Math.random())}, 100%, 60%)`;
let rainbowHue = 0;

// Dynamic Symmetry Origin Point
let centerX = canvas.width / 2;
let centerY = canvas.height / 2;

// History Stack using ImageData
let undoStack = [];
let redoStack = [];
const MAX_STATES = 25;

let isMovingCenterMode = false;

saveState();
drawGuidelines();

document.querySelectorAll('.palette-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
        const selectedColor = e.target.getAttribute('data-color');
        colorPicker.value = selectedColor;
        colorMode.value = 'fixed';
        colorPicker.disabled = false;
        currentStrokeColor = selectedColor;
    });
});

colorMode.addEventListener('change', () => {
    colorPicker.disabled = ('fixed' !== colorMode.value);
});

toggleMoveCenterBtn.addEventListener('click', () => {
    isMovingCenterMode = !isMovingCenterMode;
    if (isMovingCenterMode) {
        activateCenterHintMode();
    } else {
        deactivateCenterHintMode();
    }
});

function activateCenterHintMode() {
    toggleMoveCenterBtn.classList.add('active-toggle');
    toggleMoveCenterBtn.textContent = 'Cancel';
    tipBar.classList.add('active-hint');
    tipText.innerHTML = '<strong>Ready!</strong> Tap or click anywhere on the canvas to drop a new symmetry center point.';
}

function deactivateCenterHintMode() {
    isMovingCenterMode = false;
    toggleMoveCenterBtn.classList.remove('active-toggle');
    toggleMoveCenterBtn.textContent = 'Set Center';
    tipBar.classList.remove('active-hint');
    tipText.innerHTML = 'Pro-Tip: Tap <kbd>Set Center</kbd> or hold <kbd>Shift</kbd> and click to relocate the symmetry center!';
}

bgColorPicker.addEventListener('input', (e) => {
    canvasWrapper.style.backgroundColor = e.target.value;
});

// Event Listeners
symmetryMode.addEventListener('change', () => {
    const mode = symmetryMode.value;
    const usesSlices = (mode === 'kaleidoscope' || mode === 'radial-star');
    slicesContainer.style.display = usesSlices ? 'flex' : 'none';
    drawGuidelines();
});

slicesPicker.addEventListener('input', () => {
    slicesVal.textContent = slicesPicker.value;
    drawGuidelines();
});

mirrorSlices.addEventListener('change', drawGuidelines);
showGuides.addEventListener('change', drawGuidelines);

brushType.addEventListener('change', () => {
    colorPicker.disabled = ('fixed' !== brushType.value && 'spray' !== brushType.value && 'calligraphy' !== brushType.value);
});

resetOriginBtn.addEventListener('click', () => {
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
    drawGuidelines();
});

// Canvas Input Listeners
guideCanvas.addEventListener('mousedown', startDrawing);
guideCanvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', stopDrawing);

guideCanvas.addEventListener('touchstart', startDrawing, { passive: false });
guideCanvas.addEventListener('touchmove', draw, { passive: false });
window.addEventListener('touchend', stopDrawing);
window.addEventListener('touchcancel', stopDrawing);

clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
});

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

// Keyboard Shortcuts (Ctrl+Z / Ctrl+Y)
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo();
        else undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
    }
});

function getPointerPos(e) {
    const rect = guideCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function startDrawing(e) {
    if (e.type.startsWith('touch')) e.preventDefault();
    
    if (e.shiftKey || isMovingCenterMode) {
        const pos = getPointerPos(e);
        centerX = pos.x;
        centerY = pos.y;
        drawGuidelines();
        deactivateCenterHintMode();
        return;
    }

    isDrawing = true;
    const pos = getPointerPos(e);
    lastX = pos.x;
    lastY = pos.y;

    // Color calculation now checks colorMode independently
    if ('rainbow-click' === colorMode.value) {
        currentStrokeColor = `hsl(${Math.floor(360 * Math.random())}, 100%, 60%)`;
    } else if ('fixed' === colorMode.value) {
        currentStrokeColor = colorPicker.value;
    }
}

function draw(e) {
    if (!isDrawing) return;
    if (e.type.startsWith('touch')) e.preventDefault();

    const pos = getPointerPos(e);

    // Continuous rainbow updating checks colorMode independently
    if ('rainbow-cycle' === colorMode.value) {
        rainbowHue = (rainbowHue + 2) % 360;
        currentStrokeColor = `hsl(${rainbowHue}, 100%, 60%)`;
    }

    ctx.globalAlpha = opacityPicker.value / 100;
    ctx.strokeStyle = currentStrokeColor;
    ctx.fillStyle = currentStrokeColor;
    ctx.lineWidth = sizePicker.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (neonGlow.checked) {
        ctx.shadowBlur = 1.5 * sizePicker.value;
        ctx.shadowColor = currentStrokeColor;
    } else {
        ctx.shadowBlur = 0;
    }

    switch (symmetryMode.value) {
        case '4-corner':
            drawFourCorners(lastX, lastY, pos.x, pos.y);
            break;
        case 'vertical':
            drawVerticalMirror(lastX, lastY, pos.x, pos.y);
            break;
        case 'horizontal':
            drawHorizontalMirror(lastX, lastY, pos.x, pos.y);
            break;
        case 'radial-star':
            drawRadialStar(lastX, lastY, pos.x, pos.y);
            break;
        case 'kaleidoscope':
        default:
            drawKaleidoscope(lastX, lastY, pos.x, pos.y);
            break;
    }

    lastX = pos.x;
    lastY = pos.y;
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        saveState();
    }
}

function drawLineSegment(x1, y1, x2, y2) {
    const type = brushType.value;
    
    // Configure eraser composite operation
    if (type === 'eraser') {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (type === 'spray') {
        const density = 30;
        const radius = sizePicker.value * 3;
        for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * radius;
            ctx.fillRect(x2 + r * Math.cos(angle), y2 + r * Math.sin(angle), 1.5, 1.5);
        }
    } else if (type === 'calligraphy') {
        const width = sizePicker.value * 2;
        ctx.beginPath();
        ctx.moveTo(x1 - width, y1 - width);
        ctx.lineTo(x2 - width, y2 - width);
        ctx.lineTo(x2 + width, y2 + width);
        ctx.lineTo(x1 + width, y1 + width);
        ctx.fill();
    } else if (type === 'marker') {
        // Semi-transparent layered marker stroke
        ctx.save();
        ctx.lineCap = 'square';
        ctx.lineWidth = sizePicker.value * 2.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
    } else if (type === 'charcoal') {
        // Textured multi-grain line effect
        const particles = 1;
        for (let i = 0; i < particles; i++) {
            const offsetX = (Math.random() - 0.5) * sizePicker.value;
            const offsetY = (Math.random() - 0.5) * sizePicker.value;
            ctx.beginPath();
            ctx.moveTo(x1 + offsetX, y1 + offsetY);
            ctx.lineTo(x2 + offsetX, y2 + offsetY);
            ctx.stroke();
        }
    } else {
        // Standard line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

function drawFourCorners(x1, y1, x2, y2) {
    drawLineSegment(x1, y1, x2, y2);
    drawLineSegment(2 * centerX - x1, y1, 2 * centerX - x2, y2);
    drawLineSegment(x1, 2 * centerY - y1, x2, 2 * centerY - y2);
    drawLineSegment(2 * centerX - x1, 2 * centerY - y1, 2 * centerX - x2, 2 * centerY - y2);
}

function drawKaleidoscope(x1, y1, x2, y2) {
    const slices = parseInt(slicesPicker.value, 10);
    const angle = (2 * Math.PI) / slices;
    const dx1 = x1 - centerX;
    const dy1 = y1 - centerY;
    const dx2 = x2 - centerX;
    const dy2 = y2 - centerY;

    for (let i = 0; i < slices; i++) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle * i);
        
        drawLineSegment(dx1, dy1, dx2, dy2);

        if (mirrorSlices.checked) {
            ctx.scale(1, -1);
            drawLineSegment(dx1, dy1, dx2, dy2);
        }

        ctx.restore();
    }
}

function drawGuidelines() {
    gCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    if (!showGuides.checked) return;

    gCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    gCtx.lineWidth = 1;

    // Center indicator
    gCtx.beginPath();
    gCtx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    gCtx.stroke();

    const mode = symmetryMode.value;

    if (mode === 'vertical') {
        gCtx.beginPath();
        gCtx.moveTo(centerX, 0);
        gCtx.lineTo(centerX, canvas.height);
        gCtx.stroke();
    } else if (mode === 'horizontal') {
        gCtx.beginPath();
        gCtx.moveTo(0, centerY);
        gCtx.lineTo(canvas.width, centerY);
        gCtx.stroke();
    } else if (mode === '4-corner') {
        gCtx.beginPath();
        gCtx.moveTo(centerX, 0);
        gCtx.lineTo(centerX, canvas.height);
        gCtx.moveTo(0, centerY);
        gCtx.lineTo(canvas.width, centerY);
        gCtx.stroke();
    } else {
        // Kaleidoscope or Radial Star
        const slices = parseInt(slicesPicker.value, 10);
        for (let i = 0; i < slices; i++) {
            const rad = (2 * Math.PI / slices) * i;
            gCtx.beginPath();
            gCtx.moveTo(centerX, centerY);
            gCtx.lineTo(centerX + 600 * Math.cos(rad), centerY + 600 * Math.sin(rad));
            gCtx.stroke();
        }
    }
}

function saveState() {
    if (undoStack.length >= MAX_STATES) undoStack.shift();
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    redoStack = [];
    updateHistoryButtons();
}

function undo() {
    if (undoStack.length > 1) {
        redoStack.push(undoStack.pop());
        ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
        updateHistoryButtons();
    }
}

function redo() {
    if (redoStack.length > 0) {
        const state = redoStack.pop();
        undoStack.push(state);
        ctx.putImageData(state, 0, 0);
        updateHistoryButtons();
    }
}

function updateHistoryButtons() {
    undoBtn.disabled = undoStack.length <= 1;
    redoBtn.disabled = redoStack.length === 0;
}

downloadBtn.addEventListener('click', () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const eCtx = exportCanvas.getContext('2d');

    eCtx.fillStyle = bgColorPicker.value;
    eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    eCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = 'symmetry-artwork.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') {
        tipBar.classList.add('active-hint');
        tipText.innerHTML = '<strong>Ready!</strong> Click anywhere on the canvas to drop a new symmetry center point.';
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
        tipBar.classList.remove('active-hint');
        tipText.innerHTML = 'Pro-Tip: Hold <kbd>Shift</kbd> and click anywhere on the canvas to relocate the symmetry center!';
    }
});

function drawVerticalMirror(x1, y1, x2, y2) {
    drawLineSegment(x1, y1, x2, y2);
    drawLineSegment(2 * centerX - x1, y1, 2 * centerX - x2, y2);
}

function drawHorizontalMirror(x1, y1, x2, y2) {
    drawLineSegment(x1, y1, x2, y2);
    drawLineSegment(x1, 2 * centerY - y1, x2, 2 * centerY - y2);
}

function drawRadialStar(x1, y1, x2, y2) {
    const slices = parseInt(slicesPicker.value, 10);
    const angle = (2 * Math.PI) / slices;

    for (let i = 0; i < slices; i++) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle * i);

        // Scale alternating slices to create the star depth
        if (i % 2 === 1) {
            ctx.scale(0.65, 0.65);
        }

        // Convert global mouse coordinates to rotated local coordinates
        const rad = -angle * i;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const rx1 = x1 - centerX;
        const ry1 = y1 - centerY;
        const lx1 = rx1 * cos - ry1 * sin;
        const ly1 = rx1 * sin + ry1 * cos;

        const rx2 = x2 - centerX;
        const ry2 = y2 - centerY;
        const lx2 = rx2 * cos - ry2 * sin;
        const ly2 = rx2 * sin + ry2 * cos;

        drawLineSegment(lx1, ly1, lx2, ly2);

        // Mirror the line inside the star slice if enabled
        if (mirrorSlices.checked) {
            ctx.scale(1, -1);
            drawLineSegment(lx1, ly1, lx2, ly2);
        }

        ctx.restore();
    }
}