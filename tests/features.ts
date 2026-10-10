import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {Arena,Monster,difficultySettings} from '../src/sim.ts';
import {weapons,weaponOrder} from '../src/weapons.ts';
import {free} from '../src/maps.ts';

const totals=[],hp=[],damage=[],ammo=[];
for(const difficulty of ['easy','normal','hard'] as const){
 const g=new Arena(8);g.start('guama','Pilot',difficulty);totals.push(g.totalEnemies);ammo.push(g.player.reserve);g.update(1.01,false);hp.push(g.enemies[0].hp);
 const enemy=g.enemies[0];enemy.pos.copy(g.player.pos);enemy.pos.z-=1;enemy.attackDelay=0;g.update(.01);damage.push(100-g.player.hp);
 g.player.hp=100;for(let i=0;i<12000&&g.phase==='playing';i++){g.update(1/60,false);for(const e of g.enemies)if(e.alive)g.damage(e,999,0);g.events=[];}
 assert.equal(g.phase,'cleared');assert.equal(g.kills,g.totalEnemies);assert.equal(g.portalOpen,true);assert.equal(g.worldKills,g.totalEnemies);
 assert.equal(g.enterPortal(),false,'Cannot enter a portal from across the arena');
 const kills=g.kills;g.selectWeapon('rifle');const reserve=g.player.reserve;g.player.pos.copy(g.portalPos);g.update(.01,false);
 assert.equal(g.map.id,'jurunas');assert.equal(g.phase,'playing');assert.equal(g.portalOpen,false);assert.equal(g.level,2);assert.equal(g.player.name,'Pilot');assert.equal(g.difficulty,difficulty);assert.equal(g.kills,kills);assert.equal(g.worldKills,0);assert.equal(g.player.weapon,'rifle');assert.equal(g.player.reserve,reserve);
 for(let i=0;i<12000&&g.phase==='playing';i++){g.update(1/60,false);for(const e of g.enemies)if(e.alive)g.damage(e,999,0);g.events=[];}
 g.player.pos.copy(g.portalPos);g.update(.01,false);assert.equal(g.map.id,'guama');assert.equal(g.level,3);assert.equal(g.kills,kills*2);
}
assert.deepEqual(totals,[44,57,73]);assert.ok(hp[0]<hp[1]&&hp[1]<hp[2]);assert.ok(damage[0]<damage[1]&&damage[1]<damage[2]);assert.ok(ammo[0]>ammo[1]&&ammo[1]>ammo[2]);

function range(){const g=new Arena();g.start('guama','test');g.pending=0;g.player.pos.set(-20,0,18);const idle=new Monster(90,0);idle.pos.set(20,0,-20);g.enemies=[idle];return g;}
for(const weapon of weaponOrder){
 const g=range();g.selectWeapon(weapon);assert.equal(g.player.ammo,weapons[weapon].magazine);const before=g.player.ammo;
 g.shoot(new Vector3(0,0,-1),false);assert.equal(g.player.ammo,before-1);g.shoot(new Vector3(0,0,-1),false);assert.equal(g.player.ammo,before-1,'Cooldown applies');
 const state=g.player.inventory[weapon],reserve=state.reserve;g.reload();assert.equal(state.reload,weapons[weapon].reload);g.cycleWeapon();g.update(weapons[weapon].reload+.01,false);assert.equal(state.ammo,weapons[weapon].magazine);assert.equal(state.reserve,reserve-1,'Reload continues on holstered weapon without duplicating ammo');
}
const rifle=range(),target=new Monster(50,0);target.pos.set(-20,0,-18);rifle.enemies=[target];rifle.selectWeapon('rifle');rifle.shoot(target.eye.sub(rifle.player.eye).normalize(),false);assert.equal(target.alive,false,'Precision rifle kills a distant target');
const machinegun=range(),victim=new Monster(50,0);victim.pos.set(-20,0,10);machinegun.enemies=[victim];machinegun.shoot(victim.pos.clone().add(new Vector3(0,1.1,0)).sub(machinegun.player.eye).normalize(),false);assert.equal(victim.hp,48-weapons.machinegun.damage);assert.ok(weapons.machinegun.interval<weapons.rifle.interval);
const blast=range(),one=new Monster(50,0),two=new Monster(51,1);one.pos.set(-20,0,9);two.pos.set(-18,0,9);blast.enemies=[one,two];blast.selectWeapon('bazooka');blast.shoot(one.eye.sub(blast.player.eye).normalize(),false);assert.equal(blast.rockets.length,1);assert.ok(one.alive,'Rocket has travel time');for(let i=0;i<60;i++)blast.update(1/60,false);assert.equal(blast.kills,2,'Explosion hurts multiple monsters');assert.equal(blast.rockets.length,0);assert.ok(blast.events.some(e=>e.type==='explosion'));
const blocked=range(),hidden=new Monster(50,0);blocked.player.pos.set(-11,0,0);hidden.pos.set(-11,0,-14);blocked.enemies=[hidden];blocked.selectWeapon('bazooka');blocked.shoot(new Vector3(0,0,-1),false);for(let i=0;i<60;i++)blocked.update(1/60,false);assert.equal(hidden.hp,48,'Walls block rockets and blast damage');assert.equal(blocked.rockets.length,0);
const floor=range();floor.selectWeapon('bazooka');floor.shoot(new Vector3(0,-1,0),false);floor.update(.1,false);assert.equal(floor.rockets.length,0,'Downward rocket explodes on the floor');
const out=range();out.selectWeapon('bazooka');out.player.ammo=out.player.reserve=0;out.shoot(new Vector3(0,0,-1));assert.equal(out.rockets.length,0);

for(const map of ['guama','jurunas'] as const){
 const g=new Arena();g.start(map,'Pilot');g.pending=0;g.enemies=[new Monster(50,0)];g.enemies[0].pos.set(-20,0,-20);
 assert.ok(g.pickups.every(item=>free(g.map,item.pos.x,item.pos.z)),'All pickups are reachable');
 const jet=g.pickups.find(p=>p.kind==='jetpack')!;g.player.pos.copy(jet.pos);g.update(.01,false);assert.ok(g.player.jetpack);assert.equal(g.player.fuel,20);assert.equal(jet.active,false);
 g.lift=true;for(let i=0;i<600;i++)g.update(1/60,false);assert.ok(g.player.flying);assert.ok(Math.abs(g.player.fuel-10)<1e-7);assert.equal(g.player.pos.y,9,'Flight stays inside ceiling');
 const y=g.player.pos.y,fuel=g.player.fuel;g.lift=false;g.update(.1,false);assert.ok(g.player.pos.y<y,'Gravity returns after releasing jetpack');assert.equal(g.player.fuel,fuel);
 g.lift=true;for(let i=0;i<601;i++)g.update(1/60,false);assert.ok(g.player.fuel<1e-7);g.update(.1,false);assert.equal(g.player.flying,false,'Fuel exhaustion stops hovering');
 g.lift=false;for(let i=0;i<180;i++)g.update(1/60,false);assert.equal(g.player.pos.y,0,'Safe landing');
 g.player.pos.set(-11,6,-8);g.lift=false;for(let i=0;i<240;i++)g.update(1/60,false);assert.ok(g.player.pos.y>=0);assert.ok(free(g.map,g.player.pos.x,g.player.pos.z,.45,g.player.pos.y),'Roof landing never embeds the player in a wall');
 g.player.pos.set(0,0,18);g.lift=true;g.player.jetpack=false;g.update(.01,false);assert.ok(g.player.pos.y>0,'Space jumps without jetpack');g.lift=false;for(let i=0;i<120;i++)g.update(1/60,false);assert.equal(g.player.pos.y,0);
 const item=g.pickups.find(p=>p.weapon==='bazooka')!,before=g.player.inventory.bazooka.reserve;g.player.pos.copy(item.pos);g.update(.01,false);assert.equal(g.player.weapon,'bazooka');assert.ok(g.player.reserve>before);assert.equal(item.active,false);
 g.player.pos.set(0,6,18);const enemy=g.enemies[0];enemy.pos.set(0,0,17);enemy.attackDelay=0;g.update(.01);assert.equal(g.player.hp,100,'Ground monsters cannot strike a flying player');assert.equal(enemy.pos.y,0,'Monsters do not fly');
 g.damage(g.player,999,enemy.id);const elapsed=g.elapsed;g.lift=true;g.update(5);assert.equal(g.elapsed,elapsed);assert.equal(g.player.flying,false);
}
console.log('PASS: difficulty health/damage/waves/ammo; both directions of portal progression; inventory persistence; three weapons, rocket travel/AOE/occlusion/floor, reload/empty ammo; pickups, 20-second fuel, jump, gravity, roof landing, flight ceiling and airborne combat');