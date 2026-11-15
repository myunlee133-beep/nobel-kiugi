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
      const ok=v.ch.map((c,i)=>i).filter(i=>!/은퇴/.test(v.ch[i].l)&&!v.ch[i].lock); G.resolve(ok[Math.floor(Math.random()*ok.length)]); continue; }
    if(S.pend){ G.reveal(); continue; } // 진행 화면이 달을 하나씩 꺼내는 자리
    if(S.army===0&&S.stage==='ug'){ const ks=Object.keys(G.UGF); G.focus(ks[Math.floor(Math.random()*ks.length)]); } // 학부생: 초점 5종 중 아무거나
    else if(S.army===0){ // 대학원생, 평범한 플레이어: 학업 위주, 체력이 낮으면 휴식을 늘린다. 5% 단위로 합 100.
      const A=S.alloc, k=['lec','eco','rel','rest']; const rest=S.hp<45?30:5*Math.floor(Math.random()*4);
      A.study=S.stage==='ug'?5*(6+Math.floor(Math.random()*5)):5*(10+Math.floor(Math.random()*6)); let left=100-A.study-rest; A.rest=rest; for(const x of k.slice(0,3)){A[x]=0;}
      while(left<0){A.study-=5;left+=5;} while(left>0){A[k[Math.floor(Math.random()*3)]]+=5;left-=5;} }
    S.act=[null,...Object.keys(G.ACTS)][Math.floor(Math.random()*6)]; // 학업 토글: 5종 중 하나 또는 선택 안 함
    const r=a=>a[Math.floor(Math.random()*a.length)]; // 투자 접기: 생활·운용 하나씩, 구매는 아무거나
    S.life=r(Object.keys(G.LIFE)); S.port=r(Object.keys(G.PORT)); S.buy=Object.fromEntries(Object.keys(G.BUY).map(k=>[k,Math.random()<.3]));
    for(let j=0;j<3;j++){const ws=[...(S.ppl||[]).map((_,i)=>i),'r',...(S.partner?['p']:[]),...(S.lab?['a']:[])], acts=['call','meal','listen','study','gift','notes','job','coauth','advice','rally','confess','propose']; G.relAct(ws[Math.floor(Math.random()*ws.length)],acts[Math.floor(Math.random()*acts.length)]);} // 관계 행동 아무거나
    G.advance();
    assert(Object.values(S.alloc).reduce((a,b)=>a+b,0)===100,'배분 합 100 seed '+n);
    for(const k of G.STATS) assert(S[k]>=0&&S[k]<=100&&!Number.isNaN(S[k]),k+' 범위 seed '+n);
    assert(!Number.isNaN(S.money)&&!Number.isNaN(S.hp)&&S.joy>=0&&S.joy<=100);
    assert(S.t<=40,'시제품 구간을 넘김 seed '+n);
  }
  for(const l of S.log){ const x=l.s+' '+(l.sub||''); assert(!/\((가|과|를|는)\)/.test(x),'조사 자리표시가 남음: '+x);
    assert((l.s.match(/"/g)||[]).length%2===0,'따옴표가 닫히지 않은 기록: '+l.s);
    for(const k in l.d||{}){ assert(!(l.tone==='+'&&l.d[k]<0),'좋은 멘트에 감소: '+l.s+' '+k); assert(!(l.tone==='-'&&l.d[k]>0),'나쁜 멘트에 증가: '+l.s+' '+k); } }
  ends[S.end.name]=(ends[S.end.name]||0)+1; st.sem+=S.t; st.money+=S.money; st.hosp+=S.hosp; st.papers+=S.papers.length;
  if(S.end.kind==='grad'){st.grads++;st.phd+=S.ss;}
}
console.log(ends);
console.log('평균 학기',(st.sem/N).toFixed(1),'박사 졸업자 평균 박사 학기',(st.phd/st.grads).toFixed(1),'평균 재산',Math.round(st.money/N),'평균 입원',(st.hosp/N).toFixed(2),'평균 논문',(st.papers/N).toFixed(1));
// 관계 행동: 학기당 3번, 도와주기는 호감을 올리고 부탁하기는 호감을 쓴다, 고백하면 연인이 된다
{ G.newLife({seed:7,gender:'여'}); const S=G.S; S.money=1000; S.cha=60; S.ap=3; S.ppl=[{n:'김서연',role:'학과 친구',img:'연인',v:95},{n:'이지훈',role:'학과 친구',img:'라이벌',v:50}];
  const v0=S.ppl[1].v; G.relAct(1,'meal'); assert(S.money===995&&S.ppl[1].v>v0&&S.ap===2,'밥');
  G.relAct(1,'notes'); assert(S.ppl[1].v<v0+20&&S.ap===1,'족보 부탁은 호감을 쓴다');
  G.relAct(0,'confess'); assert(S.ap===0&&(S.partner?S.ppl.length===1:S.ppl[0].v===85),'고백');
  const m=S.money; G.relAct(S.ppl.length-1,'gift'); assert(S.money===m,'행동을 다 쓰면 못 한다'); }
// 연인이 있어도 고백할 수 있다. 성공하면 기존 연인과는 이별
{ const S=G.S; S.partner={name:'하린',fav:3}; S.ppl=[{n:'정유진',role:'학과 친구',img:'연인',v:100}]; S.cha=100; S.ap=3;
  G.relAct(0,'confess'); assert(S.partner&&(S.partner.name==='정유진'?S.ppl.length===0:S.partner.name==='하린'),'환승 고백'); }
// 조사: 받침 있으면 이·과·을·은, 없으면 가·와·를·는. 따옴표 뒤도 앞 글자를 본다
assert.strictEqual(G.josa('건우이(가) 왔다'),'건우가 왔다'); assert.strictEqual(G.josa('서윤이(가) 왔다'),'서윤이 왔다');
assert.strictEqual(G.josa('채원와(과) 이별'),'채원과 이별'); assert.strictEqual(G.josa("칭호 '첫 논문'을(를)"),"칭호 '첫 논문'을");
// 첫 문장은 닫는 따옴표까지
assert.deepStrictEqual(G.split1('"그래, 신중한 게 좋지." 교수의 표정이 조금 쓸쓸했다.'),['"그래, 신중한 게 좋지."','교수의 표정이 조금 쓸쓸했다.']);
assert.deepStrictEqual(G.split1('"관운이 있어. 사람들이 알아서 도와줘." 복채가 아깝지 않았다.'),['"관운이 있어. 사람들이 알아서 도와줘."','복채가 아깝지 않았다.']);
console.log('조사·문장 나누기 점검 통과');
