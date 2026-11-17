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
      let ok=v.ch.map((c,i)=>i).filter(i=>!/은퇴/.test(v.ch[i].l)&&!v.ch[i].lock); if(!ok.length)ok=v.ch.map((c,i)=>i).filter(i=>!v.ch[i].lock); G.resolve(ok[Math.floor(Math.random()*ok.length)]); continue; }
    if(S.pend){ G.reveal(); continue; } // 진행 화면이 달을 하나씩 꺼내는 자리
    if(S.army===0&&['ug','ms','phd','pd','ap','asc','full'].includes(S.stage)){ // 학기 전략. 학점(대학원은 개인 연구, 교수는 직접 연구)과 행동은 아무거나 넣고 맞춘다. 칸을 넘기면 안 된다
      S.plan={cred:12+Math.floor(Math.random()*10),rs:Math.floor(Math.random()*19),acts:Object.keys(G.SA).filter(()=>Math.random()<.3),gs:['s','m','l'][Math.floor(Math.random()*3)]}; G.fitPlan();
      assert(G.used()<=G.slots(),'슬롯 초과 seed '+n); for(const id of S.plan.acts)assert(!G.SA[id].lock?.()||G.must(id),'잠긴 행동 '+id);
      if(S.stage==='ug')assert(S.plan.cred>=12,'학점 12 이상 seed '+n);
      else{ assert.strictEqual(S.plan.cred,G.gradCred(),'학점·강의 고정'); for(const id of['ind','ta'])if(G.must(id))assert(S.plan.acts.includes(id),'연구실 의무 '+id);
        for(const id of S.plan.acts)assert(G.saOk(id),'단계에 안 맞는 행동 '+id); } }
    else if(S.army===0){ // 대학원생, 평범한 플레이어: 학업 위주, 체력이 낮으면 휴식을 늘린다. 5% 단위로 합 100.
      const A=S.alloc, k=['lec','eco','rel','rest']; const rest=S.hp<45?30:5*Math.floor(Math.random()*4);
      A.study=S.stage==='ug'?5*(6+Math.floor(Math.random()*5)):5*(10+Math.floor(Math.random()*6)); let left=100-A.study-rest; A.rest=rest; for(const x of k.slice(0,3)){A[x]=0;}
      while(left<0){A.study-=5;left+=5;} while(left>0){A[k[Math.floor(Math.random()*3)]]+=5;left-=5;} }
    S.act=[null,...Object.keys(G.ACTS)][Math.floor(Math.random()*6)]; // 학업 토글: 5종 중 하나 또는 선택 안 함
    const r=a=>a[Math.floor(Math.random()*a.length)]; // 투자 접기: 생활·운용 하나씩, 구매는 아무거나
    S.life=r(Object.keys(G.LIFE)); S.port=r(Object.keys(G.PORT)); S.buy=Object.fromEntries(Object.keys(G.BUY).map(k=>[k,Math.random()<.3]));
    if(G.prof()){ // 교수: 지원자를 아무나 받고, 지시를 아무거나 고르고, 가끔 붙잡고, 가끔 사비로 메운다
      while(S.applicants.length&&Math.random()<.5){const i=Math.floor(Math.random()*S.applicants.length); if(G.lockApp(S.applicants[i]))break; G.takeStudent(i);}
      for(const s of S.students){s.ord=['paper','paper','grant','rest'][Math.floor(Math.random()*4)]; if(s.ready)s.hold=Math.random()<.2;}
      if(Math.random()<.3)G.fundMe(); assert(S.students.length<=G.CAP[S.stage],'정원 초과 seed '+n); }
    G.advance();
    if(G.prof()){ assert(!Number.isNaN(S.fund)&&S.rep>=0&&S.rep<=100&&S.fame>=0&&S.fame<=100,'연구실 값 범위 seed '+n);
      for(const s of S.students)assert(s.sat>=0&&s.sat<=100&&s.res>=0&&s.res<=100,'학생 범위 seed '+n); }
    assert(Object.values(S.alloc).reduce((a,b)=>a+b,0)===100,'배분 합 100 seed '+n);
    for(const k of G.STATS) assert(S[k]>=0&&S[k]<=100&&!Number.isNaN(S[k]),k+' 범위 seed '+n);
    assert(!Number.isNaN(S.money)&&!Number.isNaN(S.hp)&&S.joy>=0&&S.joy<=100);
    assert(S.t<=G.RETIRE_T+1,'정년을 넘김 seed '+n);
  }
  for(const l of S.log){ const x=l.s+' '+(l.sub||''); assert(!/\((가|과|를|는)\)/.test(x),'조사 자리표시가 남음: '+x);
    assert((l.s.match(/"/g)||[]).length%2===0,'따옴표가 닫히지 않은 기록: '+l.s);
    for(const k in l.d||{}){ assert(!(l.tone==='+'&&l.d[k]<0),'좋은 멘트에 감소: '+l.s+' '+k); assert(!(l.tone==='-'&&l.d[k]>0),'나쁜 멘트에 증가: '+l.s+' '+k); } }
  if(S.alumni){st.prof=(st.prof||0)+1; st.alumni=(st.alumni||0)+S.alumni.length; st.full=(st.full||0)+(S.titles.includes('정교수')?1:0); st.fame=(st.fame||0)+S.fame;}
  ends[S.end.name]=(ends[S.end.name]||0)+1; st.sem+=S.t; st.money+=S.money; st.hosp+=S.hosp; st.papers+=S.papers.length;
  if(S.end.kind==='grad'){st.grads++;st.phd+=S.ss;} if(['prof','noTenure','pdOut','retire'].includes(S.end.kind))st.career=(st.career||0)+1;
}
console.log(ends);
console.log('박사 이후 경력까지 간 인생',st.career||0);
console.log('교수가 된 인생',st.prof||0,'정교수까지',st.full||0,'평균 제자',st.prof?(st.alumni/st.prof).toFixed(1):0,'평균 최종 명성',st.prof?(st.fame/st.prof).toFixed(0):0);
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
// 학기 전략: 슬롯 = 20 + 체력 × 0.16, 9분위는 근장 불가, 썸이 있어야 연애
{ G.newLife({seed:21,gender:'여',decile:9,hpMax:100}); const S=G.S; assert.strictEqual(G.slots(),36); S.hp=50; assert.strictEqual(G.slots(),28);
  assert(G.SA.work.lock(),'9분위 근장'); S.decile=3; assert(!G.SA.work.lock(),'3분위 근장'); assert(G.SA.love.lock(),'썸 없이 연애'); S.crush={name:'하린'}; assert(!G.SA.love.lock(),'썸이면 연애');
  S.plan={cred:21,acts:['job','gym']}; G.fitPlan(); assert.strictEqual(S.plan.cred,18,'학점 상한 18'); S.hp=0; G.fitPlan(); assert(G.used()<=20,'체력 0이면 20칸'); }
// 교수 학기 전략: 강의 의무 고정(학교 등급 1은 +3), 직접 연구 0~12, 교수 전용 행동만
{ G.newLife({seed:31,gender:'여',hpMax:100}); const S=G.S; S.q=[]; S.stage='ap'; S.lab={school:'남도대',pres:1,type:'방임형',fav:2};
  S.plan={cred:0,rs:20,acts:['guide','lprep','job','club','consult']}; G.fitPlan();
  assert.strictEqual(S.plan.cred,12,'남도대 조교수 강의 9+3'); assert.strictEqual(S.plan.rs,12,'직접 연구 상한 12');
  assert(!S.plan.acts.includes('job')&&!S.plan.acts.includes('club'),'학부·대학원 행동 제외'); assert(S.plan.acts.includes('guide')&&S.plan.acts.includes('consult'));
  S.stage='full'; S.lab.pres=3; S.plan.rs=-5; G.fitPlan(); assert.strictEqual(S.plan.cred,6,'정교수 강의 6'); assert.strictEqual(S.plan.rs,0,'직접 연구 하한 0'); }
console.log('학기 전략 점검 통과');
// 대학원 원서: 실제 대학 20곳을 판정해 합격한 3곳만 보여 준다. 모자라면 평판 낮은 곳이 추가 합격. 고른 곳으로 간다
{ G.newLife({seed:11,gender:'여'}); const S=G.S; S.q=[]; S.res=0; S.luck=-10; const c=G.offers(); assert(c.list.some(o=>o.ok),'원서 합격 보장');
  assert.strictEqual(c.list.length,3,'합격한 곳은 늘 3곳'); assert(c.list.every(o=>o.ok),'화면에는 합격한 곳만');
  S.q=[c]; const ok=c.list; G.resolve(2); assert.strictEqual(S.stage,'ms'); assert.strictEqual(S.lab.school,ok[2].n); assert(S.lab.prof,'지도교수 이름'); }
// 랩 인턴 인연: 학부 대학에 붙으면 3곳 안에 그 연구실이 들어간다. 실력이 좋으면 평판 높은 곳 위주로 붙는다
{ let home=0, top=0; for(let n=0;n<200;n++){ G.newLife({seed:200+n,gender:'여',uni:9}); const S=G.S; S.flags.known=1; S.res=60;
    const c=G.offers(); assert.strictEqual(c.list.length,3); if(c.list.some(o=>o.home&&o.n===S.uni.n))home++; if(c.list[0].urep>=92)top++; }
  assert(home>150,'인연 연구실이 대부분 보인다 '+home); assert(top>150,'연구력 60이면 최상위권 합격 '+top); }
// 박사 원서: 석사 졸업 카드에서 '다른 대학원'을 고르면 합격 3곳이 뜨고, 고른 곳에서 박사를 시작한다. 접으면 지금 연구실에 남는다
{ G.newLife({seed:12,gender:'여'}); const S=G.S; S.q=[]; S.stage='ms'; S.lab={school:'남도대',pres:1,type:'방임형',fav:2}; S.res=50; S.papers=[{pt:4}];
  S.q=[{k:'msEnd'}]; G.resolve(1); const c=S.q[0]; assert(c&&c.k==='offers'&&c.phd&&c.list.length===3,'박사 원서 3곳'); const o=c.list[1]; G.resolve(1);
  assert.strictEqual(S.stage,'phd'); assert.strictEqual(S.lab.school,o.n); assert.strictEqual(S.ss,0);
  S.stage='ms'; S.lab={school:'남도대',pres:1,type:'방임형',fav:2}; S.q=[{k:'msEnd'}]; G.resolve(1); G.resolve(3);
  assert.strictEqual(S.stage,'phd'); assert.strictEqual(S.lab.school,'남도대','접으면 그대로'); }
// 박사 이후: 포닥 → 조교수 → 부교수(정년 보장) → 정교수
{ G.newLife({seed:5,gender:'여'}); const S=G.S; S.q=[]; S.stage='phd'; S.lab={school:'한국대',pres:3,type:'은인형',fav:3}; S.res=100; S.lec=100; S.luck=10; S.papers=[{pt:40}];
  S.q=[{k:'phdDone'}]; G.resolve(0); assert.strictEqual(S.stage,'pd'); S.q=[];
  while(S.stage==='pd'){S.q=[{k:'faculty'}];G.resolve(0);S.q=[];} assert.strictEqual(S.stage,'ap'); assert.strictEqual(S.lab.school,'한국대');
  S.papers.push({pt:40}); while(S.stage==='ap'){S.promoFail=0;S.ss=8;S.q=[{k:'promo'}];G.resolve(0);S.q=[];} assert.strictEqual(S.stage,'asc'); assert(S.titles.includes('정년 보장'));
  S.papers.push({pt:40}); let n=0; while(S.stage==='asc'&&n++<100){S.ss=8;S.q=[{k:'promo'}];G.resolve(0);S.q=[];}
  assert.strictEqual(S.stage,'full','정교수 단계'); assert(!S.end,'정교수 승진은 엔딩이 아니다'); assert(S.titles.includes('정교수'));
  S.t=G.RETIRE_T; S.q=[{k:'retire'}]; G.resolve(0); assert.strictEqual(S.end.kind,'prof','정교수의 정년은 prof 엔딩'); }
// 조교수가 두 번 떨어지면 재임용 종료
{ G.newLife({seed:6,gender:'여'}); const S=G.S; S.q=[]; S.stage='ap'; S.lab={school:'남도대',pres:1,type:'방임형',fav:2}; S.res=0; S.lec=0; S.cpt=0; S.papers=[]; S.ss=8; S.luck=-10;
  let n=0; while(!S.end&&n++<50){S.q=[{k:'promo'}];G.resolve(0);} assert.strictEqual(S.end.kind,'noTenure'); }
console.log('진학 결과·박사 이후 경력 점검 통과');
// 평판·명성: 임용 때 시작값, 학기마다 평판은 50 쪽, 명성은 줄어든다. 강의 준비·봉사는 평판, 학회는 명성
{ G.newLife({seed:41,gender:'여'}); const S=G.S; S.q=[]; S.stage='pd'; S.lab={school:'한국대',pres:3,type:'은인형',fav:3}; S.papers=[{pt:8},{pt:4},{pt:8}];
  G.hire('ap',2); assert.strictEqual(S.rep,30); assert.strictEqual(S.fame,50,'실적 20점 × 3, 최대 50'); assert.strictEqual(S.fund,6000,'정착 연구비');
  S.lec=50; S.cha=50; G.labTurn({acts:[],f:5}); const r1=S.rep; assert(S.fame<50,'명성은 줄어든다');
  S.rep=30; G.labTurn({acts:['lprep','serve'],f:5}); assert(S.rep>r1,'강의 준비·봉사가 평판을 올린다');
  S.fame=20; G.labTurn({acts:['pconf'],f:5}); assert(S.fame>20,'학회는 명성을 올린다'); }
console.log('평판·명성 점검 통과');
// 연구비: 과제 수주 → 매 학기 입금, 기간이 끝나면 사라진다. 대형은 부교수·명성 60부터. 인건비는 연구실 통장에서
{ G.newLife({seed:51,gender:'여'}); const S=G.S; S.q=[]; S.stage='pd'; S.lab={school:'한국대',pres:3,type:'은인형',fav:3}; S.papers=[]; G.hire('ap',3);
  assert(G.grantLock('l'),'조교수는 대형 불가'); S.stage='asc'; S.fame=60; assert(!G.grantLock('l'),'부교수 명성 60이면 대형'); S.stage='ap';
  S.plan={cred:9,rs:0,acts:[],gs:'m'}; const f0=S.fund; G.labTurn({acts:['pitch'],f:5}); assert.strictEqual(S.grants.length,1); assert.strictEqual(S.fund,f0+4000,'중형 학기 4,000만');
  for(let i=0;i<5;i++)G.labTurn({acts:[],f:5}); assert.strictEqual(S.grants.length,0,'6학기 뒤 종료'); assert.strictEqual(S.fund,f0+24000);
  S.students=[{id:1,n:'김서윤',deg:'phd',ss:0,res:50,sat:60,prog:0,pts:0,tr:'성실형',ord:'paper'}]; S.fund=500; G.labTurn({acts:[],f:5});
  assert.strictEqual(S.fund,500,'못 내면 통장은 그대로'); assert(S.students[0].sat<45,'인건비 미지급 −20');
  S.money=5000; G.fundMe(); assert.strictEqual(S.fund,1000,'사비로 인건비만큼 메운다'); assert.strictEqual(S.money,4500); }
console.log('연구비 점검 통과');
// 학생: 지원자 수는 평판·매력, 정원·연구비로 잠김, 성장·만족도·졸업
{ G.newLife({seed:61,gender:'여'}); const S=G.S; S.q=[]; S.stage='pd'; S.lab={school:'한국대',pres:3,type:'은인형',fav:3}; S.papers=[]; G.hire('ap',3);
  S.rep=0; S.cha=0; for(let i=0;i<30;i++)assert(G.appN()<=1,'평판·매력 0이면 0~1명'); S.rep=100; S.cha=100; for(let i=0;i<30;i++)assert(G.appN()>=3,'평판·매력 100이면 3~4명');
  S.fund=0; S.applicants=[G.mkStudent('ms')]; assert.strictEqual(G.lockApp(S.applicants[0]),'연구비 부족'); G.takeStudent(0); assert.strictEqual(S.students.length,0);
  S.fund=99999; S.students=[...Array(4)].map(()=>G.mkStudent('ms')); assert.strictEqual(G.lockApp(S.applicants[0]),'정원 상한','조교수 4명');
  S.students=[]; G.takeStudent(0); assert.strictEqual(S.students.length,1);
  const s=S.students[0]; Object.assign(s,{tr:'성실형',res:40,sat:60,ord:'paper'}); S.res=90; S.lec=50; const r0=s.res;
  G.labTurn({acts:['guide'],f:0}); assert(s.res>r0+4,'지도 + 연구력 차이로 빨리 큰다'); assert.strictEqual(Math.round(s.sat),57,'60 −3 +5(지도) −5(관리 0칸)');
  s.ord='rest'; G.labTurn({acts:[],f:4}); assert(s.sat>=69,'쉬게 함 +15');
  Object.assign(s,{deg:'ms',ss:3,sat:20}); G.labTurn({acts:[],f:4}); assert(!S.students.includes(s)&&S.alumni.some(a=>a.n===s.n),'석사 4학기 졸업');
  const p=G.mkStudent('phd'); Object.assign(p,{ss:8,pts:12,res:80,sat:90,tr:'성실형',ord:'paper'}); S.students=[p];
  G.labTurn({acts:[],f:4}); assert(p.ready,'박사 졸업 요건'); p.hold=true; const sat0=p.sat; G.labTurn({acts:[],f:4}); assert(S.students.includes(p)&&p.sat<=sat0-15,'붙잡기');
  G.labTurn({acts:[],f:4}); assert(S.alumni.some(a=>a.n===p.n&&a.job==='교수'),'교수가 된 제자');
  const z=G.mkStudent('phd'); Object.assign(z,{sat:5,tr:'성실형',ord:'paper'}); S.students=[z]; S.q=[]; G.labTurn({acts:[],f:0}); assert(S.q.some(c=>c.k==='labTalk'),'만족도 10 미만이면 면담');
  assert.strictEqual(S.q[0].k,'labTalk'); G.resolve(0); assert(S.students.includes(z)&&z.sat===45&&z.ord==='rest','면담에서 붙잡기'); }
console.log('학생 점검 통과');
// 학생 논문: 완성된 원고마다 투고 카드, 일괄 투고 선택지, 게재되면 교수 실적
{ G.newLife({seed:71,gender:'여'}); const S=G.S; S.q=[]; S.stage='pd'; S.lab={school:'한국대',pres:3,type:'은인형',fav:3}; S.papers=[]; G.hire('ap',3);
  const a=G.mkStudent('phd'), b=G.mkStudent('phd'); for(const s of[a,b])Object.assign(s,{prog:99,res:95,sat:60,tr:'성실형',ord:'paper'}); S.students=[a,b]; S.res=95; S.luck=10; S.q=[];
  G.labTurn({acts:[],f:4}); assert.strictEqual(S.q.filter(c=>c.k==='labSub').length,2,'완성된 원고마다 투고 카드');
  while(S.q[0]&&S.q[0].k!=='labSub')S.q.shift(); const v=G.view(); assert(/추천 급/.test(v.ch[v.ch.length-1].l),'일괄 투고 선택지'); const n0=S.papers.length;
  G.resolve(v.ch.length-1); assert(!S.q.some(c=>c.k==='labSub'),'일괄 투고로 모두 처리'); assert(S.papers.length>n0||a.prog===50,'게재되면 교수 실적, 리젝되면 50%'); }
console.log('학생 논문 점검 통과');
