import sharp from 'sharp';
import { paper } from './bg.mjs';
const [,, file, outp] = process.argv;
const img = sharp(file); const { width: W, height: H } = await img.metadata();
const { data } = await img.clone().raw().toBuffer({ resolveWithObject: true });
const bg = await paper(data, W, H);
const pick = [[255,1490],[300,1560],[420,1100],[700,500],[900,1500]];
for (const [x,y] of pick) { const i=(y*W+x)*3; console.log(x,y,'px',data[i],data[i+1],data[i+2],'bg',bg[i],bg[i+1],bg[i+2],'ratio',(data[i]/bg[i]).toFixed(2),(data[i+1]/bg[i+1]).toFixed(2),(data[i+2]/bg[i+2]).toFixed(2)); }
const m = Buffer.alloc(W*H);
for (let i=0;i<W*H;i++){ const j=i*3; const rr=data[j]/Math.max(bg[j],1), rg=data[j+1]/Math.max(bg[j+1],1), rb=data[j+2]/Math.max(bg[j+2],1); const rt=(rr+rg+rb)/3; m[i] = (rt<0.62 && rt>0.1 && Math.abs(rr-rb)<0.14 && Math.abs(rg-rb)<0.14) ? 255 : 0; }
await sharp(m,{raw:{width:W,height:H,channels:1}}).resize({width:700}).png().toFile(outp);
