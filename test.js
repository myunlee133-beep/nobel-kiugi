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
    G.advance();
    assert(Object.values(S.alloc).reduce((a,b)=>a+b,0)===100,'배분 합 100 seed '+n);
    for(const k of G.STATS) assert(S[k]>=0&&S[k]<=100&&!Number.isNaN(S[k]),k+' 범위 seed '+n);
    assert(!Number.isNaN(S.money)&&!Number.isNaN(S.hp)&&S.joy>=0&&S.joy<=100);
    assert(S.t<=G.RETIRE_T+1,'정년을 넘김 seed '+n);
  }
  for(const l of S.log){ const x=l.s+' '+(l.sub||''); assert(!/\((가|과|를|는)\)/.test(x),'조사 자리표시가 남음: '+x);
    assert((l.s.match(/"/g)||[]).length%2===0,'따옴표가 닫히지 않은 기록: '+l.s);
    for(const k in l.d||{}){ assert(!(l.tone==='+'&&l.d[k]<0),'좋은 멘트에 감소: '+l.s+' '+k); assert(!(l.tone==='-'&&l.d[k]>0),'나쁜 멘트에 증가: '+l.s+' '+k); } }
  ends[S.end.name]=(ends[S.end.name]||0)+1; st.sem+=S.t; st.money+=S.money; st.hosp+=S.hosp; st.papers+=S.papers.length;
  if(S.end.kind==='grad'){st.grads++;st.phd+=S.ss;} if(['prof','noTenure','pdOut','retire'].includes(S.end.kind))st.career=(st.career||0)+1;
}
console.log(ends);
console.log('박사 이후 경력까지 간 인생',st.career||0);
console.log('평균 학기',(st.sem/N).toFixed(1),'박사 졸업자 평균 박사 학기',(st.phd/st.grads).toFixed(1),'평균 재산',Math.round(st.money/N),'평균 입원',(st.hosp/N).toFixed(2),'평균 논문',(st.papers/N).toFixed(1));
// 관계 행동: 학기당 한 사람에게 한 번, 매력 조건, 고백하면 연인이 된다
{ G.newLife({seed:7,gender:'여'}); const S=G.S; S.money=1000; S.cha=60; S.ppl=[{n:'김서연',role:'학과 친구',img:'연인',v:95},{n:'이지훈',role:'학과 친구',img:'라이벌',v:50}];
  G.relAct(1,'meal'); assert(S.money===995&&S.ppl[1].v>=56,'밥'); G.relAct(1,'gift'); assert(S.money===995,'학기당 한 번');
  S.cha=10; G.relAct(0,'trip'); assert(S.money===995,'여행 매력 조건'); S.cha=60;
  G.relAct(0,'confess'); assert(S.partner?S.ppl.length===1:S.ppl[0].v===85,'고백'); }
// 연인이 있어도 고백할 수 있다. 성공하면 기존 연인과는 이별
{ const S=G.S; S.partner={name:'하린',fav:3}; S.ppl=[{n:'정유진',role:'학과 친구',img:'연인',v:100}]; S.cha=100; S.t++;
  G.relAct(0,'confess'); assert(S.partner&&(S.partner.name==='정유진'?S.ppl.length===0:S.partner.name==='하린'),'환승 고백'); }
// 조사: 받침 있으면 이·과·을·은, 없으면 가·와·를·는. 따옴표 뒤도 앞 글자를 본다
assert.strictEqual(G.josa('건우이(가) 왔다'),'건우가 왔다'); assert.strictEqual(G.josa('서윤이(가) 왔다'),'서윤이 왔다');
assert.strictEqual(G.josa('채원와(과) 이별'),'채원과 이별'); assert.strictEqual(G.josa("칭호 '첫 논문'을(를)"),"칭호 '첫 논문'을");
// 첫 문장은 닫는 따옴표까지
assert.deepStrictEqual(G.split1('"그래, 신중한 게 좋지." 교수의 표정이 조금 쓸쓸했다.'),['"그래, 신중한 게 좋지."','교수의 표정이 조금 쓸쓸했다.']);
assert.deepStrictEqual(G.split1('"관운이 있어. 사람들이 알아서 도와줘." 복채가 아깝지 않았다.'),['"관운이 있어. 사람들이 알아서 도와줘."','복채가 아깝지 않았다.']);
console.log('조사·문장 나누기 점검 통과');
// 대학원 원서: 3곳을 한꺼번에 판정하고, 모두 떨어지면 가장 낮은 곳이 추가 합격. 합격한 곳 중 고른 곳으로 간다
{ G.newLife({seed:11,gender:'여'}); const S=G.S; S.q=[]; S.res=0; S.luck=-10; const c=G.offers(); assert(c.list.some(o=>o.ok),'원서 합격 보장');
  S.q=[c]; const ok=c.list.filter(o=>o.ok); G.resolve(ok.length-1); assert.strictEqual(S.stage,'ms'); assert.strictEqual(S.lab.pres,ok[ok.length-1].pres); assert(S.lab.prof,'지도교수 이름'); }
// 박사 이후: 포닥 → 조교수 → 부교수(정년 보장) → 정교수
{ G.newLife({seed:5,gender:'여'}); const S=G.S; S.q=[]; S.stage='phd'; S.lab={school:'한국대',pres:3,type:'은인형',fav:3}; S.res=100; S.lec=100; S.luck=10; S.papers=[{pt:40}];
  S.q=[{k:'phdDone'}]; G.resolve(0); assert.strictEqual(S.stage,'pd'); S.q=[];
  while(S.stage==='pd'){S.q=[{k:'faculty'}];G.resolve(0);S.q=[];} assert.strictEqual(S.stage,'ap'); assert.strictEqual(S.lab.school,'한국대');
  S.papers.push({pt:40}); while(S.stage==='ap'){S.promoFail=0;S.ss=8;S.q=[{k:'promo'}];G.resolve(0);S.q=[];} assert.strictEqual(S.stage,'asc'); assert(S.titles.includes('정년 보장'));
  S.papers.push({pt:40}); let n=0; while(!S.end&&n++<100){S.q=[{k:'promo'}];G.resolve(0);} assert.strictEqual(S.end.kind,'prof'); }
// 조교수가 두 번 떨어지면 재임용 종료
{ G.newLife({seed:6,gender:'여'}); const S=G.S; S.q=[]; S.stage='ap'; S.lab={school:'남도대',pres:1,type:'방임형',fav:2}; S.res=0; S.lec=0; S.cpt=0; S.papers=[]; S.ss=8; S.luck=-10;
  let n=0; while(!S.end&&n++<50){S.q=[{k:'promo'}];G.resolve(0);} assert.strictEqual(S.end.kind,'noTenure'); }
console.log('진학 결과·박사 이후 경력 점검 통과');
