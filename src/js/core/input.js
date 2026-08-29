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
    // ---- TOUCH: twin-thumb support ----
    // left 45% of the canvas = virtual joystick (movement)
    // anywhere else = a tap, mirrored to the mouse so every menu works
    this.joy = null;              // {id, ox, oy, x, y}
    this.touchSeen = false;       // flips true forever once a finger lands
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      this.touchSeen = true;
      for (const t of e.changedTouches) {
        const r = canvas.getBoundingClientRect();
        const x = (t.clientX - r.left) / r.width * canvas.width;
        const y = (t.clientY - r.top) / r.height * canvas.height;
        if (this.joy === null && x < canvas.width * 0.45) {
          this.joy = { id: t.identifier, ox: x, oy: y, x, y };
        } else {
          this.mouse.x = x; this.mouse.y = y;
          this.mouse.down = true; this.mouse.justDown = true;
          this._touchTap = { id: t.identifier, x, y };
        }
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      for (const t of e.changedTouches) {
        const x = (t.clientX - r.left) / r.width * canvas.width;
        const y = (t.clientY - r.top) / r.height * canvas.height;
        if (this.joy && t.identifier === this.joy.id) { this.joy.x = x; this.joy.y = y; }
        else if (this._touchTap && t.identifier === this._touchTap.id) { this.mouse.x = x; this.mouse.y = y; }
      }
    }, { passive: false });
    const touchEnd = e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (this.joy && t.identifier === this.joy.id) this.joy = null;
        if (this._touchTap && t.identifier === this._touchTap.id) { this.mouse.down = false; this.mouse.justUp = true; this._touchTap = null; }
      }
    };
    canvas.addEventListener('touchend', touchEnd, { passive: false });
    canvas.addEventListener('touchcancel', touchEnd, { passive: false });
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
    // virtual joystick wins when a thumb is on the stick
    if (this.joy) {
      const dx = this.joy.x - this.joy.ox, dy = this.joy.y - this.joy.oy;
      const len = Math.hypot(dx, dy);
      if (len > 6) {
        const k = Math.min(1, len / 34);
        x = dx / len * k; y = dy / len * k;
      }
    }
    return { x, y };
  }
}
