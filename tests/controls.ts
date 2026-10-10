import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {accelerate,smoothAim,walkSpeed} from '../src/controls.ts';
import {Arena,Monster} from '../src/sim.ts';
const v=new Vector3(),keys=new Set(['KeyW']);accelerate(v,keys,0,walkSpeed,1/60);assert.ok(v.z<0&&v.length()<6);
for(let i=0;i<60;i++)accelerate(v,keys,0,6,1/60);assert.ok(Math.abs(v.length()-6)<.001);
keys.clear();accelerate(v,keys,0,6,1/60);assert.ok(v.length()>0&&v.length()<6);for(let i=0;i<60;i++)accelerate(v,keys,0,6,1/60);assert.equal(v.length(),0);
function movement(fps:number,keys:Set<string>){const velocity=new Vector3();for(let i=0;i<fps;i++)accelerate(velocity,keys,.4,6,1/fps);return velocity;}
assert.ok(movement(30,new Set(['KeyW'])).distanceTo(movement(144,new Set(['ArrowUp'])))<1e-9);
assert.ok(movement(60,new Set(['KeyW','ArrowUp'])).distanceTo(movement(60,new Set(['KeyW'])))<1e-9);
assert.ok(movement(60,new Set(['KeyW','KeyD'])).length()<=6);assert.equal(movement(60,new Set(['KeyW','ArrowDown'])).length(),0);
let aim=smoothAim(0,true,1/60);assert.ok(aim>0&&aim<1);for(let i=0;i<60;i++)aim=smoothAim(aim,true,1/60);assert.ok(aim>.999);assert.ok(smoothAim(aim,false,1/60)<aim);
function hits(aimAmount:number,fps=60){const g=new Arena(13);g.start('guama','test');g.pending=0;const p=g.player,e=new Monster(1,0);g.enemies=[e];p.pos.set(-20,0,22);g.move(p,0,-6/fps,1/fps);p.pos.set(-20,0,22);e.pos.set(-20,0,-22);p.aimAmount=aimAmount;let count=0;const direction=e.pos.clone().add(new Vector3(0,1.1,0)).sub(p.eye).normalize();for(let i=0;i<200;i++){p.cooldown=0;p.ammo=30;p.spray=0;e.hp=100;e.alive=true;g.events=[];g.shoot(direction);count+=Number(g.events.some(e=>e.type==='hit'));}return count;}
assert.ok(hits(1)>=hits(0),'ADS never reduces accuracy');assert.equal(hits(0,30),hits(0,144),'Accuracy uses speed, independent of frame rate');
console.log('PASS: acceleration, friction, WASD/arrows, diagonal speed, ADS, frame rates and weapon accuracy');