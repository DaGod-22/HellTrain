// ============================================================
// HELL TRAIN — input layer
// ============================================================
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressed = new Set();
    this.justReleased = new Set();
    this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0, down: false, justDown: false, justUp: false };
    window.addEventListener('keydown', e => {
      const k = e.code;
      if (!this.keys.has(k)) this.justPressed.add(k);
      this.keys.add(k);
      // prevent scroll
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this.keys.delete(e.code);
      this.justReleased.add(e.code);
    });
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) / r.width * canvas.width;
      this.mouse.y = (e.clientY - r.top) / r.height * canvas.height;
    });
    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) { this.mouse.down = true; this.mouse.justDown = true; }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) { this.mouse.down = false; this.mouse.justUp = true; }
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }
  endFrame() { this.justPressed.clear(); this.justReleased.clear(); this.mouse.justDown = false; this.mouse.justUp = false; }
  isDown(code) { return this.keys.has(code); }
  wasPressed(code) { return this.justPressed.has(code); }
  axis() {
    let x = 0, y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    return { x, y };
  }
}
