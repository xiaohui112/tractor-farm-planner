// Host adaptation and independent result checks only; placement stays in Mod Lua.
import lua51 from './runtime/lua51.mjs';

const F=Math.fround;
export const distanceSquared=(ax,ay,az,bx,by,bz)=>{
 const dx=F(F(ax)-F(bx)),dy=F(F(ay)-F(by)),dz=F(F(az)-F(bz));
 return F(F(dz*dz)+F(F(dx*dx)+F(dy*dy)));
};
const radiusSquared=r=>F(F(r)*F(r));
const quote=s=>'"'+s.replace(/[\x00-\x1f\\"]/g,c=>'\\'+c.charCodeAt(0).toString().padStart(3,'0'))+'"';
function literal(value){
 if(value===null||value===undefined)return 'nil';
 if(typeof value==='string')return quote(value);
 if(typeof value==='boolean')return String(value);
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('场景包含非有限数值。');return String(value);}
 return '{'+Object.entries(value).map(([k,v])=>'['+(Array.isArray(value)?Number(k)+1:quote(k))+']='+literal(v)).join(',')+'}';
}
export function normalize(data,meta){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('请输入有效的测试场景。');
 const value=(key,fallback)=>Object.hasOwn(data,key)?data[key]:fallback;
 const strategy=value('strategy','GIANT'),season=value('season','autumn'),width=value('width',2),height=value('height',2);
 if(!['GIANT','GIANT_TEMPLATE'].includes(strategy))throw Error('播种策略无效。');
 if(!['autumn','winter','spring','summer'].includes(season))throw Error('季节无效。');
 if(![width,height].every(n=>Number.isSafeInteger(n)&&n>=1))throw Error('农田宽高须为正整数。');
 const tiles=value('tiles',undefined)===undefined?Array.from({length:width*height},(_,i)=>[i%width,Math.floor(i/width)]):data.tiles;
 if(!Array.isArray(tiles)||!tiles.length)throw Error('请至少选一块农田。');
 const seen=new Set();
 for(const p of tiles){
  if(!Array.isArray(p)||p.length!==2||!p.every(Number.isSafeInteger)||p[0]<0||p[1]<0||p[0]>=width||p[1]>=height)throw Error('地皮坐标超出画布范围。');
  const k=p.join(',');if(seen.has(k))throw Error('存在重复地皮。');seen.add(k);
 }
 const start=value('start',tiles[0]);
 if(!Array.isArray(start)||start.length!==2||!start.every(Number.isSafeInteger)||!seen.has(start.join(',')))throw Error('请在已选择的农田中设置起点。');
 const supplied=value('seeds',{}),order=[...meta.crops.map(c=>c.id),'randomseed'];
 if(!supplied||typeof supplied!=='object'||Array.isArray(supplied)||Object.keys(supplied).some(k=>!order.includes(k)))throw Error('种子种类无效。');
 const seeds={};for(const k of order){const n=Object.hasOwn(supplied,k)?supplied[k]:0;if(!Number.isInteger(n)||n<0||n>9999)throw Error('种子数量须为0至9999的整数。');seeds[k]=n;}
 const template_id=data.template_id||null;
 if(template_id!==null&&(strategy!=='GIANT_TEMPLATE'||!meta.templates.some(t=>t.id===template_id)))throw Error('锁定模版编号无效，或当前策略不是模版。');
 return {template_id,strategy,season,width,height,tiles:tiles.map(p=>[...p]),start:[...start],seeds};
}
const reasons={NO_BALANCED_COMBO:'现有应季库存与农田容量无法组成逐地皮互补配比，请调整种子或农田范围。',MISSING_SEEDS:'没有能组成同族的应季种子，请增加种子或检查季节。',FARM_TOO_LARGE:'从起点连通的农田超过最优策略的64块上限；可缩小范围或切换模版策略。',NEED_PLOW:'起点需要完整的九宫格空坑。',FOREIGN_CROP:'起点存在不符合空田要求的作物或障碍。',NO_FAMILY:'本次未找到能通过同族与坑距检查的方案。'};
function checked(result,data,bundle){
 const used={},remaining={...data.seeds},perTile=new Map(),buckets=new Map(),defs=bundle.definitions;
 for(const p of result.slots){if(!p.crop)continue;used[p.crop]=(used[p.crop]||0)+1;remaining[p.crop]--;const key=p.cx+','+p.cz;const row=perTile.get(key)||[];row.push(p);perTile.set(key,row);}
 Object.assign(result,{strategy:data.strategy,input:data,source:bundle.meta,used,remaining});
 if(!result.count){result.message=reasons[result.reason]||'本次没有生成播种方案。';return result;}
 const radius=Math.max(bundle.meta.constants.FARM_TILL_SPACING,...Object.keys(used).map(k=>defs[k].family_check_dist));
 for(const p of result.slots){if(!p.crop)continue;const key=Math.floor(p.x/radius)+','+Math.floor(p.z/radius),row=buckets.get(key)||[];row.push(p);buckets.set(key,row);}
 let familyPassed=0,spacing=true;
 for(const p of result.slots){if(!p.crop)continue;const d=defs[p.crop],bx=Math.floor(p.x/radius),bz=Math.floor(p.z/radius);let family=0;
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(const q of buckets.get((bx+dx)+','+(bz+dz))||[]){
   const squared=distanceSquared(p.x,0,p.z,q.x,0,q.z);
   if(q.crop===p.crop&&squared<=radiusSquared(d.family_check_dist))family++;
   if(q!==p&&squared<=radiusSquared(bundle.meta.constants.FARM_TILL_SPACING))spacing=false;
  }
  Object.assign(p,{family,family_min:d.family_min_count,family_radius:d.family_check_dist});if(family>=d.family_min_count)familyPassed++;
 }
 const nutrientTiles=result.tiles.map(tile=>{
  const net=[0,0,0];for(const p of perTile.get(tile.x+','+tile.z)||[]){const d=defs[p.crop],consume=[1,2,3].map(i=>d.nutrient_consumption[i]||0),restore=[1,2,3].filter(i=>d.nutrient_restoration[i]);
   for(let i=1;i<=3;i++)net[i-1]+=(restore.includes(i)?consume.reduce((a,b)=>a+b,0)/restore.length:0)-consume[i-1];
  }
  return {...tile,net,balanced:net.every(n=>Math.abs(n)<1e-8)};
 });
 const stock=Object.values(remaining).every(n=>n>=0),season=Object.keys(used).every(k=>defs[k].good_seasons[data.season]),nutrients=nutrientTiles.every(t=>t.balanced);
 result.used_tiles=perTile.size;
 result.checks={family_passed:familyPassed,family_total:Object.values(used).reduce((a,b)=>a+b,0),spacing,stock,season,mod_validation:result.valid,complete_templates:data.strategy!=='GIANT_TEMPLATE'||result.valid,nutrient_balance:nutrients,nutrient_tiles:nutrientTiles};
 if(!(result.valid&&familyPassed===result.count&&spacing&&stock&&season&&nutrients))throw Error('布局未通过校验，请保留场景并检查Mod。');
 return result;
}
export async function createPlanner({bundle,wasmBinary,onProgress=()=>{}}){
 if(bundle.schema!==1||bundle.meta.verifier_schema!==4)throw Error('浏览器算法包版本不匹配，请重新构建。');
 const init=performance.now();
 const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(n=>n.toString(16).padStart(2,'0')).join('');
 for(const file of bundle.meta.files){const name=file.path.slice(8,-4),source=bundle.modules[name];
  if(typeof source!=='string'||await digest(new TextEncoder().encode(source))!==file.sha256)throw Error('Mod源码快照校验失败：'+file.path);
 }
 for(const [name,hash]of Object.entries(bundle.adapter_hashes))if(await digest(new TextEncoder().encode(bundle[name]))!==hash)throw Error('运行适配文件校验失败：'+name);
 if(!wasmBinary){const response=await fetch(new URL('./runtime/lua51.wasm',import.meta.url));if(!response.ok)throw Error('无法加载Lua运行时。');wasmBinary=new Uint8Array(await response.arrayBuffer());}
 if(await digest(wasmBinary)!==bundle.runtime_build.files['lua51.wasm'])throw Error('Lua运行时版本与算法包不一致，请刷新页面。');
 const runtime=await lua51({...(wasmBinary?{wasmBinary}:{}),onPhase:phase=>onProgress({phase,elapsed_ms:performance.now()-started})});
 const runtimeInitMs=performance.now()-init;
 let started=0;
 const prelude='MOD_SCRIPTS="/mod"\nNATIVE_SOURCE='+quote(bundle.native_source)+'\nNATIVE_CONSTANTS='+literal(bundle.meta.constants)+'\n'+
  Object.entries(bundle.modules).map(([name,source])=>'package.preload['+quote(name)+']=assert(loadstring('+quote(source)+','+quote('@mod/scripts/'+name+'.lua')+'))').join('\n');
 return {run(input){
  const data=normalize(input,bundle.meta);started=performance.now();onProgress({phase:'正在运行 Mod 原始 Lua 5.1',elapsed_ms:0});
  const script=prelude+'\nINPUT='+literal({...data,crop_order:[...bundle.meta.crops.map(c=>c.id),'randomseed']})+'\nlocal r=(function()\n'+bundle.bridge+'\nend)()\n'+bundle.result_adapter;
  const raw=runtime.ccall('planner_execute','string',['string'],[script]);
  if(runtime.ccall('planner_failed','number',[],[]))throw Error(raw);
  const result=checked(JSON.parse(raw),data,bundle);
  result.elapsed_ms=Math.round(performance.now()-started);result.runtime_init_ms=Math.round(runtimeInitMs);
  return result;
 }};
}
