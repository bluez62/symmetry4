function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        startDrawing(e);
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        draw(e);
    }
}

const canvas = document.getElementById('drawCanvas'), ctx = canvas.getContext('2d'), guideCanvas = document.getElementById('guideCanvas'), gCtx = guideCanvas.getContext('2d'), symmetryMode = document.getElementById('symmetryMode'), slicesContainer = document.getElementById('slicesContainer'), slicesPicker = document.getElementById('slicesPicker'), slicesVal = document.getElementById('slicesVal'), brushType = document.getElementById('brushType'), colorPicker = document.getElementById('colorPicker'), neonGlow = document.getElementById('neonGlow'), showGuides = document.getElementById('showGuides'), sizePicker = document.getElementById('sizePicker'), opacityPicker = document.getElementById('opacityPicker'), undoBtn = document.getElementById('undoBtn'), redoBtn = document.getElementById('redoBtn'), clearBtn = document.getElementById('clearBtn'), downloadBtn = document.getElementById('downloadBtn'); let isDrawing = !1, lastX = 0, lastY = 0, currentStrokeColor = '#00ffcc', rainbowHue = 0; const centerX = canvas.width / 2, centerY = canvas.height / 2; let undoStack = [], redoStack = []; const MAX_STATES = 20; saveState(); symmetryMode.addEventListener('change', () => { slicesContainer.style.display = 'kaleidoscope' === symmetryMode.value ? 'flex' : 'none'; drawGuidelines() }); slicesPicker.addEventListener('input', () => { slicesVal.textContent = slicesPicker.value; drawGuidelines() }); showGuides.addEventListener('change', drawGuidelines); brushType.addEventListener('change', () => { colorPicker.disabled = 'fixed' !== brushType.value }); // Existing mouse event listeners
guideCanvas.addEventListener('mousedown', startDrawing);
guideCanvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', stopDrawing);

guideCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
guideCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
window.addEventListener('touchend', stopDrawing);
window.addEventListener('touchcancel', stopDrawing);
clearBtn.addEventListener('click', () => { ctx.clearRect(0, 0, canvas.width, canvas.height); saveState() }); undoBtn.addEventListener('click', undo); redoBtn.addEventListener('click', redo); drawGuidelines(); function startDrawing(e) {
    isDrawing = !0;
    const t = guideCanvas.getBoundingClientRect();

    // 📱 Check if touch event, otherwise use mouse event
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    lastX = clientX - t.left;
    lastY = clientY - t.top;

    if ('rainbow-click' === brushType.value) {
        currentStrokeColor = `hsl(${Math.floor(360 * Math.random())}, 100%, 60%)`
    } else if ('fixed' === brushType.value) {
        currentStrokeColor = colorPicker.value
    }
}
function draw(e) {
    if (!isDrawing) return;
    const t = guideCanvas.getBoundingClientRect();

    // 📱 Check if touch event, otherwise use mouse event
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const n = clientX - t.left, o = clientY - t.top;

    if ('rainbow-cycle' === brushType.value) {
        rainbowHue = (rainbowHue + 2) % 360;
        currentStrokeColor = `hsl(${rainbowHue}, 100%, 60%)`
    }
    ctx.globalAlpha = opacityPicker.value / 100;
    ctx.strokeStyle = currentStrokeColor;
    ctx.lineWidth = sizePicker.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (neonGlow.checked) {
        ctx.shadowBlur = 1.5 * sizePicker.value;
        ctx.shadowColor = currentStrokeColor
    } else {
        ctx.shadowBlur = 0
    }
    if ('4-corner' === symmetryMode.value) {
        drawFourCorners(lastX, lastY, n, o)
    } else {
        drawKaleidoscope(lastX, lastY, n, o)
    }
    lastX = n;
    lastY = o
}
function stopDrawing() { if (isDrawing) { isDrawing = !1; saveState() } } function drawLine(e, t, n, o) { ctx.beginPath(); ctx.moveTo(e, t); ctx.lineTo(n, o); ctx.stroke() } function drawFourCorners(e, t, n, o) { drawLine(e, t, n, o); drawLine(centerX + (centerX - e), t, centerX + (centerX - n), o); drawLine(e, centerY + (centerY - t), n, centerY + (centerY - o)); drawLine(centerX + (centerX - e), centerY + (centerY - t), centerX + (centerX - n), centerY + (centerY - o)) } function drawKaleidoscope(e, t, n, o) { const r = parseInt(slicesPicker.value), a = 2 * Math.PI / r, i = e - centerX, c = t - centerY, s = n - centerX, l = o - centerY; for (let e = 0; e < r; e++) { ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(a * e); ctx.beginPath(); ctx.moveTo(i, c); ctx.lineTo(s, l); ctx.stroke(); ctx.scale(1, -1); ctx.beginPath(); ctx.moveTo(i, c); ctx.lineTo(s, l); ctx.stroke(); ctx.restore() } } function drawGuidelines() { gCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height); if (!showGuides.checked) return; gCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; gCtx.lineWidth = 1; if ('4-corner' === symmetryMode.value) { gCtx.beginPath(); gCtx.moveTo(centerX, 0); gCtx.lineTo(centerX, canvas.height); gCtx.moveTo(0, centerY); gCtx.lineTo(canvas.width, centerY); gCtx.stroke() } else { const e = parseInt(slicesPicker.value); for (let t = 0; t < e / 2; t++) { const n = 2 * Math.PI / e * t; gCtx.beginPath(); gCtx.moveTo(centerX + 450 * Math.cos(n), centerY + 450 * Math.sin(n)); gCtx.lineTo(centerX - 450 * Math.cos(n), centerY - 450 * Math.sin(n)); gCtx.stroke() } } } function saveState() { if (undoStack.length >= MAX_STATES) undoStack.shift(); undoStack.push(canvas.toDataURL()); redoStack = []; updateHistoryButtons() } function undo() { if (!(undoStack.length <= 1)) { redoStack.push(undoStack.pop()); loadState(undoStack[undoStack.length - 1]) } } function redo() { if (0 !== redoStack.length) { const e = redoStack.pop(); undoStack.push(e); loadState(e) } } function loadState(e) { const t = new Image; t.src = e; t.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.drawImage(t, 0, 0); updateHistoryButtons() } } function updateHistoryButtons() { undoBtn.disabled = undoStack.length <= 1; redoBtn.disabled = 0 === redoStack.length } downloadBtn.addEventListener('click', () => { const e = document.createElement('canvas'); e.width = canvas.width; e.height = canvas.height; const t = e.getContext('2d'); t.fillStyle = '#1e1e1e'; t.fillRect(0, 0, e.width, e.height); t.drawImage(canvas, 0, 0); const n = document.createElement('a'); n.download = 'ultimate-symmetry-artwork.png'; n.href = e.toDataURL('image/png'); n.click() });