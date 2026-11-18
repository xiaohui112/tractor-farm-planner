'use strict';
// Display geometry only; crop positions and planting plans still come from Mod Lua.
(function(root){
 function canvasViewport({contentWidth,contentHeight,stageWidth,stageHeight,view='detail',zoom=1,editing=false}){
  const availableWidth=Math.max(1,stageWidth-12),availableHeight=Math.max(1,stageHeight-12);
  const fit=Math.min(availableWidth/contentWidth,availableHeight/contentHeight);
  const scale=(view==='detail'&&!editing?Math.max(fit,28/31):fit)*zoom;
  return {fit,scale,width:contentWidth*scale,height:contentHeight*scale};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=canvasViewport;
 else root.canvasViewport=canvasViewport;
})(typeof window!=='undefined'?window:globalThis);
