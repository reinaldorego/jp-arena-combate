import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {Match,free} from '../src/sim.ts';

const g=new Match();g.start(0);g.phase='live';
const p=g.actors[0],enemy=g.actors[5];
g.difficulty='easy';g.damage(enemy,p,'body');const easyDamage=100-p.hp;
p.hp=100;p.armor=100;g.difficulty='normal';g.damage(enemy,p,'body');
assert.ok(easyDamage<100-p.hp,'Easy mode gives time to survive enemy fire');
g.difficulty='easy';g.elapsed=10;
for(const a of g.actors)a.alive=a===enemy||a===p;
enemy.pos.set(-20,0,0);enemy.yaw=Math.PI;p.pos.set(-20,0,12);
g.events=[];g.bot(enemy,.1);assert.ok(!g.events.some(e=>e.type==='shot'),'New target gets a reaction delay even late in the round');
for(let i=0;i<8;i++)g.bot(enemy,.1);
assert.ok(g.events.some(e=>e.type==='shot'),'Enemy eventually reacts');
p.pos.set(0,0,30);g.move(p,0,-70,.1);
assert.ok(p.pos.z>-33&&free(p.pos.x,p.pos.z),'Large movement cannot tunnel through boundary walls');

const carrier=g.actors[4];carrier.alive=true;carrier.pos.set(-20,0,-10);g.bomb.carrier=4;
g.interact(carrier,1);assert.equal(carrier.action,1);
carrier.reload=1;g.interact(carrier,1);assert.equal(carrier.action,0,'Reload cancels planting');
g.events=[{type:'end',text:'old'}];g.start(0);
assert.ok(g.events.every(e=>e.type==='round'),'New match clears previous notifications');
p.spotted=99;p.silent=true;p.speed=6;p.enemyId=5;g.next();
assert.equal(p.spotted,0);assert.equal(p.silent,false);assert.equal(p.speed,0);assert.equal(p.enemyId,-1);
function shots(fps:number){const m=new Match(13);m.start(0);m.phase='live';const a=m.actors[0],b=m.actors[5];for(const actor of m.actors.slice(1))actor.alive=false;b.alive=true;a.pos.set(-20,0,25);m.move(a,0,-6/fps,1/fps);a.pos.set(-20,0,25);b.pos.set(-20,0,-25);let hits=0;const dir=b.pos.clone().add(new Vector3(0,1.15,0)).sub(a.eye).normalize();for(let i=0;i<100;i++){a.cooldown=0;a.ammo=30;a.spray=0;b.hp=100;b.alive=true;m.events=[];m.shoot(a,dir);hits+=Number(m.events.some(e=>e.type==='hit'));}return hits;}
assert.equal(shots(30),shots(144),'Movement spread is independent of frame rate');
for(const difficulty of ['easy','normal'] as const)for(const side of [0,1] as const){
 const match=new Match(37);match.difficulty=difficulty;match.start(side);
 for(let i=0;i<60*900&&match.phase!=='match';i++){match.update(1/60);match.events=[];}
 assert.equal(match.phase,'match',`${difficulty}/${side}: autonomous full match finishes`);
 assert.ok(match.history.length>=4&&match.history.length<=6);
 assert.ok(match.history.every((round,i)=>round.round===i+1),'Rounds are recorded once and in order');
}
console.log('PASS: easy damage/reaction, collision tunneling, interrupted plant, clean restart/respawn and frame rate independent accuracy');
