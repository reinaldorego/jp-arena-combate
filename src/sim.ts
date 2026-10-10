import {Box3,Ray,Vector3} from 'three';
import {maps,free,route,wallDistance,type MapId,type ArenaMap} from './maps.ts';
import {weapons,weaponOrder,loadout,type WeaponId} from './weapons.ts';

export type Difficulty='easy'|'normal'|'hard';
export type Phase='menu'|'playing'|'cleared'|'lost';
export type Zone='head'|'body'|'legs';
export const difficultySettings={
 easy:{name:'FÁCIL',health:1,damage:5,attack:1.25,speed:1,count:1,ammo:1,heal:15},
 normal:{name:'NORMAL',health:1.3,damage:9,attack:.95,speed:1.12,count:1.25,ammo:.7,heal:10},
 hard:{name:'DIFÍCIL',health:1.65,damage:14,attack:.8,speed:1.2,count:1.6,ammo:.45,heal:5}
};
export const monsterNames=['MARCUS','ADY','REINALDO','CAVALCANTE','CYNTHIA','JULIANA','SAID','JAINARA','FÁBIO','DEJA','NADJA'];
export const waveSizes=[6,9,12,17];
export class Actor{
 pos=new Vector3();yaw=0;hp=100;alive=true;aimAmount=0;speed=0;moving=0;
 weapon:WeaponId='machinegun';inventory=loadout(1);
 jetpack=false;fuel=0;flying=false;verticalSpeed=0;
 constructor(public id:number,public name:string,public player=false){}
 get eye(){return this.pos.clone().add(new Vector3(0,1.6,0));}
 get ammo(){return this.inventory[this.weapon].ammo;}set ammo(n:number){this.inventory[this.weapon].ammo=n;}
 get reserve(){return this.inventory[this.weapon].reserve;}set reserve(n:number){this.inventory[this.weapon].reserve=n;}
 get cooldown(){return this.inventory[this.weapon].cooldown;}set cooldown(n:number){this.inventory[this.weapon].cooldown=n;}
 get reload(){return this.inventory[this.weapon].reload;}set reload(n:number){this.inventory[this.weapon].reload=n;}
 get spray(){return this.inventory[this.weapon].spray;}set spray(n:number){this.inventory[this.weapon].spray=n;}
}
export class Monster extends Actor{
 path:Vector3[]=[];navTime=0;attackDelay=.6;target=new Vector3();
 constructor(id:number,public variant:number){super(id,monsterNames[variant]);this.hp=48+(variant%4)*8;}
 get moveSpeed(){return 1.8+(this.variant%4)*.2;}
}
export interface Pickup{id:number;kind:'health'|'ammo'|'weapon'|'jetpack';weapon?:WeaponId;pos:Vector3;active:boolean}
export interface Rocket{id:number;pos:Vector3;dir:Vector3;life:number}
export interface GameEvent{type:'spawn'|'shot'|'hit'|'kill'|'reload'|'pickup'|'wave'|'end'|'explosion'|'portal'|'map';actor?:number;target?:number;zone?:Zone;value?:number;pos?:Vector3;weapon?:WeaponId}
export function hitTest(map:ArenaMap,origin:Vector3,dir:Vector3,actors:Actor[],shooter:Actor){
 const ray=new Ray(origin,dir),hit=new Vector3();let distance=wallDistance(map,origin,dir),result:{actor:Actor;zone:Zone;distance:number}|undefined;
 for(const a of actors){if(a===shooter||!a.alive)continue;for(const [zone,lo,hi,w] of [['head',1.45,2.2,.34],['body',.65,1.45,.5],['legs',0,.65,.34]] as [Zone,number,number,number][]){const b=new Box3(new Vector3(a.pos.x-w,a.pos.y+lo,a.pos.z-w),new Vector3(a.pos.x+w,a.pos.y+hi,a.pos.z+w));if(ray.intersectBox(b,hit)){const d=origin.distanceTo(hit);if(d<distance){distance=d;result={actor:a,zone,distance:d};}}}}
 return result;
}
export class Arena{
 phase:Phase='menu';difficulty:Difficulty='easy';map:ArenaMap=maps.guama;player=new Actor(0,'Jogador',true);enemies:Monster[]=[];pickups:Pickup[]=[];rockets:Rocket[]=[];events:GameEvent[]=[];
 kills=0;worldKills=0;level=1;wave=0;pending=0;spawnTimer=0;nextWave=0;elapsed=0;spawned=0;portalOpen=false;portalPos=new Vector3(0,0,10);lift=false;
 private wasLift=false;private serial=1;private seed:number;
 constructor(seed=42){this.seed=seed;}
 random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 get settings(){return difficultySettings[this.difficulty];}
 get waves(){return waveSizes.map(n=>Math.ceil(n*this.settings.count));}
 get totalEnemies(){return this.waves.reduce((a,b)=>a+b,0);}
 get active(){return this.phase==='playing'||this.phase==='cleared';}
 start(mapId:MapId,name:string,difficulty:Difficulty='easy'){
  this.difficulty=difficulty;Object.assign(this.player,new Actor(0,name.trim().slice(0,24)||'Jogador',true));this.player.inventory=loadout(this.settings.ammo);
  this.kills=0;this.level=1;this.elapsed=0;this.serial=1;this.events=[];this.loadWorld(mapId);
 }
 private loadWorld(id:MapId){
  this.map=maps[id];this.player.pos.copy(this.map.spawn);this.player.yaw=0;this.player.verticalSpeed=0;this.player.flying=false;this.player.aimAmount=0;
  this.enemies=[];this.rockets=[];this.pickups=[];this.worldKills=0;this.wave=0;this.spawned=0;this.nextWave=0;this.portalOpen=false;this.phase='playing';this.lift=this.wasLift=false;
  for(const [kind,weapon,x,z] of [['weapon','machinegun',0,14],['weapon','rifle',5,12],['weapon','bazooka',-5,12],['jetpack',undefined,0,16]] as const)this.pickups.push({id:this.serial++,kind,weapon,pos:new Vector3(x,0,z),active:true});
  this.beginWave();
 }
 enterPortal(){
  if(!this.portalOpen||this.phase!=='cleared'||this.player.pos.distanceTo(this.portalPos)>1.65)return false;
  const id=this.map.id==='guama'?'jurunas':'guama';this.level++;this.player.hp=Math.min(100,this.player.hp+25);
  // Preserve ammunition and weapon selection; cancel unfinished animations without granting rounds.
  for(const state of Object.values(this.player.inventory)){state.reload=0;state.cooldown=0;}
  this.loadWorld(id);this.events.push({type:'map'});return true;
 }
 private beginWave(){
  this.wave++;this.pending=this.waves[this.wave-1];this.spawnTimer=1;this.nextWave=0;
  if(this.wave>1){this.player.hp=Math.min(100,this.player.hp+this.settings.heal);this.refillAmmo();}
  this.events.push({type:'wave',value:this.wave});
 }
 private refillAmmo(){for(const id of weaponOrder){const state=this.player.inventory[id],amount=id==='bazooka'?2:id==='rifle'?12:60;state.reserve=Math.min(id==='bazooka'?16:id==='rifle'?80:300,state.reserve+Math.max(1,Math.floor(amount*this.settings.ammo)));}}
 spawnMonster(){
  const gates=this.map.gates.filter(p=>p.clone().setY(0).distanceTo(this.player.pos.clone().setY(0))>10&&this.enemies.every(e=>!e.alive||e.pos.distanceTo(p)>1.5));
  if(!gates.length)return false;
  const enemy=new Monster(this.serial++,this.spawned%monsterNames.length);enemy.hp=Math.round(enemy.hp*this.settings.health);enemy.pos.copy(gates[Math.floor(this.random()*gates.length)]);enemy.yaw=Math.atan2(-(this.player.pos.x-enemy.pos.x),-(this.player.pos.z-enemy.pos.z));this.enemies.push(enemy);this.spawned++;this.events.push({type:'spawn',actor:enemy.id,pos:enemy.pos.clone()});return true;
 }
 move(a:Actor,dx:number,dz:number,dt=1/60){
  const old=a.pos.clone(),steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.18));
  for(let i=0;i<steps;i++){if(free(this.map,a.pos.x+dx/steps,a.pos.z,.45,a.pos.y))a.pos.x+=dx/steps;if(free(this.map,a.pos.x,a.pos.z+dz/steps,.45,a.pos.y))a.pos.z+=dz/steps;}
  a.moving=a.pos.distanceTo(old);a.speed=a.moving/Math.max(dt,.0001);
 }
 visible(a:Actor,b:Actor){const delta=b.eye.sub(a.eye),distance=delta.length();return wallDistance(this.map,a.eye,delta.normalize())>distance;}
 damage(target:Actor,amount:number,actor:number,zone:Zone='body'){
  if(!this.active||!target.alive)return;target.hp=Math.max(0,target.hp-Math.round(amount));this.events.push({type:'hit',actor,target:target.id,zone,value:amount,pos:target.pos.clone()});
  if(target.hp>0)return;target.alive=false;
  if(target.player){this.phase='lost';this.player.flying=false;this.lift=false;this.events.push({type:'end'});return;}
  this.kills++;this.worldKills++;this.events.push({type:'kill',actor,target:target.id,pos:target.pos.clone()});
  if(this.worldKills%4===0)this.pickups.push({id:this.serial++,kind:this.worldKills%8===0?'ammo':'health',pos:target.pos.clone(),active:true});
 }
 selectWeapon(id:WeaponId){if(!this.active||!this.player.alive)return;this.player.weapon=id;}
 cycleWeapon(){this.selectWeapon(weaponOrder[(weaponOrder.indexOf(this.player.weapon)+1)%weaponOrder.length]);}
 shoot(direction:Vector3,spread=true){
  const a=this.player;if(!this.active||!a.alive||a.cooldown>0||a.reload>0)return;
  if(a.ammo===0){this.reload();return;}const weapon=weapons[a.weapon];a.ammo--;a.cooldown=weapon.interval;a.spray++;
  const d=direction.clone().normalize();if(spread){const cone=(weapon.spread+Math.min(a.speed/6,1)*weapon.spread+Math.min(a.spray,12)*weapon.spread*.05)*(1-.7*a.aimAmount);d.x+=(this.random()-.5)*cone;d.y+=(this.random()-.5)*cone;d.z+=(this.random()-.5)*cone;d.normalize();}
  this.events.push({type:'shot',actor:0,pos:a.eye,weapon:a.weapon});
  if(a.weapon==='bazooka'){this.rockets.push({id:this.serial++,pos:a.eye,dir:d,life:3.5});return;}
  const hit=hitTest(this.map,a.eye,d,this.enemies,a);if(hit)this.damage(hit.actor,hit.zone==='head'?weapon.head:hit.zone==='body'?weapon.damage:weapon.damage*.75,0,hit.zone);
 }
 reload(){const p=this.player,w=weapons[p.weapon];if(this.active&&p.alive&&p.reload<=0&&p.reserve>0&&p.ammo<w.magazine){p.reload=w.reload;this.events.push({type:'reload',actor:0});}}
 private explode(pos:Vector3){
  this.events.push({type:'explosion',pos:pos.clone()});
  for(const enemy of this.enemies){if(!enemy.alive)continue;const delta=enemy.pos.clone().add(new Vector3(0,1.1,0)).sub(pos),distance=delta.length();if(distance<5.5&&wallDistance(this.map,pos,delta.clone().normalize())>distance-.05)this.damage(enemy,Math.round(weapons.bazooka.damage*(1-distance/7)),0);}
 }
 private updateRockets(dt:number){
  const alive:Rocket[]=[];
  for(const rocket of this.rockets){
   const travel=Math.min(24*dt,rocket.life*24),wall=wallDistance(this.map,rocket.pos,rocket.dir),hit=hitTest(this.map,rocket.pos,rocket.dir,this.enemies,this.player),floor=rocket.dir.y<0?Math.max(0,(rocket.pos.y-.05)/-rocket.dir.y):Infinity,distance=Math.min(wall,floor,hit?.distance??Infinity);
   rocket.life-=dt;
   if(distance<=travel){rocket.pos.addScaledVector(rocket.dir,Math.max(0,distance-.04));this.explode(rocket.pos);}else{rocket.pos.addScaledVector(rocket.dir,travel);if(rocket.life<=0)this.explode(rocket.pos);else alive.push(rocket);}
  }this.rockets=alive;
 }
 private flight(dt:number){
  const p=this.player,ground=this.map.blocks.reduce((h,b)=>Math.abs(p.pos.x-b.x)<b.w/2+.45&&Math.abs(p.pos.z-b.z)<b.d/2+.45?Math.max(h,b.h+.22):h,0),onGround=p.pos.y<=ground+.001;
  p.flying=this.lift&&p.jetpack&&p.fuel>0;
  if(p.flying){const burn=Math.min(dt,p.fuel);p.fuel=Math.max(0,p.fuel-burn);p.verticalSpeed=0;p.pos.y=Math.min(9,p.pos.y+3.2*burn);}
  else{if(this.lift&&!this.wasLift&&onGround)p.verticalSpeed=5.5;p.verticalSpeed=Math.max(-20,p.verticalSpeed-14*dt);p.pos.y+=p.verticalSpeed*dt;if(p.pos.y<ground){p.pos.y=ground;p.verticalSpeed=0;}}
  this.wasLift=this.lift;
 }
 private chase(enemy:Monster,dt:number){
  const p=this.player,delta=p.pos.clone().sub(enemy.pos).setY(0),distance=delta.length();enemy.attackDelay=Math.max(0,enemy.attackDelay-dt);enemy.moving=0;enemy.speed=0;enemy.yaw=Math.atan2(-delta.x,-delta.z);
  if(distance<1.65&&Math.abs(p.pos.y-enemy.pos.y)<1.65&&this.visible(enemy,p)){if(enemy.attackDelay===0){enemy.attackDelay=this.settings.attack;this.damage(p,this.settings.damage+enemy.variant%3,enemy.id);}return;}
  let goal:Vector3|undefined;
  const steps=Math.max(1,Math.ceil(distance/.4));let clear=true;
  for(let i=1;i<=steps;i++)if(!free(this.map,enemy.pos.x+delta.x*i/steps,enemy.pos.z+delta.z*i/steps,.5)){clear=false;break;}
  if(clear){goal=p.pos;}else{enemy.navTime-=dt;if(enemy.navTime<=0||enemy.target.distanceTo(p.pos)>3){enemy.path=route(this.map,enemy.pos,p.pos);enemy.target.copy(p.pos);enemy.navTime=.65+enemy.variant*.025;}while(enemy.path.length&&enemy.pos.distanceTo(enemy.path[0])<.4)enemy.path.shift();goal=enemy.path[0];}
  if(!goal)return;const direction=goal.clone().sub(enemy.pos).setY(0);if(direction.lengthSq()<.01)return;direction.normalize();const step=enemy.moveSpeed*this.settings.speed*dt,next=enemy.pos.clone().addScaledVector(direction,step);
  if(this.enemies.some(other=>other!==enemy&&other.alive&&other.pos.distanceTo(next)<.85)){const side=enemy.id%2?1:-1;this.move(enemy,-direction.z*step*.65*side,direction.x*step*.65*side,dt);}else this.move(enemy,direction.x*step,direction.z*step,dt);
 }
 update(dt:number,enemies=true){
  if(!this.active)return;this.elapsed+=dt;const p=this.player;
  for(const id of weaponOrder){const state=p.inventory[id];state.cooldown=Math.max(0,state.cooldown-dt);state.spray=Math.max(0,state.spray-dt*3);if(state.reload>0){state.reload=Math.max(0,state.reload-dt);if(state.reload===0){const n=Math.min(weapons[id].magazine-state.ammo,state.reserve);state.ammo+=n;state.reserve-=n;}}}
  this.flight(dt);this.updateRockets(dt);
  if(this.phase==='playing'&&this.pending>0){this.spawnTimer-=dt;if(this.spawnTimer<=0){if(this.spawnMonster())this.pending--;this.spawnTimer=.6;}}
  if(enemies&&this.phase==='playing')for(const enemy of this.enemies){if(!this.active)break;if(enemy.alive)this.chase(enemy,dt);}
  if(!this.active)return;
  for(const item of this.pickups)if(item.active&&item.pos.distanceTo(p.pos)<1.3){
   if(item.kind==='health'&&p.hp===100||item.kind==='ammo'&&weaponOrder.every(id=>p.inventory[id].reserve>=(id==='bazooka'?16:id==='rifle'?80:300)))continue;
   item.active=false;if(item.kind==='health')p.hp=Math.min(100,p.hp+25);else if(item.kind==='ammo')this.refillAmmo();else if(item.kind==='jetpack'){p.jetpack=true;p.fuel=20;}else if(item.weapon){p.weapon=item.weapon;const state=p.inventory[item.weapon];state.reserve+=Math.max(1,Math.floor((item.weapon==='bazooka'?2:item.weapon==='rifle'?12:60)*this.settings.ammo));}
   this.events.push({type:'pickup',pos:item.pos.clone()});
  }
  if(this.phase==='playing'&&this.pending===0&&this.enemies.every(e=>!e.alive)){
   if(this.wave===waveSizes.length){this.phase='cleared';this.portalOpen=true;this.events.push({type:'portal',pos:this.portalPos.clone()});}else{this.nextWave+=dt;if(this.nextWave>=2.5)this.beginWave();}
  }
  if(this.portalOpen)this.enterPortal();
 }
}