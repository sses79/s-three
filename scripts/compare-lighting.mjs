import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser,openWatch} from './browser.mjs';
import {startServer} from './serve.mjs';

const {server,url}=await startServer({port:0});let browser;
try{
  await mkdir('out/lighting',{recursive:true});browser=await openBrowser();
  const {page,errors}=await openWatch(browser,url,{query:'capture=1'});
  const status=await page.evaluate(()=>window.secondShowcase.sample());
  assert.equal(status.lighting.available,true,'The actual HDRI must load');
  const frames=[];
  for(const [finish,time] of [['steel',3.115],['gold',8.5],['graphite',10.8]]){
    const pair=[];
    for(const profile of ['original','hdri']){
      await page.evaluate(profile=>window.secondShowcase.setLighting(profile),profile);
      const state=await page.evaluate(time=>window.secondShowcase.renderAt(time),time);
      assert.equal(state.lighting.profile,profile);assert.equal(state.time,time);
      const image=await page.screenshot({path:`out/lighting/${profile}-${finish}.png`});
      pair.push(image);frames.push({label:`${profile==='hdri'?'Studio Small 09':'Original'} / ${finish}`,data:image.toString('base64'),state});
    }
    assert.notDeepEqual(pair[0],pair[1],`${finish}: lighting must visibly change`);
  }
  const sheet=await page.evaluate(async frames=>{
    const c=document.createElement('canvas'),w=640,h=360,pad=12,label=35;c.width=2*w+3*pad;c.height=3*(h+label+pad)+pad;
    const ctx=c.getContext('2d');ctx.fillStyle='#eeeae2';ctx.fillRect(0,0,c.width,c.height);
    for(let i=0;i<frames.length;i++){
      const f=frames[i],img=new Image();img.src='data:image/png;base64,'+f.data;await img.decode();
      const x=pad+i%2*(w+pad),y=pad+Math.floor(i/2)*(h+label+pad);
      ctx.fillStyle='#45553b';ctx.font='15px Arial';ctx.fillText(f.label,x,y+20);ctx.drawImage(img,x,y+label,w,h);
    }
    return c.toDataURL('image/png').split(',')[1];
  },frames.map(({label,data})=>({label,data})));
  await writeFile('out/lighting/comparison.png',Buffer.from(sheet,'base64'));
  await writeFile('out/lighting/manifest.json',JSON.stringify(frames.map(({label,state})=>({label,state})),null,2));
  assert.deepEqual(errors,[]);console.log('Verified both lighting profiles across all three finishes. Saved out/lighting/comparison.png');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
