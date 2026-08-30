import { CFG } from './config.js';

export class Engine {
  constructor(root) {
    this.root = root;
    this.canvas = document.createElement('canvas');
    this.canvas.width = CFG.VIEW_W; this.canvas.height = CFG.VIEW_H;
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.imageRendering = 'crisp-edges';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    root.appendChild(this.canvas);
    this.scenes = {};
    this.current = null;
    this.t = 0;
    this.last = performance.now();
    this.lastRenderTime = 0;
    this.fps = 60;
    this._error = null;
    this.onResize = () => this._fit();
    window.addEventListener('resize', this.onResize);
    requestAnimationFrame(() => this._fit());
  }
  _fit() {
    const rect = this.root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const cw = this.canvas.width, ch = this.canvas.height;
    const maxScale = Math.min(rect.width / cw, rect.height / ch);
    let scale = Math.floor(maxScale);
    if (scale < 1) scale = maxScale;
    else if (maxScale - scale > 0.92) scale += 1;
    const w = Math.round(cw * scale);
    const h = Math.round(ch * scale);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.style.imageRendering = 'pixelated';
    this.scale = scale;
  }
  setResolution(w, h) {
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this._fit();
  }
  resetResolution() { this.setResolution(CFG.VIEW_W, CFG.VIEW_H); }

  addScene(name, scene) { this.scenes[name] = scene; }
  resumeScene(scene) { if (scene) this.current = scene; }
  setScene(name, params = {}) {
    try {
      if (this.current?.exit) this.current.exit();
      this.current = this.scenes[name];
      if(!this.current){ console.error('Scene not found', name); return; }
      this.current?.enter?.(params);
      this._error = null;
    } catch(e){
      console.error('setScene error', e);
      this._error = e;
    }
  }
  start() {
    const loop = (now) => {
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > CFG.MAX_DT) dt = CFG.MAX_DT;
      this.t += dt;
      try {
        if (this.current?.update) this.current.update(dt, this.t);
      } catch(e){
        console.error('update error', e);
        this._error = e;
      }
      try {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if(this._error){
          this.ctx.fillStyle='#1a0a0a'; this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
          this.ctx.fillStyle='#ff4d4a'; this.ctx.font='bold 10px monospace'; this.ctx.textAlign='left';
          this.ctx.fillText('ERROR: '+(this._error.message||String(this._error)), 8, 20);
          const stack = (this._error.stack||'').split('\n').slice(0,8);
          this.ctx.font='6px monospace'; this.ctx.fillStyle='#c8a8a0';
          for(let i=0;i<stack.length;i++) this.ctx.fillText(stack[i].slice(0,80), 8, 32+i*8);
          this.ctx.fillStyle='#8ef0ff'; this.ctx.fillText('Press ESC to return to menu', 8, this.canvas.height-12);
          if(this.ctx && this.current && this.current.input && this.current.input.wasPressed && this.current.input.wasPressed('Escape')){
            this._error=null; this.setScene('menu',{save:this.save});
          }
        } else {
          if (this.current?.render) this.current.render(this.ctx, this.t);
        }
      } catch(e){
        console.error('render error', e);
        this._error = e;
      }
      this.lastRenderTime = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
