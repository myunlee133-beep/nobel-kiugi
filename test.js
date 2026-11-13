// 자동 플레이 점검: node test.js  (규칙이 깨지면 실패)
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/nobel.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1];
eval(src); const G=globalThis.G;
const N=3000, ends={}, st={sem:0,phd:0,grads:0,money:0,hosp:0,papers:0};
for(let n=0;n<N;n++){
  G.newLife({seed:n+1,gender:n%2?'남':'여'}); const S=G.S; let guard=0;
  while(!S.end){ assert(++guard<2000,'끝나지 않는 인생 seed '+n);
    const v=G.view();
    if(v){ // 은퇴 선택지는 고르지 않는 평범한 플레이어
      const ok=v.ch.map((c,i)=>i).filter(i=>!/은퇴/.test(v.ch[i].l)); G.resolve(ok[Math.floor(Math.random()*ok.length)]); continue; }
    if(S.pend){ G.reveal(); continue; } // 진행 화면이 달을 하나씩 꺼내는 자리
    if(S.army===0&&S.stage==='ug'){ const ks=Object.keys(G.UGF); G.focus(ks[Math.floor(Math.random()*ks.length)]); } // 학부생: 초점 5종 중 아무거나
    else if(S.army===0){ // 대학원생, 평범한 플레이어: 학업 위주, 체력이 낮으면 휴식을 늘린다. 5% 단위로 합 100.
      const A=S.alloc, k=['lec','eco','rel','rest']; const rest=S.hp<45?30:5*Math.floor(Math.random()*4);
      A.study=S.stage==='ug'?5*(6+Math.floor(Math.random()*5)):5*(10+Math.floor(Math.random()*6)); let left=100-A.study-rest; A.rest=rest; for(const x of k.slice(0,3)){A[x]=0;}
      while(left<0){A.study-=5;left+=5;} while(left>0){A[k[Math.floor(Math.random()*3)]]+=5;left-=5;} }
    S.act=[null,...Object.keys(G.ACTS)][Math.floor(Math.random()*6)]; // 학업 토글: 5종 중 하나 또는 선택 안 함
    const r=a=>a[Math.floor(Math.random()*a.length)]; // 투자 접기: 생활·운용 하나씩, 구매는 아무거나
    S.life=r(Object.keys(G.LIFE)); S.port=r(Object.keys(G.PORT)); S.buy=Object.fromEntries(Object.keys(G.BUY).map(k=>[k,Math.random()<.3]));
    G.advance();
    assert(Object.values(S.alloc).reduce((a,b)=>a+b,0)===100,'배분 합 100 seed '+n);
    for(const k of G.STATS) assert(S[k]>=0&&S[k]<=100&&!Number.isNaN(S[k]),k+' 범위 seed '+n);
    assert(!Number.isNaN(S.money)&&!Number.isNaN(S.hp)&&S.joy>=0&&S.joy<=100);
    assert(S.t<=40,'시제품 구간을 넘김 seed '+n);
  }
  ends[S.end.name]=(ends[S.end.name]||0)+1; st.sem+=S.t; st.money+=S.money; st.hosp+=S.hosp; st.papers+=S.papers.length;
  if(S.end.kind==='grad'){st.grads++;st.phd+=S.ss;}
}
console.log(ends);
console.log('평균 학기',(st.sem/N).toFixed(1),'박사 졸업자 평균 박사 학기',(st.phd/st.grads).toFixed(1),'평균 재산',Math.round(st.money/N),'평균 입원',(st.hosp/N).toFixed(2),'평균 논문',(st.papers/N).toFixed(1));
// 관계 행동: 학기당 한 사람에게 한 번, 매력 조건, 고백하면 연인이 된다
{ G.newLife({seed:7,gender:'여'}); const S=G.S; S.money=1000; S.cha=60; S.ppl=[{n:'김서연',role:'학과 친구',img:'연인',v:95},{n:'이지훈',role:'학과 친구',img:'라이벌',v:50}];
  G.relAct(1,'meal'); assert(S.money===995&&S.ppl[1].v>=56,'밥'); G.relAct(1,'gift'); assert(S.money===995,'학기당 한 번');
  S.cha=10; G.relAct(0,'trip'); assert(S.money===995,'여행 매력 조건'); S.cha=60;
  G.relAct(0,'confess'); assert(S.partner?S.ppl.length===1:S.ppl[0].v===85,'고백'); }
// 연인이 있어도 고백할 수 있다. 성공하면 기존 연인과는 이별
{ const S=G.S; S.partner={name:'하린',fav:3}; S.ppl=[{n:'정유진',role:'학과 친구',img:'연인',v:100}]; S.cha=100; S.t++;
  G.relAct(0,'confess'); assert(S.partner&&(S.partner.name==='정유진'?S.ppl.length===0:S.partner.name==='하린'),'환승 고백'); }
