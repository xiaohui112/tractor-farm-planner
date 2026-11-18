'use strict';
// 只判断布局可提供的巨大化条件，不替代游戏生长过程中的压力结算。
// 原版 farm_plants.lua：FamilyStressTest / SeasonStressTest / OvercrowdingStressTest。
(function(root){
 function cropDisplay(point,result,scene,meta){
  const definition=meta?.crops?.find(c=>c.id===point.crop);
  const tile=result?.checks?.nutrient_tiles?.find(t=>t.x===point.cx&&t.z===point.cz);
  const density=result?.slots?.filter(p=>p.crop&&p.cx===point.cx&&p.cz===point.cz).length;
  const maximum=meta?.constants?.FARM_PANT_OVERCROWDING_MAX_PLANTS;
  const checks={
   season:!!definition?.seasons?.includes(scene.season),
   family:Number.isFinite(point.family)&&Number.isFinite(point.family_min)&&point.family>=point.family_min,
   nutrients:tile?.balanced===true,
   density:Number.isFinite(maximum)&&Number.isFinite(density)&&density<=maximum
  };
  const names={season:'非应季',family:'同族不足',nutrients:'养分互补未通过',density:'密度检查未通过'};
  const reasons=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>names[name]);
  const giant=reasons.length===0;
  return {giant,checks,reasons,label:giant?'巨大化预期':'成熟',icon:`/assets/crops/${point.crop}${giant?'_oversized':''}.png`};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=cropDisplay;
 else root.cropDisplay=cropDisplay;
})(typeof window!=='undefined'?window:globalThis);
