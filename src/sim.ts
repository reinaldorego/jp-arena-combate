import {Box3,Ray,Vector3} from 'three';
import {maps,free,route,wallDistance,type MapId,type ArenaMap} from './maps.ts';

export type Difficulty='easy'|'normal';
export type Phase='menu'|'playing'|'won'|'lost';
export type Zone='head'|'body'|'legs';
export const monsterNames=['MARCUS','ADY','REINALDO','CAVALCANTE','CYNTHIA','JULIANA','SAID','JAINARA','FÁBIO','DEJA','NADJA'];
export const waveSizes=[6,9,12,17];
export class Actor{
 pos=new Vector3();yaw=0;hp=100;alive=true;aimAmount=0;speed=0;moving=0;ammo=30;reserve=180;cooldown=0;reload=0;spray=0;foot=0;
 constructor(public id:number,public name:string,public player=false){}
 get eye(){return this.pos.clone().add(new Vector3(0,1.6,0));}
}
export class Monster extends Actor{
 path:Vector3[]=[];navTime=0;attackDelay=.6;target=new Vector3();
 constructor(id:number,public variant:number){super(id,monsterNames[variant]);this.hp=48+(variant%4)*8;}
 get moveSpeed(){return 1.8+(this.variant%4)*.2;}
}
export interface Pickup{id:number;kind:'health'|'ammo';pos:Vector3;active:boolean}
export interface GameEvent{type:'spawn'|'shot'|'hit'|'kill'|'reload'|'pickup'|'wave'|'end';actor?:number;target?:number;zone?:Zone;value?:number;pos?:Vector3}
export function hitTest(map:ArenaMap,origin:Vector3,dir:Vector3,actors:Actor[],shooter:Actor){
 const ray=new Ray(origin,dir),hit=new Vector3();let distance=wallDistance(map,origin,dir),result:{actor:Actor;zone:Zone;distance:number}|undefined;
 for(const a of actors){if(a===shooter||!a.alive)continue;for(const [zone,lo,hi,w] of [['head',1.45,2.2,.34],['body',.65,1.45,.5],['legs',0,.65,.34]] as [Zone,number,number,number][]){const b=new Box3(new Vector3(a.pos.x-w,lo,a.pos.z-w),new Vector3(a.pos.x+w,hi,a.pos.z+w));if(ray.intersectBox(b,hit)){const d=origin.distanceTo(hit);if(d<distance){distance=d;result={actor:a,zone,distance:d};}}}}
 return result;
}
export class Arena{
 phase:Phase='menu';difficulty:Difficulty='easy';map:ArenaMap=maps.guama;player=new Actor(0,'Jogador',true);enemies:Monster[]=[];pickups:Pickup[]=[];events:GameEvent[]=[];
 kills=0;wave=0;pending=0;spawnTimer=0;nextWave=0;elapsed=0;spawned=0;private serial=1;private seed:number;
 constructor(seed=42){this.seed=seed;}
 random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 get totalEnemies(){return waveSizes.reduce((a,b)=>a+b,0);}
 start(mapId:MapId,name:string,difficulty:Difficulty='easy'){
  this.map=maps[mapId];this.difficulty=difficulty;Object.assign(this.player,new Actor(0,name.trim().slice(0,24)||'Jogador',true));this.player.pos.copy(this.map.spawn);
  this.enemies=[];this.pickups=[];this.events=[];this.kills=0;this.wave=0;this.spawned=0;this.serial=1;this.elapsed=0;this.nextWave=0;this.phase='playing';this.beginWave();
 }
 private beginWave(){this.wave++;this.pending=waveSizes[this.wave-1];this.spawnTimer=1;this.nextWave=0;if(this.wave>1){this.player.hp=Math.min(100,this.player.hp+15);this.player.reserve=Math.min(300,this.player.reserve+60);}this.events.push({type:'wave',value:this.wave});}
 spawnMonster(){
  const gates=this.map.gates.filter(p=>p.distanceTo(this.player.pos)>10&&this.enemies.every(e=>!e.alive||e.pos.distanceTo(p)>1.5));
  if(!gates.length)return false;
  const enemy=new Monster(this.serial++,this.spawned%monsterNames.length);enemy.pos.copy(gates[Math.floor(this.random()*gates.length)]);enemy.yaw=Math.atan2(-(this.player.pos.x-enemy.pos.x),-(this.player.pos.z-enemy.pos.z));this.enemies.push(enemy);this.spawned++;this.events.push({type:'spawn',actor:enemy.id,pos:enemy.pos.clone()});return true;
 }
 move(a:Actor,dx:number,dz:number,dt=1/60){
  const old=a.pos.clone(),steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.18));
  for(let i=0;i<steps;i++){if(free(this.map,a.pos.x+dx/steps,a.pos.z,.45))a.pos.x+=dx/steps;if(free(this.map,a.pos.x,a.pos.z+dz/steps,.45))a.pos.z+=dz/steps;}
  a.moving=a.pos.distanceTo(old);a.speed=a.moving/Math.max(dt,.0001);
 }
 visible(a:Actor,b:Actor){const delta=b.eye.sub(a.eye),distance=delta.length();return wallDistance(this.map,a.eye,delta.normalize())>distance;}
 damage(target:Actor,amount:number,actor:number,zone:Zone='body'){
  if(this.phase!=='playing'||!target.alive)return;target.hp=Math.max(0,target.hp-amount);this.events.push({type:'hit',actor,target:target.id,zone,value:amount,pos:target.pos.clone()});
  if(target.hp>0)return;target.alive=false;
  if(target.player){this.phase='lost';this.events.push({type:'end'});return;}
  this.kills++;this.events.push({type:'kill',actor,target:target.id,pos:target.pos.clone()});
  if(this.kills%4===0)this.pickups.push({id:this.serial++,kind:this.kills%8===0?'ammo':'health',pos:target.pos.clone(),active:true});
 }
 shoot(direction:Vector3,spread=true){
  const a=this.player;if(this.phase!=='playing'||!a.alive||a.cooldown>0||a.reload>0)return;
  if(a.ammo===0){this.reload();return;}a.ammo--;a.cooldown=.105;a.spray++;
  const d=direction.clone();if(spread){const cone=(.004+Math.min(a.speed/6,1)*.01+Math.min(a.spray,12)*.0003)*(1-.7*a.aimAmount);d.x+=(this.random()-.5)*cone;d.y+=(this.random()-.5)*cone;d.z+=(this.random()-.5)*cone;d.normalize();}
  this.events.push({type:'shot',actor:0,pos:a.eye});const hit=hitTest(this.map,a.eye,d,this.enemies,a);if(hit)this.damage(hit.actor,hit.zone==='head'?90:hit.zone==='body'?36:26,0,hit.zone);
 }
 reload(){const p=this.player;if(this.phase==='playing'&&p.alive&&p.reload<=0&&p.reserve>0&&p.ammo<30){p.reload=1.25;this.events.push({type:'reload',actor:0});}}
 private chase(enemy:Monster,dt:number){
  const p=this.player,delta=p.pos.clone().sub(enemy.pos),distance=delta.length();enemy.attackDelay=Math.max(0,enemy.attackDelay-dt);enemy.moving=0;enemy.speed=0;
  enemy.yaw=Math.atan2(-delta.x,-delta.z);
  if(distance<1.65&&this.visible(enemy,p)){
   if(enemy.attackDelay===0){enemy.attackDelay=this.difficulty==='easy'?1.25:.85;this.damage(p,this.difficulty==='easy'?5+enemy.variant%3:9+enemy.variant%5,enemy.id);}return;
  }
  let goal:Vector3|undefined;
  // Walk straight only when every point along the ground path is clear.
  const steps=Math.max(1,Math.ceil(distance/.4));let clear=true;
  for(let i=1;i<=steps;i++)if(!free(this.map,enemy.pos.x+delta.x*i/steps,enemy.pos.z+delta.z*i/steps,.5)){clear=false;break;}
  if(clear){goal=p.pos;}else{
   enemy.navTime-=dt;if(enemy.navTime<=0||enemy.target.distanceTo(p.pos)>3){enemy.path=route(this.map,enemy.pos,p.pos);enemy.target.copy(p.pos);enemy.navTime=.65+enemy.variant*.025;}
   while(enemy.path.length&&enemy.pos.distanceTo(enemy.path[0])<.4)enemy.path.shift();goal=enemy.path[0];
  }
  if(!goal)return;const direction=goal.clone().sub(enemy.pos);if(direction.lengthSq()<.01)return;direction.normalize();
  const step=enemy.moveSpeed*(this.difficulty==='easy'?1:1.2)*dt;
  const next=enemy.pos.clone().addScaledVector(direction,step);
  // Keep the horde spread out instead of stacking every monster in one point.
  if(this.enemies.some(other=>other!==enemy&&other.alive&&other.pos.distanceTo(next)<.85)){
   const side=enemy.id%2?1:-1;this.move(enemy,-direction.z*step*.65*side,direction.x*step*.65*side,dt);
  }else this.move(enemy,direction.x*step,direction.z*step,dt);
 }
 update(dt:number,enemies=true){
  if(this.phase!=='playing')return;this.elapsed+=dt;const p=this.player;
  p.cooldown=Math.max(0,p.cooldown-dt);p.spray=Math.max(0,p.spray-dt*3);
  if(p.reload>0){p.reload=Math.max(0,p.reload-dt);if(p.reload===0){const n=Math.min(30-p.ammo,p.reserve);p.ammo+=n;p.reserve-=n;}}
  if(this.pending>0){this.spawnTimer-=dt;if(this.spawnTimer<=0){if(this.spawnMonster())this.pending--;this.spawnTimer=.6;}}
  if(enemies)for(const enemy of this.enemies){if(this.phase!=='playing')break;if(enemy.alive)this.chase(enemy,dt);}
  if(this.phase!=='playing')return;
  for(const pickup of this.pickups)if(pickup.active&&pickup.pos.distanceTo(p.pos)<1.6){if(pickup.kind==='health'&&p.hp===100||pickup.kind==='ammo'&&p.reserve>=300)continue;pickup.active=false;if(pickup.kind==='health')p.hp=Math.min(100,p.hp+25);else p.reserve=Math.min(300,p.reserve+60);this.events.push({type:'pickup',pos:pickup.pos.clone()});}
  if(this.pending===0&&this.enemies.every(e=>!e.alive)){
   if(this.wave===waveSizes.length){this.phase='won';this.events.push({type:'end'});}else{this.nextWave+=dt;if(this.nextWave>=2.5)this.beginWave();}
  }
 }
}