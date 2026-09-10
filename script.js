const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const guideCanvas = document.getElementById('guideCanvas');
const gCtx = guideCanvas.getContext('2d');

// UI Controls
const symmetryMode = document.getElementById('symmetryMode');
const slicesContainer = document.getElementById('slicesContainer');
const slicesPicker = document.getElementById('slicesPicker');
const slicesVal = document.getElementById('slicesVal');
const brushType = document.getElementById('brushType');
const colorPicker = document.getElementById('colorPicker');
const neonGlow = document.getElementById('neonGlow');
const showGuides = document.getElementById('showGuides');
const sizePicker = document.getElementById('sizePicker');
const opacityPicker = document.getElementById('opacityPicker');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Drawing Variables
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentStrokeColor = '#00ffcc';
let rainbowHue = 0;
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

// History Stack using ImageData
let undoStack = [];
let redoStack = [];
const MAX_STATES = 25;

saveState();
drawGuidelines();

// Event Listeners
symmetryMode.addEventListener('change', () => {
    slicesContainer.style.display = 'kaleidoscope' === symmetryMode.value ? 'flex' : 'none';
    drawGuidelines();
});

slicesPicker.addEventListener('input', () => {
    slicesVal.textContent = slicesPicker.value;
    drawGuidelines();
});

showGuides.addEventListener('change', drawGuidelines);
brushType.addEventListener('change', () => {
    colorPicker.disabled = 'fixed' !== brushType.value;
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
    isDrawing = true;
    
    const pos = getPointerPos(e);
    lastX = pos.x;
    lastY = pos.y;

    if ('rainbow-click' === brushType.value) {
        currentStrokeColor = `hsl(${Math.floor(360 * Math.random())}, 100%, 60%)`;
    } else if ('fixed' === brushType.value) {
        currentStrokeColor = colorPicker.value;
    }
}

function draw(e) {
    if (!isDrawing) return;
    if (e.type.startsWith('touch')) e.preventDefault();

    const pos = getPointerPos(e);

    if ('rainbow-cycle' === brushType.value) {
        rainbowHue = (rainbowHue + 2) % 360;
        currentStrokeColor = `hsl(${rainbowHue}, 100%, 60%)`;
    }

    ctx.globalAlpha = opacityPicker.value / 100;
    ctx.strokeStyle = currentStrokeColor;
    ctx.lineWidth = sizePicker.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (neonGlow.checked) {
        ctx.shadowBlur = 1.5 * sizePicker.value;
        ctx.shadowColor = currentStrokeColor;
    } else {
        ctx.shadowBlur = 0;
    }

    if ('4-corner' === symmetryMode.value) {
        drawFourCorners(lastX, lastY, pos.x, pos.y);
    } else {
        drawKaleidoscope(lastX, lastY, pos.x, pos.y);
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

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function drawFourCorners(x1, y1, x2, y2) {
    drawLine(x1, y1, x2, y2);
    drawLine(2 * centerX - x1, y1, 2 * centerX - x2, y2);
    drawLine(x1, 2 * centerY - y1, x2, 2 * centerY - y2);
    drawLine(2 * centerX - x1, 2 * centerY - y1, 2 * centerX - x2, 2 * centerY - y2);
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
        
        ctx.beginPath();
        ctx.moveTo(dx1, dy1);
        ctx.lineTo(dx2, dy2);
        ctx.stroke();

        ctx.scale(1, -1);
        ctx.beginPath();
        ctx.moveTo(dx1, dy1);
        ctx.lineTo(dx2, dy2);
        ctx.stroke();

        ctx.restore();
    }
}

function drawGuidelines() {
    gCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    if (!showGuides.checked) return;

    gCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    gCtx.lineWidth = 1;

    if ('4-corner' === symmetryMode.value) {
        gCtx.beginPath();
        gCtx.moveTo(centerX, 0);
        gCtx.lineTo(centerX, canvas.height);
        gCtx.moveTo(0, centerY);
        gCtx.lineTo(canvas.width, centerY);
        gCtx.stroke();
    } else {
        const slices = parseInt(slicesPicker.value, 10);
        for (let i = 0; i < slices / 2; i++) {
            const rad = (2 * Math.PI / slices) * i;
            gCtx.beginPath();
            gCtx.moveTo(centerX + 450 * Math.cos(rad), centerY + 450 * Math.sin(rad));
            gCtx.lineTo(centerX - 450 * Math.cos(rad), centerY - 450 * Math.sin(rad));
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

    eCtx.fillStyle = '#1e1e1e';
    eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    eCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = 'symmetry-artwork.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
});