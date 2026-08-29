// ============================================================
// HELL TRAIN — COIN SHOP (POLISHED)
// Same chunky tile language as homepage
// ============================================================
import { CFG } from '../core/config.js';
import { TAU, fmtNum } from '../core/utils.js';
import { COIN_SHOP } from '../data/progression.js';
import { CHAR_SKINS, TRAIN_SKINS } from '../data/skins.js';
import { saveSave } from '../core/save.js';

const W=270,H=480;
const INK='#241318';
const PANEL='#2b2230';
const PANEL_HI='#3d3242';
const GOLD='#ffc63c';
const RED='#e8352a';
const GREEN='#4ec53c';

function roundPath(ctx,x,y,w,h,r){ const rr=Math.max(0,Math.min(r,w/2,h/2)); ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath(); }
function clipRound(ctx,x,y,w,h,r){ roundPath(ctx,x,y,w,h,r); ctx.clip(); }
function tile(ctx,x,y,w,h,r,o={}){ const lift=o.lift??3; if(lift>0){ roundPath(ctx,x,y+lift,w,h,r); ctx.fillStyle=o.shadow||'rgba(20,8,10,0.55)'; ctx.fill(); } const g=ctx.createLinearGradient(0,y,0,y+h); g.addColorStop(0,o.fill||PANEL); g.addColorStop(1,o.fill2||o.fill||PANEL); roundPath(ctx,x,y,w,h,r); ctx.fillStyle=g; ctx.fill(); if(o.ring){ ctx.strokeStyle=o.ring; ctx.lineWidth=o.ringW||2; ctx.stroke(); } roundPath(ctx,x,y,w,h,r); ctx.strokeStyle=o.outline||INK; ctx.lineWidth=2; ctx.stroke(); ctx.save(); clipRound(ctx,x,y,w,h,r); ctx.globalAlpha=0.16; ctx.fillStyle='#ffffff'; ctx.fillRect(x,y+2,w,Math.max(2,h*0.26)); ctx.restore(); ctx.lineWidth=1; }
function label(ctx,str,x,y,color,size,align='center'){ ctx.font='bold '+size+'px monospace'; ctx.textAlign=align; ctx.fillStyle='rgba(20,8,12,0.75)'; ctx.fillText(str,x+1,y+1); ctx.fillStyle=color; ctx.fillText(str,x,y); ctx.textAlign='left'; }
function outlineText(ctx,str,cx,y,color,ink,size){ ctx.font='bold '+size+'px monospace'; ctx.textAlign='center'; ctx.fillStyle=ink; const k=size>15?2:1; for(let dx=-k;dx<=k;dx++) for(let dy=-k;dy<=k;dy++) if(dx||dy) ctx.fillText(str,cx+dx,y+dy); ctx.fillText(str,cx,y+k+1); ctx.fillStyle=color; ctx.fillText(str,cx,y); ctx.textAlign='left'; }
function lavaBackground(ctx,t,embers){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#c9341c'); g.addColorStop(0.3,'#e8511c'); g.addColorStop(0.7,'#f4761d'); g.addColorStop(1,'#ffc24a');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  for(const e of embers){ e.y-=(10+e.s*14)/60; if(e.y<-4){ e.y=H+4; e.x=Math.random()*W; } ctx.fillStyle=`rgba(255,150,50,${(0.2+e.s*0.3).toFixed(2)})`; ctx.fillRect(e.x|0,e.y|0,1,1); }
}

export class CoinShopScene {
  constructor(engine){
    this.engine=engine; this.t=0; this.tab=0; this.sel=0; this.scroll=0; this.toast=null;
    this.embers=[]; for(let i=0;i<30;i++) this.embers.push({x:Math.random()*W,y:Math.random()*H,s:0.4+Math.random()});
    this._mouse={x:W/2,y:H/2,down:false,justDown:false};
    const c=engine.canvas;
    c.addEventListener('mousemove',e=>{ const r=c.getBoundingClientRect(); this._mouse.x=(e.clientX-r.left)/r.width*W; this._mouse.y=(e.clientY-r.top)/r.height*H; });
    c.addEventListener('mousedown',e=>{ if(e.button===0){ this._mouse.down=true; this._mouse.justDown=true; }});
    c.addEventListener('mouseup',e=>{ if(e.button===0) this._mouse.down=false; });
  }
  enter(p){ this.save=p.save||this.engine.save; this.engine.setResolution?.(W,H); this.t=0; this.sel=0; this.scroll=0; this.toast=null; this.coins=this.save.coins||0; this.upgrades=this.save.coinShopUpgrades||{}; }
  exit(){ this.save.coins=this.coins; this.save.coinShopUpgrades=this.upgrades; saveSave(this.save); this.engine.resetResolution?.(); }
  hit(r){ const m=this._mouse; return m.x>=r.x&&m.x<=r.x+r.w&&m.y>=r.y&&m.y<=r.y+r.h; }
  _say(msg,color){ this.toast={msg,color,t:1.5}; }
  _buy(item){
    if(!item) return;
    if(item.kind==='skin'){
      if(this.save.ownedSkins?.[item.skin.key]) return this._say('OWNED',GREEN);
      if(this.coins < item.skin.cost) return this._say('NOT ENOUGH COINS',RED);
      this.coins-=item.skin.cost; this.save.ownedSkins=this.save.ownedSkins||{}; this.save.ownedSkins[item.skin.key]=true;
      this._say('UNLOCKED '+item.skin.label.toUpperCase(),GOLD);
    } else {
      const owned=this.upgrades[item.key]||0;
      if(item.upgrade.level <= owned) return this._say('MAXED',GREEN);
      if(item.upgrade.level !== owned+1) return this._say('BUY PREV RANK',RED);
      if(this.coins < item.upgrade.cost) return this._say('NOT ENOUGH',RED);
      this.coins-=item.upgrade.cost; this.upgrades[item.key]=item.upgrade.level;
      this._say(item.upgrade.label.toUpperCase()+' BOUGHT',GREEN);
    }
    this.save.coins=this.coins; this.save.coinShopUpgrades=this.upgrades; saveSave(this.save);
  }
  items(){
    const tabs=['character','train','skins']; const cur=tabs[this.tab];
    if(cur==='skins'){
      return [
        ...Object.values(CHAR_SKINS).map(s=>({kind:'skin',skin:{key:s.id,label:s.name,desc:s.desc,cost:s.cost||100}})),
        ...Object.values(TRAIN_SKINS).map(s=>({kind:'skin',skin:{key:s.id,label:s.name,desc:s.desc,cost:s.cost||150}})),
      ];
    }
    const out=[]; const group=COIN_SHOP[cur.toUpperCase()];
    if(!group) return out;
    for(const [cat, arr] of Object.entries(group)){
      for(const up of arr){
        out.push({kind:'upgrade',key:cat,upgrade:up,cat});
      }
    }
    return out;
  }
  update(dt){
    this.t+=dt; if(this.toast){ this.toast.t-=dt; if(this.toast.t<=0) this.toast=null; }
    const inp=this.engine.input;
    if(inp?.wasPressed?.('Escape')){ this.exit(); this.engine.setScene('menu',{save:this.save}); return; }
    if(inp?.wasPressed?.('ArrowLeft')){ this.tab=(this.tab+2)%3; this.sel=0; this.scroll=0; }
    if(inp?.wasPressed?.('ArrowRight')){ this.tab=(this.tab+1)%3; this.sel=0; this.scroll=0; }
    if(inp?.wasPressed?.('ArrowUp')) this.sel=Math.max(0,this.sel-1);
    if(inp?.wasPressed?.('ArrowDown')) this.sel=Math.min(this.items().length-1,this.sel+1);
    if(inp?.wasPressed?.('Enter')) this._buy(this.items()[this.sel]);
    const m=this._mouse;
    if(m.justDown){
      for(let i=0;i<3;i++){ const r={x:8+i*86,y:38,w:80,h:20}; if(this.hit(r)){ this.tab=i; this.sel=0; this.scroll=0; } }
      this.items().forEach((it,i)=>{
        const r={x:8,y:64+(i-this.scroll)*44,w:W-16,h:38}; if(r.y>=60&&r.y<=H-30&&this.hit(r)){ this.sel=i; this._buy(it); }
      });
      const bb={x:4,y:H-22,w:56,h:18}; if(this.hit(bb)){ this.exit(); this.engine.setScene('menu',{save:this.save}); }
    }
    const visible=Math.floor((H-100)/44);
    if(this.sel<this.scroll) this.scroll=this.sel;
    if(this.sel>=this.scroll+visible) this.scroll=this.sel-visible+1;
    this.scroll=Math.max(0,Math.min(Math.max(0,this.items().length-visible),this.scroll));
    for(const e of this.embers){ e.y-=(10+e.s*14)*dt; if(e.y<-4){ e.y=H+4; e.x=Math.random()*W; } }
    if(inp) inp.endFrame(); m.justDown=false;
  }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers);
    tile(ctx,0,0,W,30,0,{fill:'rgba(0,0,0,0.5)',outline:'rgba(0,0,0,0)',lift:0});
    outlineText(ctx,'COIN SHOP',W/2,20,'#ffd700','#5a1a08',12);
    label(ctx,fmtNum(this.coins)+' COINS',W-10,18,'#ffe878',8,'right');
    const TABS=['CHARACTER','TRAIN','SKINS'];
    TABS.forEach((name,i)=>{
      const r={x:8+i*86,y:38,w:80,h:20}; const on=i===this.tab;
      tile(ctx,r.x,r.y,r.w,r.h,7,{fill:on?'#4a3a52':'#2b2230',fill2:'#1d1622',outline:'#241318',ring:on?GOLD:null,ringW:1,lift:2});
      label(ctx,name,r.x+r.w/2,r.y+13,on?GOLD:'#c8b8c0',6);
    });
    const items=this.items();
    items.forEach((it,i)=>{
      const y=64+(i-this.scroll)*44; if(y<50||y>H-30) return;
      const r={x:8,y,w:W-16,h:38}; const selected=i===this.sel;
      tile(ctx,r.x,r.y,r.w,r.h,8,{fill:selected?'#3a2a4a':'#2b2230',fill2:'#1d1622',outline:selected?'#ffffff':'#241318',lift:selected?3:2});
      if(it.kind==='skin'){
        label(ctx,it.skin.label.toUpperCase(),r.x+10,r.y+12,'#ffffff',7,'left');
        label(ctx,it.skin.desc.slice(0,36),r.x+10,r.y+24,'#b8a8a0',5,'left');
        const owned=this.save.ownedSkins?.[it.skin.key];
        label(ctx,owned?'OWNED':it.skin.cost+'c',r.x+r.w-8,r.y+12,owned?GREEN:(this.coins>=it.skin.cost?'#ffe878':RED),6,'right');
      } else {
        label(ctx,it.upgrade.label.toUpperCase(),r.x+10,r.y+12,'#ffffff',6,'left');
        label(ctx,it.upgrade.desc.slice(0,40),r.x+10,r.y+24,'#b8a8a0',5,'left');
        const owned=this.upgrades[it.key]||0; const isMax=owned>=it.upgrade.level;
        label(ctx,isMax?'MAX':it.upgrade.cost+'c',r.x+r.w-8,r.y+12,isMax?GREEN:(this.coins>=it.upgrade.cost?'#ffe878':RED),6,'right');
      }
    });
    const bb={x:4,y:H-22,w:56,h:18}; tile(ctx,bb.x,bb.y,bb.w,bb.h,6,{fill:'#2b2230',outline:INK,lift:2}); label(ctx,'BACK',bb.x+bb.w/2,bb.y+12,'#ffffff',7);
    if(this.toast){
      const a=Math.min(1,this.toast.t*2); ctx.globalAlpha=a;
      tile(ctx,W/2-70,H-40,140,16,6,{fill:'rgba(20,10,14,0.9)',outline:this.toast.color,lift:0});
      label(ctx,this.toast.msg,W/2,H-29,this.toast.color,7); ctx.globalAlpha=1;
    }
  }
}
