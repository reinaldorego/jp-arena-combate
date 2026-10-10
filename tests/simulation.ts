import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {Arena,Monster,monsterNames,waveSizes,hitTest} from '../src/sim.ts';
import {maps,free,route} from '../src/maps.ts';

assert.equal(monsterNames.length,11);assert.equal(new Set(monsterNames).size,11);
assert.notDeepEqual(maps.guama.blocks,maps.jurunas.blocks,'Maps have distinct geometry');
for(const map of Object.values(maps)){
 assert.ok(free(map,map.spawn.x,map.spawn.z));
 for(const gate of map.gates){assert.ok(free(map,gate.x,gate.z));const path=route(map,gate,map.spawn);assert.ok(path.length>0);assert.ok(path.every(p=>free(map,p.x,p.z,.5)));assert.ok(path.at(-1)!.distanceTo(map.spawn)<2.1);}
 const g=new Arena(37);g.start(map.id,'  Arena Player  ');assert.equal(g.player.name,'Arena Player');assert.equal(g.phase,'playing');assert.equal(g.kills,0);
 const before=g.player.pos.clone();g.move(g.player,0,-100,.1);assert.ok(free(map,g.player.pos.x,g.player.pos.z));assert.ok(g.player.pos.z>-24,'No wall tunneling');g.player.pos.copy(before);
 // Exercise every spawn and wave through the same update path used by the UI.
 for(let i=0;i<60*180&&g.phase==='playing';i++){
  g.update(1/60,false);
  for(const enemy of g.enemies)if(enemy.alive)g.damage(enemy,999,0);
  g.events=[];
 }
 assert.equal(g.phase,'cleared');assert.equal(g.wave,4);assert.equal(g.kills,waveSizes.reduce((a,b)=>a+b,0));assert.equal(g.spawned,g.kills);assert.ok(monsterNames.every(name=>g.enemies.some(e=>e.name===name)));
 const count=g.kills;g.damage(g.enemies[0],999,0);assert.equal(g.kills,count,'Dead monsters cannot award duplicate kills');
 g.start(map.id,'');assert.equal(g.player.name,'Jogador');assert.equal(g.kills,0);assert.equal(g.wave,1);assert.equal(g.player.hp,100);assert.equal(g.enemies.length,0);
 // Newly spawned monsters move toward an unobstructed player and can hurt them.
 g.update(1.01,false);const enemy=g.enemies[0];enemy.pos.set(0,0,14);const distance=enemy.pos.distanceTo(g.player.pos);
 for(let i=0;i<30;i++)g.update(1/60);assert.ok(enemy.pos.distanceTo(g.player.pos)<distance);
 enemy.pos.set(0,0,17);enemy.attackDelay=0;g.update(.02);assert.ok(g.player.hp<100);
 g.damage(g.player,999,enemy.id);assert.equal(g.phase,'lost');const elapsed=g.elapsed;g.update(10);assert.equal(g.elapsed,elapsed,'Defeat stops the simulation');
 // Navigation must handle obstacles instead of freezing at the walls.
 const chase=new Arena(4);chase.start(map.id,'test');chase.pending=0;const hunter=new Monster(1,0);hunter.pos.set(-20,0,-20);chase.enemies=[hunter];
 for(let i=0;i<60*80&&chase.player.hp===100;i++)chase.update(1/60);
 assert.ok(chase.player.hp<100,`${map.name}: hunter reaches the player around obstacles`);
}
const g=new Arena();g.start('guama','<script>');g.pending=0;const enemy=new Monster(1,0);g.enemies=[enemy];g.player.pos.set(0,0,10);enemy.pos.set(0,0,0);
for(const [zone,height] of [['head',1.8],['body',1.1],['legs',.3]] as const){assert.equal(hitTest(g.map,new Vector3(0,height,10),new Vector3(0,0,-1),g.enemies,g.player)?.zone,zone);}
enemy.pos.set(-11,0,-14);g.player.pos.set(-11,0,0);assert.equal(hitTest(g.map,g.player.eye,new Vector3(0,0,-1),g.enemies,g.player),undefined,'Buildings block bullets');
g.player.ammo=0;g.player.reserve=17;g.shoot(new Vector3(0,0,-1));assert.ok(g.player.reload>0);g.update(1.5,false);assert.equal(g.player.ammo,17);assert.equal(g.player.reserve,0);
g.player.hp=40;g.pickups=[{id:2,kind:'health',pos:g.player.pos.clone(),active:true}];g.update(.01,false);assert.equal(g.player.hp,65);assert.equal(g.pickups[0].active,false);
g.start('jurunas','new');assert.equal(g.map.id,'jurunas');assert.equal(g.enemies.length,0);assert.equal(g.pickups.length,4);
console.log('PASS: two map layouts, navigable spawn gates, four complete waves, all 11 monster names, exact kills, pursuit, melee, victory/defeat, collision, bullet occlusion, reload, pickups and restart');