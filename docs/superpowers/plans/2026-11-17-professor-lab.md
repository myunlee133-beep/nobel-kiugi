# 교수 연구실 경영 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 조교수·부교수·정교수가 학기 전략 창 → 연구실 화면 → 학기 진행으로 연구실을 경영하고, 정교수가 된 뒤에도 정년까지 플레이한다.

**Architecture:** 모든 규칙은 `nobel.html`의 `<script>` 안에 둔다(기존 방식). 교수 규칙은 `// ---------- 교수 연구실 ----------` 묶음 하나에 모으고, 한 학기 처리는 `labTurn(cur)` 한 함수가 맡는다. `advance()`는 교수 단계에서 `labTurn`을 부르기만 한다. 화면은 기존 `strat()` 다음에 `lab()` 화면을 하나 더 둔다.

**Tech Stack:** 프레임워크·빌드 없는 HTML·CSS·JS. 테스트는 `node test.js`(스크립트를 `eval`해서 `globalThis.G`로 함수에 접근).

**기준 문서:** `노벨상-키우기-기획서.md` 4장 "학기 전략과 연구실 — 교수".

## Global Constraints

- 단일 파일 `nobel.html`에 구현한다. 새 파일·라이브러리 없음.
- 테스트는 `node test.js` 하나. 실패하면 `assert`가 던진다. 맨 아래 `console.log('... 통과')` 줄로 묶음별 통과를 알린다.
- 노드에서 쓰는 함수는 파일 끝 `globalThis.G={...}`에 내보낸다.
- 화면 글은 한국어, 조사는 `와(과)`·`이(가)`·`을(를)` 자리표시를 쓰고 `log()`·`msg()`·`josa()`가 고친다(테스트가 자리표시가 남으면 실패시킨다).
- 금액 단위는 만 원(`won()`으로 표시).
- 수치는 기획서 그대로: 정착 연구비 6,000 · 인건비 석사 600 / 박사 1,000 · 과제 소형 1,500×4 / 중형 4,000×6 / 대형 10,000×10 · 정원 조교수 4 / 부교수 6 / 정교수 8 · 강의 의무 9 / 9 / 6(학교 등급 1은 +3) · 직접 연구 0~12칸 · 평판 시작 30 · 명성 시작 실적×3(최대 50).
- 랜덤은 `rnd()`(시드 고정)만 쓴다. `Math.random()`은 테스트 파일에서만.
- 저장 호환: 예전 저장(교수인데 `S.rep`가 없음)은 `ensureLab()`이 처음 쓰일 때 채운다.
- 학교 속성 '명성' → '학교 등급' 이름 변경은 기획서에서만 하면 된다. 지금 화면에 학교 '명성'이라는 글자는 없다(`ADV_TRAIT`의 '높은 명성'은 지도교수 특성이라 그대로 둔다).
- **시작 전**: 작업 트리에 아직 커밋하지 않은 변경(포닥 학기 전략, 박사 진학 원서)이 있다. 이 계획은 그 변경 위에서 짠 것이다. 첫 커밋 전에 사용자에게 그 변경을 먼저 따로 커밋할지 물어본다.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

---

### Task 1: 정교수 단계와 정년까지 플레이

정교수 승진이 엔딩이 아니라 새 단계 `full`이 된다. 정년 카드에서 정교수면 `prof` 엔딩, 부교수면 기존 `retire` 엔딩.

**Files:**
- Modify: `nobel.html` — `CAREER`(635행 근처), `transitions()`(1169행 근처), `achieve()`(1140행 근처), `resolve_()`의 `promo`·`retire`(1290·1294행 근처), `globalThis.G`(1730행)
- Test: `test.js` 75~80행 블록

**Interfaces:**
- Produces: `CAREER.full={n:'정교수',pay:5000}`, `const PROF=['ap','asc','full']`, `prof()` → boolean. `G.prof`, `G.hire`.

- [ ] **Step 1: 실패하는 테스트로 바꾸기**

`test.js` 80행을 다음으로 바꾼다.

```js
  S.papers.push({pt:40}); let n=0; while(S.stage==='asc'&&n++<100){S.ss=8;S.q=[{k:'promo'}];G.resolve(0);S.q=[];}
  assert.strictEqual(S.stage,'full','정교수 단계'); assert(!S.end,'정교수 승진은 엔딩이 아니다'); assert(S.titles.includes('정교수'));
  S.t=G.RETIRE_T; S.q=[{k:'retire'}]; G.resolve(0); assert.strictEqual(S.end.kind,'prof','정교수의 정년은 prof 엔딩'); }
```

- [ ] **Step 2: 실패 확인**

Run: `node test.js`
Expected: `AssertionError ... 정교수 단계` (지금은 `finish('prof')`로 바로 끝나서 `S.stage`가 `asc`)

- [ ] **Step 3: 구현**

`CAREER` 줄을 바꾸고 바로 아래에 `PROF`를 둔다.

```js
const CAREER={pd:{n:'박사후연구원',pay:2200},ap:{n:'조교수',pay:3000,min:8,need:6,req:55},asc:{n:'부교수',pay:4000,min:8,need:10,req:65},full:{n:'정교수',pay:5000}};
const PROF=['ap','asc','full'], prof=()=>!!S&&PROF.includes(S.stage); // 교수 단계: 학기 전략 → 연구실 화면 → 학기 진행
```

`transitions()`의 승진 카드 줄(정교수는 `min`이 없다):

```js
    else if(CAREER[S.stage].min&&S.ss>=CAREER[S.stage].min)S.q.push({k:'promo'});
```

`resolve_()`의 `promo` 성공 분기:

```js
  else if(c.k==='promo'&&i===0){ if(roll(promoP())){ if(S.stage==='asc'){hire('full');log('정교수 승진');title('정교수');msg('승진','정교수가 되었다. 연구실 문패의 직함이 바뀌었다. 정년까지는 아직 시간이 많다.','승진');save();return;}
```

(그 뒤 `hire('asc');...` 줄과 실패 분기는 그대로.)

`retire` 줄:

```js
  else if(c.k==='retire')return finish(S.stage==='full'?'prof':'retire');
```

`achieve()`의 마지막 단계 줄을 정교수까지 다루게 바꾼다.

```js
      :S.stage==='full'?['학사모','정년 퇴임','65세',`${Math.max(0,65-age())}년 남음`]
      :['학사모',S.stage==='ap'?'정년 보장 심사':'정교수 승진',`임용 뒤 실적 ${CAREER[S.stage].need}점 권장`,`실적 ${cpts()}점`]].filter(Boolean);}
```

도감 칭호 개수 `TITLES.length+2`(1340행 근처)를 `TITLES.length+3`으로 바꾼다('정교수' 칭호가 늘었다).

`globalThis.G={...}`에 `prof,hire`를 더한다.

- [ ] **Step 4: 통과 확인**

Run: `node test.js`
Expected: 끝까지 돌고 `진학 결과·박사 이후 경력 점검 통과` 출력. 자동 플레이 3000판에 `끝나지 않는 인생`·`정년을 넘김` 실패가 없어야 한다.

- [ ] **Step 5: 커밋**

```bash
git add nobel.html test.js
git commit -m "정교수 단계 추가: 승진 뒤에도 정년까지 플레이

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 교수 학기 전략 창

교수도 학기 전략 창을 쓴다. 학점 자리 = 강의 의무(고정), 개인 연구 자리 = 직접 연구(0~12), 교수 전용 행동. 남는 칸은 연구실 관리 시간(Task 5에서 쓴다).

**Files:**
- Modify: `nobel.html` — `SA`(936행 근처), `planMode`·`saOk`·`gradCred`·`planSum`·`fitPlan`(954~970행 근처), `advance()` 계획 분기(1041~1051행)·학점 줄(1107행), `strat()`(1563행 근처), `G`
- Test: `test.js` 13~18행, 새 블록

**Interfaces:**
- Consumes: `prof()` (Task 1)
- Produces: `DUTY`, `grp()`, `saOk(id)`, `gradCred()`, `rsLim()` → `[lo,hi]`. SA 키 `guide`(학생 지도), `lprep`(강의 준비), `serve`(학과 봉사), `pconf`(학회). `consult`는 교수도 쓴다. `G.saOk`, `G.gradCred`.

- [ ] **Step 1: 실패하는 테스트**

`test.js` 60행(`console.log('학기 전략 점검 통과');`) 바로 앞에 넣는다.

```js
// 교수 학기 전략: 강의 의무 고정(학교 등급 1은 +3), 직접 연구 0~12, 교수 전용 행동만
{ G.newLife({seed:31,gender:'여',hpMax:100}); const S=G.S; S.q=[]; S.stage='ap'; S.lab={school:'남도대',pres:1,type:'방임형',fav:2};
  S.plan={cred:0,rs:20,acts:['guide','lprep','job','club','consult']}; G.fitPlan();
  assert.strictEqual(S.plan.cred,12,'남도대 조교수 강의 9+3'); assert.strictEqual(S.plan.rs,12,'직접 연구 상한 12');
  assert(!S.plan.acts.includes('job')&&!S.plan.acts.includes('club'),'학부·대학원 행동 제외'); assert(S.plan.acts.includes('guide')&&S.plan.acts.includes('consult'));
  S.stage='full'; S.lab.pres=3; S.plan.rs=-5; G.fitPlan(); assert.strictEqual(S.plan.cred,6,'정교수 강의 6'); assert.strictEqual(S.plan.rs,0,'직접 연구 하한 0'); }
```

`test.js` 13~18행(자동 플레이의 학기 전략)을 교수까지 다루게 바꾼다.

```js
    if(S.army===0&&['ug','ms','phd','pd','ap','asc','full'].includes(S.stage)){ // 학기 전략. 학점(대학원은 개인 연구, 교수는 직접 연구)과 행동은 아무거나 넣고 맞춘다. 칸을 넘기면 안 된다
      S.plan={cred:12+Math.floor(Math.random()*10),rs:Math.floor(Math.random()*19),acts:Object.keys(G.SA).filter(()=>Math.random()<.3)}; G.fitPlan();
      assert(G.used()<=G.slots(),'슬롯 초과 seed '+n); for(const id of S.plan.acts)assert(!G.SA[id].lock?.()||G.must(id),'잠긴 행동 '+id);
      if(S.stage==='ug')assert(S.plan.cred>=12,'학점 12 이상 seed '+n);
      else{ assert.strictEqual(S.plan.cred,G.gradCred(),'학점·강의 고정'); for(const id of['ind','ta'])if(G.must(id))assert(S.plan.acts.includes(id),'연구실 의무 '+id);
        for(const id of S.plan.acts)assert(G.saOk(id),'단계에 안 맞는 행동 '+id); } }
```

- [ ] **Step 2: 실패 확인**

Run: `node test.js`
Expected: 처음 실패는 `G.gradCred is not a function` 또는 `남도대 조교수 강의 9+3`.

- [ ] **Step 3: 구현 — 행동과 단계 판정**

`SA`에 교수 행동 넷을 더하고, `consult`의 `only`를 `'pd prof'`로 바꾼다.

```js
  consult:{n:'산학 자문',only:'pd prof',s:4,ico:'가방',d:'수입 +300만 원 · 경제 +4',g:{eco:4},hp:-6,money:300,why:'산학 자문',k:'eco'},
  guide:{n:'학생 지도',only:'prof',s:4,ico:'사람들',d:'학생 만족도 +5 · 성장 ↑',hp:-6,k:'lec'},
  lprep:{n:'강의 준비',only:'prof',s:3,ico:'강의',d:'강의 평가 ↑ · 강의력 +3',g:{lec:3},hp:-4,k:'lec'},
  serve:{n:'학과 봉사',only:'prof',s:3,ico:'관계',d:'평판 +4 · 매력 +1',g:{cha:1},hp:-4,k:'rel'},
  pconf:{n:'학회',only:'prof',s:3,ico:'발표',d:'명성 +2 · 매력 +2',g:{res:1,cha:2},hp:-6,money:-30,why:'학회 참가비',k:'study'},
```

`planMode`~`gradCred` 줄을 바꾼다.

```js
const planMode=()=>!!S&&(S.stage==='ug'||S.stage==='ms'||S.stage==='phd'||S.stage==='pd'||prof()); // 학기 전략 창을 쓰는 단계
const grp=()=>S.stage==='ug'?'ug':S.stage==='pd'?'pd':prof()?'prof':'gr';
const saOk=id=>SA[id]&&(!SA[id].only||SA[id].only.split(' ').includes(grp()));
```

```js
const DUTY={ap:9,asc:9,full:6}; // 교수 강의 의무(칸). 학교 등급 1(가장 낮음)은 강의 부담이 커서 +3
const slots=()=>20+Math.round(Math.max(S.hp,0)*.16), credCap=()=>S.gpa0>=4?21:18, gradCred=()=>prof()?DUTY[S.stage]+(S.lab&&S.lab.pres===1?3:0):S.stage==='pd'?6:S.stage==='phd'&&S.ss>=4?3:9;
const rsLim=()=>prof()?[0,12]:[3,18]; // 직접 연구(교수) / 개인 연구(대학원) 칸 범위
```

`planSum` 첫 항목:

```js
const planSum=(P=S.cur||plan())=>[prof()?'강의 '+P.cred+'칸':S.stage==='pd'?'랩 프로젝트':P.cred+'학점',...(P.rs?[(prof()?'직접 연구 ':'연구 ')+P.rs+'칸']:[]),...P.acts.map(id=>SA[id].n)].join(' · ');
```

`fitPlan()`의 대학원·교수 분기 첫 줄에서 개인 연구 범위를 `rsLim()`으로:

```js
  const req=['ind','ta'].filter(must), [lo,hi]=rsLim(); P.cred=gradCred(); P.rs=clamp(P.rs??(prof()?6:9),lo,hi);
```

- [ ] **Step 4: 구현 — 학기 처리**

`advance()` 계획 분기에서 지원형 행동 탈락 문구, 성장, 논문 진행을 교수용으로 나눈다.

```js
      const P=fitPlan(), ok={}, acts=P.acts.filter(id=>{const A=SA[id]; if(!A.p)return true; ok[id]=roll(A.p()); if(!ok[id])log(A.n+' 탈락',prof()?'남은 시간은 연구실에 쏟았다.':'남은 시간은 학업에 쏟았다.'); return ok[id];});
```

```js
      const ad=adv||{gain:1,prog:1}, g=ug?{res:P.cred/18*3+cur.f*.3,lec:P.cred/18}:prof()?{res:rs*.25+.5,lec:P.cred/9}:{res:(P.cred/9+rs*.25+cur.f*.15)*ad.gain,lec:P.cred/18};
      // 대학원: 개인 연구 칸이 논문 진행도를(빨리 쓰기), 남은 칸이 논문 퀄리티를(잘 쓰기) 올린다. 착취형 교수는 진행 1.2배.
      // 교수: 직접 연구 칸만 본인 논문 진행도를 올린다. 남은 칸은 연구실 관리 시간(labTurn).
      if(!ug){ if(!prof()||rs)S.prog+=(rs*1.6+S.res*.1)*(ad.prog||1); if(!prof())S.pq=Math.min(30,(S.pq||0)+cur.f*.6); S.hp-=rs;}
```

학점 줄(1107행 근처, `const gk=S.res*.7+S.lec*.3, gpa=planMode()&&S.cur&&!inArmy&&!sick?...`)에서 교수를 뺀다. 그 줄의 `gpa=planMode()&&S.cur&&`를 `gpa=planMode()&&!prof()&&S.cur&&`로 바꾸고 나머지는 그대로 둔다. 교수는 학점이 없으므로 대학원 평점(`S.gg`)에도 쌓이지 않는다.

- [ ] **Step 5: 구현 — 화면**

`strat()`에서 대학원용 개인 연구 줄을 교수에도 맞춘다.

```js
          :`<div class="cr"><span>${prof()?'직접 연구':'개인 연구'}</span><button data-a="cred" data-v="-1" aria-label="${prof()?'직접':'개인'} 연구 줄이기"${P.rs<=rsLim()[0]?' disabled':''}>−</button><b class="num">${P.rs}</b><button data-a="cred" data-v="1" aria-label="${prof()?'직접':'개인'} 연구 늘리기"${P.rs>=rsLim()[1]||f<1?' disabled':''}>+</button><small>${prof()?'강의':S.stage==='pd'?'랩 프로젝트':'학점'} ${P.cred} 고정 · 논문 ${Math.round(S.prog)}%</small></div>`}
```

슬롯 설명 줄:

```js
        <p class="sl"><b class="num">체력 ${Math.round(S.hp)} · 슬롯 ${N} · ${prof()?'관리 '+f+'칸':'집중도 '+Math.round(f/P.cred*100)+'%'}</b><small>남은 ${f}칸은 ${ug?'학점 집중에':prof()?'연구실 관리에':'평점과 논문 퀄리티에'} 사용</small></p>
```

`globalThis.G`에 `saOk,gradCred`를 더한다.

- [ ] **Step 6: 통과 확인**

Run: `node test.js`
Expected: `학기 전략 점검 통과`, `진학 결과·박사 이후 경력 점검 통과`. 자동 플레이에서 `슬롯 초과`·`단계에 안 맞는 행동`·`배분 합 100` 실패가 없어야 한다.

- [ ] **Step 7: 커밋**

```bash
git add nobel.html test.js
git commit -m "교수 학기 전략 창: 강의 의무, 직접 연구, 교수 행동

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 평판과 명성, 한 학기 연구실 처리의 뼈대

**Files:**
- Modify: `nobel.html` — `hire()`(1240행), `promoP`(1239행), `CAREER`, `advance()`(학기 초기화 1031행, 계획 분기 끝 1051행, 결산 카드 1112행), `resolve_()`의 `submit` 게재 분기(1271행), `view()`의 `promo`(1223행), `G`
- Test: `test.js` 새 블록

**Interfaces:**
- Consumes: `prof()`, `SA.lprep/serve/pconf` (Task 1·2)
- Produces:
  - 저장값 `S.rep`, `S.fame`, `S.fund`, `S.grants=[]`, `S.students=[]`, `S.alumni=[]`, `S.applicants=[]`, `S.joined=[]`, `S.labR`(이번 학기 연구실 기록)
  - `initLab()`, `ensureLab()`, `addRep(v)`, `addFame(v)`, `labTurn(cur)` — `cur={acts:[...], f:남은 칸}`. `S.labR`을 채우고 돌려준다.
  - `S.labR` 필드: `{fund0,inc,pay,unpaid,joined,left,grads,grow,pub,rep0,fame0,ev,n0}`
  - `G.labTurn, G.initLab`

- [ ] **Step 1: 실패하는 테스트**

`test.js` 맨 끝에 넣는다.

```js
// 평판·명성: 임용 때 시작값, 학기마다 평판은 50 쪽, 명성은 줄어든다. 강의 준비·봉사는 평판, 학회는 명성
{ G.newLife({seed:41,gender:'여'}); const S=G.S; S.q=[]; S.stage='pd'; S.lab={school:'한국대',pres:3,type:'은인형',fav:3}; S.papers=[{pt:8},{pt:4},{pt:8}];
  G.hire('ap',2); assert.strictEqual(S.rep,30); assert.strictEqual(S.fame,50,'실적 20점 × 3, 최대 50'); assert.strictEqual(S.fund,6000,'정착 연구비');
  S.lec=50; S.cha=50; G.labTurn({acts:[],f:5}); const r1=S.rep; assert(S.fame<50,'명성은 줄어든다');
  S.rep=30; G.labTurn({acts:['lprep','serve'],f:5}); assert(S.rep>r1,'강의 준비·봉사가 평판을 올린다');
  S.fame=20; G.labTurn({acts:['pconf'],f:5}); assert(S.fame>20,'학회는 명성을 올린다'); }
console.log('평판·명성 점검 통과');
```

- [ ] **Step 2: 실패 확인**

Run: `node test.js`
Expected: `assert.strictEqual(S.rep,30)` 실패(`undefined !== 30`).

- [ ] **Step 3: 구현**

`CAREER`의 `ap`·`asc`에 심사 기준을 더한다.

```js
const CAREER={pd:{n:'박사후연구원',pay:2200},ap:{n:'조교수',pay:3000,min:8,need:6,req:55,fame:40,rep:40},asc:{n:'부교수',pay:4000,min:8,need:10,req:65,fame:60,rep:50},full:{n:'정교수',pay:5000}};
```

`promoP`:

```js
const promoP=()=>{const C=CAREER[S.stage];return prob(35+(S.res-C.req)*.4+(cpts()-C.need)*6+(S.lec-50)*.3+((S.fame||0)-C.fame)*.3+((S.rep||0)-C.rep)*.3);};
```

`view()`의 `promo` 본문(`body:`)을 평판·명성을 붙인 것으로 바꾼다.

```js
body:`${C.n} 임용 뒤 실적 ${cpts()}점 (권장 ${C.need}점) · 강의력 ${Math.round(S.lec)} · 명성 ${Math.round(S.fame||0)} · 평판 ${Math.round(S.rep||0)}\n${ap?(last?'이번 심사에서 떨어지면 재임용이 끝난다.':'두 번 떨어지면 재임용이 끝난다.'):'떨어져도 자리는 그대로이고 다음 학기에 다시 신청할 수 있다.'}`,
```

`hire()` 끝에서 조교수 임용 때 연구실을 연다.

```js
function hire(stage,pres){S.stage=stage;S.ss=0;S.cpt=pts();S.promoFail=0;if(pres){S.lab.school=GRAD[pres].n;S.lab.pres=pres;}focus(FOCUS[S.focus]?S.focus:'res');if(stage==='ap')initLab();}
```

`hire()` 바로 아래에 교수 연구실 묶음을 새로 둔다.

```js
// ---------- 교수 연구실 (기획서 4장 '학기 전략과 연구실 — 교수') ----------
// 평판: 학내 평가(강의·학생 대우·봉사). 매력·강의력이 높을수록 같은 일로 더 오른다. 명성: 연구 실적. 둘 다 0~100.
function initLab(){ Object.assign(S,{rep:30,fame:Math.min(50,pts()*3),fund:6000,grants:[],students:[],alumni:[],applicants:[],joined:[],labR:null});
  log('정착 연구비 6,000만 원','연구실 통장에 들어왔다.'); }
const ensureLab=()=>{if(prof()&&S.rep==null)initLab();}; // 예전 저장(교수인데 연구실 값이 없음)
const addRep=v=>{S.rep=clamp(S.rep+(v>0?v*(.6+(S.cha+S.lec)/250):v),0,100);};
const addFame=v=>{S.fame=clamp(S.fame+v,0,100);};
// 한 학기 연구실 처리. cur = 이번 학기 계획({acts: 합격한 행동, f: 남은 칸}). 결산이 읽도록 S.labR에 남긴다.
function labTurn(cur){ ensureLab(); const acts=cur.acts||[];
  const R=S.labR={fund0:S.fund,inc:0,pay:0,unpaid:0,joined:S.joined||[],left:[],grads:[],grow:[],pub:[],rep0:S.rep,fame0:S.fame,ev:0,n0:S.students.length-(S.joined||[]).length};
  S.joined=[];
  // 강의 평가와 학내 활동
  const ev=clamp(S.lec*.7+(acts.includes('lprep')?20:0)+rnd()*20,0,100); R.ev=Math.round(ev); addRep((ev-50)/10);
  if(acts.includes('serve'))addRep(4); if(acts.includes('pconf'))addFame(2);
  // 자연 변화: 평판은 50 쪽으로, 명성은 높을수록 많이 줄어든다
  S.rep=clamp(S.rep+(50-S.rep)*.05,0,100); S.fame=clamp(S.fame-(.5+S.fame*.02),0,100);
  return R; }
```

`advance()`:
- 학기 초기화 줄(`S.used=[]; S.brk=[]; ...`)에 `S.labR=null;`을 더한다.
- 계획 분기 끝 `S.alloc=planAlloc(cur); }` 앞에 `if(prof())labTurn(cur);`를 넣는다.
- 결산 카드 `S.q.push({k:'settle',...})`의 객체에 `lab:!!S.labR,`을 더한다.

`resolve_()`의 `submit` 게재 분기에서 `log(...게재...)` 다음에 `if(prof())addFame(pt*1.5);`를 넣는다.

`globalThis.G`에 `labTurn,initLab`을 더한다.

- [ ] **Step 4: 통과 확인**

Run: `node test.js`
Expected: `평판·명성 점검 통과`까지 출력. 기존 `조교수가 두 번 떨어지면 재임용 종료` 테스트도 통과(평판·명성이 없으면 `||0`으로 더 어려워질 뿐).

- [ ] **Step 5: 커밋**

```bash
git add nobel.html test.js
git commit -m "평판·명성 지표와 학기별 연구실 처리 뼈대

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 연구비와 과제

**Files:**
- Modify: `nobel.html` — 교수 연구실 묶음(Task 3), `SA`, `fitPlan()`, `strat()`, `onAction()`, `G`
- Test: `test.js` 새 블록

**Interfaces:**
- Consumes: `labTurn`, `S.fund`, `S.grants` (Task 3)
- Produces: `GRANT`, `WAGE`, `gsize()`, `grantLock(k)` → 잠긴 이유 문자열 또는 `''`, `grantP(k)` → %, `income()`, `payroll()`, `room()`, `fundMe()`. SA 키 `pitch`(과제 제안서). 계획 저장값 `S.plan.gs`('s'|'m'|'l'). `G.grantLock, G.grantP, G.payroll, G.fundMe, G.GRANT`

- [ ] **Step 1: 실패하는 테스트**

`test.js` 맨 끝에 넣는다.

```js
// 연구비: 과제 수주 → 매 학기 입금, 기간이 끝나면 사라진다. 대형은 부교수·명성 60부터. 인건비는 연구실 통장에서
{ G.newLife({seed:51,gender:'여'}); const S=G.S; S.q=[]; S.stage='pd'; S.lab={school:'한국대',pres:3,type:'은인형',fav:3}; S.papers=[]; G.hire('ap',3);
  assert(G.grantLock('l'),'조교수는 대형 불가'); S.stage='asc'; S.fame=60; assert(!G.grantLock('l'),'부교수 명성 60이면 대형'); S.stage='ap';
  S.plan={cred:9,rs:0,acts:[],gs:'m'}; const f0=S.fund; G.labTurn({acts:['pitch'],f:5}); assert.strictEqual(S.grants.length,1); assert.strictEqual(S.fund,f0+4000,'중형 학기 4,000만');
  for(let i=0;i<5;i++)G.labTurn({acts:[],f:5}); assert.strictEqual(S.grants.length,0,'6학기 뒤 종료'); assert.strictEqual(S.fund,f0+24000);
  S.students=[{id:1,n:'김서윤',deg:'phd',ss:0,res:50,sat:60,prog:0,pts:0,tr:'성실형',ord:'paper'}]; S.fund=500; G.labTurn({acts:[],f:5});
  assert.strictEqual(S.fund,500,'못 내면 통장은 그대로'); assert(S.students[0].sat<45,'인건비 미지급 −20');
  S.money=5000; G.fundMe(); assert.strictEqual(S.fund,1000,'사비로 인건비만큼 메운다'); assert.strictEqual(S.money,4500); }
console.log('연구비 점검 통과');
```

- [ ] **Step 2: 실패 확인**

Run: `node test.js`
Expected: `G.grantLock is not a function`

- [ ] **Step 3: 구현 — 규칙**

교수 연구실 묶음의 `initLab` 위에 넣는다.

```js
// 과제: 수주하면 len학기 동안 학기마다 pay(만 원)가 연구실 통장에 들어온다. req = 수주 판정의 기준 영업력.
const GRANT={s:{n:'소형',pay:1500,len:4,req:35},m:{n:'중형',pay:4000,len:6,req:55},l:{n:'대형',pay:10000,len:10,req:75}};
const WAGE={ms:600,phd:1000}, CAP={ap:4,asc:6,full:8}; // 학생 학기 인건비(만 원), 직급별 정원 상한
const gsize=()=>(S.plan&&S.plan.gs)||'s';
const grantLock=k=>k==='l'&&(S.stage==='ap'||(S.fame||0)<60)?'부교수 이상 · 명성 60 필요':'';
const grantP=(k=gsize())=>prob(45+(S.eco-GRANT[k].req)*1.2+((S.fame||0)-30)*.4+5*(S.students||[]).filter(s=>s.ord==='grant').length);
const income=()=>(S.grants||[]).reduce((a,g)=>a+GRANT[g.k].pay,0);
const payroll=()=>(S.students||[]).reduce((a,s)=>a+WAGE[s.deg],0);
const room=()=>(S.fund||0)+income()-payroll(); // 이번 학기 인건비를 내고 남을 돈
function fundMe(){const need=payroll()-S.fund-income(); if(need>0){fx({money:-need},'연구실 인건비'); S.fund+=need;}}
```

`labTurn` 안, `// 자연 변화` 앞에 과제·인건비 처리를 넣는다.

```js
  // 과제 수주(학기 초 판정에 붙은 경우)와 입금, 인건비
  if(acts.includes('pitch')){const k=gsize(); S.grants.push({k,left:GRANT[k].len}); log(`${GRANT[k].n} 과제 수주`,`${GRANT[k].len}학기 동안 학기 ${won(GRANT[k].pay)}`);}
  for(const g of S.grants){S.fund+=GRANT[g.k].pay; R.inc+=GRANT[g.k].pay; g.left--;}
  S.grants=S.grants.filter(g=>g.left>0);
  const pay=payroll(); if(S.fund>=pay){S.fund-=pay;R.pay=pay;}
  else{R.unpaid=1; for(const s of S.students)s.sat=clamp(s.sat-20,0,100); log('인건비가 밀렸다','학생들의 표정이 어둡다.');}
```

`SA`에 과제 제안서를 더한다. `p`가 있으면 `advance()`가 학기 초에 판정하고, 붙으면 `cur.acts`에 남아 `labTurn`이 과제를 연다.

```js
  pitch:{n:'과제 제안서',only:'prof',s:6,ico:'재정',d:()=>`${GRANT[gsize()].n} · 학기 ${won(GRANT[gsize()].pay)} × ${GRANT[gsize()].len}학기 · 영업력 +3`,g:{eco:3},hp:-10,k:'eco',p:()=>grantP()},
```

`fitPlan()`의 대학원·교수 분기 첫 줄 뒤에 잠긴 규모를 소형으로 돌린다.

```js
  if(prof()&&grantLock(P.gs||'s'))P.gs='s';
```

- [ ] **Step 4: 구현 — 화면**

`strat()`의 `<div class="sal">...</div></section>` 앞에 과제 규모 고르기 줄을 넣는다(교수만).

```js
        ${prof()?`<div class="cr gs"><span>과제 규모</span>${Object.keys(GRANT).map(k=>`<button class="${gsize()===k?'on':''}" data-a="gs" data-v="${k}"${grantLock(k)?` disabled title="${grantLock(k)}"`:''}>${GRANT[k].n}</button>`).join('')}<small>수주 확률 ${label(grantP())}</small></div>`:''}
```

`onAction()`에 한 줄:

```js
    else if(a==='gs'){plan().gs=v;fitPlan();save();}
```

CSS(`<style>` 안 `.cr` 규칙 근처)에 고른 규모 표시:

```css
.cr.gs button.on{background:#fdecc4;border-color:var(--gold)}
```

`globalThis.G`에 `grantLock,grantP,payroll,fundMe,GRANT`를 더한다.

`test.js` 자동 플레이의 교수 학기 전략(Task 2에서 바꾼 줄) `G.fitPlan();` 앞에 규모를 무작위로 넣는다.

```js
      S.plan.gs=['s','m','l'][Math.floor(Math.random()*3)];
```

- [ ] **Step 5: 통과 확인**

Run: `node test.js`
Expected: `연구비 점검 통과`까지. 자동 플레이 통과.

- [ ] **Step 6: 커밋**

```bash
git add nobel.html test.js
git commit -m "연구실 통장과 과제: 규모별 수주, 학기 입금, 인건비, 사비 보전

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 학생 — 모집, 성장, 만족도, 이탈, 졸업

**Files:**
- Modify: `nobel.html` — 교수 연구실 묶음, `labTurn`, `initLab`, `view()`, `resolve_()`, `G`
- Test: `test.js` 새 블록, 자동 플레이 루프

**Interfaces:**
- Consumes: `labTurn`, `CAP`, `WAGE`, `room()`, `payroll()` (Task 3·4)
- Produces:
  - 학생 객체 `{id,n,img,deg:'ms'|'phd',ss,res,sat,prog,pts,tr,ord:'paper'|'grant'|'rest',q?,ready?,hold?,talked?}`
  - `TRAIT`, `mkStudent(deg)`, `tier(res)` → '상'|'중'|'하', `appN()`, `lockApp(a)` → '정원 상한'|'연구비 부족'|'', `takeStudent(i)`, `setOrder(i,o)`, `stu(id)`, `graduate(s,R,how)`, `leave(s,R)`
  - 카드 `{k:'labTalk',id}`(면담), `{k:'labMsPhd',id}`(석사 → 박사 제안)
  - 제자 `S.alumni` 항목 `{n,deg,t,job}`
  - `G.mkStudent, G.appN, G.lockApp, G.takeStudent, G.CAP`

- [ ] **Step 1: 실패하는 테스트**

`test.js` 맨 끝에 넣는다.

```js
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
```

(마지막 `G.resolve(0)`은 맨 앞 카드를 처리한다. `labTurn`이 면담 카드만 넣도록 `S.q=[]`로 비운 뒤 부른다.)

- [ ] **Step 2: 실패 확인**

Run: `node test.js`
Expected: `G.appN is not a function`

- [ ] **Step 3: 구현 — 학생 규칙**

교수 연구실 묶음, `initLab` 위에 넣는다.

```js
// 학생 성격: prog 진행 배수, grow 성장 배수, satDown 만족도 감소 배수, pub 게재 때 만족도 추가, ghost 한 학기를 날릴 확률. 사교형은 labTurn에서 동료 만족도 +2.
const TRAIT={성실형:{prog:1.1},천재형:{grow:1.5,satDown:1.3},워라밸형:{satDown:1.5},야심형:{pub:10},사교형:{},잠수형:{ghost:.15}};
const tier=r=>r>=60?'상':r>=40?'중':'하'; // 지원자 카드에는 연구력을 대략만 보인다
const stu=id=>(S.students||[]).find(s=>s.id===id);
function mkStudent(deg){ let n,f; const used=[...(S.students||[]),...(S.applicants||[]),...(S.alumni||[])].map(x=>x.n);
  do{f=rnd()<.5; n=pick('김이박최정강윤장임한')+pick(f?F_NAMES:M_NAMES);}while(used.includes(n)&&rnd()<.95);
  return{id:S.sid=(S.sid||0)+1,n,img:f?'연인':'라이벌',deg,ss:0,res:clamp(Math.round(20+(S.fame||0)*.4+[0,-5,0,5][S.lab.pres]+rnd()*30-15),5,95),sat:60,prog:0,pts:0,tr:pick(Object.keys(TRAIT)),ord:'paper'}; }
// 지원자 수: 지원 점수(평판 ×0.7 + 매력 ×0.3) 구간 0~29 → 0~1명, 30~59 → 1~2명, 60~79 → 2~3명, 80↑ → 3~4명
const appN=()=>{const s=S.rep*.7+S.cha*.3; return (s<30?0:s<60?1:s<80?2:3)+(rnd()<.5?1:0);};
const lockApp=a=>S.students.length>=CAP[S.stage]?'정원 상한':room()<WAGE[a.deg]?'연구비 부족':'';
function takeStudent(i){const a=S.applicants[i]; if(!a||lockApp(a))return; S.applicants.splice(i,1); S.students.push(a); (S.joined=S.joined||[]).push(a.n); log(`${a.n} ${a.deg==='ms'?'석사':'박사'}과정 입학`);}
function setOrder(i,o){const s=S.students[i]; if(s&&['paper','grant','rest'].includes(o))s.ord=o;}
// 졸업·수료. 진로: 박사 연구력 75↑·실적 10↑ → 교수(명성 +2), 박사 연구력 60↑ → 연구소·포닥, 그 외 → 기업.
function graduate(s,R,how){ R=R||S.labR||{grads:[]}; S.students=S.students.filter(x=>x!==s); const deg=s.deg==='ms'?'석사':'박사';
  const job=how||s.deg==='ms'?'기업':s.res>=75&&s.pts>=10?'교수':s.res>=60?'연구소·포닥':'기업';
  if(job==='교수')addFame(2); if(!how)addRep(1);
  S.alumni.push({n:s.n,deg:how?'박사 수료':deg,t:S.t,job}); R.grads.push([s.n,how?'박사 수료':deg,job]); log(`${s.n} ${deg} ${how?'수료':'졸업'}`,job); }
function leave(s,R){ R=R||S.labR||{left:[]}; S.students=S.students.filter(x=>x!==s); addRep(-5); R.left.push(s.n); log(`${s.n}이(가) 연구실을 떠났다`,'진행 중이던 논문도 함께 사라졌다.'); }
```

`initLab()` 끝(`log(...)` 앞)에 첫 지원자를 뽑는다.

```js
  S.applicants=[...Array(appN())].map(()=>mkStudent(rnd()<.6?'ms':'phd'));
```

- [ ] **Step 4: 구현 — labTurn에 학생 처리**

`labTurn`의 인건비 처리 다음, `// 자연 변화` 앞에 넣는다.

```js
  // 연구실 화면에서 고른 졸업 / 붙잡기
  for(const s of S.students.filter(s=>s.ready)){ if(s.hold){s.sat=clamp(s.sat-20,0,100);addRep(-2);s.hold=false;} else graduate(s,R); }
  // 학생 한 명씩: 학기, 성장, 논문 진행, 만족도
  const guide=acts.includes('guide'), lm=.5+S.lec/100, aura=2*S.students.filter(s=>s.tr==='사교형').length, n=Math.max(1,S.students.length), subs=[];
  for(const s of S.students){ const T=TRAIT[s.tr]||{}, dn=T.satDown||1, r0=s.res; s.ss++;
    // 성장: 기본 2, 논문 집중 1, 학생 지도 2×강의력 배율, 지도 보너스(교수 연구력 차이 ×5% ×강의력 배율). 높을수록 덜 오른다.
    // ponytail: 플레이어 grow()는 S의 능력치만 다뤄서 학생은 단순 감쇠(1 − 연구력/150)를 쓴다. 벽·잠재력 폭발은 없다.
    const g=(2+(s.ord==='paper'?1:0)+(guide?2*lm:0)+Math.max(0,S.res-s.res)*.05*lm)*(T.grow||1);
    s.res=clamp(s.res+g*(1-s.res/150),0,100); R.grow.push([s.n,r0,s.res]);
    if(s.ord!=='rest'&&!(T.ghost&&rnd()<T.ghost)){ s.prog+=(8+s.res*.2)*(s.ord==='grant'?.5:1)*(T.prog||1)*(s.sat>=80?1.1:1); s.q=guide?s.res*.3+S.res*.7:s.res*.5+S.res*.5; }
    const d=-3*dn+(s.ord==='rest'?15:0)-(s.ord==='grant'?3*dn:0)+(guide?5:0)+(cur.f>0?Math.min(8,cur.f/n):-5*dn)+aura-(s.tr==='사교형'?2:0);
    s.sat=clamp(s.sat+d,0,100); if(s.prog>=100){s.prog=100;subs.push(s.id);} }
  // 졸업 요건, 면담, 이탈
  for(const s of [...S.students]){
    if(s.deg==='ms'&&s.ss>=4){ if(s.sat>=70&&rnd()*100<clamp(s.sat-40+(s.res-40)*.5,0,90))S.q.push({k:'labMsPhd',id:s.id}); else graduate(s,R); continue; }
    if(s.deg==='phd'&&s.ss>=16){graduate(s,R,'수료');continue;}
    s.ready=s.deg==='phd'&&s.ss>=8&&s.pts>=6;
    if(s.sat<10&&!s.talked){s.talked=1;S.q.push({k:'labTalk',id:s.id});continue;}
    if(s.sat<30&&rnd()*100<(30-s.sat)*2)leave(s,R); }
  R.subs=subs; // 투고 카드는 Task 6
  if(S.students.length)addRep((S.students.reduce((a,s)=>a+s.sat,0)/S.students.length-50)/25); // 학생 만족도 평균이 평판에
```

`labTurn`의 `return R;` 앞에 다음 학기 지원자를 뽑는다.

```js
  S.applicants=[...Array(appN())].map(()=>mkStudent(rnd()<.6?'ms':'phd'));
```

- [ ] **Step 5: 구현 — 면담·박사 제안 카드**

`view()`의 `burnout` 줄 앞에 넣는다.

```js
  if(c.k==='labTalk'){const s=stu(c.id); if(!s)return{title:'면담',body:'',ch:[T('확인')]};
    return{title:'면담 요청',body:josa(`${s.n}이(가) 연구실 문을 두드렸다. "교수님, 드릴 말씀이 있습니다." 표정이 좋지 않다.`),ch:[T('한 학기 쉬게 해 주겠다고 약속한다'),T('떠나겠다면 보내 준다')]};}
  if(c.k==='labMsPhd'){const s=stu(c.id); if(!s)return{title:'석사 졸업',body:'',ch:[T('확인')]};
    return{title:'석사 졸업',body:josa(`${s.n}이(가) 석사를 마쳤다. "박사도 여기서 하고 싶습니다."`),ch:[T('박사 과정으로 받는다'),T('졸업시켜 보낸다')]};}
```

`resolve_()`의 `burnout` 줄 앞에 넣는다.

```js
  else if(c.k==='labTalk'){const s=stu(c.id); if(s){ if(i===0){s.sat=45;s.ord='rest';msg('면담',`${s.n}에게 한 학기 쉬라고 했다. 고개를 끄덕였지만 눈은 아직 붉다.`);} else leave(s);} }
  else if(c.k==='labMsPhd'){const s=stu(c.id); if(s){ if(i===0){s.deg='phd';s.ss=0;log(`${s.n} 박사과정 진학`,'같은 연구실에 남는다.');} else graduate(s);} }
```

`globalThis.G`에 `mkStudent,appN,lockApp,takeStudent,CAP`를 더한다.

- [ ] **Step 6: 자동 플레이에 연구실 넣기**

`test.js` 자동 플레이에서 `G.advance();` 바로 앞에 넣는다.

```js
    if(G.prof()){ // 교수: 지원자를 아무나 받고, 지시를 아무거나 고르고, 가끔 붙잡고, 가끔 사비로 메운다
      while(S.applicants.length&&Math.random()<.5){const i=Math.floor(Math.random()*S.applicants.length); if(G.lockApp(S.applicants[i]))break; G.takeStudent(i);}
      for(const s of S.students){s.ord=['paper','paper','grant','rest'][Math.floor(Math.random()*4)]; if(s.ready)s.hold=Math.random()<.2;}
      if(Math.random()<.3)G.fundMe(); assert(S.students.length<=G.CAP[S.stage],'정원 초과 seed '+n); }
```

`G.advance();` 다음 검사 줄들 뒤에 넣는다.

```js
    if(G.prof()){ assert(!Number.isNaN(S.fund)&&S.rep>=0&&S.rep<=100&&S.fame>=0&&S.fame<=100,'연구실 값 범위 seed '+n);
      for(const s of S.students)assert(s.sat>=0&&s.sat<=100&&s.res>=0&&s.res<=100,'학생 범위 seed '+n); }
```

- [ ] **Step 7: 통과 확인**

Run: `node test.js`
Expected: `학생 점검 통과`까지. 자동 플레이 3000판 통과.

- [ ] **Step 8: 커밋**

```bash
git add nobel.html test.js
git commit -m "연구실 학생: 모집, 성장, 만족도, 면담, 이탈, 졸업과 제자

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 학생 논문 투고

**Files:**
- Modify: `nobel.html` — 교수 연구실 묶음, `labTurn`, `view()`, `resolve_()`
- Test: `test.js` 새 블록

**Interfaces:**
- Consumes: `stu(id)`, `R.subs`, `TRAIT`, `addFame` (Task 3·5)
- Produces: `stuP(s,i)` → %, `recJ(s)` → 학술지 번호, `subStu(s,i)` → 결과 한 줄. 카드 `{k:'labSub',id}`. 선택지 번호 `JOURNAL.length`는 "남은 원고 모두 추천 급으로 투고". 게재된 논문은 `S.papers`에 `{n,pt,a,by}`로 쌓여 교수 실적이 된다.

- [ ] **Step 1: 실패하는 테스트**

`test.js` 맨 끝에 넣는다.

```js
// 학생 논문: 완성된 원고마다 투고 카드, 일괄 투고 선택지, 게재되면 교수 실적
{ G.newLife({seed:71,gender:'여'}); const S=G.S; S.q=[]; S.stage='pd'; S.lab={school:'한국대',pres:3,type:'은인형',fav:3}; S.papers=[]; G.hire('ap',3);
  const a=G.mkStudent('phd'), b=G.mkStudent('phd'); for(const s of[a,b])Object.assign(s,{prog:99,res:95,sat:60,tr:'성실형',ord:'paper'}); S.students=[a,b]; S.res=95; S.luck=10; S.q=[];
  G.labTurn({acts:[],f:4}); assert.strictEqual(S.q.filter(c=>c.k==='labSub').length,2,'완성된 원고마다 투고 카드');
  while(S.q[0]&&S.q[0].k!=='labSub')S.q.shift(); const v=G.view(); assert(/추천 급/.test(v.ch[v.ch.length-1].l),'일괄 투고 선택지'); const n0=S.papers.length;
  G.resolve(v.ch.length-1); assert(!S.q.some(c=>c.k==='labSub'),'일괄 투고로 모두 처리'); assert(S.papers.length>n0||a.prog===50,'게재되면 교수 실적, 리젝되면 50%'); }
console.log('학생 논문 점검 통과');
```

- [ ] **Step 2: 실패 확인**

Run: `node test.js`
Expected: `완성된 원고마다 투고 카드` 실패(0 !== 2)

- [ ] **Step 3: 구현**

교수 연구실 묶음에 넣는다.

```js
// 학생 논문 투고. 퀄리티 s.q = 학생 연구력 ×0.5 + 교수 연구력 ×0.5(학생 지도 학기는 0.3 / 0.7). 학교 등급이 높으면 조금 유리.
const stuP=(s,i)=>prob(50+((s.q??s.res)-JOURNAL[i].req)*2+S.lab.pres*4-4);
const recJ=s=>{let r=0; JOURNAL.forEach((j,i)=>{if(stuP(s,i)>=50)r=i;}); return r;}; // 반반 이상인 곳 중 가장 높은 급
function subStu(s,i){ const j=JOURNAL[i]; let line;
  if(roll(stuP(s,i))){ S.papers.push({n:j.n,pt:j.pt,a:age(),by:s.n}); s.pts+=j.pt; s.prog=0; s.sat=clamp(s.sat+10+((TRAIT[s.tr]||{}).pub||0),0,100); addFame(j.pt*1.5);
    line=`${s.n} · ${j.n} 게재 (실적 ${j.pt}점)`; log(`${s.n}의 논문이 ${j.n}에 실렸다`); }
  else{ s.prog=50; s.sat=clamp(s.sat-5,0,100); line=`${s.n} · ${j.n} 리젝`; log(`${s.n}의 논문이 ${j.n}에서 리젝됐다`,'고쳐서 다시 낸다.'); }
  if(S.labR)S.labR.pub.push(line); return line; }
```

`labTurn`의 `R.subs=subs; // 투고 카드는 Task 6` 줄을 바꾼다.

```js
  for(const id of subs)if(stu(id))S.q.push({k:'labSub',id}); // 완성된 원고마다 투고 카드
```

`view()`의 `labTalk` 줄 앞에 넣는다.

```js
  if(c.k==='labSub'){const s=stu(c.id); if(!s)return{title:'원고',body:'',ch:[T('확인')]}; const more=S.q.filter(x=>x.k==='labSub').length-1;
    return{title:`${s.n}의 원고`,body:josa(`${s.n}이(가) 논문 초고를 들고 왔다. 어디에 투고할까? 추천은 ${JOURNAL[recJ(s)].n}.`),
      ch:JOURNAL.map((j,i)=>T(`${j.n} (실적 ${j.pt}점)`,stuP(s,i))).concat(more>0?[T(`남은 원고 ${more+1}편 모두 추천 급으로 투고`)]:[])};}
```

`resolve_()`의 `labTalk` 줄 앞에 넣는다.

```js
  else if(c.k==='labSub'){ const batch=i===JOURNAL.length, cs=batch?[c,...S.q.filter(x=>x.k==='labSub')]:[c]; if(batch)S.q=S.q.filter(x=>x.k!=='labSub');
    const lines=cs.map(x=>stu(x.id)).filter(Boolean).map(s=>subStu(s,batch?recJ(s):i)); if(lines.length)msg('투고 결과',lines.join('\n')); }
```

- [ ] **Step 4: 통과 확인**

Run: `node test.js`
Expected: `학생 논문 점검 통과`까지. 자동 플레이 통과(무작위 선택이 `labSub` 카드도 고른다).

- [ ] **Step 5: 커밋**

```bash
git add nobel.html test.js
git commit -m "학생 논문 투고 카드와 일괄 투고

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 연구실 화면

학기 전략 창의 버튼이 교수일 때 "연구실로 →"가 되고, 연구실 화면에서 "이번 학기 시작"을 눌러야 학기가 돈다.

**Files:**
- Modify: `nobel.html` — `<style>`, `strat()`, 새 `lab()`(strat 아래), `kind()`·`game()`(1621행 근처), `onAction()`
- Test: 브라우저 확인(화면 코드는 노드 테스트가 닿지 않는다)

**Interfaces:**
- Consumes: `ensureLab, income, payroll, fundMe, CAP, GRANT, lockApp, takeStudent, setOrder, tier` (Task 3~5)
- Produces: 화면 종류 `'lab'`, `ui.lab`(1이면 연구실 화면). 버튼 `data-a`: `toLab, labBack, ord, hold, take, fundme, labGo`.

- [ ] **Step 1: 화면 함수**

`strat()` 바로 아래에 넣는다. `BACK`·`HOUSE`·`esc`·`won`·`stg`는 화면 묶음에 이미 있다.

```js
  // 연구실 화면(교수): 학기 전략 창 다음, 학기 진행 전. 학생 지시·모집·졸업 결정·인건비 보전.
  const ORD={paper:'논문 집중',grant:'과제 투입',rest:'쉬게 함'};
  function lab(){ ensureLab(); const inc=income(), pay=payroll(), short=pay-(S.fund+inc), face=x=>`<img class="ico" src="에셋/인물-${x.img}.webp" alt="">`;
    const srow=(s,i)=>`<div class="stu"><div class="stn">${face(s)}<span><b>${esc(s.n)}</b><small>${s.deg==='ms'?'석사':'박사'} ${s.ss+1}학기 · ${esc(s.tr)} · 실적 ${s.pts}점</small></span><span class="num stv">연구력 <b>${Math.round(s.res)}</b></span></div>
      <div class="meter" style="--bar:var(--gold)" role="img" aria-label="만족도 ${Math.round(s.sat)}"><i style="width:${Math.round(s.sat)}%"></i></div><small class="muted">만족도 ${Math.round(s.sat)} · 논문 ${Math.round(s.prog)}%</small>
      <div class="seg" role="radiogroup" aria-label="${esc(s.n)} 지시">${Object.keys(ORD).map(o=>`<button role="radio" aria-checked="${s.ord===o}" class="${s.ord===o?'on':''}" data-a="ord" data-v="${i}:${o}">${ORD[o]}</button>`).join('')}</div>
      ${s.ready?`<div class="seg" role="radiogroup" aria-label="${esc(s.n)} 졸업">${[['0','졸업시킨다'],['1','한 학기 더 붙잡는다']].map(([h,l])=>`<button role="radio" aria-checked="${!!s.hold===(h==='1')}" class="${!!s.hold===(h==='1')?'on':''}" data-a="hold" data-v="${i}:${h}">${l}</button>`).join('')}</div>`:''}</div>`;
    const arow=(a,i)=>{const why=lockApp(a); return `<div class="stu app"><div class="stn">${face(a)}<span><b>${esc(a.n)}</b><small>${a.deg==='ms'?'석사':'박사'} 지원 · ${esc(a.tr)} · 연구력 ${tier(a.res)}</small></span></div><button class="btn" data-a="take" data-v="${i}"${why?' disabled':''}>${why||'받기'}</button></div>`;};
    return `<header class="top st-top"><button class="homebtn" data-a="labBack" aria-label="학기 전략으로">${BACK}</button><h1>${stg()} ${S.t%2+1}학기 연구실</h1></header>
      <div class="scroll"><section class="card"><div class="fx"><div class="fxg">
          <div><span>연구실 통장</span><b class="num">${won(S.fund)}</b><small>이번 학기 과제 +${won(inc)}</small></div>
          <div><span>인건비</span><b class="num down">${won(pay)}</b><small>정원 ${S.students.length} / ${CAP[S.stage]}</small></div></div>
        <p class="muted">${S.grants.length?S.grants.map(g=>`${GRANT[g.k].n} 과제 ${g.left}학기 남음`).join(' · '):'진행 중인 과제 없음'}</p>
        ${short>0?`<p class="warn">이번 학기 인건비가 ${won(short)} 모자란다. 그대로 가면 학생 모두 만족도 −20.</p><button class="btn ghost" data-a="fundme">사비로 ${won(short)} 메운다</button>`:''}</div></section>
        <section class="card"><header class="sah"><span class="chip">학생 ${S.students.length}명</span>${S.t?'<small>지난 학기 지시 유지</small>':''}</header>${S.students.map(srow).join('')||'<p class="muted">아직 학생이 없다.</p>'}</section>
        ${S.applicants.length?`<section class="card"><header class="sah"><span class="chip">지원자 ${S.applicants.length}명</span><small>이번 학기에만 받을 수 있다</small></header>${S.applicants.map(arow).join('')}</section>`:''}</div>
      <button class="btn big" data-a="labGo">이번 학기 시작</button>`; }
```

- [ ] **Step 2: 흐름 연결**

`strat()` 마지막 버튼:

```js
      <button class="btn big" data-a="${prof()?'toLab':'start'}">${prof()?'연구실로 →':'이번 학기 시작'}</button>`;
```

`kind()`의 끝부분과 `game()`:

```js
  const kind=()=>ui.screen!=='game'||!S?ui.screen:S.end?'end':storyCard()?'intro':S.pend?'prog':S.q[0]&&S.q[0].k==='settle'?'settle':S.q.some(c=>c.k==='settle')?'prog':S.q[0]&&S.q[0].k==='offers'?'offers':!S.q.length&&stratOn()?(prof()&&ui.lab?'lab':'strat'):'plan';
  const game=()=>({strat,lab,intro:prologue,end:ending,prog:progress,settle:()=>settle(S.q[0]),plan:progress,offers:gradResult})[kind()]();
```

`onAction()`에 넣는다(`a==='start'` 줄 다음).

```js
    else if(a==='toLab')ui.lab=1;
    else if(a==='labBack')ui.lab=0;
    else if(a==='ord'){const[i,o]=v.split(':');setOrder(+i,o);save();}
    else if(a==='hold'){const[i,h]=v.split(':'),s=S.students[+i]; if(s&&s.ready){s.hold=h==='1';save();}}
    else if(a==='take'){takeStudent(+v);save();}
    else if(a==='fundme'){fundMe();save();}
    else if(a==='labGo'){ui.lab=0;ui.paused=false;ui.logN=6;advance();}
```

- [ ] **Step 3: CSS**

`<style>` 끝에 넣는다. 색은 `:root` 토큰(`--line`, `--gold`, `--muted`)을 쓰고, 고른 상태 바탕은 학기 전략 행과 같은 `#fdecc4`(DESIGN.md 컴팩트 기준).

```css
.stu{display:grid;gap:6px;padding:10px 0;border-top:2px solid var(--line)}
.stu:first-of-type{border-top:0}
.stn{display:flex;align-items:center;gap:10px}.stn>span:first-of-type{flex:1;display:grid;min-width:0}
.stv{white-space:nowrap}
.seg{display:flex;gap:4px}.seg button{flex:1;min-height:36px;padding:6px 4px;border:2px solid var(--line);background:none;font:inherit;font-size:13px;color:inherit}
.seg button.on{background:#fdecc4;border-color:var(--gold)}
.stu.app{grid-template-columns:1fr auto;align-items:center}
.warn{color:var(--accent);margin:6px 0}
```

- [ ] **Step 4: 브라우저 확인**

1. `preview_start {name:"nobel"}`로 열고 `http://127.0.0.1:8765/nobel.html`로 간다.
2. 새 인생을 만든 뒤, 콘솔(javascript_tool)에서 조교수 상태로 바꾸고 새로고침한다.

```js
const s=JSON.parse(localStorage.getItem('nobel.life')); Object.assign(s,{stage:'ap',ss:0,q:[],pend:null,army:0,lab:{school:'한국대',pres:3,type:'은인형',fav:3,prof:'김서윤'},papers:[{pt:8}],rep:null,plan:{cred:9,rs:6,acts:[]}}); localStorage.setItem('nobel.life',JSON.stringify(s)); location.reload();
```

3. 홈에서 이어하기 → 학기 전략 창에 강의 9칸 고정, 직접 연구 줄, 교수 행동(과제 제안서·학생 지도·강의 준비·학과 봉사·학회·산학 자문)이 보이는지 본다.
4. "연구실로 →" → 통장 6,000만 원, 지원자 카드(연구력 상·중·하), "받기"를 눌러 명단에 들어가는지, 지시 세 개가 바뀌는지, 뒤로 가기가 전략 창으로 돌아가는지 본다.
5. "이번 학기 시작" → 학기 진행 → 결산까지 오류 없이 가는지 본다(`read_console_messages {onlyErrors:true}`).
6. 375px 폭(`resize_window {preset:'mobile'}`)에서 가로 스크롤이 없는지 보고 스크린숏을 남긴다. 끝나면 `preset:'desktop'`.

- [ ] **Step 5: 회귀 확인**

Run: `node test.js`
Expected: 모든 점검 통과.

- [ ] **Step 6: 커밋**

```bash
git add nobel.html
git commit -m "연구실 화면: 학생 지시, 모집, 졸업 결정, 인건비 보전

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 결산 연구실 묶음, 상단 평판·명성, 인물 화면의 제자 목록

**Files:**
- Modify: `nobel.html` — `settle()`(1435행 근처), `progress()`(1550행 근처), `home()`의 인물 화면(1333행 근처)
- Test: 브라우저 확인

**Interfaces:**
- Consumes: `S.labR` 필드(Task 3~6), 결산 카드 `c.lab`(Task 3), `S.alumni`(Task 5)
- Produces: 결산 접기 `s_lab`

기획서는 평판·명성을 "인물 카드"에 둔다고 했지만, 게임 중 볼 수 있는 인물 정보는 홈의 **인물** 화면(`ui.screen==='people'`)뿐이다(생성 때의 인물 카드는 게임 중에 다시 열리지 않는다). 그래서 인물 화면에 넣는다. 아래 탭 "인생"도 아직 없어서 제자 목록도 같은 화면에 둔다.

- [ ] **Step 1: 결산 연구실 묶음**

`settle()`의 `// 관계:` 주석 앞에 넣는다.

```js
    // 연구실(교수): 변화가 있는 줄만. S.labR은 이번 학기 labTurn 기록이고, 투고 결과(pub)는 결산 전에 카드로 처리돼 들어와 있다.
    const LR=c.lab&&S.labR, labUI=!LR?'':(()=>{ const ln=[];
      ln.push(['연구비',`${won(LR.fund0)} → ${won(S.fund)}`,[LR.pay&&`인건비 −${won(LR.pay)}`,LR.inc&&`과제 +${won(LR.inc)}`,LR.unpaid&&'인건비 밀림'].filter(Boolean).join(' · ')]);
      const mv=[...LR.joined.map(n=>n+' 입학'),...LR.grads.map(([n,d,j])=>`${n} ${d} · ${j}`),...LR.left.map(n=>n+' 이탈')]; if(mv.length)ln.push(['학생',`${LR.n0}명 → ${S.students.length}명`,mv.join(', ')]);
      const gr=LR.grow.filter(g=>Math.round(g[2])>Math.round(g[1])); if(gr.length)ln.push(['성장',gr.map(g=>`${g[0]} ${Math.round(g[1])} → ${Math.round(g[2])}`).join(' · '),'연구력']);
      if(LR.pub.length)ln.push(['논문',LR.pub.join(' · '),'']);
      for(const[k,nm,a]of[['rep','평판',LR.rep0],['fame','명성',LR.fame0]])if(Math.round(S[k])!==Math.round(a))ln.push([nm,`${Math.round(a)} → ${Math.round(S[k])}`,k==='rep'?`강의 평가 ${LR.ev}점`:'']);
      return FD('s_lab','연구실',`<ul class="fxl dot">${ln.map(([k,v,s])=>`<li><span>${k}</span><b class="num">${esc(v)}</b>${s?`<small>${esc(s)}</small>`:''}</li>`).join('')}</ul>`,`평판 ${Math.round(S.rep)} · 명성 ${Math.round(S.fame)}`); })();
```

반환 HTML에서 재정 `FD('s_fin',...)` 다음 줄에 `${labUI}`를 넣는다. `onAction`의 `a==='res'` 줄 앞부분 `ui.fold.s_fin=ui.fold.s_rel=false;`에 `ui.fold.s_lab=`을 더해 `ui.fold.s_fin=ui.fold.s_rel=ui.fold.s_lab=false;`로 만든다.

- [ ] **Step 2: 진행 화면 상단**

`progress()`의 `<p class="idl">...</p>` 다음 줄에 넣는다.

```js
        ${prof()&&S.rep!=null?`<p class="idl"><b>평판 ${Math.round(S.rep)}</b><i>·</i><b>명성 ${Math.round(S.fame)}</b></p>`:''}
```

- [ ] **Step 3: 인물 화면**

`home()`의 인물 화면 `<ul class="list panel">` 첫 `<li>` 앞에 평판·명성 줄을, 그 `</ul>` 바로 뒤에 제자 목록을 넣는다. 둘 다 `${!S?'<p ...>진행 중인 인생이 없습니다.</p>':`...`}`의 **S가 있을 때 쪽 템플릿 문자열 안**에 넣어야 한다(바깥에 두면 S가 없을 때 오류).

```js
      ${S.rep!=null?`<li><span>평판 · 명성</span><span class="muted num">${Math.round(S.rep)} · ${Math.round(S.fame)}</span></li>`:''}
```

```js
      ${(S.alumni||[]).length?`<h2>제자</h2><ul class="list panel">${S.alumni.map(a=>`<li><span>${esc(a.n)} · ${a.deg}</span><span class="muted">${20+(a.t>>1)}세 때 · ${esc(a.job)}</span></li>`).join('')}</ul>`:''}
```

- [ ] **Step 4: 브라우저 확인**

Task 7 Step 4의 방법으로 조교수 상태를 만든 뒤 학생 2명을 받고 학기를 두세 번 돈다.
1. 결산에 "연구실" 접기가 있고, 펼치면 연구비·학생·성장·평판·명성 줄이 보이는지(바뀐 줄만).
2. 진행 화면 위에 "평판 n · 명성 n" 한 줄.
3. 콘솔에서 학생 하나를 `ss:3, deg:'ms'`로 바꿔 한 학기 돌린 뒤, 홈 → 인물 화면에 제자 목록이 생기는지.
4. 콘솔 오류 없음. 375px 폭 스크린숏.

- [ ] **Step 5: 회귀 확인**

Run: `node test.js`
Expected: 모든 점검 통과.

- [ ] **Step 6: 커밋**

```bash
git add nobel.html
git commit -m "결산 연구실 요약, 상단 평판·명성, 인물 화면의 제자 목록

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 밸런스 점검과 기획서 정리

**Files:**
- Modify: `test.js` 끝의 통계 출력, `노벨상-키우기-기획서.md`(수치가 바뀐 경우만)

- [ ] **Step 1: 통계 출력 추가**

`test.js`의 `console.log('평균 학기',...)` 줄 다음에, 자동 플레이 루프에서 모은 값을 출력한다. 루프의 인생 끝(`ends[S.end.name]=...` 줄 근처)에 다음을 더한다.

```js
  if(S.alumni){st.prof=(st.prof||0)+1; st.alumni=(st.alumni||0)+S.alumni.length; st.full=(st.full||0)+(S.titles.includes('정교수')?1:0); st.fame=(st.fame||0)+S.fame;}
```

출력:

```js
console.log('교수가 된 인생',st.prof||0,'정교수까지',st.full||0,'평균 제자',st.prof?(st.alumni/st.prof).toFixed(1):0,'평균 최종 명성',st.prof?(st.fame/st.prof).toFixed(0):0);
```

- [ ] **Step 2: 실행하고 수치 보기**

Run: `node test.js`
보는 것:
- 교수가 된 인생 중 정교수까지 간 비율이 0%나 100%에 붙어 있지 않은지.
- 평균 제자 수가 0이 아닌지(무작위 플레이어도 학생을 받는다).
- 학생 논문이 교수 실적(`pts()`)에 더해져 `finish('prof')`의 "노벨상 후보로 거론되는 석학"(실적 52↑)이 지나치게 흔해지지 않았는지 — `ends` 출력에서 그 엔딩 수를 본다.

- [ ] **Step 3: 손잡이 조정(필요할 때만)**

치우쳐 있으면 아래 값만 바꾼다: `GRANT[].req`(수주 난이도), `appN()` 구간, 학생 진행 `8+s.res*.2`, `finish('prof')`의 실적 기준(52·40). 바꾼 값은 기획서 4장 교수 절의 표에도 같은 숫자로 고친다.

- [ ] **Step 4: 커밋**

```bash
git add test.js nobel.html 노벨상-키우기-기획서.md
git commit -m "교수 연구실 밸런스 점검 통계

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
