import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL??'http://127.0.0.1:5173');
  await page.waitForFunction(()=>window.breach?.game);
  assert.ok(await page.evaluate(()=>document.body.classList.contains('touch-mode')));
  await page.tap('#start');await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>document.pointerLockElement),null,'Touch does not require pointer lock');
  await page.evaluate(()=>{const g=window.breach.game;g.phase='live';g.timer=75;g.events=[];const update=g.update.bind(g);g.update=dt=>update(dt,false);g.actors[0].pos.set(0,0,28);});
  const buttons=await page.locator('#touch-controls button').all();
  for(const b of buttons){const r=await b.boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height,'Every touch button fits');}
  const ammo=await page.locator('.ammo').boundingBox();
  for(const b of buttons){const r=await b.boundingBox();assert.ok(!(r.x<ammo.x+ammo.width&&r.x+r.width>ammo.x&&r.y<ammo.y+ammo.height&&r.y+r.height>ammo.y),'Buttons do not cover ammo');}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
  const cdp=await context.newCDPSession(page),points=[];
  const touch=async()=>cdp.send('Input.dispatchTouchEvent',{type:points.length?'touchMove':'touchEnd',touchPoints:points});
  const add=async(id,x,y)=>{points.push({id,x,y});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});};
  const joystick=await page.locator('#joystick').boundingBox();
  await add(1,joystick.x+joystick.width/2,joystick.y+joystick.height/2);
  points[0].y-=joystick.height*.3;await touch();await page.waitForTimeout(220);
  assert.ok(await page.evaluate(()=>window.breach.game.actors[0].pos.z)<28,'Joystick moves player');
  const aim=await page.locator('[data-hold="aim"]').boundingBox();
  await add(2,aim.x+aim.width/2,aim.y+aim.height/2);await page.waitForTimeout(450);
  assert.ok(await page.evaluate(()=>window.breach.game.actors[0].aimAmount)>.99,'ADS works during movement');
  const fire=await page.locator('[data-hold="fire"]').boundingBox();
  await add(3,fire.x+fire.width/2,fire.y+fire.height/2);await page.waitForTimeout(180);
  assert.ok(await page.evaluate(()=>window.breach.game.actors[0].ammo)<30,'Multitouch supports moving, aiming and shooting together');
  const yaw=await page.evaluate(()=>window.breach.game.actors[0].yaw);
  await add(4,viewport.width*.75,viewport.height*.4);points[3].x+=60;await touch();await page.waitForTimeout(80);
  assert.ok(await page.evaluate(()=>window.breach.game.actors[0].yaw)<yaw,'Drag rotates camera');
  points.length=0;await touch();await page.waitForTimeout(700);
  assert.ok(await page.evaluate(()=>window.breach.game.actors[0].aimAmount)<.001);
  assert.equal(await page.evaluate(()=>window.breach.game.actors[0].moving),0,'Released joystick stops');
  await mkdir('artifacts',{recursive:true});await page.screenshot({path:`artifacts/mobile-${viewport.width}.png`});
  await page.tap('[data-tap="pause"]');await page.waitForTimeout(80);
  assert.ok(await page.locator('#pause').isVisible());await page.tap('#resume');
  assert.ok(await page.locator('#touch-controls').isVisible());
  await page.evaluate(()=>{window.breach.game.phase='freeze';window.breach.game.timer=8;});
  await page.tap('[data-tap="buy"]');assert.ok(await page.locator('#buy').isVisible());
  await page.tap('[data-buy="SMG-24"]');assert.equal(await page.evaluate(()=>window.breach.game.actors[0].weapon),'SMG-24');
  await page.tap('#close-buy');assert.ok(await page.locator('#touch-controls').isVisible());
  await page.evaluate(()=>window.breach.game.phase='match');await page.waitForTimeout(120);
  await page.tap('#rematch');assert.equal(await page.evaluate(()=>window.breach.game.phase),'freeze');
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: portrait/landscape layout, multitouch movement/ADS/fire/look, release, pause, buy, rematch and no runtime errors');
} finally {await browser.close();}
