import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:'artifacts',size:{width:1280,height:720}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});const started=Date.now();await page.goto(process.env.GAME_URL??'http://127.0.0.1:5173');await page.waitForFunction(()=>window.breach?.telemetry().firstFrameMs>0);const ready=Date.now()-started;await page.screenshot({path:'artifacts/menu.png'});
// Run full autonomous match in real wall-clock time and record its actual rendered frames.
await page.evaluate(()=>{const b=window.breach;b.game.start(0);document.querySelector('#menu').classList.add('hidden');document.querySelector('#hud').classList.remove('hidden');b.game.actors[0].alive=false;});
await page.waitForFunction(()=>window.breach.game.phase==='match',null,{timeout:660000});await page.screenshot({path:'artifacts/match.png'});const telemetry=await page.evaluate(()=>window.breach.telemetry());const sorted=[...telemetry.fps].sort((a,b)=>a-b);const report={readyMs:ready,...telemetry,medianFPS:sorted[Math.floor(sorted.length/2)],p5FPS:sorted[Math.floor(sorted.length*.05)],consoleErrors:errors,note:'Chrome headless / viewport 1280×720; benchmark applies only to this machine.'};await writeFile('artifacts/browser-report.json',JSON.stringify(report,null,2));await context.close();await browser.close();assert.equal(errors.length,0);assert.ok(telemetry.history.length>=3);console.log(report);
