import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.mjs';
import {startServer} from './serve.mjs';

const {server,url}=await startServer({port:0});let browser;
await mkdir('out/citrus',{recursive:true});
try{
  browser=await openBrowser();const results=[];
  const open=async({mobile=false,webgl=false}={})=>{
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1600,height:1000},deviceScaleFactor:1,hasTouch:mobile,reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(`${url}/citrus/?capture=1${webgl?'&webgl=1':''}`);
    await page.waitForFunction(()=>window.citrusPlayground||document.querySelector('#scene').dataset.error,null,{timeout:60000});
    assert.equal(await page.locator('#scene').getAttribute('data-error'),null,errors.join('\n'));
    return {page,errors};
  };
  {
    const{page,errors}=await open();
    const initial=await page.evaluate(()=>window.citrusPlayground.advance(120));assert.equal(initial.paused,true);assert.equal(initial.actor.support,'jelly');
    await page.screenshot({path:'out/citrus/standing.png'});
    await page.locator('#scene').focus();await page.keyboard.press('Space');
    await page.waitForFunction(()=>window.citrusPlayground.diagnostics().jumps===1);
    await page.evaluate(()=>window.citrusPlayground.pause(true));
    const air=await page.evaluate(()=>window.citrusPlayground.advance(32));assert.equal(air.actor.support,'air');assert.ok(air.actor.y>initial.actor.y+.4);
    await page.screenshot({path:'out/citrus/jump.png'});
    const landed=await page.evaluate(()=>window.citrusPlayground.advance(450));
    assert.ok(landed.landings>=1);assert.equal(landed.actor.support,'jelly');assert.ok(landed.peakDent>.04);assert.equal(landed.jelly.recoveries,0);
    await page.screenshot({path:'out/citrus/landed.png'});
    await page.keyboard.down('ArrowRight');const moved=await page.evaluate(()=>window.citrusPlayground.advance(90));await page.keyboard.up('ArrowRight');
    assert.ok(Math.hypot(moved.actor.x,moved.actor.z-.78)>.4);
    await page.locator('#reset').click();await page.evaluate(()=>window.citrusPlayground.pause(true));
    const before=await page.evaluate(()=>window.citrusPlayground.advance(120));
    await page.mouse.move(before.screenJelly.x,before.screenJelly.y);await page.mouse.down();
    assert.equal((await page.evaluate(()=>window.citrusPlayground.diagnostics())).dragging,true);
    await page.mouse.move(before.screenJelly.x,before.screenJelly.y-55,{steps:6});await page.mouse.up();
    assert.equal((await page.evaluate(()=>window.citrusPlayground.diagnostics())).dragging,false);
    await page.evaluate(()=>window.citrusPlayground.pause(true));const released=await page.evaluate(()=>window.citrusPlayground.advance(180));assert.equal(released.jelly.finite,true);
    assert.deepEqual(errors,[]);results.push({backend:initial.backend,jumps:landed.jumps,landings:landed.landings,peakDent:landed.peakDent,volume:landed.jelly.volumeRatio});
    console.log('Desktop: tiny rig, keyboard jump, two-way jelly deformation, landing, movement and flesh dragging passed');await page.close();
  }
  {
    const{page,errors}=await open({webgl:true});await page.evaluate(()=>{window.citrusPlayground.advance(120);window.citrusPlayground.jump();});
    const d=await page.evaluate(()=>window.citrusPlayground.advance(400));assert.equal(d.backend,'WebGL2');assert.ok(d.landings>=1);assert.equal(d.jelly.finite,true);
    await page.screenshot({path:'out/citrus/webgl.png'});assert.deepEqual(errors,[]);console.log('WebGL2: model, jelly material and landing passed');await page.close();
  }
  {
    const{page,errors}=await open({mobile:true});await page.locator('#touch-jump').tap();await page.waitForFunction(()=>window.citrusPlayground.diagnostics().jumps===1);
    await page.evaluate(()=>window.citrusPlayground.pause(true));const d=await page.evaluate(()=>window.citrusPlayground.advance(25));assert.equal(d.actor.support,'air');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
    const jump=await page.locator('#touch-jump').boundingBox();assert.ok(jump.y+jump.height<=844);
    await page.screenshot({path:'out/citrus/mobile.png'});assert.deepEqual(errors,[]);console.log('Phone viewport: touch jump, reduced-motion starting state and layout passed');await page.close();
  }
  await writeFile('out/citrus/results.json',JSON.stringify(results,null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
