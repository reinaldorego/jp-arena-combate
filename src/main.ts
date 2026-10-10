import * as T from 'three';
import {Arena,monsterNames,type Difficulty,type Monster} from './sim';
import {maps,type MapId} from './maps';
import {Synth} from './audio';
import {mobileControls} from './mobile';
import {walkSpeed,baseMouseSensitivity,touchSensitivity,hipFov,aimFov,smoothAim,accelerate} from './controls';
import './style.css';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<canvas id="world"></canvas>
<section id="menu"><div class="menu-content">
 <div class="eyebrow">SINGLE-PLAYER / ARENA SHOOTER</div><h1>JP ARENA<br><span>COMBATE.</span></h1>
 <p class="subtitle">Dois mundos. Quatro hordas. Sobreviva e elimine todos os monstros.</p>
 <label for="player-name">SEU NOME</label><input id="player-name" type="text" maxlength="24" placeholder="Digite seu nome" value="Jogador" autocomplete="nickname">
 <label>ESCOLHA SEU MUNDO</label><div class="worlds">
 <button class="map-card selected" data-map="guama" aria-pressed="true"><small>01 / MERCADO</small><strong>MUNDO GUAMÁ</strong><span>Praça aberta · luz verde</span></button>
 <button class="map-card" data-map="jurunas" aria-pressed="false"><small>02 / FORTALEZA</small><strong>MUNDO JURUNAS</strong><span>Pedra vulcânica · lava</span></button></div>
 <div class="settings"><div><label for="difficulty">DIFICULDADE</label><select id="difficulty"><option value="easy">FÁCIL</option><option value="normal">NORMAL</option></select></div><div><label for="sensitivity">SENSIBILIDADE <span id="sens-value">1.0</span></label><input id="sensitivity" type="range" min="0.3" max="2.5" step="0.1" value="1"></div></div>
 <button id="start" class="primary">ENTRAR NA ARENA →</button>
 <p class="desktop-help">WASD / setas para mover · mouse para olhar · esquerdo para atirar · direito para ADS · R para recarregar · ESC para pausar.</p>
 <p class="touch-help">Mova no joystick. Arraste à direita para olhar. Toque MIRA para o zoom; segure e arraste ATIRAR para mirar e disparar com o mesmo dedo.</p>
</div><div class="world-caption"><span id="preview-name">MUNDO GUAMÁ</span><p id="preview-theme">PRAÇA DO MERCADO</p></div></section>
<div id="hud" class="hidden"><div class="hud-top"><div class="identity"><small>JOGADOR</small><b id="hud-player"></b></div><div class="map-identity"><small>MUNDO</small><b id="hud-map"></b></div><div class="kill-count"><small>KILLS</small><b id="kills">0</b></div></div>
 <div id="crosshair"></div><div id="hit"></div><div id="damage"></div>
 <div id="bottom"><div class="health"><small>VIDA</small><b id="health">100</b></div><div class="ammo"><small id="ammo-label">MUNIÇÃO</small><b id="ammo">30</b><span id="reserve"> / 180</span></div></div></div>
<section id="pause" class="overlay hidden"><div class="dialog"><h2>ARENA EM PAUSA</h2><button id="resume" class="primary">CONTINUAR</button><button id="restart" class="secondary">RECOMEÇAR</button><button id="home" class="secondary">ESCOLHER MUNDO</button></div></section>
<section id="result" class="overlay hidden"><div class="dialog"><h2 id="result-title"></h2><p id="result-details"></p><button id="rematch" class="primary">JOGAR NOVAMENTE</button><button id="result-home" class="secondary">ESCOLHER MUNDO</button></div></section><div id="error"></div>`;
const $=(s:string)=>document.querySelector<HTMLElement>(s)!;
const canvas=$('#world') as HTMLCanvasElement,touchDevice=matchMedia('(pointer:coarse)').matches;
const renderer=new T.WebGLRenderer({canvas,antialias:!touchDevice,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,touchDevice?1:1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(hipFov,innerWidth/innerHeight,.08,100);camera.rotation.order='YXZ';scene.add(camera);
const skyLight=new T.HemisphereLight(0xe5ffee,0x3c3034,2.6),sun=new T.DirectionalLight(0xffd9b0,2.1);sun.position.set(-12,25,14);scene.add(skyLight,sun);
const game=new Arena(),player=game.player,audio=new Synth(),world=new T.Group();scene.add(world);
let selected:MapId='guama',sensitivity=1,yaw=0,pitch=0,mouseDown=false,aimHeld=false,paused=false,lastPhase=game.phase,hitUntil=0,damageUntil=0,flashUntil=0;
const velocity=new T.Vector3(),keys=new Set<string>(),cube=new T.BoxGeometry(1,1,1);
const dark=new T.MeshStandardMaterial({color:0x253238,roughness:.75}),steel=new T.MeshStandardMaterial({color:0x8b9998,roughness:.5}),glow=new T.MeshBasicMaterial({color:0xc5ff9a});
function box(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,material:T.Material){const mesh=new T.Mesh(cube,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;}
function texture(mapId:MapId){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle=mapId==='guama'?'#82978a':'#67515b';ctx.fillRect(0,0,128,128);ctx.strokeStyle=mapId==='guama'?'#536e61':'#352b35';ctx.lineWidth=3;for(let y=0;y<128;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(128,y);ctx.stroke();for(let x=(y%64?0:32);x<128;x+=64){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+32);ctx.stroke();}}const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(2,2);return tex;}
function clearWorld(){const materials=new Set<T.Material>();world.traverse(o=>{if(o instanceof T.Mesh){const list=Array.isArray(o.material)?o.material:[o.material];list.forEach(m=>materials.add(m));}});for(const m of materials){if(m instanceof T.MeshStandardMaterial)m.map?.dispose();m.dispose();}const geometries=new Set<T.BufferGeometry>();world.traverse(o=>{if(o instanceof T.Mesh&&o.geometry!==cube)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());world.clear();}
function buildWorld(id:MapId){
 clearWorld();const map=maps[id];renderer.setClearColor(map.sky);scene.fog=new T.Fog(map.sky,32,80);
 const wall=new T.MeshStandardMaterial({color:map.wall,map:texture(id),roughness:.9}),floor=new T.MeshStandardMaterial({color:map.floor,roughness:.95}),accent=new T.MeshStandardMaterial({color:map.accent,emissive:map.accent,emissiveIntensity:.45}),trim=new T.MeshStandardMaterial({color:id==='guama'?0x31483e:0x332732});
 box(world,0,-.2,0,52,.4,52,floor);
 for(const b of map.blocks){box(world,b.x,b.h/2,b.z,b.w,b.h,b.d,wall);box(world,b.x,b.h+.1,b.z,b.w+.15,.2,b.d+.15,trim);if(b.kind==='stall'){box(world,b.x,b.h+.25,b.z,b.w+.8,.2,b.d+.8,accent);for(const x of [-1,1])box(world,b.x+x*(b.w/2-.25),1.2,b.z-b.d/2-.03,.15,2.4,.15,trim);}else if(b.kind==='pillar')box(world,b.x,b.h/2,b.z-b.d/2-.04,b.w*.5,.14,.08,accent);}
 for(const gate of map.gates){box(world,gate.x,.025,gate.z,2.8,.05,2.8,accent);box(world,gate.x-1.45,1,gate.z,.12,2,.12,accent);box(world,gate.x+1.45,1,gate.z,.12,2,.12,accent);}
 if(id==='guama'){
  const foliage=new T.MeshStandardMaterial({color:0x477a56});const treeGeo=new T.IcosahedronGeometry(2.2,0);
  for(const x of [-29,29])for(const z of [-18,-6,6,18]){box(world,x,2,z,.7,4,.7,trim);const crown=new T.Mesh(treeGeo,foliage);crown.position.set(x,5,z);world.add(crown);}
 }else{
  for(const x of [-22,22])box(world,x,.015,0,.9,.03,42,accent);
  for(const x of [-16,0,16]){box(world,x,3.8,-24,2,.25,.2,accent);const torch=new T.PointLight(0xff793b,7,14);torch.position.set(x,3,-22);world.add(torch);}
 }
 $('#preview-name').textContent=map.name;$('#preview-theme').textContent=map.theme;
}

const enemyModels=new Map<number,{g:T.Group;legs:T.Mesh[]}>(),pickupModels=new Map<number,T.Group>();
const bodyGeo=new T.IcosahedronGeometry(1,0),hornGeo=new T.ConeGeometry(.15,.65,5),eyeGeo=new T.BoxGeometry(.12,.1,.05);
const monsterMaterials=monsterNames.map((_,i)=>new T.MeshStandardMaterial({color:new T.Color().setHSL((i*.083+.01)%1,.45,.4),roughness:.8}));
const eyeMaterial=new T.MeshBasicMaterial({color:0xffdf68}),hornMaterial=new T.MeshStandardMaterial({color:0xe6d3af});
const nameMaterials=monsterNames.map(name=>{const c=document.createElement('canvas');c.width=384;c.height=64;const ctx=c.getContext('2d')!;ctx.fillStyle='#180c14bb';ctx.fillRect(0,0,384,64);ctx.fillStyle='#ffc4a8';ctx.font='bold 36px Arial';ctx.textAlign='center';ctx.fillText(name,192,45);return new T.SpriteMaterial({map:new T.CanvasTexture(c),depthWrite:false});});
function createMonster(enemy:Monster){
 const g=new T.Group(),mat=monsterMaterials[enemy.variant],body=new T.Mesh(bodyGeo,mat);body.position.y=1.12;body.scale.set(.62,.68,.43);g.add(body);
 const head=new T.Mesh(bodyGeo,mat);head.position.set(0,1.85,-.04);head.scale.set(.4,.4,.34);g.add(head);
 for(const side of [-1,1]){const horn=new T.Mesh(hornGeo,hornMaterial);horn.position.set(side*.34,2.23,0);horn.rotation.z=-side*.3;g.add(horn);const eye=new T.Mesh(eyeGeo,eyeMaterial);eye.position.set(side*.16,1.91,-.34);g.add(eye);box(g,side*.68,1.05,-.12,.22,.74,.24,mat);box(g,side*.68,.7,-.25,.12,.12,.32,hornMaterial);}
 const legs=[box(g,-.24,.35,0,.29,.7,.35,mat),box(g,.24,.35,0,.29,.7,.35,mat)];
 const tag=new T.Sprite(nameMaterials[enemy.variant]);tag.name='monster-name';tag.position.y=2.75;tag.scale.set(2.3,.38,1);g.add(tag);scene.add(g);enemyModels.set(enemy.id,{g,legs});
}
function clearActors(){for(const {g} of enemyModels.values())scene.remove(g);enemyModels.clear();for(const g of pickupModels.values())scene.remove(g);pickupModels.clear();}
const healthMaterial=new T.MeshBasicMaterial({color:0x6effb9}),ammoMaterial=new T.MeshBasicMaterial({color:0xffc562});
function syncActors(now:number){
 for(const enemy of game.enemies){if(!enemyModels.has(enemy.id))createMonster(enemy);const {g,legs}=enemyModels.get(enemy.id)!;g.visible=enemy.alive;const tag=g.getObjectByName('monster-name')!;const distance=enemy.pos.distanceTo(player.pos);tag.visible=distance>4&&distance<28;g.position.copy(enemy.pos);g.rotation.y=enemy.yaw;g.position.y=enemy.alive&&enemy.moving>.002?Math.sin(now*.009+enemy.id)*.04:0;for(let i=0;i<2;i++)legs[i].rotation.x=enemy.moving>.002?Math.sin(now*.01+i*Math.PI)*.3:0;}
 for(const pickup of game.pickups){let g=pickupModels.get(pickup.id);if(!g){g=new T.Group();const material=pickup.kind==='health'?healthMaterial:ammoMaterial;box(g,0,0,0,.6,.5,.6,dark);if(pickup.kind==='health'){box(g,0,.28,0,.12,.04,.4,material);box(g,0,.28,0,.4,.04,.12,material);}else box(g,0,.28,0,.4,.06,.4,material);scene.add(g);pickupModels.set(pickup.id,g);}g.visible=pickup.active;g.position.copy(pickup.pos);g.position.y=.45+Math.sin(now*.002)*.1;g.rotation.y=now*.0007;}
}
const gun=new T.Group();camera.add(gun);
box(gun,.29,-.27,-.58,.16,.18,.62,dark);box(gun,.29,-.2,-.5,.14,.06,.28,steel);box(gun,.29,-.38,-.51,.1,.26,.12,steel);box(gun,.29,-.31,-.28,.16,.16,.3,dark);box(gun,.29,-.27,-1,.075,.075,.28,steel);box(gun,.29,-.16,-.92,.025,.04,.025,glow);
const muzzle=new T.Mesh(new T.ConeGeometry(.1,.32,6),new T.MeshBasicMaterial({color:0xffdf88}));muzzle.rotation.x=-Math.PI/2;muzzle.position.set(.29,-.27,-1.2);gun.add(muzzle);muzzle.visible=false;
function lookBy(x:number,y:number){if(paused||game.phase!=='playing')return;const scale=(mobile.enabled?touchSensitivity:baseMouseSensitivity)*sensitivity*(1-.55*player.aimAmount);yaw-=x*scale;pitch=T.MathUtils.clamp(pitch-y*scale,-1.4,1.4);player.yaw=yaw;}
const mobile=mobileControls({look:lookBy,reload:()=>game.reload(),pause:pauseGame});
function resetControls(){mobile.reset();keys.clear();mouseDown=aimHeld=false;velocity.set(0,0,0);player.aimAmount=player.moving=player.speed=0;}
function pauseGame(){if(game.phase!=='playing')return;paused=true;resetControls();mobile.show(false);$('#pause').classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock();}
async function lock(){
 if(mobile.enabled){mobile.show(true);$('#error').textContent='';return;}
 try{await canvas.requestPointerLock({unadjustedMovement:true});}catch(e){if(e instanceof DOMException&&e.name==='NotSupportedError'){try{await canvas.requestPointerLock();return;}catch{}}pauseGame();$('#error').textContent='Clique em Continuar para capturar o mouse.';}
}
async function begin(){
 try{await audio.start();}catch{ /* Audio availability never blocks the arena. */ }
 game.start(selected,($('#player-name') as HTMLInputElement).value,($('#difficulty') as HTMLSelectElement).value as Difficulty);
 clearActors();buildWorld(selected);resetControls();yaw=player.yaw;pitch=0;paused=false;lastPhase='playing';hitUntil=damageUntil=flashUntil=0;
 $('#menu').classList.add('hidden');$('#pause').classList.add('hidden');$('#result').classList.add('hidden');$('#hud').classList.remove('hidden');hud();void lock();
}
function home(){game.phase='menu';paused=false;resetControls();mobile.show(false);if(document.pointerLockElement)document.exitPointerLock();clearActors();$('#menu').classList.remove('hidden');$('#pause').classList.add('hidden');$('#result').classList.add('hidden');$('#hud').classList.add('hidden');$('#error').textContent='';}
$('#start').onclick=begin;$('#restart').onclick=begin;$('#rematch').onclick=begin;$('#home').onclick=home;$('#result-home').onclick=home;
$('#resume').onclick=()=>{paused=false;resetControls();$('#pause').classList.add('hidden');void audio.start().catch(()=>{});void lock();};
document.querySelectorAll<HTMLButtonElement>('[data-map]').forEach(button=>button.onclick=()=>{selected=button.dataset.map as MapId;document.querySelectorAll<HTMLButtonElement>('[data-map]').forEach(other=>{const active=other===button;other.classList.toggle('selected',active);other.setAttribute('aria-pressed',String(active));});buildWorld(selected);});
($('#sensitivity') as HTMLInputElement).oninput=e=>{sensitivity=Number((e.target as HTMLInputElement).value);$('#sens-value').textContent=sensitivity.toFixed(1);};
document.addEventListener('pointerlockchange',()=>{if(mobile.enabled)return;resetControls();if(document.pointerLockElement===canvas){paused=false;$('#pause').classList.add('hidden');$('#error').textContent='';}else if(game.phase==='playing')pauseGame();});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas)lookBy(e.movementX,e.movementY);});
document.addEventListener('mousedown',e=>{if(document.pointerLockElement!==canvas||paused||game.phase!=='playing')return;if(e.button===0)mouseDown=true;if(e.button===2)aimHeld=true;});
document.addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;if(e.button===2)aimHeld=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,select'))return;if(e.code.startsWith('Arrow'))e.preventDefault();if(game.phase==='playing'&&!paused)keys.add(e.code);if(e.repeat)return;if(e.code==='KeyR')game.reload();if(e.code==='Escape'){if(paused)$('#resume').click();else pauseGame();}if(e.code==='Enter'&&(game.phase==='won'||game.phase==='lost'))void begin();});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{if(game.phase==='playing')pauseGame();else resetControls();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.phase==='playing')pauseGame();});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function hud(){
 $('#hud-player').textContent=player.name;$('#hud-map').textContent=game.map.name;$('#kills').textContent=String(game.kills);$('#health').textContent=String(player.hp);$('#ammo').textContent=String(player.ammo);$('#reserve').textContent=` / ${player.reserve}`;$('#ammo-label').textContent=player.reload>0?'RECARREGANDO':'MUNIÇÃO';
}
function events(now:number){for(const event of game.events){
 if(event.type==='shot'){audio.play('shot');flashUntil=now+45;const kick=(game.difficulty==='easy'?.5:1)*(1-.65*player.aimAmount);pitch=Math.min(1.4,pitch+(.005+Math.min(player.spray,10)*.0004)*kick);yaw+=Math.sin(player.spray*.72)*.002*kick;}
 if(event.type==='hit'){if(event.target===0){damageUntil=now+350;audio.play('armor');}else{hitUntil=now+100;audio.play(event.zone==='head'?'head':'armor');}}
 if(event.type==='reload')audio.play('reload');if(event.type==='pickup')audio.play('beep');
 }game.events=[];}
let last=performance.now(),hudAt=0;const fpsSamples:number[]=[];let frames=0,fpsAt=last;
function frame(now:number){
 requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.1);last=now;frames++;if(now-fpsAt>=1000){fpsSamples.push(frames*1000/(now-fpsAt));if(fpsSamples.length>120)fpsSamples.shift();frames=0;fpsAt=now;}
 const active=game.phase==='playing'&&!paused;
 player.aimAmount=smoothAim(player.aimAmount,active&&player.reload<=0&&(aimHeld||mobile.aim),dt);
 const fov=hipFov+(aimFov-hipFov)*player.aimAmount;if(Math.abs(camera.fov-fov)>.001){camera.fov=fov;camera.updateProjectionMatrix();}$('#crosshair').style.opacity=String(1-player.aimAmount);
 if(game.phase==='menu'){camera.position.set(23,19,27);camera.lookAt(0,0,-3);gun.visible=false;}else{
  if(active){accelerate(velocity,keys,yaw,walkSpeed,dt,{x:mobile.x,z:mobile.z});const before=player.pos.clone();game.move(player,velocity.x*dt,velocity.z*dt,dt);if(Math.abs(player.pos.x-before.x)<1e-8)velocity.x=0;if(Math.abs(player.pos.z-before.z)<1e-8)velocity.z=0;
   if(mouseDown||mobile.fire)game.shoot(new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)));
   game.update(dt);events(now);
  }
  if(game.phase!==lastPhase&&(game.phase==='won'||game.phase==='lost')){resetControls();mobile.show(false);if(document.pointerLockElement)document.exitPointerLock();$('#result-title').textContent=game.phase==='won'?'MUNDO CONQUISTADO':'FIM DE JOGO';$('#result-details').textContent=`${player.name} · ${game.map.name} · ${game.kills} Kills`;$('#result').classList.remove('hidden');$('#pause').classList.add('hidden');paused=false;}
  lastPhase=game.phase;camera.position.copy(player.eye);camera.rotation.set(pitch,yaw,0);gun.visible=player.alive;
  const aim=player.aimAmount,scale=1-.2*aim,bob=paused?0:player.moving*.22*(1-aim),recoil=Math.max(0,(flashUntil-now)/45);gun.scale.setScalar(scale);gun.position.set(-.29*scale*aim+Math.sin(now*.01)*bob,.16*scale*aim-Math.abs(Math.cos(now*.012))*bob,-.2*aim+recoil*.055*(1-.65*aim));muzzle.visible=now<flashUntil;
  audio.listener(camera.position,yaw);
 }
 if(game.phase!=='menu')syncActors(now);$('#hit').style.opacity=now<hitUntil?'1':'0';$('#damage').style.opacity=now<damageUntil?String((damageUntil-now)/350):'0';if(now>hudAt&&game.phase!=='menu'){hud();hudAt=now+80;}renderer.render(scene,camera);
}
buildWorld(selected);requestAnimationFrame(frame);
Object.assign(window,{arena:{game,renderer,start:begin,telemetry:()=>({fps:fpsSamples,drawCalls:renderer.info.render.calls})}});
window.addEventListener('error',e=>{$('#error').textContent=`Erro: ${e.message}`;});