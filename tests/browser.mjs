import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const mobile=process.argv.includes('--mobile');
const sizes=mobile?[{width:390,height:844},{width:844,height:390},{width:320,height:568},{width:667,height:375}]:[{width:1366,height:768}];
await mkdir('artifacts',{recursive:true});
try {
 for(const viewport of sizes)for(const map of ['guama','jurunas']){
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL??'http://127.0.0.1:5173');await page.waitForFunction(()=>window.arena?.game);
  await page.fill('#player-name','Reinaldo <arena>');await page.click(`[data-map="${map}"]`);await page.click('#start');
  await page.waitForTimeout(250);
  const initial=await page.evaluate(()=>({phase:window.arena.game.phase,map:window.arena.game.map.id,name:window.arena.game.player.name}));
  assert.deepEqual(initial,{phase:'playing',map,name:'Reinaldo <arena>'});
  assert.equal(await page.locator('#hud-player').textContent(),'Reinaldo <arena>');
  assert.equal(await page.locator('#hud-map').textContent(),map==='guama'?'MUNDO GUAMÁ':'MUNDO JURUNAS');
  assert.equal(await page.locator('#kills').textContent(),'0');
  assert.equal(await page.locator('#objective,#progress,#radar,#score,#team').count(),0,'Tactical HUD and tutorial removed');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
  // Freeze AI for deterministic gestures; spawning, cooldown and reload still use the live update code.
  await page.evaluate(()=>{const g=window.arena.game,update=g.update.bind(g);g.update=dt=>update(dt,false);window.qaUpdate=update;const render=window.arena.renderer.render.bind(window.arena.renderer);window.arena.renderer.render=(scene,camera)=>{window.qaCamera={fov:camera.fov,x:camera.children[0].position.x};render(scene,camera);};});
  if(mobile){
   assert.equal(await page.evaluate(()=>document.pointerLockElement),null);
   const buttons=await page.locator('#touch-controls button').all(),ammo=await page.locator('.ammo').boundingBox();
   for(const button of buttons){const r=await button.boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height,'Touch button fits viewport');assert.ok(!(r.x<ammo.x+ammo.width&&r.x+r.width>ammo.x&&r.y<ammo.y+ammo.height&&r.y+r.height>ammo.y),'Controls do not cover ammo');}
   const cdp=await context.newCDPSession(page),points=[];
   const add=async(id,r)=>{points.push({id,x:r.x+r.width/2,y:r.y+r.height/2});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});};
   const move=async()=>cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points});
   const release=async()=>cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:points});
   const joystick=await page.locator('#joystick').boundingBox();await add(1,joystick);points[0].y-=35;await move();await page.waitForTimeout(250);
   assert.ok(await page.evaluate(()=>window.arena.game.player.pos.z)<17.7,'Joystick moves player');
   await add(2,await page.locator('[data-toggle=aim]').boundingBox());points.splice(1,1);await release();await page.waitForTimeout(500);
   assert.ok(await page.evaluate(()=>window.arena.game.player.aimAmount)>.99,'ADS works while moving');
   assert.ok(await page.evaluate(()=>window.qaCamera.fov)<51,'Smooth ADS zoom');
   assert.ok(await page.evaluate(()=>window.qaCamera.x)<-.22,'Weapon centers during ADS');
   assert.ok(Number(await page.locator('#crosshair').evaluate(el=>el.style.opacity))<.01);
   await add(3,await page.locator('[data-hold=fire]').boundingBox());await page.waitForTimeout(220);
   assert.ok(await page.evaluate(()=>window.arena.game.player.ammo)<30,'Fire works while moving and aiming');
   const yaw=await page.evaluate(()=>window.arena.game.player.yaw);points[1].x-=22;await move();await page.waitForTimeout(100);assert.ok(Math.abs(await page.evaluate(()=>window.arena.game.player.yaw)-yaw)>.03,'Drag fire button rotates camera');
   points.length=0;await release();await page.tap('[data-toggle=aim]');await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>window.arena.game.player.aimAmount)<.01);
   const ammoBefore=await page.evaluate(()=>window.arena.game.player.ammo);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.arena.game.player.ammo),ammoBefore,'Release stops shooting');
   await page.tap('[data-tap=reload]');await page.waitForTimeout(1400);assert.equal(await page.evaluate(()=>window.arena.game.player.ammo),30);
   await page.tap('[data-tap=pause]');
  }else{
   await page.waitForFunction(()=>document.pointerLockElement?.id==='world');
   await page.keyboard.down('ArrowUp');await page.waitForTimeout(300);await page.keyboard.up('ArrowUp');assert.ok(await page.evaluate(()=>window.arena.game.player.pos.z)<17.7);
   await page.mouse.down({button:'right'});await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>window.arena.game.player.aimAmount)>.99);assert.ok(await page.evaluate(()=>window.qaCamera.fov)<51);
   await page.mouse.down();await page.waitForTimeout(230);await page.mouse.up();await page.mouse.up({button:'right'});assert.ok(await page.evaluate(()=>window.arena.game.player.ammo)<30);
   await page.keyboard.press('KeyR');await page.waitForTimeout(1400);assert.equal(await page.evaluate(()=>window.arena.game.player.ammo),30);await page.keyboard.press('Escape');
  }
  assert.ok(await page.locator('#pause').isVisible());const elapsed=await page.evaluate(()=>window.arena.game.elapsed);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.arena.game.elapsed),elapsed,'Pause freezes game');
  await page.click('#resume');await page.waitForTimeout(150);
  // A live spawned monster pursues and damages the player, then ends the match.
  await page.evaluate(()=>{const g=window.arena.game;g.pending=0;const enemy=g.enemies.find(e=>e.alive);enemy.pos.copy(g.player.pos);enemy.pos.z-=1;enemy.attackDelay=0;window.qaUpdate(.02);});
  assert.ok(await page.evaluate(()=>window.arena.game.player.hp)<100);
  await page.screenshot({path:`artifacts/arena-${map}-${viewport.width}x${viewport.height}.png`});
  await page.evaluate(()=>window.arena.game.damage(window.arena.game.player,999,1));await page.waitForTimeout(150);assert.ok(await page.locator('#result').isVisible());assert.equal(await page.locator('#result-title').textContent(),'FIM DE JOGO');
  await page.click('#rematch');await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.arena.game.kills),0);assert.equal(await page.evaluate(()=>window.arena.game.player.hp),100);
  // Finish all four waves through simulation, then verify the rendered victory HUD.
  await page.evaluate(()=>{const g=window.arena.game;for(let i=0;i<12000&&g.phase==='playing';i++){window.qaUpdate(1/60,false);for(const e of g.enemies)if(e.alive)g.damage(e,999,0);g.events=[];}});
  await page.waitForTimeout(180);assert.equal(await page.locator('#result-title').textContent(),'MUNDO CONQUISTADO');assert.equal(await page.locator('#kills').textContent(),'44');
  await page.click('#result-home');assert.ok(await page.locator('#menu').isVisible());assert.ok(await page.locator('#hud').isHidden());
  await page.click(`[data-map="${map==='guama'?'jurunas':'guama'}"]`);await page.click('#start');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.arena.game.enemies.length),0,'New world has no previous monsters');
  assert.deepEqual(errors,[]);console.log(`PASS ${mobile?'mobile':'desktop'} ${viewport.width}x${viewport.height} ${map}: name/map, clean HUD, movement, ADS, fire, reload, pause, damage, defeat, replay, 44-kill victory, world switch`);
  await context.close();
 }
}finally{await browser.close();}