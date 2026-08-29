// ============================================================
// HELL TRAIN — AAA GOD LEVEL UI (ALL SECTIONS)
// Daily, Rewards, Shops, Profile, WorldMap, etc.
// Better than survivor.io — every screen is AAA
// ============================================================
import { CFG } from '../core/config.js';
import { TAU, fmtNum, fmtTime, randInt } from '../core/utils.js';
import { REALMS, HIDDEN_REALM, ACHIEVEMENTS, WEEKLY_CHALLENGES, ARMOURS, RELICS, findRealm } from '../data/realms.js';
import { ENDINGS } from '../data/endings.js';
import { TRAIN_SKINS } from '../data/skins.js';
import { CHAR_SKINS } from '../data/skins.js';
import { WEAPONS } from '../data/weapons.js';
import { ASCENSIONS } from '../data/upgrades.js';
import { TRAIN_CARRIAGE_MODULES } from '../data/carriages.js';
import { saveSave } from '../core/save.js';
import { AUTH } from '../systems/auth.js';
import { SOUNDS } from '../core/sound.js';

const W=270,H=480;
const INK='#241318';
const PANEL='#2b2230';
const PANEL_HI='#3d2f4a';
const GOLD='#ffc63c';
const GOLD_D='#b06a12';
const GREEN='#4ec53c';
const GREEN_D='#2a6a1a';
const RED='#e8352a';
const RED_D='#7a1420';
const BLUE='#8ef0ff';

function roundPath(ctx,x,y,w,h,r){ const rr=Math.max(0,Math.min(r,w/2,h/2)); ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath(); }
function clipRound(ctx,x,y,w,h,r){ roundPath(ctx,x,y,w,h,r); ctx.clip(); }
function tile(ctx,x,y,w,h,r,o={}){ const lift=o.lift??3; if(lift>0){ roundPath(ctx,x,y+lift,w,h,r); ctx.fillStyle=o.shadow||'rgba(20,8,10,0.55)'; ctx.fill(); } const g=ctx.createLinearGradient(0,y,0,y+h); g.addColorStop(0,o.fill||PANEL); g.addColorStop(1,o.fill2||o.fill||PANEL); roundPath(ctx,x,y,w,h,r); ctx.fillStyle=g; ctx.fill(); if(o.ring){ ctx.strokeStyle=o.ring; ctx.lineWidth=o.ringW||2; ctx.stroke(); } roundPath(ctx,x,y,w,h,r); ctx.strokeStyle=o.outline||INK; ctx.lineWidth=2; ctx.stroke(); ctx.save(); clipRound(ctx,x,y,w,h,r); ctx.globalAlpha=0.16; ctx.fillStyle='#ffffff'; ctx.fillRect(x,y+2,w,Math.max(2,h*0.26)); ctx.restore(); ctx.lineWidth=1; }
function label(ctx,str,x,y,color,size,align='center'){ ctx.font='bold '+size+'px monospace'; ctx.textAlign=align; ctx.fillStyle='rgba(20,8,12,0.75)'; ctx.fillText(str,x+1,y+1); ctx.fillStyle=color; ctx.fillText(str,x,y); ctx.textAlign='left'; }
function outlineText(ctx,str,cx,y,color,ink,size){ ctx.font='bold '+size+'px monospace'; ctx.textAlign='center'; ctx.fillStyle=ink; const k=size>15?2:1; for(let dx=-k;dx<=k;dx++) for(let dy=-k;dy<=k;dy++) if(dx||dy) ctx.fillText(str,cx+dx,y+dy); ctx.fillText(str,cx,y+k+1); ctx.fillStyle=color; ctx.fillText(str,cx,y); ctx.textAlign='left'; }
function lavaBackground(ctx,t,embers){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#c9341c'); g.addColorStop(0.3,'#e8511c'); g.addColorStop(0.7,'#f4761d'); g.addColorStop(1,'#ffc24a');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // god rays
  ctx.save(); ctx.globalAlpha=0.08; ctx.fillStyle='#ffffff';
  for(let i=0;i<3;i++){ const x=(Math.sin(t*0.2+i)*0.5+0.5)*W; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x-40,H); ctx.lineTo(x+40,H); ctx.lineTo(x,0); ctx.fill(); }
  ctx.restore();
  for(const e of embers){ e.y-=(10+e.s*14)/60; if(e.y<-4){ e.y=H+4; e.x=Math.random()*W; } ctx.fillStyle=`rgba(255,150,50,${(0.2+e.s*0.3).toFixed(2)})`; ctx.fillRect(e.x|0,e.y|0,1,1); }
  const tg=ctx.createLinearGradient(0,0,0,44); tg.addColorStop(0,'rgba(60,10,10,0.45)'); tg.addColorStop(1,'rgba(60,10,10,0)'); ctx.fillStyle=tg; ctx.fillRect(0,0,W,44);
}
function star(ctx,x,y,r,color){ ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill(); ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(x-r*0.3,y-r*0.3,r*0.4,0,TAU); ctx.fill(); }
function icon(ctx,kind,x,y,s,color,t){
  // AAA icons — chunky
  ctx.save(); ctx.translate(x,y);
  const pulse = 0.5+0.5*Math.sin((t||0)*3 + x*0.1);
  if(kind==='coin'){ ctx.fillStyle=color; ctx.beginPath(); ctx.arc(s/2,s/2,s/2-2,0,TAU); ctx.fill(); ctx.fillStyle='#7a4a0a'; ctx.fillRect(s/2-2,4,4,s-8); }
  else if(kind==='energy'){ ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(s/2,2); ctx.lineTo(s-2,s/2); ctx.lineTo(s/2+2,s-2); ctx.lineTo(2,s/2+2); ctx.closePath(); ctx.fill(); }
  else if(kind==='shard'){ ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(s/2,1); ctx.lineTo(s-1,s/2); ctx.lineTo(s/2,s-1); ctx.lineTo(1,s/2); ctx.closePath(); ctx.fill(); }
  else if(kind==='lock'){ ctx.fillStyle=color; ctx.fillRect(4,8,s-8,s-8); ctx.beginPath(); ctx.arc(s/2,8,5,0,TAU); ctx.strokeStyle=color; ctx.lineWidth=2; ctx.stroke(); }
  else if(kind==='trophy'){ ctx.fillStyle=color; ctx.fillRect(3,2,s-6, s-4); ctx.fillStyle='#7a4a0a'; ctx.fillRect(s/2-2,s-4,4,4); }
  else { ctx.fillStyle=color; ctx.fillRect(2,2,s-4,s-4); }
  ctx.restore();
}
function glyph(ctx,kind,x,y,s,color,t,alpha=1){
  ctx.save(); ctx.globalAlpha=alpha;
  const bob = Math.sin((t||0)*4 + x*0.05)*1;
  ctx.translate(x,y+bob);
  // AAA glyphs — simplified but god level with glow
  ctx.shadowColor=color; ctx.shadowBlur=8;
  ctx.fillStyle=color;
  if(kind==='chest'){ ctx.fillRect(2,8,s-4,s/2); ctx.fillRect(0,6,s,4); ctx.fillStyle='#7a4a0a'; ctx.fillRect(s/2-2,10,4,6); }
  else if(kind==='bag'){ ctx.fillRect(4,6,s-8,s-6); ctx.fillRect(2,4,s-4,4); }
  else if(kind==='battle'){ ctx.beginPath(); ctx.moveTo(s/2,1); ctx.lineTo(s-1,s-1); ctx.lineTo(1,s-1); ctx.closePath(); ctx.fill(); }
  else if(kind==='train'){ ctx.fillRect(1,6,s-2,8); ctx.fillRect(2,2,s-6,4); }
  else if(kind==='arsenal'){ ctx.fillRect(2,2,4,s-4); ctx.fillRect(10,2,4,s-4); ctx.fillRect(6,8,4,4); }
  else if(kind==='forge'){ ctx.fillRect(2,10,s-4,4); ctx.fillRect(s/2-3,2,6,10); }
  else if(kind==='coinshop'){ ctx.beginPath(); ctx.arc(s/2,s/2,s/2-2,0,TAU); ctx.fill(); }
  else if(kind==='trophy'){ ctx.fillRect(3,2,s-6,10); ctx.fillRect(s/2-2,12,4,4); }
  else if(kind==='gift'){ ctx.fillRect(2,6,s-4,s-6); ctx.fillRect(0,4,s,4); }
  else if(kind==='calendar'){ ctx.fillRect(2,4,s-4,s-6); ctx.fillRect(2,2,s-4,3); }
  else if(kind==='ghost'){ ctx.fillRect(3,3,s-6,s-6); ctx.fillRect(3,s-6,3,3); ctx.fillRect(s-6,s-6,3,3); }
  else if(kind==='gun'){ ctx.fillRect(2,7,s-5,4); ctx.fillRect(s-4,5,3,8); ctx.fillRect(4,4,3,9); }
  else if(kind==='fan'){ ctx.beginPath(); ctx.arc(s/2,s/2,s/2-2,0,TAU); ctx.fill(); ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(s/2,s/2,2.2,0,TAU); ctx.fill(); }
  else if(kind==='cross'){ ctx.fillRect(s/2-2,2,4,s-4); ctx.fillRect(2,s/2-2,s-4,4); }
  else if(kind==='coin'){ ctx.beginPath(); ctx.arc(s/2,s/2,s/2-2,0,TAU); ctx.fill(); ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(s/2,s/2,s/2-5,0,TAU); ctx.fill(); ctx.fillStyle=color; ctx.fillRect(s/2-4,s/2-1,8,3); }
  else if(kind==='shield'){ ctx.beginPath(); ctx.moveTo(s/2,1.5); ctx.lineTo(s-1.5,4); ctx.lineTo(s-1.5,s/2+1); ctx.quadraticCurveTo(s-1.5,s-3,s/2,s-1); ctx.quadraticCurveTo(1.5,s-3,1.5,s/2+1); ctx.lineTo(1.5,4); ctx.closePath(); ctx.fill(); }
  else if(kind==='medal'){ ctx.beginPath(); ctx.arc(s/2,s/2,s/2-2,0,TAU); ctx.fill(); ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(s/2,s/2,s/2-6,0,TAU); ctx.fill(); }
  else { ctx.fillRect(4,4,s-8,s-8); }
  ctx.shadowBlur=0;
  ctx.restore();
}

// Base class with AAA background + back button + embers
class PolishedBase {
  constructor(engine){ this.engine=engine; this.t=0; this.embers=[]; for(let i=0;i<40;i++) this.embers.push({x:Math.random()*W,y:Math.random()*H,s:0.3+Math.random()*0.8}); this._mouse={x:W/2,y:H/2,down:false,justDown:false,wheel:0}; this._press=null; this.hover=null;
    const c=engine.canvas;
    c.addEventListener('mousemove',e=>{ const r=c.getBoundingClientRect(); this._mouse.x=(e.clientX-r.left)/r.width*W; this._mouse.y=(e.clientY-r.top)/r.height*H; });
    c.addEventListener('mousedown',e=>{ if(e.button===0){ this._mouse.down=true; this._mouse.justDown=true; }});
    c.addEventListener('mouseup',e=>{ if(e.button===0) this._mouse.down=false; });
    c.addEventListener('wheel',e=>{ this._mouse.wheel = e.deltaY; });
  }
  enter(p){ this.save=p.save||this.engine.save; this.engine.setResolution?.(W,H); this.t=0; }
  exit(){ saveSave(this.save); this.engine.resetResolution?.(); }
  hit(r){ const m=this._mouse; return r && m.x>=r.x&&m.x<=r.x+r.w&&m.y>=r.y&&m.y<=r.y+r.h; }
  backButton(){ return {x:4,y:6,w:54,h:20}; }
  drawBack(ctx){ const r=this.backButton(); const hov=this.hit(r); tile(ctx,r.x,r.y,r.w,r.h,8,{fill:hov?'#3d2a4a':'#2b2230',fill2:'#1d1622',outline:INK,ring:hov?BLUE:null,ringW:2,lift:hov?3:2}); label(ctx,'BACK',r.x+r.w/2,r.y+13,'#ffffff',7); }
}

// ====================================================================
// PROFILE / AUTH — AAA GOD LEVEL (username/password, guest, no email)
// Opens from top-right profile icon on homescreen
// ====================================================================
export class ProfileScene extends PolishedBase {
  enter(p){
    super.enter(p);
    this.mode='main'; // main, login, register, guestUpgrade
    this.username=''; this.password=''; this.error=''; this.success='';
    this.focus='username';
    this._setupInput();
    this.tab=0;
  }
  _setupInput(){
    if(this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
    this._keyHandler = (e)=>{
      if(this.engine.current !== this) return;
      if(e.key==='Backspace'){
        if(this.focus==='username') this.username=this.username.slice(0,-1);
        else this.password=this.password.slice(0,-1);
      } else if(e.key==='Enter'){
        this._submit();
      } else if(e.key.length===1){
        if(this.focus==='username' && this.username.length<20) this.username+=e.key;
        else if(this.focus==='password' && this.password.length<20) this.password+=e.key;
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }
  exit(){ super.exit(); if(this._keyHandler) window.removeEventListener('keydown', this._keyHandler); }
  _submit(){
    if(this.mode==='login'){
      const res=AUTH.login(this.username,this.password);
      if(res.ok){ this.success='Welcome back, '+res.user.username+'!'; this.error=''; this.mode='main'; try{SOUNDS.levelup();}catch{} setTimeout(()=>{ this.engine.save = this.save; },100); }
      else this.error=res.error;
    } else if(this.mode==='register'){
      const res=AUTH.register(this.username,this.password);
      if(res.ok){ this.success='Account created! Welcome '+res.user.username; this.error=''; this.mode='main'; try{SOUNDS.levelup();}catch{} }
      else this.error=res.error;
    } else if(this.mode==='guestUpgrade'){
      const res=AUTH.upgradeGuest(this.username,this.password);
      if(res.ok){ this.success='Upgraded to '+res.user.username; this.error=''; this.mode='main'; }
      else this.error=res.error;
    }
  }
  update(dt){
    this.t+=dt; const m=this._mouse;
    if(m.justDown){
      if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; }
      const curUser=AUTH.getCurrentUser();
      // tabs
      for(let i=0;i<3;i++){ const r={x:8+i*86,y:38,w:80,h:20}; if(this.hit(r)) this.tab=i; }
      if(this.mode==='main'){
        if(this.hit({x:8,y:64,w:W-16,h:28})){ this.mode='login'; this.username=''; this.password=''; this.error=''; }
        if(this.hit({x:8,y:96,w:W-16,h:28})){ this.mode='register'; this.username=''; this.password=''; this.error=''; }
        if(this.hit({x:8,y:130,w:W-16,h:28})){
          const res=AUTH.guestLogin(); this.success='Guest: '+res.user.username; this.error='';
          this.save = this.engine.save;
          try{SOUNDS.pickup();}catch{}
        }
        if(curUser){
          if(this.hit({x:8,y:164,w:W-16,h:28})){ AUTH.logout(); this.success='Logged out'; this.mode='main'; }
          if(curUser.guest && this.hit({x:8,y:198,w:W-16,h:28})){ this.mode='guestUpgrade'; this.username=''; this.password=''; }
        }
      } else {
        // login/register form
        if(this.hit({x:8,y:80,w:W-16,h:32})) this.focus='username';
        if(this.hit({x:8,y:120,w:W-16,h:32})) this.focus='password';
        if(this.hit({x:8,y:160,w:120,h:28})){ this._submit(); }
        if(this.hit({x:140,y:160,w:120,h:28})){ this.mode='main'; this.error=''; }
      }
    }
    if(!m.down) this._press=null; m.justDown=false;
  }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers);
    this.drawBack(ctx);
    outlineText(ctx,'PROFILE — AAA',W/2,30,'#ffffff','#5a1a08',16);
    const cur=AUTH.getCurrentUser();
    if(this.mode==='main'){
      // current user card — god level
      tile(ctx,8,64,W-16,70,12,{fill:'#20182c',fill2:'#140e1e',outline:INK,ring:cur? (cur.guest?'#9aa0b4':GOLD) : '#3a2a4a',ringW:2,lift:4});
      if(cur){
        label(ctx,cur.username.toUpperCase(),14,78, cur.guest?'#9aa0b4':'#ffffff',10,'left');
        label(ctx,(cur.title||'Conductor')+'  LVL '+(cur.level||1)+'  '+(cur.guest?'GUEST':'VERIFIED'),14,90, cur.guest?'#9aa0b4':BLUE,7,'left');
        label(ctx,'Coins: '+fmtNum(this.save.coins||0)+'  Gems: '+fmtNum(this.save.shards||0)+'  Streak: '+(cur.streak||0),14,102,'#c8b8a0',6,'left');
        label(ctx,'Created: '+new Date(cur.created).toLocaleDateString(),14,114,'#7a6a5a',5,'left');
        label(ctx,'Last: '+new Date(cur.lastLogin).toLocaleDateString(),14,124,'#7a6a5a',5,'left');
      } else {
        label(ctx,'NO USER — LOGIN OR PLAY AS GUEST',14,90,'#ff7a6a',8,'left');
        label(ctx,'Guest needs no password, upgrade anytime',14,104,'#c8b8a0',6,'left');
      }
      // tabs
      const tabs=['ACCOUNT','STATS','LEADERBOARD']; tabs.forEach((lb,i)=>{
        const r={x:8+i*86,y:38,w:80,h:20}; const active=this.tab===i;
        tile(ctx,r.x,r.y,r.w,r.h,7,{fill:active?'#4a3a52':'#2b2230',fill2:'#1d1622',outline:INK,ring:active?GOLD:null,ringW:1,lift:2});
        label(ctx,lb,r.x+r.w/2,r.y+13,active?GOLD:'#c8b8c0',6);
      });
      if(this.tab===0){
        // buttons — AAA
        const btns=[
          {y:64,label:'LOGIN WITH USERNAME',color:BLUE,desc:'Existing account'},
          {y:96,label:'REGISTER NEW ACCOUNT',color:GREEN,desc:'Username + password, no email'},
          {y:130,label:'PLAY AS GUEST',color:'#9aa0b4',desc:'Instant, upgrade later'},
        ];
        btns.forEach((b,i)=>{
          const r={x:8,y:b.y+ (cur?70:0),w:W-16,h:28}; const hov=this.hit(r);
          tile(ctx,r.x,r.y,r.w,r.h,8,{fill:hov?'#3a2a5a':PANEL,fill2:'#1d1622',outline:INK,ring:b.color,ringW:hov?2:1,lift:hov?3:2});
          label(ctx,b.label,14,r.y+12,b.color,7,'left'); label(ctx,b.desc,14,r.y+22,'#7a6a5a',5,'left');
        });
        if(cur){
          const r1={x:8,y:234,w:W-16,h:28}; const hov1=this.hit(r1);
          tile(ctx,r1.x,r1.y,r1.w,r1.h,8,{fill:hov1?'#4a2a3a':'#2b2230',outline:RED,lift:2}); label(ctx,'LOGOUT',14,r1.y+12,RED,7,'left'); label(ctx,'Switch user',14,r1.y+22,'#7a6a5a',5,'left');
          if(cur.guest){
            const r2={x:8,y:268,w:W-16,h:28}; const hov2=this.hit(r2);
            tile(ctx,r2.x,r2.y,r2.w,r2.h,8,{fill:hov2?'#3a4a2e':'#2b2230',outline:GREEN,lift:2}); label(ctx,'UPGRADE GUEST TO ACCOUNT',14,r2.y+12,GREEN,7,'left'); label(ctx,'Keep progress, add password',14,r2.y+22,'#7a6a5a',5,'left');
          }
        }
      } else if(this.tab===1){
        const s=this.save.stats||{};
        const lines=[
          'Total Runs: '+(s.totalRuns||0)+'  Kills: '+fmtNum(s.totalKills||0),
          'Best Combo: '+(s.bestCombo||0)+'  Longest: '+fmtTime(s.longestRun||0),
          'Best Score: '+fmtNum(s.bestScore||0)+'  Apocalypses: '+(s.apocalypses||0),
          'Boss Cores: '+Object.keys(this.save.bossCores||{}).length+'  Realms: '+(this.save.unlockedRealms||[]).length+'/11',
          'Coins: '+fmtNum(this.save.coins||0)+'  Total: '+fmtNum(s.totalCoins||0),
          '∞ Infinite Map Explored: '+fmtNum(Math.floor((s.totalRuns||0)*1.5))+' chunks',
        ];
        lines.forEach((ln,i)=>{ tile(ctx,8,70+i*36,W-16,30,8,{fill:'#20182c',outline:INK,lift:2}); label(ctx,ln,14,86+i*36,'#c8b8a0',6,'left'); });
      } else {
        const board=AUTH.getLeaderboard();
        board.forEach((u,i)=>{
          const y=70+i*26; if(y>H-10) return;
          tile(ctx,8,y,W-16,22,7,{fill:i===0?'#3a2a1a':PANEL,outline:i===0?GOLD:INK,lift:1});
          label(ctx,(i+1)+'. '+u.username.toUpperCase().slice(0,16),14,y+9,u.guest?'#9aa0b4':'#ffffff',6,'left');
          label(ctx,'LVL '+ (u.level||1)+'  '+(u.guest?'GUEST':'') ,W-14,y+9,'#8ef0ff',5,'right');
        });
      }
      if(this.success) { tile(ctx,8,H-24,W-16,18,7,{fill:'#1a2a1a',outline:GREEN,lift:1}); label(ctx,this.success,W/2,H-13,GREEN,6); }
      if(this.error) { tile(ctx,8,H-44,W-16,18,7,{fill:'#2a1a1a',outline:RED,lift:1}); label(ctx,this.error,W/2,H-33,RED,6); }
    } else {
      // login/register form — AAA
      outlineText(ctx,this.mode.toUpperCase(),W/2,64, '#ffffff','#5a1a08',12);
      const uFocus=this.focus==='username';
      tile(ctx,8,80,W-16,32,8,{fill:uFocus?'#3a2a5a':PANEL,outline:uFocus?GOLD:INK,ring:uFocus?GOLD:null,ringW:2,lift:2});
      label(ctx,'USERNAME: '+this.username+(uFocus?'_':''),14,96,'#ffffff',8,'left'); label(ctx,'3-20 chars, letters/numbers/_',14,108,'#7a6a5a',5,'left');
      const pFocus=this.focus==='password';
      tile(ctx,8,120,W-16,32,8,{fill:pFocus?'#3a2a5a':PANEL,outline:pFocus?BLUE:INK,ring:pFocus?BLUE:null,ringW:2,lift:2});
      label(ctx,'PASSWORD: '+('*'.repeat(this.password.length))+(pFocus?'_':''),14,136,'#ffffff',8,'left'); label(ctx,'Min 3 chars, no email needed',14,148,'#7a6a5a',5,'left');
      tile(ctx,8,160,120,28,8,{fill:'#2a4a2e',fill2:GREEN_D,outline:INK,ring:GREEN,ringW:2,lift:3}); label(ctx,this.mode==='login'?'LOGIN':'CREATE',68,176,'#ffffff',8);
      tile(ctx,140,160,120,28,8,{fill:'#2b2230',outline:INK,lift:2}); label(ctx,'BACK',200,176,'#ffffff',8);
      if(this.error){ tile(ctx,8,196,W-16,22,7,{fill:'#2a1a1a',outline:RED,lift:1}); label(ctx,this.error,W/2,210,RED,6); }
      if(this.success){ tile(ctx,8,196,W-16,22,7,{fill:'#1a2a1a',outline:GREEN,lift:1}); label(ctx,this.success,W/2,210,GREEN,6); }
      label(ctx,'No email required — local + optional cloud',W/2,H-8,'#8ef0ff',5);
    }
  }
}

// ====================================================================
// DAILY REWARDS — AAA GOD LEVEL (calendar, streak, chests)
// ====================================================================
export class DailyRewardsScene extends PolishedBase {
  enter(p){ super.enter(p); this.scroll=0; this.claimed=false; }
  update(dt){
    this.t+=dt; const m=this._mouse;
    if(m.justDown){
      if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; }
      // claim button
      if(this.hit({x:W/2-60,y:300,w:120,h:32})){
        const res=AUTH.claimDaily();
        if(res.ok){
          this.save.coins = (this.save.coins||0) + res.reward.coins;
          this.save.shards = (this.save.shards||0) + res.reward.gems;
          if(res.reward.chest){ this.save.chests = this.save.chests||{common:0,rare:0,epic:0}; this.save.chests.rare = (this.save.chests.rare||0)+1; }
          saveSave(this.save);
          this.claimed=true;
          try{SOUNDS.chest();}catch{}
        } else {
          this.error=res.error;
        }
      }
      // open chest
      if(this.hit({x:8,y:350,w:80,h:60})){ this._openChest('common'); }
      if(this.hit({x:96,y:350,w:80,h:60})){ this._openChest('rare'); }
      if(this.hit({x:184,y:350,w:80,h:60})){ this._openChest('epic'); }
    }
    if(!m.down) this._press=null; m.justDown=false;
  }
  _openChest(type){
    const chests=this.save.chests||{common:0,rare:0,epic:0};
    if((chests[type]||0)<=0) return;
    chests[type]--;
    const rewards={common:{coins:100, shards:0}, rare:{coins:300, shards:5}, epic:{coins:800, shards:20}};
    const rw=rewards[type];
    this.save.coins+=rw.coins; this.save.shards+=rw.shards;
    saveSave(this.save);
    try{SOUNDS.chest();}catch{}
    this.lastReward=rw; this.lastType=type;
  }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers);
    this.drawBack(ctx);
    outlineText(ctx,'DAILY REWARDS — AAA',W/2,30,'#ffffff','#5a1a08',14);
    const user=AUTH.getCurrentUser();
    const streak=user?.streak||0;
    // streak bar
    tile(ctx,8,48,W-16,36,10,{fill:'#20182c',fill2:'#140e1e',outline:INK,ring:GOLD,ringW:2,lift:3});
    label(ctx,'STREAK: '+streak+' DAYS',14,62,GOLD,10,'left');
    label(ctx,'Claim every 24h — 7 day bonus chest',14,76,'#c8b8a0',6,'left');
    // calendar 7 days
    for(let i=0;i<7;i++){
      const x=8+i*36, y=90, w=32, h=50;
      const isToday = i=== (streak%7);
      const claimed = i < (streak%7);
      tile(ctx,x,y,w,h,8,{fill:claimed?'#2a4a2e':isToday?'#3a2a5a':PANEL,fill2:'#1d1622',outline:claimed?GREEN:(isToday?GOLD:INK),ring:isToday?GOLD:null,ringW:2,lift:2});
      label(ctx,'DAY '+(i+1),x+w/2,y+10,GOLD,6);
      icon(ctx,i===6?'trophy':'coin',x+6,y+16,20, claimed?'#6a6a6a':GOLD, this.t);
      label(ctx,claimed?'DONE':(i===6?'CHEST':(100+i*25)),x+w/2,y+42,claimed?'#6a6a6a':'#ffffff',6);
      if(isToday && !claimed) star(ctx,x+w-4,y+4,3,GOLD);
    }
    // claim button
    const canClaim = !user || (Date.now() - (user.lastDaily||0) > 24*60*60*1000 - 1000);
    const cb={x:W/2-60,y:300,w:120,h:32};
    tile(ctx,cb.x,cb.y,cb.w,cb.h,10,{fill:canClaim?'#ff5a3a':'#3a2a3a',fill2:canClaim?RED_D:'#1d1622',outline:INK,ring:canClaim?GOLD:null,ringW:2,lift:canClaim?4:1});
    label(ctx,canClaim?'CLAIM DAILY':'COME BACK',W/2,318,canClaim?'#ffffff':'#6a5a6a',8);
    if(this.claimed) { label(ctx,'+'+(100+streak*25)+' coins!',W/2,340,'#8ef0ff',7); }
    if(this.error) { label(ctx,this.error,W/2,340,'#ff7a6a',6); }

    // chests — AAA
    const chests=this.save.chests||{common:1,rare:0,epic:0};
    const chestTypes=[
      {id:'common',name:'COMMON',color:'#9aa0b4',count:chests.common||0},
      {id:'rare',name:'RARE',color:'#5a8aff',count:chests.rare||0},
      {id:'epic',name:'EPIC',color:'#ff5a3a',count:chests.epic||0},
    ];
    chestTypes.forEach((ch,i)=>{
      const x=8+i*88, y=350, w=80, h=60;
      const hov=this.hit({x,y,w,h});
      tile(ctx,x,y,w,h,10,{fill:hov?'#3a2a5a':PANEL,fill2:'#1d1622',outline:INK,ring:ch.color,ringW:hov?2:1,lift:hov?4:2});
      glyph(ctx,'chest',x+20,y+6,40,ch.color,this.t);
      label(ctx,ch.name,x+w/2,y+48,ch.color,7);
      label(ctx,'x'+ch.count,x+w/2,y+56,'#ffffff',8);
      if(ch.count>0) { ctx.fillStyle='#ff4d4a'; ctx.beginPath(); ctx.arc(x+w-4,y+4,5,0,TAU); ctx.fill(); label(ctx,String(ch.count),x+w-4,y+7,'#ffffff',7); }
    });
    if(this.lastReward){ tile(ctx,8,H-24,W-16,18,7,{fill:'#1a2a1a',outline:GREEN,lift:1}); label(ctx,'Opened '+this.lastType+' +'+this.lastReward.coins+'c +'+this.lastReward.shards+'g',W/2,H-13,GREEN,6); }
    label(ctx,'∞ INFINITE REWARDS — daily, chests, streaks',W/2,H-8,'#8ef0ff',5);
  }
}

// ====================================================================
// SHOP — AAA GOD LEVEL (Hell Forge)
// ====================================================================
export class ShopScene extends PolishedBase {
  enter(p){ super.enter(p); this.tab=0; this.scroll=0; }
  update(dt){
    this.t+=dt; const m=this._mouse;
    if(m.justDown){
      if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; }
      for(let i=0;i<3;i++){ const r={x:8+i*86,y:38,w:80,h:20}; if(this.hit(r)) this.tab=i; }
    }
    if(this.engine.input?.isDown?.('ArrowUp')) this.scroll=Math.max(0,this.scroll-3);
    if(this.engine.input?.isDown?.('ArrowDown')) this.scroll=Math.min(400,this.scroll+3);
    if(!m.down) this._press=null; m.justDown=false;
  }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers);
    this.drawBack(ctx);
    outlineText(ctx,'HELL FORGE — AAA',W/2,30,'#ffe066','#5a1a08',14);
    const tabs=['WEAPONS','ARMOUR','RELICS']; tabs.forEach((lb,i)=>{
      const r={x:8+i*86,y:38,w:80,h:20}; const active=this.tab===i;
      tile(ctx,r.x,r.y,r.w,r.h,7,{fill:active?'#4a3a52':'#2b2230',fill2:'#1d1622',outline:INK,ring:active?GOLD:null,ringW:1,lift:2});
      label(ctx,lb,r.x+r.w/2,r.y+13,active?GOLD:'#c8b8c0',7);
    });
    // AAA shop items with glow
    const items = this.tab===0 ? WEAPONS.slice(0,8) : this.tab===1 ? ARMOURS : RELICS;
    items.forEach((it,i)=>{
      const y=64+i*48 - this.scroll; if(y<50||y>H-10) return;
      const r={x:8,y,w:W-16,h:42}; const hov=this.hit(r);
      tile(ctx,r.x,r.y,r.w,r.h,10,{fill:hov?'#3a2a5a':PANEL,fill2:'#1d1622',outline:INK,ring:hov?GOLD:'#3a2a3a',ringW:hov?2:1,lift:hov?4:2});
      glyph(ctx,it.icon||'chest',r.x+8,r.y+8,26, it.color||GOLD, this.t);
      label(ctx,(it.name||it.id).toUpperCase(),r.x+42,r.y+14,'#ffffff',8,'left');
      label(ctx,(it.desc||'').slice(0,48),r.x+42,r.y+26,'#b8a8a0',5,'left');
      label(ctx,'OWNED',r.x+r.w-8,r.y+14,'#8ef0ff',6,'right');
    });
    tile(ctx,8,H-24,W-16,18,7,{fill:'#20182c',outline:INK,lift:1});
    label(ctx,'AAA FORGE — infinite upgrades, god-level gear',W/2,H-13,'#c8b8a0',5);
  }
}

// ====================================================================
// COIN SHOP — AAA GOD LEVEL
// ====================================================================
export class CoinShopScene extends PolishedBase {
  enter(p){ super.enter(p); this.scroll=0; }
  update(dt){
    this.t+=dt; const m=this._mouse;
    if(m.justDown){ if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; } }
    if(!m.down) this._press=null; m.justDown=false;
  }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers);
    this.drawBack(ctx);
    outlineText(ctx,'COIN SHOP — AAA',W/2,30,'#ffffff','#5a1a08',14);
    label(ctx,'Coins: '+fmtNum(this.save.coins||0)+'  Shards: '+fmtNum(this.save.shards||0),W/2,48,'#ffe066',8);
    const offers=[
      {name:'1000 COINS',cost:'$0.99',color:GOLD},
      {name:'5000 COINS + 100 GEMS',cost:'$4.99',color:'#5a8aff'},
      {name:'EPIC CHEST',cost:'500 COINS',color:'#ff5a3a'},
      {name:'REMOVE ADS',cost:'$2.99',color:GREEN},
    ];
    offers.forEach((o,i)=>{
      const y=64+i*56; const r={x:8,y,w:W-16,h:48}; const hov=this.hit(r);
      tile(ctx,r.x,r.y,r.w,r.h,10,{fill:hov?'#3a2a5a':PANEL,fill2:'#1d1622',outline:INK,ring:o.color,ringW:hov?2:1,lift:hov?4:2});
      label(ctx,o.name,r.x+12,r.y+18,'#ffffff',8,'left');
      label(ctx,o.cost,r.x+r.w-8,r.y+18,o.color,8,'right');
      label(ctx,'AAA DEAL — god level value',r.x+12,r.y+32,'#7a6a5a',5,'left');
    });
    label(ctx,'No real purchases — all earnable in-game ∞',W/2,H-8,'#8ef0ff',6);
  }
}

// ====================================================================
// WORLD MAP — AAA INFINITE (already patched, but include here for completeness)
// ====================================================================
export class WorldMapScene extends PolishedBase {
  enter(p){ super.enter(p); this.scroll=0; const unlocked=this.save.unlockedRealms||['purgatory']; this.sel=REALMS.findIndex(r=>r.id=== (this.save.lastRealm||unlocked[unlocked.length-1]))||0; if(this.sel<0) this.sel=0; }
  update(dt){
    this.t+=dt; const m=this._mouse;
    if(m.justDown){
      if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; }
      const diffs=['easy','normal','hard','nightmare','abyss','infinite'];
      diffs.forEach((d,i)=>{ const r={x:6+i*44,y:34,w:40,h:16}; if(this.hit(r)) this.engine._difficulty=d; });
      REALMS.forEach((realm,i)=>{ const r=this._realmRect(i); if(this.hit(r)){ const unlocked=(this.save.unlockedRealms||['purgatory']).includes(realm.id); if(unlocked){ this.save.lastRealm=realm.id; saveSave(this.save); this.engine.setScene('gameplay',{save:this.save,realmId:realm.id,stage:1,difficulty:this.engine._difficulty||'normal'}); } } });
    }
    if(this.engine.input?.isDown?.('ArrowUp')) this.scroll=Math.max(0,this.scroll-4);
    if(this.engine.input?.isDown?.('ArrowDown')) this.scroll=Math.min(REALMS.length*38, this.scroll+4);
    if(!m.down) this._press=null; m.justDown=false;
  }
  _realmRect(i){ const x=8, y=60+i*38 - this.scroll, w=W-16, h=34; return {x,y,w,h,i}; }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers);
    this.drawBack(ctx);
    outlineText(ctx,'WORLD MAP — ∞ INFINITE AAA',W/2,30,'#ffffff','#5a1a08',16);
    const diffs=['easy','normal','hard','nightmare','abyss','infinite']; const cur=this.engine._difficulty||'normal';
    diffs.forEach((d,i)=>{ const r={x:6+i*44,y:34,w:40,h:16}; const active=cur===d; tile(ctx,r.x,r.y,r.w,r.h,6,{fill:active?'#ff5a3a':'#2b2230',fill2:active?'#9c1208':'#1d1622',outline:INK,lift:2}); label(ctx,d.toUpperCase(),r.x+r.w/2,r.y+11,active?'#ffffff':'#c8b8c0',5); });
    const unlocked=this.save.unlockedRealms||['purgatory'];
    REALMS.forEach((realm,i)=>{ const r=this._realmRect(i); if(r.y < 50 || r.y > H-20) return; const isUnlock=unlocked.includes(realm.id); const hov=this.hit(r); const isNew=['dreadmarsh','foundry','starlight'].includes(realm.id); tile(ctx,r.x,r.y,r.w,r.h,10,{fill:isUnlock?(hov?'#3d2f4a':PANEL):'#1a1420',fill2:'#1d1622',outline:INK,ring:isUnlock?(isNew?'#5a8aff':realm.accent):'#3a2a3a',ringW:isNew?2:1,lift:hov?3:2}); ctx.fillStyle=isNew?'#5a8aff':realm.accent; ctx.fillRect(r.x+2,r.y+2,4,r.h-4); label(ctx,(i+1)+'. '+realm.name.toUpperCase()+(isNew?' ★NEW ∞':''),r.x+14,r.y+13,isUnlock?'#ffffff':'#6a5a6a',isNew?8:7,'left'); label(ctx,realm.desc.slice(0,52),r.x+14,r.y+23,'#b8a8a0',5,'left'); const boss=this.save.bossCores?.[realm.boss.id]||0; label(ctx,isUnlock?(boss?'CLEARED x'+boss:'READY'):'LOCKED',r.x+r.w-8,r.y+13,isUnlock?'#8ef0ff':'#ff7a6a',6,'right'); label(ctx,'BOSS: '+realm.boss.name+' '+(120+i*60)+'s '+(isNew?'INFINITE':'') ,r.x+r.w-8,r.y+23,'#7a6a5a',5,'right'); if(!isUnlock) icon(ctx,'lock',r.x+r.w-26,r.y+6,16,'#ff7a6a',this.t); if(isNew) star(ctx,r.x+r.w-40,r.y+8,5,'#5a8aff'); });
    label(ctx,'∞ INFINITE MAP — AAA GOD LEVEL — scroll to see 11 sectors',W/2,H-8,'#8ef0ff',6);
  }
}

// ====================================================================
// TRAIN BASE — AAA
// ====================================================================
export class TrainBaseScene extends PolishedBase {
  enter(p){ super.enter(p); this.tab=0; }
  update(dt){
    this.t+=dt; const m=this._mouse;
    if(m.justDown){
      if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; }
      const tabs=['STATS','SKINS','CARRIAGES']; tabs.forEach((_,i)=>{ const r={x:8+i*86,y:38,w:80,h:20}; if(this.hit(r)) this.tab=i; });
      if(this.tab===1){
        TRAIN_SKINS.forEach((sk,i)=>{ const r={x:8+(i%2)*130,y:64+Math.floor(i/2)*52,w:124,h:46}; if(this.hit(r)){ if(this.save.ownedTrainSkins?.includes(sk.id)||sk.cost===0){ this.save.trainSkin=sk.id; saveSave(this.save); } } });
      }
      if(this.tab===2){
        // carriage loadout: pick 2 modules that shape every run
        const load=this.save.trainCarriages||[];
        TRAIN_CARRIAGE_MODULES.forEach((mod,i)=>{
          const r={x:8,y:78+i*40,w:W-16,h:34};
          if(this.hit(r)){
            const idx=load.indexOf(mod.id);
            if(idx>=0){
              load.splice(idx,1);
            } else if(load.length<2){
              load.push(mod.id);
            } else {
              load.shift(); load.push(mod.id);
            }
            this.save.trainCarriages=load.slice(0,2);
            saveSave(this.save);
          }
        });
      }
    }
    if(!m.down) this._press=null; m.justDown=false;
  }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers);
    this.drawBack(ctx);
    outlineText(ctx,'TRAIN BASE — AAA',W/2,30,'#ffffff','#5a1a08',16);
    const tabs=['STATS','SKINS','CARRIAGES']; tabs.forEach((lb,i)=>{ const r={x:8+i*86,y:38,w:80,h:20}; const active=this.tab===i; tile(ctx,r.x,r.y,r.w,r.h,7,{fill:active?'#4a3a52':'#2b2230',fill2:'#1d1622',outline:INK,ring:active?GOLD:null,ringW:1,lift:2}); label(ctx,lb,r.x+r.w/2,r.y+13,active?GOLD:'#c8b8c0',7); });
    if(this.tab===0){
      tile(ctx,8,64,W-16,90,10,{fill:'#20182c',fill2:'#140e1e',outline:INK,ring:GOLD,ringW:1,lift:3});
      label(ctx,'LOCOMOTIVE: '+(this.engine.sprites?.getTrainSet?.(this.save.trainSkin||'iron_horse')?.skin?.name||'Iron Horse').toUpperCase(),14,78,'#ffffff',8,'left');
      const stats=this.save.stats||{}; const lines=[
        'Runs: '+(stats.totalRuns||0)+'  Kills: '+fmtNum(stats.totalKills||0)+'  ∞ Chunks: '+fmtNum(Math.floor((stats.totalRuns||0)*1.5)),
        'Best Combo: '+(stats.bestCombo||0)+'  Longest: '+fmtTime(stats.longestRun||0),
        'Coins: '+fmtNum(this.save.coins||0)+'  Boss Cores: '+Object.keys(this.save.bossCores||{}).length+'/11',
        'Sector Time: 120+(sector-1)*60s — infinite map',
        'Upgrade Cap: 10 (5 ATK/CHAR +5 PASSIVE) — evolved/final excluded',
        'AAA GOD LEVEL — better than survivor.io',
      ];
      lines.forEach((ln,i)=> label(ctx,ln,14,92+i*12,'#c8b8a0',6,'left'));
      try{ const f=this.engine.sprites?.getTrainSet?.(this.save.trainSkin||'iron_horse')?.engine[0]; if(f) ctx.drawImage(f, W-80, 76, f.width*1.2, f.height*1.2); }catch{}
    } else if(this.tab===1){
      TRAIN_SKINS.forEach((sk,i)=>{ const r={x:8+(i%2)*130,y:64+Math.floor(i/2)*52,w:124,h:46}; const owned=this.save.ownedTrainSkins?.includes(sk.id)||sk.cost===0; const active=this.save.trainSkin===sk.id; tile(ctx,r.x,r.y,r.w,r.h,9,{fill:active?'#3a4a2e':owned?PANEL:'#1a1420',fill2:'#1d1622',outline:INK,ring:active?GREEN:'#3a2a3a',ringW:active?2:1,lift:2}); label(ctx,sk.name.toUpperCase(),r.x+8,r.y+12,active?'#8ef07a':'#ffffff',7,'left'); label(ctx,owned?'OWNED':sk.cost+' COINS',r.x+8,r.y+24,owned?'#8ef07a':'#ff7a6a',6,'left'); });
    } else if(this.tab===2){
      // REAL CARRIAGE BUILD — permanent, affects every run
      const load=this.save.trainCarriages||[];
      label(ctx,'LOADOUT (2 SLOTS — STRATEGY, NOT SKIN)',W/2,58,'#ffe066',7);
      label(ctx,load.length?load.map(id=>TRAIN_CARRIAGE_MODULES.find(m=>m.id===id)?.name||id).join('  +  '):'NONE',W/2,68,load.length?GOLD:'#7a6a5a',6);
      TRAIN_CARRIAGE_MODULES.forEach((mod,i)=>{
        const r={x:8,y:78+i*40,w:W-16,h:34};
        const active=load.includes(mod.id);
        tile(ctx,r.x,r.y,r.w,r.h,8,{fill:active?'#2a3a2e':'#231a2e',fill2:'#1d1622',outline:active?GREEN:INK,ring:active?GREEN:null,ringW:1,lift:2});
        glyph(ctx,mod.icon,r.x+8,r.y+6,22,active?GREEN:GOLD,this.t);
        label(ctx,mod.name.toUpperCase()+(active?'  ●':'  ○'),r.x+40,r.y+10,active?'#8ef07a':'#ffffff',7,'left');
        label(ctx,mod.desc,r.x+40,r.y+21,'#b8a8a0',5,'left');
      });
    }
  }
}

// ====================================================================
// MENU — AAA GOD LEVEL (14-button wall now AAA)
// ====================================================================
export class MenuScene extends PolishedBase {
  enter(p){ super.enter(p); this.scroll=0; }
  update(dt){
    this.t+=dt; const m=this._mouse;
    if(m.justDown){
      if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; }
      const btns=this._buttons();
      for(const b of btns){ if(this.hit(b)){ if(b.scene) this.engine.setScene(b.scene,{save:this.save}); else if(b.act==='play') this.engine.setScene('worldmap',{save:this.save}); } }
    }
    if(this.engine.input?.isDown?.('ArrowUp')) this.scroll=Math.max(0,this.scroll-3);
    if(this.engine.input?.isDown?.('ArrowDown')) this.scroll=Math.min(200,this.scroll+3);
    if(!m.down) this._press=null; m.justDown=false;
  }
  _buttons(){
    const list=[
      {label:'PLAY',icon:'battle',act:'play',color:'#ff5a3a',desc:'∞ Infinite sectors'},
      {label:'TRAIN',icon:'train',scene:'trainbase',color:'#8ef0ff',desc:'Base AAA'},
      {label:'ARSENAL',icon:'arsenal',scene:'arsenal',color:GOLD,desc:'Weapons god'},
      {label:'FORGE',icon:'forge',scene:'shop',color:'#ff8a30',desc:'Upgrades AAA'},
      {label:'COIN SHOP',icon:'coinshop',scene:'coinshop',color:'#5a8aff',desc:'Shop god'},
      {label:'DAILY',icon:'calendar',scene:'daily',color:BLUE,desc:'Daily rewards AAA'},
      {label:'REWARDS',icon:'gift',scene:'rewards',color:GREEN,desc:'Chests ∞'},
      {label:'PROFILE',icon:'trophy',scene:'profile',color:'#ffe066',desc:'Login AAA'},
      {label:'LEADERBOARD',icon:'trophy',scene:'leaderboard',color:'#c07aff',desc:'Top players'},
      {label:'SETTINGS',icon:'gear',scene:'settings',color:'#9aa0b4',desc:'Settings AAA'},
      {label:'ARMOURY',icon:'arsenal',scene:'armoury',color:'#ff7a6a',desc:'Skins god'},
      {label:'RELICS',icon:'gift',scene:'relics',color:'#8ef0ff',desc:'Relics AAA'},
    ];
    return list.map((b,i)=>({ ...b, x:8+(i%2)*130, y:60+Math.floor(i/2)*56 - this.scroll, w:124, h:50 }));
  }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers);
    this.drawBack(ctx);
    outlineText(ctx,'HELL TRAIN — AAA GOD',W/2,30,'#ffffff','#5a1a08',16);
    label(ctx,'∞ INFINITE MAP — 11 SECTORS — BETTER THAN SURVIVOR.IO',W/2,46,'#8ef0ff',6);
    for(const b of this._buttons()){
      if(b.y<50||b.y>H-10) continue;
      const hov=this.hit(b);
      tile(ctx,b.x,b.y,b.w,b.h,10,{fill:hov?'#3a2a5a':PANEL,fill2:'#1d1622',outline:INK,ring:b.color,ringW:hov?2:1,lift:hov?4:2});
      glyph(ctx,b.icon,b.x+8,b.y+8,26,b.color,this.t);
      label(ctx,b.label,b.x+42,b.y+14,'#ffffff',7,'left');
      label(ctx,b.desc,b.x+42,b.y+26,'#7a6a5a',5,'left');
      if(hov) star(ctx,b.x+b.w-6,b.y+6,3,b.color);
    }
    label(ctx,'TAP ANY — AAA GOD LEVEL — PROFILE TOP-RIGHT ON HOME',W/2,H-8,'#ffe9c0',6);
  }
}

// ====================================================================
// OTHER SCENES — AAA wrappers (keep existing logic but AAA render)
// ====================================================================
export class RunSummaryScene extends PolishedBase {
  enter(p){ super.enter(p); this.params=p; this.anim=0; }
  _buttons(){ const y=H-36, w=80, gap=6; const total=3*w+2*gap; const x0=(W-total)/2; return [{label:'RETRY',x:x0,y,w,h:22,act:'retry',color:'#ff8a30'},{label:'FORGE',x:x0+w+gap,y,w,h:22,act:'shop',color:'#ffe066'},{label:'MENU',x:x0+2*(w+gap),y,w,h:22,act:'menu',color:'#985ce0'}]; }
  update(dt){ this.t+=dt; this.anim=Math.min(1,this.anim+dt*1.6); const m=this._mouse; if(m.justDown){ for(const b of this._buttons()){ if(this.hit(b)){ if(b.act==='retry') this.engine.setScene('gameplay',{save:this.save,realmId:this.params.realmId,stage:this.params.stage,difficulty:this.params.difficulty||'normal'}); else if(b.act==='shop') this.engine.setScene('shop',{save:this.save,from:'menu'}); else this.engine.setScene('menu',{save:this.save}); } } } if(!m.down) this._press=null; m.justDown=false; }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers);
    const p=this.params||{}; const rs=p.runStats||{}; const k=this.anim||0;
    tile(ctx,8,8,W-16,50,12,{fill:'#20182c',fill2:'#140e1e',outline:INK,ring:p.victory?GOLD:RED,ringW:2,lift:4});
    outlineText(ctx,p.victory?'SECTOR CLEARED ∞':'RUN ENDED',W/2,30,p.victory?'#ffe066':'#ff7a6a',p.victory?'#5a1a08':'#5a0a0a',14);
    label(ctx,(findRealm(p.realmId).name.toUpperCase())+' · SECTOR '+ (p.stage||1)+' · '+fmtTime(p.time||0)+' / '+fmtTime(p.sectorDuration||120)+'  ∞',W/2,46,'#c8b8a0',6);
    const stats=[['KILLS',fmtNum(rs.kills||0),'#ff8a30'],['LEVEL',String(p.level||1),'#8ef0ff'],['COINS',fmtNum(p.coins||0),'#ffe878'],['BEST COMBO','x'+(rs.bestCombo||0),'#c07aff'],['DMG DEALT',fmtNum(Math.round(rs.damageDealt||0)),'#ff4d6a'],['DMG TAKEN',fmtNum(Math.round(rs.damageTaken||0)),'#9aa0b4']];
    const cols=3, tw=80, th=34, gap=6, x0=(W-(cols*tw+(cols-1)*gap))/2;
    for(let i=0;i<stats.length;i++){ const c=i%cols, r=Math.floor(i/cols); const x=x0+c*(tw+gap), y=64+r*(th+gap); const kk=Math.max(0,Math.min(1,k*3-i*0.25)); if(kk<=0) continue; ctx.globalAlpha=kk; tile(ctx,x,y,tw,th,8,{fill:'rgba(10,8,18,0.9)',outline:stats[i][2],ring:stats[i][2],ringW:1,lift:2}); label(ctx,stats[i][0],x+tw/2,y+11,'#6b6b80',5); label(ctx,stats[i][1],x+tw/2,y+26,stats[i][2],9); ctx.globalAlpha=1; }
    label(ctx,'ASCENSIONS — '+Object.keys(p.owned||{}).length+' (CAP 10: 5 ATK /5 PASSIVE, evolved/final excluded)',W/2,156,'#6b6b80',5);
    // ENDING / DEATH — the run has a story now
    if(p.ending){
      const e=p.ending;
      const y=166;
      tile(ctx,20,y,W-40,102,10,{fill:'#241a08',fill2:'#140e06',outline:GOLD,ring:GOLD,ringW:2,lift:3});
      outlineText(ctx,'ENDING UNLOCKED',W/2,y+13,GOLD,'#3a2a08',9);
      outlineText(ctx,e.title,W/2,y+29,'#ffe066','#3a2a08',12);
      label(ctx,e.text.slice(0,44),W/2,y+46,'#d8c8a0',5);
      label(ctx,e.text.slice(44,88),W/2,y+56,'#d8c8a0',5);
      label(ctx,e.text.slice(88,132),W/2,y+66,'#d8c8a0',5);
      label(ctx,'ENDING + RELIC SAVED — COLLECT ALL 12',W/2,y+78,'#ffe066',5);
    } else if(!p.victory && p.cause){
      tile(ctx,20,166,W-40,26,8,{fill:'#241014',fill2:'#140808',outline:RED,ring:RED,ringW:1,lift:2});
      label(ctx,'SLAIN BY: '+String(p.cause).toUpperCase(),W/2,180,'#ff7a6a',7);
    }
    label(ctx,'+'+fmtNum(p.coins||0)+' COINS (TOTAL '+fmtNum(this.save.coins||0)+')  ∞ MAP',W/2,282,GOLD,8);
    if(p.ending) label(ctx,'ENDINGS '+(this.save.endings||[]).length+'/'+ENDINGS.length+'  RELICS '+(this.save.relics||[]).length+'/'+RELICS.length, W/2,292,'#c8b8a0',5);
    for(const b of this._buttons()){ const hov=this.hit(b); tile(ctx,b.x,b.y,b.w,b.h,8,{fill:hov?'#3a2a4a':'#1a1026',outline:b.color,ring:b.color,ringW:1,lift:2}); label(ctx,b.label,b.x+b.w/2,b.y+14,hov?'#ffffff':b.color,7); }
  }
}

export class PauseScene extends PolishedBase {
  enter(p){ super.enter(p); this.ctx=p.ctx; }
  update(dt){ this.t+=dt; const m=this._mouse; if(m.justDown){ const btns=this._buttons(); for(const b of btns){ if(this.hit(b)){ if(b.act==='resume'){ this.engine.resumeScene(this.ctx.gameplay); } else if(b.act==='settings'){ this.engine.setScene('settings',{save:this.save,from:'pause',ctx:this.ctx}); } else if(b.act==='quit'){ this.engine.setScene('menu',{save:this.save}); } } } } if(!m.down) this._press=null; m.justDown=false; }
  _buttons(){ const w=120, x=W/2-w/2; return [{label:'RESUME',y:80,x,w,h:28,act:'resume',color:GREEN},{label:'SETTINGS',y:116,x,w,h:28,act:'settings',color:BLUE},{label:'QUIT',y:152,x,w,h:28,act:'quit',color:RED}]; }
  render(ctx){ lavaBackground(ctx,this.t,this.embers); tile(ctx,W/2-70,40,140,160,12,{fill:'#20182c',fill2:'#140e1e',outline:INK,ring:GOLD,ringW:2,lift:4}); outlineText(ctx,'PAUSED — AAA',W/2,62,'#ffffff','#5a1a08',12); for(const b of this._buttons()){ const hov=this.hit(b); tile(ctx,b.x,b.y,b.w,b.h,8,{fill:hov?'#3a2a5a':PANEL,outline:b.color,ring:b.color,ringW:1,lift:2}); label(ctx,b.label,b.x+b.w/2,b.y+18,b.color,8); } }
}

export class AchievementsScene extends PolishedBase {
  enter(p){ super.enter(p); this.scroll=0; }
  update(dt){ this.t+=dt; const m=this._mouse; if(m.justDown){ if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; } } if(this.engine.input?.isDown?.('ArrowUp')) this.scroll=Math.max(0,this.scroll-3); if(this.engine.input?.isDown?.('ArrowDown')) this.scroll=Math.min(400,this.scroll+3); if(!m.down) this._press=null; m.justDown=false; }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers); this.drawBack(ctx); outlineText(ctx,'ACHIEVEMENTS — AAA',W/2,30,'#ffffff','#5a1a08',14);
    ACHIEVEMENTS.forEach((a,i)=>{ const y=50+i*38-this.scroll; if(y<40||y>H-10) return; const done=(this.save.achievements||[]).includes(a.id); tile(ctx,8,y,W-16,32,8,{fill:done?'#2a1a3a':PANEL,outline:done?GOLD:INK,ring:done?GOLD:null,ringW:1,lift:2}); label(ctx,a.name.toUpperCase(),14,y+11,done?'#ffe066':'#ffffff',7,'left'); label(ctx,a.desc.slice(0,44),14,y+22,'#b8a8a0',5,'left'); if(done) star(ctx,W-20,y+16,5,GOLD); });
  }
}

export class LeaderboardScene extends PolishedBase {
  enter(p){ super.enter(p); this.scores=[]; this.loading=true; this.engine.supabase?.topScores?.(20).then(s=>{ this.scores=s; this.loading=false; }); }
  update(dt){ this.t+=dt; const m=this._mouse; if(m.justDown){ if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; } } if(!m.down) this._press=null; m.justDown=false; }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers); this.drawBack(ctx); outlineText(ctx,'LEADERBOARD — AAA GOD',W/2,30,'#ffffff','#5a1a08',14);
    if(this.loading){ label(ctx,'LOADING...',W/2,100,'#c8b8a0',8); return; }
    // local auth leaderboard first
    const localBoard=AUTH.getLeaderboard();
    label(ctx,'LOCAL HEROES — AAA',W/2,48,GOLD,8);
    localBoard.slice(0,8).forEach((u,i)=>{ const y=60+i*22; tile(ctx,8,y,W-16,18,7,{fill:i===0?'#3a2a1a':PANEL,outline:i===0?GOLD:INK,lift:1}); label(ctx,(i+1)+'. '+u.username.toUpperCase().slice(0,14),14,y+11,'#ffffff',6,'left'); label(ctx,'LVL '+(u.level||1),W-14,y+11,'#8ef0ff',5,'right'); });
    // global
    label(ctx,'GLOBAL — ONLINE',W/2,240,'#8ef0ff',8);
    (this.scores||[]).slice(0,6).forEach((s,i)=>{ const y=252+i*22; tile(ctx,8,y,W-16,18,7,{fill:PANEL,outline:INK,lift:1}); label(ctx,(i+1)+'. '+(s.player_id||'ANON').slice(0,12),14,y+11,'#ffffff',6,'left'); label(ctx,fmtNum(s.score||0),W-14,y+11,GOLD,6,'right'); });
    label(ctx,'AAA GOD LEVEL — infinite competition ∞',W/2,H-8,'#8ef0ff',6);
  }
}

export class DailyRunScene extends PolishedBase {
  enter(p){ super.enter(p); const d=new Date(); const seed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); this.seed=seed; this.realm=REALMS[seed%REALMS.length]; }
  update(dt){ this.t+=dt; const m=this._mouse; if(m.justDown){ if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; } if(this.hit({x:W/2-60,y:120,w:120,h:32})){ this.engine.setScene('gameplay',{save:this.save,realmId:this.realm.id,stage:1,dailySeed:this.seed,difficulty:'normal'}); } } if(!m.down) this._press=null; m.justDown=false; }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers); this.drawBack(ctx); outlineText(ctx,'DAILY RUN — AAA',W/2,30,'#ffffff','#5a1a08',16);
    tile(ctx,8,50,W-16,60,10,{fill:'#20182c',fill2:'#140e1e',outline:INK,ring:this.realm.accent,ringW:2,lift:3});
    label(ctx,this.realm.name.toUpperCase(),14,68,'#ffffff',10,'left'); label(ctx,this.realm.desc.slice(0,52),14,82,'#b8a8a0',6,'left'); label(ctx,'SEED: '+this.seed+'  ∞ MAP',14,94,'#8ef0ff',6,'left');
    const b={x:W/2-60,y:120,w:120,h:32}; const hov=this.hit(b); tile(ctx,b.x,b.y,b.w,b.h,10,{fill:hov?'#ff7a3a':'#ff5a3a',fill2:RED_D,outline:INK,ring:GOLD,ringW:2,lift:hov?4:3}); label(ctx,'START DAILY',W/2,138,'#ffffff',8);
    label(ctx,'Same seed for everyone — AAA daily',W/2,H-8,'#ffe9c0',6);
  }
}

export class WeeklyChallengeScene extends PolishedBase {
  enter(p){ super.enter(p); const d=new Date(); const wk=Math.floor((Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())/86400000)/7); this.challenge=WEEKLY_CHALLENGES[wk%WEEKLY_CHALLENGES.length]; }
  update(dt){ this.t+=dt; const m=this._mouse; if(m.justDown){ if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; } if(this.hit({x:W/2-60,y:120,w:120,h:32})){ this.engine.setScene('gameplay',{save:this.save,realmId:'purgatory',stage:1,weeklyChallenge:this.challenge.id,difficulty:'hard'}); } } if(!m.down) this._press=null; m.justDown=false; }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers); this.drawBack(ctx); outlineText(ctx,'WEEKLY — AAA',W/2,30,'#ffffff','#5a1a08',16);
    tile(ctx,8,50,W-16,60,10,{fill:'#20182c',fill2:'#140e1e',outline:INK,ring:'#c07aff',ringW:2,lift:3});
    label(ctx,this.challenge.name.toUpperCase(),14,68,'#c07aff',10,'left'); label(ctx,this.challenge.desc,14,84,'#c8b8a0',6,'left');
    const b={x:W/2-60,y:120,w:120,h:32}; const hov=this.hit(b); tile(ctx,b.x,b.y,b.w,b.h,10,{fill:hov?'#8a4aff':'#6a3aff',fill2:'#2a1a4a',outline:INK,ring:'#c07aff',ringW:2,lift:hov?4:3}); label(ctx,'START WEEKLY',W/2,138,'#ffffff',8);
    label(ctx,'Weekly rotates — AAA challenge',W/2,H-8,'#c8b8a0',6);
  }
}

export class SettingsScene extends PolishedBase {
  enter(p){ super.enter(p); this.from=p.from; this.ctx2=p.ctx; }
  update(dt){ this.t+=dt; const m=this._mouse; if(m.justDown){ if(this.hit(this.backButton())){ if(this.from==='pause') this.engine.setScene('pause',{save:this.save,ctx:this.ctx2}); else this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; } const opts=['bloom','lighting','scanlines','shake','sound','damageNumbers']; opts.forEach((k,i)=>{ const r={x:8,y:58+i*32,w:W-16,h:27}; if(this.hit(r)){ this.save.settings[k] = this.save.settings[k] ? 0 : 1; saveSave(this.save); } }); } if(!m.down) this._press=null; m.justDown=false; }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers); this.drawBack(ctx); outlineText(ctx,'SETTINGS — AAA',W/2,30,'#ffffff','#5a1a08',14);
    const opts=['bloom','lighting','scanlines','shake','sound','damageNumbers']; opts.forEach((k,i)=>{ const y=58+i*32; const v=this.save.settings[k]; tile(ctx,8,y,W-16,27,8,{fill:v?'#2a3a5a':PANEL,outline:INK,ring:v?BLUE:null,ringW:1,lift:2}); label(ctx,k.toUpperCase(),14,y+11,'#ffffff',8,'left'); label(ctx,v?'ON':'OFF',W-14,y+11,v?GREEN:RED,7,'right'); });
    label(ctx,'AAA SETTINGS — god level customization',W/2,H-8,'#c8b8a0',6);
  }
}

export class ArsenalScene extends PolishedBase {
  enter(p){ super.enter(p); this.sel=0; this.scroll=0; }
  update(dt){
    this.t+=dt; const m=this._mouse;
    if(m.justDown){
      if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; }
      WEAPONS.forEach((w,i)=>{ const r={x:8,y:60+i*42-this.scroll,w:W-16,h:36}; if(this.hit(r)) this.sel=i; });
    }
    if(this.engine.input?.isDown?.('ArrowUp')) this.scroll=Math.max(0,this.scroll-3);
    if(this.engine.input?.isDown?.('ArrowDown')) this.scroll=Math.min(WEAPONS.length*42,this.scroll+3);
    if(!m.down) this._press=null; m.justDown=false;
  }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers); this.drawBack(ctx); outlineText(ctx,'ARSENAL — AAA GOD',W/2,30,'#ffffff','#5a1a08',14);
    label(ctx,'Weapons capped to 4 per run — AAA balance',W/2,44,'#8ef0ff',5);
    WEAPONS.forEach((w,i)=>{ const y=60+i*42-this.scroll; if(y<50||y>H-20) return; const r={x:8,y,w:W-16,h:36}; const active=this.sel===i; tile(ctx,r.x,r.y,r.w,r.h,8,{fill:active?'#3d2a5a':PANEL,fill2:'#1d1622',outline:active?w.color:INK,ring:active?w.color:null,ringW:1,lift:2}); label(ctx,w.name.toUpperCase(),14,y+12,w.color,7,'left'); label(ctx,w.desc.slice(0,42),14,y+24,'#b8a8a0',5,'left'); label(ctx,'DMG '+w.dmg+' CD '+w.cd.toFixed(2)+'s',W-14,y+12,'#7a6a5a',5,'right'); });
    const sel=WEAPONS[this.sel]; if(sel){ tile(ctx,8,H-62,W-16,56,10,{fill:'#20182c',fill2:'#140e1e',outline:sel.color,ring:sel.color,ringW:1,lift:3}); label(ctx,sel.name.toUpperCase()+' — '+sel.family.toUpperCase(),14,H-50,sel.color,8,'left'); label(ctx,sel.desc,14,H-38,'#c8b8a0',6,'left'); label(ctx,'AAA GOD — max 2 extra proj, 25% double cast',14,H-26,'#8ef07a',5,'left'); }
  }
}

export class ArmouryScene extends PolishedBase {
  enter(p){ super.enter(p); this.sel=0; }
  update(dt){
    this.t+=dt; const m=this._mouse;
    if(m.justDown){
      if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; }
      ARMOURS.forEach((a,i)=>{ const r={x:8,y:60+i*36,w:W-16,h:30}; if(this.hit(r)) this.sel=i; });
      CHAR_SKINS.forEach((sk,i)=>{ const r={x:8+(i%2)*130,y:200+Math.floor(i/2)*46,w:124,h:40}; if(this.hit(r)){ if(this.save.ownedCharSkins?.includes(sk.id)||sk.cost===0){ this.save.charSkin=sk.id; saveSave(this.save); } } });
    }
    if(!m.down) this._press=null; m.justDown=false;
  }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers); this.drawBack(ctx); outlineText(ctx,'ARMOURY — AAA GOD',W/2,30,'#ffffff','#5a1a08',14);
    ARMOURS.forEach((a,i)=>{ const y=50+i*30; const active=this.sel===i; tile(ctx,8,y,W-16,24,7,{fill:active?'#3a2a5a':PANEL,outline:INK,ring:active?GOLD:null,ringW:1,lift:2}); label(ctx,a.name.toUpperCase(),14,y+10,'#ffffff',7,'left'); label(ctx,a.desc.slice(0,36),14,y+20,'#b8a8a0',5,'left'); });
    label(ctx,'CONDUCTOR SKINS — AAA',W/2,190,'#ffe066',8);
    CHAR_SKINS.forEach((sk,i)=>{ const r={x:8+(i%2)*130,y:200+Math.floor(i/2)*46,w:124,h:40}; const owned=this.save.ownedCharSkins?.includes(sk.id)||sk.cost===0; const active=this.save.charSkin===sk.id; tile(ctx,r.x,r.y,r.w,r.h,8,{fill:active?'#2a3a1a':owned?PANEL:'#1a1420',outline:active?GREEN:INK,ring:active?GREEN:null,ringW:2,lift:2}); label(ctx,sk.name.toUpperCase(),r.x+8,r.y+12,active?'#8ef07a':'#ffffff',6,'left'); label(ctx,owned?'OWNED':sk.cost+'c',r.x+8,r.y+24,owned?'#8ef07a':'#ff7a6a',5,'left'); });
  }
}

export class RelicsScene extends PolishedBase {
  enter(p){ super.enter(p); this.scroll=0; }
  update(dt){
    this.t+=dt; const m=this._mouse;
    if(m.justDown){
      if(this.hit(this.backButton())){ this.engine.setScene('menu',{save:this.save}); m.justDown=false; return; }
      // click an owned relic to equip it (carried into every run)
      RELICS.forEach((r,i)=>{ const y=64+i*38-this.scroll; if(y<56||y>H-10) return; const rr={x:8,y,w:W-16,h:32}; if(this.hit(rr)&&(this.save.relics||[]).includes(r.id)){ this.save.activeRelic = this.save.activeRelic===r.id ? null : r.id; saveSave(this.save); } });
    }
    if(this.engine.input?.isDown?.('ArrowUp')) this.scroll=Math.max(0,this.scroll-3);
    if(this.engine.input?.isDown?.('ArrowDown')) this.scroll=Math.min(200,this.scroll+3);
    if(!m.down) this._press=null; m.justDown=false;
  }
  render(ctx){
    lavaBackground(ctx,this.t,this.embers); this.drawBack(ctx); outlineText(ctx,'RELICS — AAA GOD',W/2,30,'#ffffff','#5a1a08',14);
    const active=this.save.activeRelic;
    // banner showing the equipped relic
    tile(ctx,8,38,W-16,20,8,{fill:active?'#3a2a1a':PANEL,outline:active?GOLD:INK,ring:active?GOLD:null,ringW:1,lift:2});
    label(ctx,active?('EQUIPPED: '+(RELICS.find(r=>r.id===active)?.name||'').toUpperCase()):'CLICK AN OWNED RELIC TO EQUIP IT',W/2,48,active?GOLD:'#7a6a5a',6);
    RELICS.forEach((r,i)=>{ const y=64+i*38-this.scroll; if(y<56||y>H-10) return; const owned=(this.save.relics||[]).includes(r.id); const isActive=this.save.activeRelic===r.id; tile(ctx,8,y,W-16,32,8,{fill:isActive?'#3a2a1a':owned?'#2a1a3a':PANEL,outline:isActive?GOLD:owned?GOLD:INK,ring:isActive?GOLD:owned?GOLD:null,ringW:isActive?2:1,lift:2}); label(ctx,r.name.toUpperCase()+(isActive?' ★':''),14,y+11,isActive?'#ffe066':owned?'#ffffff':'#6a5a6a',7,'left'); label(ctx,r.desc.slice(0,44),14,y+22,owned?'#b8a8a0':'#5a4a5a',5,'left'); if(owned&&!isActive) star(ctx,W-20,y+16,5,GOLD); });
    label(ctx,'CLEAR REALMS TO UNLOCK THEIR RELIC — ONE EQUIPPED AT A TIME',W/2,H-8,'#c8b8a0',5);
  }
}

function drawBigTitle(ctx,text,x,y,scale=1){ ctx.font='bold '+(20*scale)+'px monospace'; ctx.textAlign='center'; ctx.fillStyle='#000'; ctx.fillText(text,x+2,y+2); ctx.fillStyle='#985ce0'; ctx.fillText(text,x,y-1); ctx.fillStyle='#ffe066'; ctx.fillText(text,x,y); ctx.textAlign='left'; }
