import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {accelerate,smoothAim,walkSpeed} from '../src/controls.ts';
import {Match} from '../src/sim.ts';

const velocity=new Vector3(),keys=new Set(['KeyW']);
accelerate(velocity,keys,0,walkSpeed,1/60);
assert.ok(velocity.z<0&&velocity.length()<walkSpeed,'Starts gradually');
for(let i=0;i<60;i++)accelerate(velocity,keys,0,walkSpeed,1/60);
assert.ok(Math.abs(velocity.length()-6)<.001,'Reaches base speed');
keys.clear();accelerate(velocity,keys,0,walkSpeed,1/60);
assert.ok(velocity.length()>0&&velocity.length()<6,'Release decelerates');
for(let i=0;i<60;i++)accelerate(velocity,keys,0,walkSpeed,1/60);
assert.equal(velocity.length(),0,'Stops without endless drift');

function movement(fps:number,keys:Set<string>){const v=new Vector3();for(let i=0;i<fps;i++)accelerate(v,keys,.4,walkSpeed,1/fps);return v;}
assert.ok(movement(30,new Set(['KeyW'])).distanceTo(movement(144,new Set(['ArrowUp'])))<1e-9,'Frame rate independent; arrows match WASD');
assert.ok(movement(60,new Set(['KeyW','ArrowUp'])).distanceTo(movement(60,new Set(['KeyW'])))<1e-9,'Duplicate bindings do not double speed');
assert.ok(movement(60,new Set(['KeyW','KeyD'])).length()<=6,'Diagonal speed stays bounded');
assert.equal(movement(60,new Set(['KeyW','ArrowDown'])).length(),0,'Opposite bindings cancel');
let aim=smoothAim(0,true,1/60);assert.ok(aim>0&&aim<1);
for(let i=0;i<60;i++)aim=smoothAim(aim,true,1/60);
assert.ok(aim>.999);assert.ok(smoothAim(aim,false,1/60)<aim,'ADS exits smoothly');

function hits(aimAmount:number){
 const g=new Match(37);g.start(0);g.phase='live';const a=g.actors[0],b=g.actors[5];
 for(const actor of g.actors.slice(1))actor.alive=false;b.alive=true;
 a.pos.set(-20,0,25);b.pos.set(-20,0,-25);a.moving=.1;a.speed=6;a.aimAmount=aimAmount;
 const direction=b.pos.clone().add(new Vector3(0,1.15,0)).sub(a.eye).normalize();let count=0;
 for(let i=0;i<200;i++){a.cooldown=0;a.spray=0;a.ammo=30;b.hp=100;b.alive=true;g.events=[];g.shoot(a,direction);count+=Number(g.events.some(e=>e.type==='hit'));}
 return count;
}
assert.ok(hits(1)>hits(0),'ADS improves actual hit rate with identical random shots');
const g=new Match();g.start(0);g.actors[0].aimAmount=1;g.next();assert.equal(g.actors[0].aimAmount,0,'Respawn clears ADS');
console.log('PASS: acceleration, friction, frame rates, bindings, diagonal speed, ADS transition, accuracy and respawn');
