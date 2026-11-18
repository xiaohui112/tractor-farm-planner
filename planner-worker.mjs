import {createPlanner} from './planner-engine.mjs';
self.onmessage=async({data})=>{
 try{
  const engine=await createPlanner({bundle:data.bundle,onProgress:progress=>self.postMessage({type:'progress',...progress})});
  self.postMessage({type:'result',result:engine.run(data.scene)});
 }catch(error){self.postMessage({type:'error',error:error.message||String(error)});}
};
