// ============================================================
// HELL TRAIN — THE HELL FORGE (POLISHED)
// Permanent progression, same chunky tile language as homepage
// ============================================================
import { CFG } from '../core/config.js';
import { TAU, fmtNum } from '../core/utils.js';
import { PLAYER_TRACKS, TRAIN_TRACKS, trackCost, totalSpent } from '../data/shop.js';
import { CHAR_SKINS, TRAIN_SKINS } from '../data/skins.js';
import { spendCoins, saveSave } from '../core/save.js';
import { ICONS } from '../data/icons.js';

const W = 270, H = 480;
const INK = '#241318';
const PANEL = '#2b2230';
const PANEL_HI = '#3d3242';
const GOLD = '#ffc63c';
const GOLD_D = '#c07a12';
const RED = '#e8352a';
const RED_D = '#9c1208';
const GREEN = '#4ec53c';
const GREEN_D = '#2a7a20';

function roundPath(ctx,x,y,w,h,r){ const rr=Math.max(0,Math.min(r,w/2,h/2)); ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath(); }
function clipRound(ctx,x,y,w,h,r){ roundPath(ctx,x,y,w,h,r); ctx.clip(); }
function tile(ctx,x,y,w,h,r,o={}){ const lift=o.lift??3; if(lift>0){ roundPath(ctx,x,y+lift,w,h,r); ctx.fillStyle=o.shadow||'rgba(20,8,10,0.55)'; ctx.fill(); } const g=ctx.createLinearGradient(0,y,0,y+h); g.addColorStop(0,o.fill||PANEL); g.addColorStop(1,o.fill2||o.fill||PANEL); roundPath(ctx,x,y,w,h,r); ctx.fillStyle=g; ctx.fill(); if(o.ring){ ctx.strokeStyle=o.ring; ctx.lineWidth=o.ringW||2; ctx.stroke(); } roundPath(ctx,x,y,w,h,r); ctx.strokeStyle=o.outline||INK; ctx.lineWidth=2; ctx.stroke(); ctx.save(); clipRound(ctx,x,y,w,h,r); ctx.globalAlpha=0.16; ctx.fillStyle='#ffffff'; ctx.fillRect(x,y+2,w,Math.max(2,h*0.26)); ctx.restore(); ctx.lineWidth=1; }
function label(ctx,str,x,y,color,size,align='center'){ ctx.font='bold '+size+'px monospace'; ctx.textAlign=align; ctx.fillStyle='rgba(20,8,12,0.75)'; ctx.fillText(str,x+1,y+1); ctx.fillStyle=color; ctx.fillText(str,x,y); ctx.textAlign='left'; }
function outlineText(ctx,str,cx,y,color,ink,size){ ctx.font='bold '+size+'px monospace'; ctx.textAlign='center'; ctx.fillStyle=ink; const k=size>15?2:1; for(let dx=-k;dx<=k;dx++) for(let dy=-k;dy<=k;dy++) if(dx||dy) ctx.fillText(str,cx+dx,y+dy); ctx.fillText(str,cx,y+k+1); ctx.fillStyle=color; ctx.fillText(str,cx,y); ctx.textAlign='left'; }
function icon(ctx,kind,x,y,s,color,t=0){
  ctx.save(); ctx.translate(x,y); ctx.scale(s/16,s/16); ctx.lineJoin='round';
  const R=(a,b,c,d,col)=>{ ctx.fillStyle=col||color; ctx.fillRect(a,b,c,d); };
  const ink=()=>{ ctx.strokeStyle=INK; ctx.lineWidth=1.6; ctx.stroke(); };
  ctx.fillStyle=color;
  switch(kind){
    case 'coin': ctx.beginPath(); ctx.arc(8,8,7,0,TAU); ctx.fill(); ink(); ctx.beginPath(); ctx.arc(8,8,4.4,0,TAU); ctx.fillStyle='#c07a12'; ctx.fill(); R(7,4.5,2,7,'#fff6c0'); break;
    case 'heart': ctx.beginPath(); ctx.moveTo(8,12); ctx.bezierCurveTo(8,12,2,8,2,5.5); ctx.arc(5,5.5,3,0,Math.PI); ctx.arc(11,5.5,3,0,Math.PI); ctx.bezierCurveTo(14,8,8,12,8,12); ctx.closePath(); ctx.fill(); ink(); break;
    case 'sword': R(7,2,2,10); R(4,4,8,2); ink(); break;
    case 'shield': ctx.beginPath(); ctx.moveTo(8,1.5); ctx.lineTo(14,4); ctx.lineTo(14,8.5); ctx.quadraticCurveTo(14,13,8,15); ctx.quadraticCurveTo(2,13,2,8.5); ctx.lineTo(2,4); ctx.closePath(); ctx.fill(); ink(); break;
    case 'train': R(2,6,12,6); R(4,3,8,4); ink(); break;
    default: ctx.beginPath(); ctx.arc(8,8,5,0,TAU); ctx.fill(); ink();
  }
  ctx.restore();
}
function lavaBackground(ctx,t,embers){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#c9341c'); g.addColorStop(0.3,'#e8511c'); g.addColorStop(0.7,'#f4761d'); g.addColorStop(1,'#ffc24a');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  for(const e of embers){ e.y-=(10+e.s*14)/60; e.x+=Math.sin(t*1.6+e.s*9)*0.2; if(e.y<-4){ e.y=H+4; e.x=Math.random()*W; } ctx.fillStyle=`rgba(255,150,50,${(0.2+e.s*0.3).toFixed(2)})`; ctx.fillRect(e.x|0,e.y|0,1, e.s>1?2:1); }
  const tg=ctx.createLinearGradient(0,0,0,44); tg.addColorStop(0,'rgba(60,10,10,0.45)'); tg.addColorStop(1,'rgba(60,10,10,0)'); ctx.fillStyle=tg; ctx.fillRect(0,0,W,44);
}

export class ShopScene {
  constructor(engine){
    this.engine=engine; this.t=0; this.tab=0; this.sel=0; this.scroll=0; this.toast=null;
    this.embers=[]; for(let i=0;i<30;i++) this.embers.push({x:Math.random()*W,y:Math.random()*H,s:0.4+Math.random()});
    this._mouse={x:W/2,y:H/2,down:false,justDown:false};
    const c=engine.canvas;
    c.addEventListener('mousemove',e=>{ const r=c.getBoundingClientRect(); this._mouse.x=(e.clientX-r.left)/r.width*W; this._mouse.y=(e.clientY-r.top)/r.height*H; });
    c.addEventListener('mousedown',e=>{ if(e.button===0){ this._mouse.down=true; this._mouse.justDown=true; }});
    c.addEventListener('mouseup',e=>{ if(e.button===0) this._mouse.down=false; });
  }
  enter(p){ this.save=p.save||this.engine.save; this.from=p.from||'menu'; this.engine.setResolution?.(W,H); this.t=0; this.sel=0; this.scroll=0; this.toast=null; }
  exit(){ saveSave(this.save); this.engine.resetResolution?.(); }
  items(){
    if(this.tab===0) return PLAYER_TRACKS.map(t=>({kind:'track',track:t}));
    if(this.tab===1) return TRAIN_TRACKS.map(t=>({kind:'track',track:t}));
    return [...CHAR_SKINS.map(s=>({kind:'charSkin',skin:s})), ...TRAIN_SKINS.map(s=>({kind:'trainSkin',skin:s}))];
  }
  _levelOf(track){ return (this.save.permaLevels?.[track.id])||0; }
  _owned(item){
    if(item.kind==='charSkin') return (this.save.ownedCharSkins||[]).includes(item.skin.id)||item.skin.cost===0;
    if(item.kind==='trainSkin') return (this.save.ownedTrainSkins||[]).includes(item.skin.id)||item.skin.cost===0;
    return false;
  }
  _equipped(item){
    if(item.kind==='charSkin') return this.save.charSkin===item.skin.id;
    if(item.kind==='trainSkin') return this.save.trainSkin===item.skin.id;
    return false;
  }
  _price(item){
    if(item.kind==='track'){ const l=this._levelOf(item.track); return l>=(item.track.max||10)?null:trackCost(item.track,l); }
    return this._owned(item)?null:item.skin.cost;
  }
  _buy(item){
    if(!item) return;
    const save=this.save;
    if(item.kind==='track'){
      const t=item.track; const l=this._levelOf(t);
      if(l>=(t.max||10)) return this._say('MAXED',GOLD);
      const cost=trackCost(t,l);
      if(!spendCoins(save,cost)) return this._say('NOT ENOUGH COINS',RED);
      save.permaLevels=save.permaLevels||{}; save.permaLevels[t.id]=l+1;
      this._say(t.name.toUpperCase()+' → '+(l+1),GREEN);
    } else {
      const s=item.skin; const listKey=item.kind==='charSkin'?'ownedCharSkins':'ownedTrainSkins'; const eqKey=item.kind==='charSkin'?'charSkin':'trainSkin';
      save[listKey]=save[listKey]||[];
      if(this._owned(item)){
        if(save[eqKey]===s.id) return this._say('ALREADY EQUIPPED','#9aa0b4');
        save[eqKey]=s.id; this._say('EQUIPPED '+s.name.toUpperCase(),'#8ef0ff');
      } else {
        if(!spendCoins(save,s.cost)) return this._say('NOT ENOUGH COINS',RED);
        save[listKey].push(s.id); save[eqKey]=s.id; this._say('UNLOCKED '+s.name.toUpperCase(),GOLD);
      }
    }
    saveSave(save);
  }
  _say(msg,color){ this.toast={msg,color,t:1.6}; }
  hit(r){ const m=this._mouse; return m.x>=r.x&&m.x<=r.x+r.w&&m.y>=r.y&&m.y<=r.y+r.h; }
  update(dt){
    this.t+=dt; if(this.toast){ this.toast.t-=dt; if(this.toast.t<=0) this.toast=null; }
    const inp=this.engine.input; const items=this.items();
    if(inp?.wasPressed?.('Escape')){ saveSave(this.save); this.engine.setScene(this.from,{save:this.save}); return; }
    if(inp?.wasPressed?.('ArrowLeft')){ this.tab=(this.tab+2)%3; this.sel=0; this.scroll=0; }
    if(inp?.wasPressed?.('ArrowRight')){ this.tab=(this.tab+1)%3; this.sel=0; this.scroll=0; }
    if(inp?.wasPressed?.('ArrowDown')) this.sel=Math.min(items.length-1,this.sel+1);
    if(inp?.wasPressed?.('ArrowUp')) this.sel=Math.max(0,this.sel-1);
    if(inp?.wasPressed?.('Enter')) this._buy(items[this.sel]);
    const m=this._mouse;
    if(m.justDown){
      // tabs
      for(let i=0;i<3;i++){ const r={x:8+i*86,y:38,w:80,h:20}; if(this.hit(r)){ this.tab=i; this.sel=0; this.scroll=0; } }
      // items
      items.forEach((it,i)=>{
        const r={x:8,y:64+(i-this.scroll)*44,w:W-16,h:38}; if(r.y>=60&&r.y<=H-30&&this.hit(r)){ this.sel=i; this._buy(it); }
      });
      // back
      const bb={x:4,y:H-22,w:56,h:18}; if(this.hit(bb)){ saveSave(this.save); this.engine.setScene(this.from,{save:this.save}); }
    }
    // keep visible
    const visible=Math.floor((H-100)/44);
    if(this.sel<this.scroll) this.scroll=this.sel;
    if(this.sel>=this.scroll+visible) this.scroll=this.sel-visible+1;
    this.scroll=Math.max(0,Math.min(Math.max(0,items.length-visible),this.scroll));
    for(const e of this.embers){ e.y-=(10+e.s*14)*dt; if(e.y<-4){ e.y=H+4; e.x=Math.random()*W; } }
    if(inp) inp.endFrame(); m.justDown=false;
  }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers);
    // header
    tile(ctx,0,0,W,30,0,{fill:'rgba(0,0,0,0.5)',outline:'rgba(0,0,0,0)',lift:0});
    outlineText(ctx,'THE HELL FORGE',W/2,20,'#ff8a30','#5a1a08',12);
    icon(ctx,'coin',W-70,6,18,GOLD,this.t); label(ctx,fmtNum(this.save.coins||0),W-48,18,'#ffe878',8,'left');
    label(ctx,'SPENT '+fmtNum(totalSpent(this.save)),6,18,'#6b6b80',6,'left');

    const TABS=['CONDUCTOR','TRAIN','SKINS'];
    TABS.forEach((name,i)=>{
      const r={x:8+i*86,y:38,w:80,h:20}; const on=i===this.tab;
      tile(ctx,r.x,r.y,r.w,r.h,7,{fill:on?'#4a3a52':'#2b2230',fill2:'#1d1622',outline:INK,ring:on?GOLD:null,ringW:1,lift:2});
      label(ctx,name,r.x+r.w/2,r.y+13,on?GOLD:'#c8b8c0',6);
    });

    const items=this.items();
    items.forEach((item,i)=>{
      const y=64+(i-this.scroll)*44; if(y<50||y>H-30) return;
      const r={x:8,y,w:W-16,h:38}; const selected=i===this.sel; const color=item.kind==='track'?(this.tab===0?'#ff8a30':'#8ef0ff'):(item.skin?.rarity==='legendary'?GOLD:item.skin?.rarity==='mythic'?'#ff4d6a':'#9aa0b4');
      tile(ctx,r.x,r.y,r.w,r.h,8,{fill:selected?'#3a2a4a':PANEL,fill2:'#1d1622',outline:selected?'#ffffff':INK,ring:selected?color:null,ringW:1,lift:selected?3:2});
      if(item.kind==='track'){
        label(ctx,item.track.name.toUpperCase(),r.x+10,r.y+12,'#ffffff',7,'left');
        label(ctx,item.track.desc.slice(0,38),r.x+10,r.y+24,'#b8a8a0',5,'left');
        const lvl=this._levelOf(item.track); const max=item.track.max||10;
        // pip
        for(let pi=0;pi<max;pi++){ ctx.fillStyle=pi<lvl?color:'#2a2a38'; ctx.fillRect(r.x+10+pi*7, r.y+30,5,3); }
        const price=this._price(item);
        label(ctx,price===null?'MAX':price+'c',r.x+r.w-8,r.y+12,price===null?'#ffb020':(this.save.coins>=price?'#ffe878':'#8a4a4a'),7,'right');
      } else {
        label(ctx,item.skin.name.toUpperCase(),r.x+10,r.y+12,this._equipped(item)?GREEN:'#ffffff',7,'left');
        label(ctx,item.skin.desc.slice(0,36),r.x+10,r.y+24,'#b8a8a0',5,'left');
        const owned=this._owned(item); const price=this._price(item);
        label(ctx,this._equipped(item)?'EQUIPPED':owned?'OWNED':price+'c',r.x+r.w-8,r.y+12,this._equipped(item)?GREEN:owned?'#8ef07a':(this.save.coins>=price?'#ffe878':'#ff7a6a'),6,'right');
      }
    });

    // detail
    const sel=items[this.sel];
    if(sel){
      tile(ctx,8,H-84,W-16,58,10,{fill:'#20182c',fill2:'#140e1e',outline:INK,lift:3});
      if(sel.kind==='track'){
        label(ctx,sel.track.name.toUpperCase()+' LV '+(this._levelOf(sel.track)+1)+'/'+(sel.track.max||10),14,H-70,'#ffffff',7,'left');
        label(ctx,sel.track.desc,14,H-58,'#c8b8a0',6,'left');
        label(ctx,'Next: '+sel.track.per+' '+sel.track.unit,14,H-46,'#8ef0ff',5,'left');
      } else {
        label(ctx,sel.skin.name.toUpperCase()+' — '+sel.skin.rarity.toUpperCase(),14,H-70,'#ffffff',7,'left');
        label(ctx,sel.skin.desc,14,H-58,'#c8b8a0',6,'left');
      }
    }

    const bb={x:4,y:H-22,w:56,h:18}; tile(ctx,bb.x,bb.y,bb.w,bb.h,6,{fill:'#2b2230',outline:INK,lift:2}); label(ctx,'BACK',bb.x+bb.w/2,bb.y+12,'#ffffff',7);
    if(this.toast){
      const a=Math.min(1,this.toast.t*2); ctx.globalAlpha=a;
      tile(ctx,W/2-70,H-40,140,16,6,{fill:'rgba(20,10,14,0.9)',outline:this.toast.color,lift:0});
      label(ctx,this.toast.msg,W/2,H-29,this.toast.color,7); ctx.globalAlpha=1;
    }
  }
}
const ROW_H=34;
