'use strict';
// No backend calls. Each task owns a Worker and a fresh Lua state.
(()=>{
 const base=new URL('.',document.currentScript.src);
 let bundlePromise,active,epoch=0;
 const bundle=()=>bundlePromise||(bundlePromise=fetch(new URL('runtime/planner-bundle.json',base)).then(r=>{if(!r.ok)throw Error('无法加载浏览器算法包，请先运行 browser/build.py。');return r.json();}).catch(e=>{bundlePromise=null;throw e;}));
 function cancel(){epoch++;if(!active)return;const task=active;active=null;clearInterval(task.timer);task.worker.terminate();task.reject(new DOMException('计算已取消。','AbortError'));}
 window.BrowserPlanner={
  metadata:async()=>structuredClone((await bundle()).meta),
  presets:async()=>structuredClone((await bundle()).presets),
  cancel,
  async start(scene,onProgress=()=>{}){
   cancel();const token=epoch,data=await bundle();
   if(token!==epoch)throw new DOMException('计算已取消。','AbortError');
   return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('planner-worker.mjs',base),{type:'module'}),task={worker,reject};active=task;
    let progress={phase:'正在加载浏览器 Lua 5.1',elapsed_ms:0},receivedAt=performance.now();
    task.timer=setInterval(()=>{if(active===task)onProgress({...progress,elapsed_ms:progress.elapsed_ms+performance.now()-receivedAt});},250);
    const finish=(error,result)=>{if(active!==task)return;active=null;clearInterval(task.timer);worker.terminate();error?reject(error):resolve(result);};
    worker.onmessage=({data:message})=>{if(active!==task)return;if(message.type==='progress'){progress=message;receivedAt=performance.now();onProgress(message);}else if(message.type==='result')finish(null,message.result);else if(message.type==='error')finish(Error(message.error));};
    worker.onerror=event=>finish(Error(event.message||'浏览器计算环境启动失败。'));
    try{worker.postMessage({bundle:data,scene:structuredClone(scene)});}catch(error){finish(error);}
   });
  }
 };
})();
