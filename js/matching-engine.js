(function(global){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
  function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function normaliseItem(item){return {text:String(item&&item.text||'').trim(),image:String(item&&item.image||'')};}
  function normaliseActivity(input){
    const source=input||{};
    const pairs=(Array.isArray(source.pairs)?source.pairs:[]).map((pair,index)=>({id:pair.id||uid(),left:normaliseItem(pair.left),right:normaliseItem(pair.right),order:index})).filter(p=>(p.left.text||p.left.image)&&(p.right.text||p.right.image));
    return {version:1,title:String(source.title||'Match the pairs'),instructions:String(source.instructions||'Drag or tap to match each item with its partner.'),feedbackMode:source.feedbackMode==='instant'?'instant':'check',allowRetry:source.allowRetry!==false,allowSolution:source.allowSolution!==false,pairs};
  }
  class MatchingEngine{
    constructor(activity){this.activity=normaliseActivity(activity);this.reset();}
    reset(){this.left=shuffle(this.activity.pairs.map(p=>({pairId:p.id,item:clone(p.left)})));this.right=shuffle(this.activity.pairs.map(p=>({pairId:p.id,item:clone(p.right)})));this.matches=[];this.attempted=new Set();this.locked=false;}
    match(leftPairId,rightPairId){
      if(this.locked||this.matches.some(m=>m.leftPairId===leftPairId||m.rightPairId===rightPairId))return null;
      const correct=leftPairId===rightPairId;this.attempted.add(leftPairId);
      const record={leftPairId,rightPairId,correct};
      if(this.activity.feedbackMode==='instant'&&!correct)return record;
      this.matches.push(record);return record;
    }
    isComplete(){return this.matches.length===this.activity.pairs.length;}
    check(){this.locked=true;return this.matches.map(m=>({...m,correct:m.leftPairId===m.rightPairId}));}
    solution(){this.locked=true;this.matches=this.activity.pairs.map(p=>({leftPairId:p.id,rightPairId:p.id,correct:true,solution:true}));return this.matches;}
    score(){return this.matches.filter(m=>m.correct).length;}
    item(side,pairId){const list=side==='left'?this.left:this.right;return list.find(x=>x.pairId===pairId)?.item||null;}
  }
  global.MatchingCore={MatchingEngine,normaliseActivity,shuffle,uid};
})(window);
