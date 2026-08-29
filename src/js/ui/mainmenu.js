// ============================================================
// HELL TRAIN — CHARACTER SELECT (POLISHED)
// Same chunky tile language as homepage
// ============================================================
import { CFG } from '../core/config.js';
import { TAU, fmtNum } from '../core/utils.js';
import { CHAR_SKINS } from '../data/skins.js';
import { REALMS } from '../data/realms.js';
import { saveSave } from '../core/save.js';
import { ICONS } from '../data/icons.js';

const W=270,H=480;
const INK='#241318';
const PANEL='#2b2230';
const GOLD='#ffc63c';
const GREEN='#4ec53c';
const RED='#e8352a';

function roundPath(ctx,x,y,w,h,r){ const rr=Math.max(0,Math.min(r,w/2,h/2)); ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath(); }
function clipRound(ctx,x,y,w,h,r){ roundPath(ctx,x,y,w,h,r); ctx.clip(); }
function tile(ctx,x,y,w,h,r,o={}){ const lift=o.lift??3; if(lift>0){ roundPath(ctx,x,y+lift,w,h,r); ctx.fillStyle=o.shadow||'rgba(20,8,10,0.55)'; ctx.fill(); } const g=ctx.createLinearGradient(0,y,0,y+h); g.addColorStop(0,o.fill||PANEL); g.addColorStop(1,o.fill2||o.fill||PANEL); roundPath(ctx,x,y,w,h,r); ctx.fillStyle=g; ctx.fill(); if(o.ring){ ctx.strokeStyle=o.ring; ctx.lineWidth=o.ringW||2; ctx.stroke(); } roundPath(ctx,x,y,w,h,r); ctx.strokeStyle=o.outline||INK; ctx.lineWidth=2; ctx.stroke(); ctx.save(); clipRound(ctx,x,y,w,h,r); ctx.globalAlpha=0.16; ctx.fillStyle='#ffffff'; ctx.fillRect(x,y+2,w,Math.max(2,h*0.26)); ctx.restore(); ctx.lineWidth=1; }
function label(ctx,str,x,y,color,size,align='center'){ ctx.font='bold '+size+'px monospace'; ctx.textAlign=align; ctx.fillStyle='rgba(20,8,12,0.75)'; ctx.fillText(str,x+1,y+1); ctx.fillStyle=color; ctx.fillText(str,x,y); ctx.textAlign='left'; }
function outlineText(ctx,str,cx,y,color,ink,size){ ctx.font='bold '+size+'px monospace'; ctx.textAlign='center'; ctx.fillStyle=ink; const k=size>15?2:1; for(let dx=-k;dx<=k;dx++) for(let dy=-k;dy<=k;dy++) if(dx||dy) ctx.fillText(str,cx+dx,y+dy); ctx.fillText(str,cx,y+k+1); ctx.fillStyle=color; ctx.fillText(str,cx,y); ctx.textAlign='left'; }
function lavaBackground(ctx,t,embers){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#c9341c'); g.addColorStop(0.3,'#e8511c'); g.addColorStop(0.7,'#f4761d'); g.addColorStop(1,'#ffc24a');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  for(const e of embers){ e.y-=(10+e.s*14)/60; if(e.y<-4){ e.y=H+4; e.x=Math.random()*W; } ctx.fillStyle=`rgba(255,150,50,${(0.2+e.s*0.3).toFixed(2)})`; ctx.fillRect(e.x|0,e.y|0,1,1); }
  const tg=ctx.createLinearGradient(0,0,0,44); tg.addColorStop(0,'rgba(60,10,10,0.45)'); tg.addColorStop(1,'rgba(60,10,10,0)'); ctx.fillStyle=tg; ctx.fillRect(0,0,W,44);
}

export class MainMenuScene {
  constructor(engine){
    this.engine=engine; this.t=0; this.selChar=0; this.selRealm=0;
    this.embers=[]; for(let i=0;i<30;i++) this.embers.push({x:Math.random()*W,y:Math.random()*H,s:0.4+Math.random()});
    this._mouse={x:W/2,y:H/2,down:false,justDown:false};
    const c=engine.canvas;
    c.addEventListener('mousemove',e=>{ const r=c.getBoundingClientRect(); this._mouse.x=(e.clientX-r.left)/r.width*W; this._mouse.y=(e.clientY-r.top)/r.height*H; });
    c.addEventListener('mousedown',e=>{ if(e.button===0){ this._mouse.down=true; this._mouse.justDown=true; }});
    c.addEventListener('mouseup',e=>{ if(e.button===0) this._mouse.down=false; });
  }
  enter(p){
    this.save=p.save||this.engine.save; this.engine.setResolution?.(W,H);
    this.chars=CHAR_SKINS.map(sk=>({id:sk.id,name:sk.name,desc:sk.desc,color:sk.pal?.glow||'#ff8a30',unlocked:sk.cost===0||(this.save.ownedCharSkins||[]).includes(sk.id)}));
    const unlocked=this.save.unlockedRealms||['purgatory'];
    this.realms=REALMS.map(r=>({id:r.id,name:r.name,desc:r.desc,color:r.accent,unlocked:unlocked.includes(r.id),tier:r.tier}));
    const ci=this.chars.findIndex(c=>c.id===this.save.charSkin); if(ci>=0) this.selChar=ci;
    this.selRealm=Math.max(0,this.realms.findIndex(r=>r.unlocked));
    this.t=0;
  }
  exit(){ saveSave(this.save); this.engine.resetResolution?.(); }
  hit(r){ const m=this._mouse; return m.x>=r.x&&m.x<=r.x+r.w&&m.y>=r.y&&m.y<=r.y+r.h; }
  update(dt){
    this.t+=dt; const m=this._mouse; const inp=this.engine.input;
    if(inp?.wasPressed?.('Escape')){ this.engine.setScene('menu',{save:this.save}); return; }
    if(inp?.wasPressed?.('ArrowLeft')) this.selChar=(this.selChar-1+this.chars.length)%this.chars.length;
    if(inp?.wasPressed?.('ArrowRight')) this.selChar=(this.selChar+1)%this.chars.length;
    if(inp?.wasPressed?.('ArrowUp')) this.selRealm=Math.max(0,this.selRealm-1);
    if(inp?.wasPressed?.('ArrowDown')) this.selRealm=Math.min(this.realms.length-1,this.selRealm+1);
    if(inp?.wasPressed?.('Enter')){
      const realm=this.realms[this.selRealm]; const chr=this.chars[this.selChar];
      if(realm.unlocked&&chr.unlocked){ this.save.charSkin=chr.id; saveSave(this.save); this.engine.setScene('gameplay',{save:this.save,realmId:realm.id,stage:1,difficulty:this.engine._difficulty||'normal'}); }
    }
    if(m.justDown){
      // back
      if(this.hit({x:4,y:6,w:52,h:20})){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; }
      // char grid
      this.chars.forEach((c,i)=>{
        const r={x:8+(i%2)*130,y:44+Math.floor(i/2)*48,w:124,h:42}; if(this.hit(r)) this.selChar=i;
      });
      // realm list
      this.realms.forEach((r,i)=>{
        const rect={x:8,y:200+i*32,w:W-16,h:26}; if(this.hit(rect)) this.selRealm=i;
      });
      // start button
      if(this.hit({x:W/2-70,y:H-40,w:140,h:32})){
        const realm=this.realms[this.selRealm]; const chr=this.chars[this.selChar];
        if(realm?.unlocked&&chr?.unlocked){ this.save.charSkin=chr.id; saveSave(this.save); this.engine.setScene('gameplay',{save:this.save,realmId:realm.id,stage:1,difficulty:this.engine._difficulty||'normal'}); }
      }
    }
    if(inp) inp.endFrame(); m.justDown=false;
  }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers);
    // back
    tile(ctx,4,6,52,20,8,{fill:'#2b2230',fill2:'#1d1622',outline:INK,lift:2}); label(ctx,'BACK',30,19,'#ffffff',7);
    outlineText(ctx,'SELECT CREW',W/2,28,'#ffffff','#5a1a08',14);
    // chars
    label(ctx,'CONDUCTORS — tap to pick',W/2,40,'#ffe9c0',6);
    this.chars.forEach((c,i)=>{
      const r={x:8+(i%2)*130,y:44+Math.floor(i/2)*48,w:124,h:42}; const active=i===this.selChar; const owned=c.unlocked;
      tile(ctx,r.x,r.y,r.w,r.h,8,{fill:active?'#3a2a4a':owned?PANEL:'#1a1420',fill2:'#1d1622',outline:active?'#ffffff':INK,ring:active?c.color:null,ringW:2,lift:active?3:2});
      label(ctx,c.name.toUpperCase(),r.x+8,r.y+14,owned?'#ffffff':'#6a5a5a',6,'left');
      label(ctx,c.desc.slice(0,22),r.x+8,r.y+26,'#b8a8a0',5,'left');
      label(ctx,owned?'READY':'LOCKED',r.x+8,r.y+36,owned?GREEN:RED,5,'left');
      if(!owned) label(ctx,'🔒',r.x+r.w-12,r.y+14,'#ff7a6a',10);
    });
    // realms
    label(ctx,'REALMS — sector time = 120+(sector-1)*60s',W/2,188,'#8ef0ff',6);
    this.realms.forEach((realm,i)=>{
      const r={x:8,y:200+i*32,w:W-16,h:26}; const active=i===this.selRealm; const unlock=realm.unlocked;
      tile(ctx,r.x,r.y,r.w,r.h,7,{fill:active?'#4a3a52':unlock?PANEL:'#1a1420',fill2:'#1d1622',outline:INK,ring:active?realm.color:null,ringW:1,lift:2});
      label(ctx,(i+1)+'. '+realm.name.toUpperCase(),r.x+8,r.y+10,unlock?'#ffffff':'#6a5a6a',6,'left');
      label(ctx,unlock?'S'+realm.tier+' '+(120+(i)*60)+'s':'LOCKED',r.x+r.w-8,r.y+10,unlock?'#8ef0ff':RED,5,'right');
      label(ctx,realm.desc.slice(0,34),r.x+8,r.y+20,'#7a6a5a',4,'left');
    });
    const start={x:W/2-70,y:H-40,w:140,h:32}; const hov=this.hit(start);
    tile(ctx,start.x,start.y,start.w,start.h,10,{fill:hov?'#ff7a3a':'#ff5a3a',fill2:'#9c1208',outline:INK,ring:GOLD,ringW:2,lift:3});
    label(ctx,'START SECTOR',W/2,start.y+20,'#ffffff',9);
    label(ctx,'Caps: 10 upgrades (5 ATK/CHAR +5 PASSIVE)',W/2,H-8,'#ffe9c0',5);
  }
}
