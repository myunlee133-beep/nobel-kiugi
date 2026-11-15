'use strict';
// 판정과 화면이 같은 확률 함수를 읽는다. roll()은 운을 다시 더하지 않는다.
let S=null, LT=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rnd(){let t=S.seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
const pick=a=>a[Math.floor(rnd()*a.length)];
const prob=(p,min=5,max=95)=>clamp(Math.round(p+S.luck),min,max);
const roll=p=>rnd()*100<clamp(p,0,100);
const label=p=>p<20?'매우 낮음':p<40?'낮음':p<60?'반반':p<80?'높음':'매우 높음';
const pct=p=>`${p}% · ${label(p)}`;
const won=v=>(v<0?'-':'')+Math.abs(Math.round(v)).toLocaleString('ko-KR')+'만 원';
const age=()=>20+Math.floor(S.t/2);
const grad=()=>S.stage==='ms'||S.stage==='phd';
const pts=()=>S.papers.reduce((a,p)=>a+p.pt,0);
const gpa=()=>S.gn?S.gsum/S.gn:3;
const closeFriend=(min=0)=>(S.ppl||[]).filter(x=>x.v>=min&&!x.away).sort((a,b)=>b.v-a.v)[0];
function josa(word,pair){const chars=Array.from(String(word)),c=chars.at(-1)?.codePointAt(0)||0,has=c>=0xac00&&c<=0xd7a3?(c-0xac00)%28!==0:/[013678]/.test(chars.at(-1)||'');return word+pair.split('/')[has?0:1];}
function natural(s){return String(s).replace(/([\p{L}\p{N}]+)(이\(가\)|을\(를\)|와\(과\))/gu,(_,w,p)=>josa(w,{'이(가)':'이/가','을(를)':'을/를','와(과)':'과/와'}[p]));}
function uniqueName(){const used=new Set([S.name,...(S.names||[]),S.rival?.name,S.partner?.name,...(S.ppl||[]).map(x=>x.n)]);const pool=NAMES.filter(n=>!used.has(n)&&![...used].some(u=>u&&u.slice(-2)===n.slice(-2)));const n=pool.length?pick(pool):'연구원'+((S.names||[]).length+1);(S.names||=[]).push(n);return n;}
function chance(stat,req,bonus=0){return prob(50+(S[stat]-req)*2+bonus-(S.hp<25?10:0)+(stat==='cha'&&S.focus==='rel'?10:0));}
function log(s,sub){const t=LT??S.t;S.log.push({a:20+(t>>1),t,s:natural(s),sub:sub?natural(sub):''});}
const ledger=()=>S.led||=( {start:S.money,inc:0,exp:0,in:{},out:{},entries:[]} );
const netAsset=(o=S)=>Math.round(o.money+(o.home?(o.homeValue||0):0)-(o.debt||0));
function fx(e,why){if(!e)return;for(const[k,v]of Object.entries(e)){
  if(STATS.includes(k))S[k]=clamp(S[k]+v,0,100);
  else if(k==='hp')S.hp=clamp(S.hp+v,-50,S.hpMax);
  else if(k==='joy')S.joy=clamp(S.joy+v,0,100);
  else if(k==='money'){const L=ledger();S.money=Math.round(S.money+v);if(v){const n=natural(why||'기타'),side=v>0?'in':'out';L[side]||={};L[side][n]=(L[side][n]||0)+Math.abs(v);L[v>0?'inc':'exp']+=Math.abs(v);(L.entries||=[]).push({t:LT??S.t,n,v});S.lastCash={n,v,seq:(S.lastCash?.seq||0)+1};}}
  else if(k==='debt')S.debt=Math.max(0,(S.debt||0)+v);
  else if(k==='prog'&&grad())S.prog=clamp(S.prog+v,0,100);
  else if(k==='adv'&&S.lab)S.lab.fav=clamp(S.lab.fav+v,0,5);
  else if(k==='rival')S.rival.fav=clamp(S.rival.fav+v,0,5);
  else if(k==='bond'){const x=closeFriend();if(x)x.v=clamp(x.v+v,0,100);}
  else if(k==='pfav'&&S.partner)S.partner.fav=clamp(S.partner.fav+v,0,5);
  else if(k==='partner'){if(v>0&&!S.partner){S.partner={name:uniqueName(),fav:2,img:'연인'};log(josa(S.partner.name,'과/와')+' 사귀기 시작');}if(v<0&&S.partner){log(josa(S.partner.name,'과/와')+' 이별');S.partner=null;}}
  else if(k==='flag')S.flags[v]=1;
  else if(k==='title')title(v);
}}
function title(n){if(!S.titles.includes(n)){S.titles.push(n);dogam('titles',n);log(`칭호 '${n}' 획득`);}}
function msg(title,body,stamp){S.q.push({k:'msg',title,body:natural(body),stamp});}
const minStudy=()=>grad()&&S.lab&&ADV[S.lab.type].lock===2?50:25;
function fixAlloc(){S.alloc||={study:40,lec:15,eco:15,rel:15,rest:15};let need=minStudy()-S.alloc.study;if(need<=0)return;for(const k of['rest','rel','eco','lec']){const d=Math.min(need,S.alloc[k]);S.alloc[k]-=d;S.alloc.study+=d;need-=d;}}
const eff=p=>p<=25?p/25:p<=50?1+(p-25)/25*.7:1.7+(p-50)/50*.5;
const hpm=p=>p<=25?p/25:1+(p-25)/25*1.25;
const UGF={
 rel:{n:'관계',d:'친밀도·행복↑ · 모임비 80만 · 체력 -20',ico:'매력',g:{cha:5,eco:2,res:-1},joy:5,hp:-20,money:-80,why:'모임',pp:3,meet:35,a:{study:25,lec:10,eco:10,rel:40,rest:15}},
 study:{n:'학업·연구',d:'연구력↑ · 체력 -38 · 학점·연구 성과에 집중',ico:'성과',g:{res:6,cha:-1,eco:-1},joy:-3,hp:-38,pp:-3,meet:10,a:{study:60,lec:10,eco:5,rel:5,rest:20}},
 out:{n:'대외활동',d:'발표·공모전 확률↑ · 체력 -38 · 참가비 40만',ico:'발표',g:{lec:4,eco:3},money:-40,why:'대외활동 참가비',hp:-38,pp:0,meet:50,a:{study:30,lec:30,eco:10,rel:15,rest:15}},
 tutor:{n:'강의·과외',d:'학생 모집에 성공해야 수입이 생긴다 · 체력 -36',ico:'강의',g:{lec:4,eco:2},hp:-36,pp:-1,meet:10,a:{study:30,lec:40,eco:5,rel:10,rest:15}},
 job:{n:'경제 활동',d:'학부 알바 학기 480만 · 연구력↓ · 체력 -46',ico:'코인',g:{eco:5,cha:2,res:-2},money:480,why:'아르바이트',joy:-2,hp:-46,pp:-2,meet:15,a:{study:25,lec:5,eco:45,rel:10,rest:15}},
 rest:{n:'휴식',d:'체력 +18 (기본 회복 별도) · 행복↑ · 성장 완만',ico:'행복',g:{res:.5,cha:1},joy:8,hp:18,pp:1,meet:10,a:{study:25,lec:5,eco:5,rel:15,rest:50}}
};
const FOCUS={res:['study',60],lec:['lec',40],eco:['eco',40],cha:['rel',40],joy:['rest',40]};
const ugf=()=>S.stage==='ug'&&UGF[S.focus];
function focus(f){if(UGF[f]){S.focus=f;S.alloc={...UGF[f].a};fixAlloc();return true;}if(!FOCUS[f])return false;const[k,p]=FOCUS[f];S.focus=f;S.alloc={study:30,lec:10,eco:10,rel:10,rest:10,[k]:p};fixAlloc();return true;}
function blocks(){const A=S.alloc,m=minStudy(),B=[['lab',m],['exp',(A.study-m)/2],['write',(A.study-m)/2],['ta',A.lec],['prop',A.eco],['people',A.rel],['rest',A.rest]];return B.filter(b=>b[1]>0);}
function tutorProfile(){const existing=S.tutorClients>0&&S.t-(S.lastTutor??-99)<=1,xp=S.tutorXP||0,g=S.exam[3];const base=existing?68+S.lec*.22+xp*2:[0,5,38,70][S.ugTier]+(5-g)*7+(S.lec-50)*.65+Math.min(28,xp*5);const p=prob(base,2,95),monthly=Math.round(clamp([0,16,30,44][S.ugTier]+Math.max(0,4-g)*4+(S.lec-45)*.45+xp*3,15,85));return{p,monthly,total:monthly*4,existing,reason:`${UG[S.ugTier].n} 초기 수요 · 수능 ${g}등급 · 강의력 ${Math.round(S.lec)} · 지도 경력 ${xp}학기`};}
function runTutoring(P=tutorProfile()){const ok=roll(P.p);S.tutoring={...P,ok};if(ok){fx({money:P.total},'과외 수입 (4개월)');S.tutorXP=(S.tutorXP||0)+1;S.tutorClients=1;S.lastTutor=S.t;log(`과외 ${P.existing?'재계약':'학생 모집'} 성공`,`${P.total}만 원 · 실제 판정 ${P.p}%`);}else{S.tutorClients=0;log('과외 모집 불발','모집 글은 남았지만 이번 학기 과외 수입은 0원이다.');}}
const campus=()=>grad()&&S.lab?S.lab.pres:S.ugTier;
const commutes=()=>S.from===UG[campus()].region||(S.from==='경기'&&UG[campus()].region==='서울');
const housingRent=()=>S.home||commutes()?0:UG[campus()].rent;
function budget(){const tuition=S.stage==='ug'&&!S.preparing?UG[S.ugTier].tuition:grad()&&!S.preparing?260:0;const entry=S.stage==='ug'&&S.ss===0?S.scholarship:0,need=S.stage==='ug'&&!S.preparing?[180,60,0][S.family]:0,merit=S.stage==='ug'&&S.ss>0&&gpa()>=3.8?Math.round(tuition*.4):0;return{tuition,scholar:Math.min(tuition,entry+need+merit),support:S.stage==='ug'&&!S.preparing?[120,480,1000][S.family]:0,living:S.preparing?180:240,rent:S.preparing?0:housingRent()};}
function tuitionAndLiving(onLeave=false){const B=budget();if(onLeave){fx({money:-180},'휴학 중 생활비 (본가)');return;}if(B.support)fx({money:B.support},'집안 지원');if(B.tuition)fx({money:-B.tuition},'등록금');if(B.scholar)fx({money:B.scholar},'등록금 장학금');fx({money:-B.living},'생활비 (식비·교통 등)');if(B.rent)fx({money:-B.rent},'월세');else log(S.home?'내 집에서 지냈다':'본가에서 통학했다');if(grad()&&!S.preparing)fx({money:Math.round((S.stage==='ms'?600:960)*ADV[S.lab.type].pay+(S.lab.pres===3?100:0))},'연구 인건비');const L=LIFE[S.life||'mid'];if(L.cost)fx({money:-L.cost},L.cost>0?'추가 소비':'생활비 절약');fx({joy:L.joy});}
function lifeSlot(life){const json=JSON.stringify(life);let hash=2166136261;for(let i=0;i<json.length;i++)hash=Math.imul(hash^json.charCodeAt(i),16777619);return{id:`${life.id}:${hash>>>0}`,name:life.name,t:life.t,stage:life.stage,end:life.end?.name||'',life:JSON.parse(json)};}
function archiveLife(life=S){if(!life)return true;const slot=lifeSlot(life),keep=(store.get(SLOTS_KEY)||[]).filter(x=>x.id!==slot.id);keep.unshift(slot);return store.set(SLOTS_KEY,keep.slice(0,3));}
function restoreSlot(index){const slots=store.get(SLOTS_KEY)||[],slot=slots[index];if(!slot)return false;let keep=slots.filter((_,i)=>i!==index);if(S){const old=lifeSlot(S);keep=keep.filter(x=>x.id!==old.id);keep.unshift(old);}if(!store.set(SLOTS_KEY,keep.slice(0,3)))return false;S=slot.life;save();return true;}
function newLife(o={}){
 S={version:2,id:o.id||`${o.seed??Date.now()}-${o.name||'김연구'}`,seed:(o.seed??Math.floor(Math.random()*2**31))|0,name:o.name||'김연구',gender:o.gender||'여',field:o.field||FIELDS[0],t:0,ss:0,stage:'ug',res:0,lec:0,eco:0,cha:0,hp:100,hpMax:100,joy:60,money:0,debt:0,homeValue:0,prog:0,papers:[],q:[],log:[],titles:[],flags:{},names:[],used:[],hosp:0,army:0,armyDone:false,defer:false,home:0,life:'mid',port:'dep',buy:{},lingo:0,end:null,lab:null,partner:null,pend:null,ppl:[],history:[],tutorXP:0,tutorClients:0,leave:0,leaveCount:0,prepCount:0};
 const rolledLuck=Math.round(rnd()*20-10);S.luck=o.luck??rolledLuck;S.family=o.family??(rnd()<.25?0:rnd()<.73?1:2);
 const st=o.stats||rollStats(rnd);S.talent=talentOf(st);Object.assign(S,schoolStats(st,o.hs,S.field));S.hs=HS[+o.hs||0];S.from=HOME[+o.home||0];S.exam=o.exam||rollExam(S.res,rnd);
 const recommended=[3,2,1].find(t=>admitP(t,S.exam[3],S.luck)>=65);const hope=clamp(+o.hope||recommended,1,3),p=admitP(hope,S.exam[3],S.luck);S.ugTier=roll(p)?hope:Math.max(1,hope-1);S.admission={hope,p,tier:S.ugTier};S.scholarship=entryScholar(S.ugTier,S.exam[3]);
 S.exempt=S.gender==='남'&&rnd()<.05;if(S.gender!=='남')S.armyDone=true;S.money=[150,500,1600][S.family];S.led={start:S.money,inc:0,exp:0,in:{},out:{},entries:[]};S.rival={name:uniqueName(),fav:2};focus('study');
 log(`${UG[S.ugTier].n} ${S.field}과 입학`);S.history.push({t:0,money:S.money,asset:netAsset(),debt:0});
 const background=['필요한 것이 생기면 먼저 통장을 확인하는 집이었다. 등록금 지원을 알아보는 것도 새 학기의 준비였다.','아주 넉넉하지도, 크게 부족하지도 않은 집이었다. 부모님은 할 수 있는 만큼 돕겠다고 했다.','당장의 생활비 때문에 꿈을 접을 필요는 없었다. 이 여유를 어디에 쓸지는 내 몫이었다.'][S.family];
 msg('스무 살, 첫 페이지',[
 `뉴스에서는 누군가 노벨상을 받았다고 했다. 스무 살 ${S.name}은 잠깐 화면을 바라보았다. 내 이름도 언젠가 저기에 있을까.`,
 `${S.from}에서 ${S.hs.n}를 졸업했다. 수능 ${S.exam[3]}등급을 확인한 뒤 ${UG[hope].n}에 지원했다. ${hope!==S.ugTier?`불합격 후 한 단계 아래인 ${UG[S.ugTier].n}의 추가 합격을 받았다.`:'합격 문자를 몇 번이나 다시 읽었다.'}`,
 `${UG[S.ugTier].n} ${S.field}과. ${background} ${S.scholarship?`첫 학기 입학 장학금 ${S.scholarship}만 원은 등록금 결산에 반영된다.`:''}`,
 S.exempt?'병역 면제 판정을 받았다. 공부에 쓸 시간이 조금 더 생겼다.':'공부와 아르바이트, 새로운 사람들과 쉬어 가는 시간. 모두 챙길 수 있을지는 아직 모르겠다.',
 '거창한 꿈에도 생활비는 든다. 첫 시간표를 짜 볼 차례다.'
 ].join('\n\n'));S.q.at(-1).intro=true;save();return S;
}
function reveal(){const P=S.pend;if(!P)return;if(!P.length){S.pend=null;save();return;}const m=P.shift(),t=S.t-1;S.log.push({a:20+(t>>1),t,mo:m.mo,w:m.w,s:natural(m.s),month:1});if(m.ev)S.q.unshift({k:'event',id:m.ev,mo:m.mo,w:m.w});save();}
const waitingEvent=()=>S.q[0]&&(S.q[0].k==='event'||S.q[0].ev);
function fastForward(){let guard=0;while(S.pend&&!waitingEvent()&&guard++<10)reveal();save();}
const stg=()=>S.army>0?'군 복무':S.leave?'휴학·근로':S.preparing?'진학 준비':S.stage==='ug'?`${Math.floor(S.ss/2)+1}학년`:`${S.stage==='ms'?'석사':'박사'} ${Math.floor(S.ss/2)+1}년 차`;
function snap(){return{res:S.res,lec:S.lec,eco:S.eco,cha:S.cha,joy:S.joy,hp:S.hp,money:S.money,home:S.home,homeValue:S.homeValue,debt:S.debt,n:S.papers.length,f:{lab:S.lab?.fav??null,rival:S.rival.fav,partner:S.partner?.fav??null},p:Object.fromEntries(S.ppl.map(x=>[x.n,x.v]))};}
function updatePeople(F){for(const x of S.ppl){x.v=clamp(x.v+Math.round((F?F.pp:S.alloc.rel/5-3)+rnd()*4)-(x.away?2:0),0,100);}if(S.ppl.filter(x=>!x.away).length<5&&rnd()*100<(F?F.meet:20+S.alloc.rel)){S.ppl.push({n:uniqueName(),role:grad()?'연구실 동료':pick(['학과 친구','동아리 선배','스터디 조원']),img:'사람',v:30+Math.round(rnd()*20),joined:S.t});}if(S.stage==='ug'&&S.ss===7&&!S.flags.classGraduated){S.flags.classGraduated=1;for(const x of S.ppl){x.career=pick(['취업','대학원','유학']);x.away=x.career==='유학';x.role='학부 친구 · '+x.career;log(`${x.n}의 근황`,`${x.career} 준비를 시작했다. ${x.away?'한동안 자주 보기 어렵겠다.':'같은 시간표를 쓰는 날이 줄어든다.'}`);}}}
function studyRecord(sick,inArmy,onLeave,preparing){if(S.stage!=='ug'||sick||inArmy||onLeave||preparing)return null;const n=Math.round(clamp(2+S.res/44+(S.alloc.study>=45?.45:0)+(S.joy>60?.1:0)-(S.hp<25?.35:0)+rnd()*.4-.2,1.5,4.5)*10)/10;S.gsum=(S.gsum||0)+n;S.gn=(S.gn||0)+1;return n;}
function semesterLines(inArmy,sick,onLeave,sem){const MO=sem?[9,10,11,12]:[3,4,5,6],P=inArmy?{army:1}:sick?{sick:1}:S.alloc,bank=MONTH[grad()?'gr':'ug'],seen=[];const lines=Array.from({length:8},(_,i)=>{const keys=Object.keys(P).filter(k=>P[k]>0);let r=rnd()*keys.reduce((a,k)=>a+P[k],0),k=keys[0];for(const x of keys)if((r-=P[x])<0){k=x;break;}const all=MONTH[k]||bank[k],fresh=all.filter(x=>!seen.includes(x));let text=pick(fresh.length?fresh:all);if(k==='lec'&&S.stage==='ug'&&!S.tutoring?.ok&&/과외|학부모/.test(text))text='과외 모집 글을 올렸다. 조회 수만 올랐다.';seen.push(text);return{mo:MO[i>>1],w:i*2+2,s:text};});
 if(!inArmy&&!sick&&!onLeave){lines[0].s=sem?'찬 바람이 불기 시작했다. 두 번째 학기 시간표를 펼쳤다.':'교정에 꽃이 피었다. 새 노트 첫 장에 이름을 썼다.';lines[7].s=S.money<0?'통장의 마이너스가 다음 학기 계획에도 따라붙었다.':S.hp<30?'주말에 잠만 잤다. 쉬는 것도 계획에 넣어야겠다.':S.joy>=70?'돌아보니, 힘들기만 한 학기는 아니었다.':S.partner?'바쁜 와중에도 함께 저녁 먹을 시간은 남겼다.':'종강 날, 이번 학기의 나에게 짧은 메모를 남겼다.';if(roll(78)){const pool=EV.filter(e=>e.st.split(' ').includes(S.stage)&&!S.flags['e_'+e.id]&&(!e.cond||e.cond(S))&&(e.id!=='parent'||S.tutoring?.ok));if(pool.length){const chain=pool.filter(e=>['friendHelp','peerWork','rivalLab','rivalTogether','anomaly','replicate','discovery'].includes(e.id));const e=pick(chain.length&&rnd()<.65?chain:pool),i=1+Math.floor(rnd()*6),t=natural(e.t(S));S.flags['e_'+e.id]=1;lines[i]={...lines[i],s:t.split(/(?<=[.!?])\s/)[0],ev:e.id};}}}
 if(onLeave)lines.forEach((l,i)=>l.s=['출근 도장을 찍었다. 이번 학기 시간표는 근무표다.','월급에서 필요한 돈부터 떼어 두었다.','다음 학기의 책을 빌렸다. 아직 돌아갈 자리는 남아 있다.','지출 내역을 정리했다. 숫자가 조금 가벼워졌다.'][i%4]);return lines;}
function advance(){
 if(!S||S.end||S.q.length||S.pend)return false;fixAlloc();const L=ledger(),b=snap();b.money=L.start??b.money;const prog0=S.prog,ti0=S.titles.length,sem=S.t%2,semName=`${stg()} ${sem+1}학기`,inArmy=S.army>0,onLeave=S.leave>0,preparing=!!S.preparing;S.used=[];S.tutoring=null;const tutorForecast=tutorProfile();S.activityForecast=S.act&&ACTS[S.act]?{id:S.act,p:ACTS[S.act].p?pAct(S.act):null,reason:activityReason(S.act)}:null;
 if(!inArmy&&!onLeave)for(const k in S.buy){const o=BUY[k];if(S.buy[k]&&o&&o.can()&&S.money>=o.price){fx({money:-o.price},o.n);o.go();}}S.buy={};
 const adv=S.lab?ADV[S.lab.type]:null,joyMul=.85+S.joy/100*.3;let sick=false;
 if(inArmy){fx({hp:10,res:-1,eco:1,joy:-2,money:600},'군 복무 급여');S.army--;if(!S.army){S.armyDone=true;log('전역');msg('전역','세 학기가 지났다. 달력은 돌아왔고, 전공 책은 낯설어졌다.');}}
 else if(onLeave){S.leave--;S.leaveCount++;fx({money:1000,hp:5,joy:-3},'휴학 중 집중 근로');log('휴학·근로 학기','학업 기간은 늘지 않았다. 생활비를 마련하고 돌아왔다.');}
 else if(S.hp<=0){sick=true;S.hosp++;S.hp=55;fx({money:-120,joy:-7},'병원비');log('과로로 입원');msg('입원','이번 학기는 회복에 썼다. 학업 학기는 늘지 않았고 병원비 120만 원이 나갔다.');}
 else{const F=ugf();if(F){for(const k of STATS){const v=F.g[k]??.3;S[k]=clamp(S[k]+(v>0?v*(1-S[k]/110)*joyMul:v),0,100);}S.used=[...STATS];fx({joy:F.joy||0,hp:F.hp});if(F.money)fx({money:F.money},F.why);if(S.focus==='tutor')runTutoring(tutorForecast);}
   else for(const[id,p]of blocks()){const a=ACT[id],m=eff(p),lin=p/25;for(const k in a.g){S[k]=clamp(S[k]+a.g[k]*(1-S[k]/110)*joyMul*m*(k==='res'&&adv?adv.gain:1),0,100);if(!S.used.includes(k))S.used.push(k);}if(a.prog)S.prog+=(a.prog[0]+S.res*a.prog[1])*m*(adv?.prog||1);S.hp+=a.hp<0?a.hp*hpm(p):a.hp*lin;fx({joy:(a.joy||0)*lin});if(a.money)fx({money:Math.round(a.money*lin)},AN[id]);}
   if(grad()&&!preparing)fx({hp:-8});updatePeople(F);if(S.alloc.rel>=25){if(S.partner)S.partner.fav=clamp(S.partner.fav+1,0,5);else if(roll(prob(S.cha*.3)))fx({partner:1});}else if(S.partner&&rnd()<.2){S.partner.fav--;if(S.partner.fav<=0){fx({partner:-1,joy:-10});msg('이별','시간을 내지 못한 날들이 쌓였다. 바빴다는 말만으로는 부족했다.');}}}
 if(!inArmy)tuitionAndLiving(onLeave);const interest=Math.round((Math.max(0,-S.money)+(S.debt||0))*.025);if(interest)fx({money:-interest},'대출·마이너스 이자 (학기 2.5%)');
 if(S.money>0&&!inArmy){const principal=S.money,p=yieldPct(S.port||'dep'),gain=Math.round(principal*p/100);L.investment={kind:S.port||'dep',principal,pct:p,gain};if(gain)fx({money:gain},PORT[S.port||'dep'].n+' 운용 손익');}
 S.hp=clamp(S.hp+(sick?0:28+(S.home?5:0)),-50,S.hpMax);for(const k of STATS)if(!S.used.includes(k)&&!inArmy&&!onLeave)S[k]=clamp(S[k]-(.4+S[k]*.012),0,100);fx({joy:(50-S.joy)*.05+(adv&&!preparing?adv.joy:0)+(S.hp<25?-4:0)+(S.money<-1000?-3:0)+(S.partner?2:0)});S.prog=Math.min(S.prog,100);
 const termGpa=studyRecord(sick,inArmy,onLeave,preparing),out=!inArmy&&!sick&&!onLeave?achieve():null;if(grad()&&!preparing&&S.prog>=100)S.q.push({k:'submit'});
 const lines=semesterLines(inArmy,sick,onLeave,sem);S.t++;if(!inArmy&&!sick&&!onLeave&&!preparing)S.ss++;if(preparing)S.prepCount++;S.pend=lines;
 for(const[n,f]of TITLES)if(f(S))title(n);S.q.push({k:'settle',t:S.t-1,name:semName,b,prog0,n0:b.n,ti0,p0:S.partner?.name,gpa:termGpa,out});
 if(S.joy<15)S.q.push({k:'burnout'});transitions({inArmy,onLeave,sick});save();return true;
}
const CONF=['미래과학자연합','청년과학포럼','한빛융합학술회','새벽탐구회','푸른별과학회','알파연구포럼'],LANG_KEEP=4;
const langLeft=()=>S.lang?S.lang.t+LANG_KEEP-S.t:0,langOk=()=>langLeft()>0;
const ACTS={
 conf:{n:'학회 발표',ico:'발표',f:'out',d:'2학기 이수 후 · 발표 실적은 진학 심사에 반영',p:()=>15+S.cha*.6+S.res*.4},
 lang:{n:'어학 시험',ico:'영어',f:'study',d:'TOEIC 성적 2년 유효 · 교환학생·해외 연구 조건'},
 contest:{n:'공모전',ico:'수상',f:'out',d:'2학기 이수 후 · 수상은 대학원 심사에 반영 · 입상 시 상금'},
 paper:{n:'논문 투고',ico:'논문',f:'study',d:'학부 4학기·연구 인연·연구력 45 필요 · 대학원 실적으로 승계',p:()=>25+(S.res-45)*1.5+(S.rec?.intern||0)*3},
 intern:{n:'랩 인턴',ico:'연구',f:'study',d:'2학기 이수 후 · 교수와의 인연은 진학 확률에 반영',p:()=>10+S.cha*.5+S.res*.7},
 exchange:{n:'교환학생',ico:'가방',f:'out',d:'학부 3~6학기 이수 · TOEIC 750·평점 3.3 · 추가 비용 400만',p:()=>45+(gpa()-3.3)*20+S.cha*.3},
 overseas:{n:'해외 공동 연구',ico:'발표',f:'study',d:'대학원 · 유효 TOEIC 850·게재 논문 1편 · 비용 200만',p:()=>30+S.res*.5+(S.flags.net?12:0)},
 startup:{n:'창업 프로젝트',ico:'코인',f:'out',d:'4학기 이수·경제력 55 · 시제품 비용 300만',p:()=>25+S.eco*.5+S.cha*.2}
};
const fbon=id=>((S.focus==='out'?'out':['study','res'].includes(S.focus)?'study':'')===ACTS[id]?.f?12:0);
const pAct=id=>prob(ACTS[id].p()+fbon(id));
function activityReason(id){if(!ACTS[id])return'없는 활동';if(S.army||S.leave)return'복무·휴학 중에는 참여할 수 없습니다';if(id==='conf'||id==='contest'||id==='intern')return S.stage==='ug'&&S.ss<2?'2학기 이수 후 해금':'';if(id==='paper'){if(S.stage==='ug'){if(S.ss<4)return'4학기 이수 후 해금';if(!S.flags.known&&!S.rec?.intern)return'먼저 랩 인턴이나 연구 인연이 필요합니다';if(S.res<45)return'연구력 45 이상 필요';}else if(S.prog<60)return'원고 진행도 60% 이상 필요';}if(id==='exchange'){if(S.stage!=='ug'||S.preparing)return'학부 재학 중에만 지원';if(S.ss<3||S.ss>6)return'3~6학기 이수 구간에 지원';if(!langOk()||S.lang.score<750)return'유효 TOEIC 750 이상 필요';if(gpa()<3.3)return'누적 평점 3.3 이상 필요';if(S.money<400)return'추가 체류비 400만 원 필요';if(S.flags.exchange)return'이미 다녀왔습니다';}if(id==='overseas'){if(!grad()||S.preparing)return'대학원 재학 중 해금';if(!langOk()||S.lang.score<850)return'유효 TOEIC 850 이상 필요';if(!S.papers.length)return'게재 논문 1편 필요';if(S.money<200)return'체류비 200만 원 필요';}if(id==='startup'){if(S.stage==='ug'&&S.ss<4)return'4학기 이수 후 해금';if(S.eco<55)return'경제력 55 이상 필요';if(S.money<300)return'시제품 비용 300만 원 필요';}return'';}
function actRow(){const id=S.act;if(!id||!ACTS[id])return null;const A=ACTS[id],forecast=S.activityForecast?.id===id?S.activityForecast:null,reason=forecast?.reason||activityReason(id);if(reason)return[A.ico,A.n,reason,'참여 보류'];const R=S.rec||={aw:{},conf:{}},b=fbon(id),T=S.t;fx({hp:id==='lang'?-4:-7});
 if(id==='lang'){const sc=clamp(Math.round((350+S.res*6+S.lec+(S.lingo||0)*4+rnd()*80+b*4)/5)*5,300,990);S.lang={score:sc,t:T+1};return[A.ico,'어학 시험','TOEIC · 4학기 유효',sc+'점'];}
 if(id==='contest'){const score=(S.eco+S.res+S.cha+S.lec)/4*1.05+rnd()*28+b,aw=score>=85?'대상':score>=70?'우수상':score>=55?'장려상':'본선 진출';if(/상$/.test(aw)){R.aw[aw]=(R.aw[aw]||0)+1;fx({money:aw==='대상'?150:50},'공모전 '+aw+' 상금');}return[A.ico,'공모전 결과','수상 경력이 대학원 심사에 반영된다',aw];}
 if(['exchange','overseas','startup'].includes(id))fx({money:-({exchange:400,overseas:200,startup:300}[id])},A.n+' 준비비');
 if(!roll(forecast?.p??pAct(id))){if(id==='paper'&&grad())S.prog=Math.max(0,S.prog-10);return[A.ico,A.n,'준비와 시도의 기록은 남았다','불합격'];}
 if(id==='conf'){const form=S.res+b>=55?'구두':'포스터';R.conf[form]=(R.conf[form]||0)+1;return[A.ico,'학회 결과',pick(CONF),form+' 발표'];}
 if(id==='intern'){S.flags.known=1;R.intern=(R.intern||0)+1;return[A.ico,'랩 인턴','지도교수와 연구 인연이 생겼다','합격'];}
 if(id==='paper'){const q=S.res+b+rnd()*12,ji=clamp(Math.floor((q-40)/20),0,2),paper={n:JOURNAL[ji].n,j:JOURNAL[ji].n,pt:JOURNAL[ji].pt,gr:q>=80?'A':'B',c:0,source:S.stage,a:age()};if(grad()){S.papers.push(paper);S.prog=Math.max(0,S.prog-60);}else(R.papers||=[]).push(paper);return[A.ico,'논문 게재','인용은 다음 학기부터 쌓인다',paper.n];}
 if(id==='exchange'){S.flags.exchange=1;fx({cha:4,res:2,joy:5});S.lingo=Math.min(60,S.lingo+10);return[A.ico,A.n,'언어와 성적으로 새로운 교정을 만났다','선발'];}
 if(id==='overseas'){S.flags.overseas=1;fx({res:4,prog:15});return[A.ico,A.n,'학회 명함이 실제 협력으로 이어졌다','참여'];}
 S.flags.startup=1;fx({eco:4,money:500},'창업 시제품 첫 매출');return[A.ico,A.n,'첫 고객이 생겼다. 회사가 된 것은 아직 아니다','첫 매출'];
}
function achieve(){return[actRow(),['과제','학업 기록',S.preparing?'진학·취업 준비':grad()?'연구 노트와 과제 보고서':'전공 수업과 과제',S.alloc.study>=35?'충실히 진행':'기본 이수'],['학사모','진로 준비',S.stage==='ug'?'평점·수상·논문·연구 인연을 함께 심사':`게재 실적 ${pts()}점`,S.stage==='ug'?'입시 반영':S.stage==='ms'?'박사 진학 심사':'졸업 준비']].filter(Boolean);}
const academicBonus=()=>{const R=S.rec||{aw:{},conf:{}};return{학점:Math.round((gpa()-3)*16),수상:Math.min(12,(R.aw?.대상||0)*6+(R.aw?.우수상||0)*4+(R.aw?.장려상||0)*2),발표:Math.min(8,(R.conf?.구두||0)*4+(R.conf?.포스터||0)*2),논문:Math.min(16,(R.papers||[]).reduce((a,p)=>a+(p.pt||1)*3,0)),연구인연:(S.flags.known?8:0)+(S.flags.rivalRef?4:0)+(S.flags.peerResearch?4:0)};};
const admit=o=>chance('res',GRAD[o.pres].req,(S.ugTier-1)*5+Object.values(academicBonus()).reduce((a,b)=>a+b,0));
const phdP=()=>chance('res',52,Math.min(18,pts()*3)+S.lab.fav*3+(S.flags.peerResearch?4:0));
const subBonus=()=>S.lab.pres*4-4+ADV[S.lab.type].sub;
function offers(){return{ k:'offers',list:[3,2,1].map(p=>({pres:p,type:pick(Object.keys(ADV))})) };}
function transitions({inArmy=false,onLeave=false,sick=false}={}){if(S.t>=48){S.q.push({k:'timeLimit'});return;}if(!inArmy&&!onLeave&&!sick){if(S.preparing)S.q.push(S.preparing==='ms'?offers():{k:'msEnd'});else if(S.stage==='ug'){if(S.ss===4&&!S.armyDone&&!S.exempt&&!S.defer)S.q.push({k:'army'});if(S.ss>=8)S.q.push(offers());}else if(S.stage==='ms'&&S.ss>=4)S.q.push({k:'msEnd'});else if(S.stage==='phd'){if(S.defer&&!S.armyDone&&!S.exempt&&S.ss===2)S.q.push({k:'jmy'});if(S.ss>=PHD_MAX)S.q.push({k:'kicked'});else if(S.ss>=PHD_MIN&&pts()>=NEED)S.q.push({k:'defense'});}}
 if(S.money<=-500&&(S.t-(S.flags.debtTurn??-10)>=2)){S.q.push({k:'debt',severe:S.money<=-1500});S.flags.debtTurn=S.t;}}
function enter(o){S.lab={school:GRAD[o.pres].n,pres:o.pres,type:o.type,fav:2};S.stage='ms';S.ss=0;S.preparing=null;S.prepCount=0;S.prog=0;const papers=S.rec?.papers||[];S.papers=papers.map(p=>({...p,source:'ug',n:p.n||p.j,pt:p.pt||1}));focus('study');log(`${S.lab.school} 대학원 입학 (${o.type} 교수)`);if(papers.length)log(`학부 논문 ${papers.length}편을 대학원 실적으로 승계`);msg('처음 연구실에 출근한 날',`선택하는 초점은 그대로다. 이제 학업은 실험과 논문이 되고, 강의는 조교 일이 된다. 체력과 생활비도 계속 필요하다. ${papers.length?`학부 논문 ${papers.length}편의 실적이 이어진다.`:''}`);}
function enlist(){S.army=3;log('입대');}
function finish(kind){const p=pts(),wealth=netAsset();let name,line;if(kind==='grad'){[name,line]=S.flags.discovery&&p>=10?['발견의 첫 장을 쓴 박사','작은 신호를 버리지 않은 덕분에, 이제 더 큰 질문을 안고 졸업한다.']:wealth<0?['학위와 남은 청구서','박사 학위를 받았다. 통장에는 아직 다음 선택의 비용이 남아 있다.']:S.joy<30?['학위와 맞바꾼 것들','졸업장은 받았다. 오래 미뤄 둔 사람들과 나를 돌볼 차례다.']:p>=14?['촉망받는 신진 박사','대표 논문과 추천서를 챙겼다. 연구를 계속할 다음 자리를 찾는다.']:['무사히 박사가 된 사람','학위 논문 감사의 글에 이 시간을 함께한 이름을 적었다.'];}else if(kind==='kicked'){name='박사 수료';line='수료라는 두 글자 뒤에 끝내지 못한 질문과 버텨 낸 시간이 남았다.';}else if(kind==='startup'){name='연구실 밖의 창업자';line='첫 고객의 질문은 심사위원의 질문만큼 날카로웠다.';}else if(kind==='job'){name=S.stage==='ug'?'다른 길을 고른 졸업생':'기업 연구소로 간 사람';line='지원서에 배운 것과 해 본 것을 적었다. 다음 명함의 소속은 연구실 밖이었다.';}else{[name,line]=S.stage==='ug'?['일찍 방향을 정한 사람',wealth<0?'공부를 잠시 멈추고 생활의 기반부터 만들기로 했다. 빚은 사라지지 않았지만 계획은 달라졌다.':S.home?'내 집에서 다음 진로를 준비한다. 남들과 다른 순서로 살기로 했다.':'학계를 떠나 새로운 일을 찾기로 했다. 아직 결정되지 않은 미래가 남아 있다.']:['학계를 떠난 사람','연구실 출입증을 반납했다. 이곳에서 익힌 질문하는 습관은 가지고 나왔다.'];}
 const epilogue=[S.flags.discovery?'30년 뒤. 당시의 이상한 신호는 여러 연구자의 검증을 거쳐 대표 연구로 남았다. 노벨상을 꿈꾸던 첫 질문은 더 많은 사람의 질문이 되었다.':S.flags.verified||S.flags.carefulDiscovery?'30년 뒤. 작은 실험 노트는 후속 연구의 출발점으로 인용되었다. 상의 이름보다 오래 남는 기록도 있었다.':p>=10?'30년 뒤. 대표 논문이 후배들의 참고 문헌에 남았다. 노벨상 수상 뉴스가 나올 때면, 나의 질문도 아직 끝나지 않았다는 생각을 했다.':'30년 뒤. 노벨상 뉴스는 여전히 나온다. 그날의 나는 연구실에서 혹은 다른 일터에서 배운 방식으로 자기 삶의 문제를 풀고 있다.',
 S.partner?`${S.partner.name}${S.partner.wed?'과는 가족이 되어':'과는'} 이 시절을 함께 기억한다. 바쁜 날에 남겨 둔 저녁 약속이 있었다.`:'인생 기록에는 친구와 동료, 혼자 회복하던 시간도 남았다.',
 S.flags.rivalCollab?`${S.rival.name}과는 경쟁 끝에 공동 저자로 이름을 남겼다.`:S.rival.fav>=3?`${S.rival.name}과는 서로 다른 길에서도 가끔 근황을 주고받았다.`:`${S.rival.name}의 소식은 가끔 학회나 동기 단톡방을 통해 들려왔다.`,
 wealth<0?`마지막 결산의 순자산은 ${won(wealth)}. 재정의 부담까지 이 삶의 기록에 남긴다.`:S.joy>=70?'성과 사이에 남겨 둔 휴식과 사람들이 이 시간을 버티게 했다.':`마지막 결산의 순자산은 ${won(wealth)}. 다음 삶의 기반으로 남았다.`];
 log(name);S.q=[];S.pend=null;S.end={kind,name,line,epilogue:epilogue.map(natural)};dogam('endings',name);save();archiveLife();}
const RACT={trip:{n:'여행',cost:80,up:12,cha:45,m:'와(과) 여행을 다녀왔다. 사진첩이 300장 늘었다.'},gift:{n:'선물',cost:30,up:7,m:'에게 선물을 건넸다. 필요한 것을 기억해 두길 잘했다.'},cut:{n:'손절'},meal:{n:'밥',cost:5,up:4,cha:15,m:'와(과) 밥을 먹었다. 다음에는 상대가 사기로 했다.'},confess:{n:'고백'},propose:{n:'청혼'}};
const relP=v=>prob((v+S.cha)*.6-15);
function relCount(){return S.relTurn===S.t?(S.relActions||0):0;}
function relCan(x,isP,a){const A=RACT[a];if(!A||!x||x.away||x.t===S.t||relCount()>=2||S.army||S.leave||A.cost&&S.money<A.cost||A.cha&&S.cha<A.cha)return false;return a==='confess'?!isP:a==='propose'?isP&&!x.wed:true;}
function relAct(who,a){const isP=who==='p',x=isP?S.partner:S.ppl[who];if(!relCan(x,isP,a))return false;const A=RACT[a],nm=isP?x.name:x.n;if(S.relTurn!==S.t){S.relTurn=S.t;S.relActions=0;}S.relActions++;x.t=S.t;
 if(A.up){fx({money:-A.cost},`관계 · ${nm} · ${A.n}`);if(isP){x.closeness=(x.closeness||0)+A.up;if(x.closeness>=12){x.fav=clamp(x.fav+1,0,5);x.closeness-=12;}}else x.v=clamp(x.v+A.up,0,100);fx({joy:2});msg(A.n,nm+A.m);}
 else if(a==='cut'){if(isP)fx({partner:-1,joy:-10});else S.ppl.splice(who,1);msg('관계 정리',`${nm}에게 거리를 두기로 했다.`);}
 else if(a==='confess'){if(roll(relP(x.v))){if(S.partner){log(josa(S.partner.name,'과/와')+' 이별');fx({joy:-5});}S.ppl.splice(who,1);S.partner={name:nm,fav:clamp(Math.round(x.v/20),2,5),img:'연인',role:x.role,t:S.t};log(josa(nm,'과/와')+' 사귀기 시작');fx({joy:10});msg('고백',`"나도 사실…" ${josa(nm,'과/와')} 사귀기로 했다.`);}else{x.v=clamp(x.v-10,0,100);fx({joy:-6});msg('고백',`"좋은 친구로 지내자." ${nm}의 답장은 짧았다.`);}}
 else if(a==='propose'){if(roll(prob((x.fav*20+S.cha)*.6-25))){x.wed=1;log(josa(nm,'과/와')+' 약혼');fx({joy:15});msg('청혼',`반지를 받은 ${josa(nm,'이/가')} 울었다. 나도 울었다.`);}else{fx({pfav:-1,joy:-8});msg('청혼','"조금 더 준비하자." 반지는 서랍에 넣었다.');}}save();return true;}
function debtChoices(c){const ch=[];if(!c.severe&&S.debt<2000)ch.push({l:'학자금 대출 800만 원 (부채도 800만 증가)',act:'loan'});if(S.family===0&&!S.flags.aid)ch.push({l:'긴급 생활 장학금 신청 (400만 원)',act:'aid'});if(S.family>0&&!S.flags.familyHelp)ch.push({l:'가족에게 한 번 도움을 청한다 (500만 원)',act:'family'});if(S.leaveCount<3)ch.push({l:'한 학기 휴학하고 집중 근로 (학업 중단)',act:'leave'});if(S.home)ch.push({l:'집을 정리하고 월세로 옮긴다',act:'sell'});ch.push({l:'취업으로 진로를 바꾼다 (엔딩)',act:'job'});return ch;}
function view(){const c=S?.q[0];if(!c)return null;const T=(l,p)=>({l,tag:p==null?'':pct(p)});if(c.k==='msg')return{title:c.title,body:c.body,stamp:c.stamp,ch:[T('확인')]};if(c.k==='settle')return{title:c.name+' 결산',body:'',ch:[T('다음 학기 준비')]};
 if(c.k==='event'){const e=EV.find(x=>x.id===c.id);return{title:e.name||'이번 학기의 사건',body:natural(e.t(S)),ch:e.c.map(o=>({...T(o.l,o.risk!=null?o.risk:o.j?chance(...o.j):null),risk:o.risk!=null}))};}
 if(c.k==='submit')return{title:'원고 완성',body:'논문 한 편이 완성되었다. 어디에 투고할까? 실제 판정에는 운과 체력도 반영되어 있다.',ch:JOURNAL.map(j=>T(`${j.n} · 실적 ${j.pt}점`,chance('res',j.req,subBonus())))};
 if(c.k==='army')return{title:'입영 통지',body:'2학년이 끝났다. 복무 중에는 학업·관계 활동이 멈춘다.',ch:[T('지금 입대한다 (3학기)'),T('박사 과정에서 전문연구요원 선발에 도전한다')]};
 if(c.k==='jmy')return{title:'전문연구요원 선발',body:'이 시제품에서는 연구 실적에 따른 선발로 단순화했다. 불합격하면 현역 복무로 학업을 잠시 멈춘다.',ch:[T('지원한다',chance('res',55,S.lab.pres*3))]};
 if(c.k==='offers'){const B=academicBonus();return{title:'대학원 원서 접수',body:`연구력과 출신 대학에 누적 평점·실적을 더해 심사한다. 불합격하면 다른 연구실 지원, 준비 학기, 취업 중에서 선택한다.\n\n누적 평점 ${gpa().toFixed(2)} / 4.5\n심사 보정: ${Object.entries(B).map(([k,v])=>k+' '+(v>=0?'+':'')+v+'%p').join(' · ')}`,ch:c.list.map(o=>T(`${GRAD[o.pres].n} · ${o.type} 교수\n${ADV[o.type].d}`,admit(o))).concat([T('취업으로 진로를 바꾼다 (엔딩)')])};}
 if(c.k==='gradFail'){const ch=[];if(c.lower.length)ch.push(T('한 단계 아래 연구실에 새로 지원한다'));if(S.prepCount<2)ch.push(T('한 학기 진학·취업을 준비한다'));ch.push(T('취업한다 (엔딩)'));return{title:'대학원 불합격',body:'자동으로 다른 연구실에 배정되지는 않는다. 준비 기간에도 생활비는 든다.',ch};}
 if(c.k==='msEnd')return{title:'석사 학위와 다음 선택',body:`박사 과정도 지원 심사를 거친다. 현재 게재 실적 ${pts()}점. 연구력·실적·지도교수의 평가가 함께 반영된다.`,ch:[T('박사 과정에 지원한다',phdP()),T('석사 졸업 후 취업한다 (엔딩)')]};
 if(c.k==='phdFail')return{title:'박사 과정 불합격',body:'석사 학위는 남았다. 다시 준비할지 다른 진로로 갈지 결정할 수 있다.',ch:(S.prepCount<2?[T('한 학기 준비하고 다시 지원한다')]:[]).concat([T('취업한다 (엔딩)')])};
 if(c.k==='defense')return{title:'학위 논문 심사',body:`실적 ${pts()}점. 졸업 요건을 채웠다. 학위 논문 심사를 신청할까?`,ch:[T('심사를 신청한다',chance('res',55,S.lab.fav*3)),T('한 학기 더 준비한다')]};
 if(c.k==='debt')return{title:c.severe?'생활을 먼저 지켜야 한다':'이번 학기 자금 부족',body:`통장 ${won(S.money)} · 별도 대출 ${won(S.debt)}\n학기 이자가 발생한다. ${c.severe?'추가 차입만으로 버틸 수 없다. 학업을 쉬며 소득을 만들거나 진로를 바꿔야 한다.':'대출은 순자산을 늘리지 않는다. 지원과 휴학도 검토할 수 있다.'}`,ch:debtChoices(c).map(x=>T(x.l))};
 if(c.k==='kicked')return{title:'재학 연한 만료',body:'박사 과정 8년이 지났다. 수료한 기록을 가지고 다음 길을 찾는다.',ch:[T('기록을 정리한다')]};
 if(c.k==='timeLimit')return{title:'긴 준비의 끝',body:'재학과 준비를 반복하며 시간이 흘렀다. 지금의 기록으로 다음 길을 찾기로 했다.',ch:[T('진로를 정리한다')]};
 if(c.k==='burnout')return{title:'다 때려치우고 싶다',body:'아침에 눈을 떴는데 연구실에 갈 이유가 떠오르지 않는다.',ch:[T('도움을 구하고 조금 더 해 본다'),T('학계를 떠난다 (엔딩)')]};return null;
}
function resolve(i){const c=S?.q[0],v=view();if(!c||!v||!Number.isInteger(i)||i<0||i>=v.ch.length)return false;LT=c.t??Math.max(0,S.t-1);try{resolveCard(c,i);}finally{LT=null;}save();return true;}
function resolveCard(c,i){S.q.shift();if(c.k==='event'){const e=EV.find(x=>x.id===c.id),o=e.c[i],ok=o.risk!=null?roll(o.risk):o.j?roll(chance(...o.j)):true,r=ok?o.ok:o.no,txt=natural(typeof r[1]==='function'?r[1](S):r[1]);fx(r[0],`사건 · ${e.name||{team:'조별 과제',parent:'과외비 협상',fest:'축제 주점',pay:'공동 통장',saju:'사주'}[e.id]||e.id} · ${o.l}`);log(txt);Object.assign(S.log.at(-1),{mo:c.mo,w:c.w,ev:1,res:o.j||o.risk!=null?(ok?'성공':'실패'):'결과'});S.q.unshift({k:'msg',title:ok?'결과':'뜻대로 되지 않았다',body:txt,ev:1});}
 else if(c.k==='submit'){const j=JOURNAL[i],ok=roll(chance('res',j.req,subBonus()));if(ok){const big=rnd()<.12+Math.max(0,S.res-j.req)*.004,pt=big?Math.round(j.pt*1.5):j.pt;S.papers.push({n:j.n,pt,big,a:age(),c:0,source:S.stage});S.prog=0;fx({joy:big?12:7,adv:1});log(j.n+' 게재');S.q.unshift({k:'msg',title:big?'화제의 논문':'게재 승인',stamp:'게재',body:`${j.n}에 게재되었다. 실적 ${pt}점.`});}else{S.prog=70;fx({joy:-6});S.q.unshift({k:'msg',title:'게재 불가',body:pick(REJECT)+'\n원고를 보완해 다시 낼 수 있다.'});}}
 else if(c.k==='army'){if(i===0)enlist();else{S.defer=true;log('입대 연기');}}
 else if(c.k==='jmy'){if(roll(chance('res',55,S.lab.pres*3))){S.armyDone=true;log('전문연구요원 선발');msg('선발 결과','연구를 이어 가며 복무하게 되었다. 실험 노트의 날짜는 계속된다.');}else{enlist();msg('선발 결과','불합격했다. 학업을 잠시 멈추고 복무를 시작한다.');}}
 else if(c.k==='offers'){if(i>=c.list.length)return finish(S.flags.startup?'startup':'job');const o=c.list[i];if(roll(admit(o))){enter(o);msg('합격',`${GRAD[o.pres].n}의 합격 통지를 받았다.`,'합격');}else S.q.push({k:'gradFail',lower:c.list.filter(x=>x.pres<o.pres)});}
 else if(c.k==='gradFail'){let at=0;if(c.lower.length&&i===at++){S.q.push({k:'offers',list:c.lower});return;}if(S.prepCount<2&&i===at){S.preparing='ms';log('대학원 재지원 준비');msg('준비 학기','등록금과 연구 인건비 없이 한 학기 준비한다. 생활비를 마련할 활동도 골라야 한다.');}else return finish('job');}
 else if(c.k==='msEnd'){if(i===1)return finish('job');if(roll(phdP())){S.stage='phd';S.ss=0;S.preparing=null;S.prepCount=0;fixAlloc();log('박사 과정 진학');msg('박사 과정 첫날','학위는 달라졌지만, 익숙한 질문은 그대로다. 이번에는 내 질문을 끝까지 붙잡아 보기로 했다.');}else S.q.push({k:'phdFail'});}
 else if(c.k==='phdFail'){if(S.prepCount<2&&i===0){S.preparing='phd';log('박사 재지원 준비');}else return finish('job');}
 else if(c.k==='defense'&&i===0){if(roll(chance('res',55,S.lab.fav*3))){log('박사 학위 취득');return finish('grad');}fx({joy:-8});msg('심사 보완','"한 학기 더 보완해 오세요." 고쳐야 할 목록을 받아 들었다.');}
 else if(c.k==='debt'){const act=debtChoices(c)[i].act;if(act==='loan'){fx({debt:800});fx({money:800},'학자금 대출 실행 (부채 증가)');}else if(act==='aid'){S.flags.aid=1;fx({money:400},'긴급 생활 장학금');}else if(act==='family'){S.flags.familyHelp=1;fx({money:500},'가족의 일회 지원');}else if(act==='leave'){S.leave=1;log('생활비 마련을 위해 한 학기 휴학');}else if(act==='sell'){fx({money:S.homeValue},'주택 처분');S.home=0;S.homeValue=0;}else return finish('job');}
 else if(c.k==='settle'){const L=ledger();S.inc0=L.inc;S.history.push({t:S.t,money:S.money,debt:S.debt,asset:netAsset(),inc:L.inc,exp:L.exp});S.led={start:S.money,inc:0,exp:0,in:{},out:{},entries:[]};for(const p of S.papers)p.c=(p.c||0)+Math.round(rnd()*Math.max(1,p.pt));}
 else if(c.k==='kicked')return finish('kicked');else if(c.k==='timeLimit')return finish('exit');else if(c.k==='burnout'){if(i===1)return finish('exit');fx({joy:12,hp:10});msg('다음 날','혼자 감당하지 않기로 했다. 다음 학기에는 쉬는 시간부터 적어 두었다.');}}
const RENT=180;
const BUY={house:{n:'소형 주택 구매',ico:'자산',get price(){return[0,12000,22000,40000][campus()];},d:'현금 구매 · 이후 월세 면제 · 순자산에 주택 가치 포함',can:()=>!S.home&&!S.army&&!S.leave&&S.debt===0,go(){S.home=1;S.homeValue=this.price;fx({joy:10});log('소형 주택을 샀다');}},tutor:{n:'전공 강좌 수강',ico:'강의',price:120,d:'연구력 +4',can:()=>!S.army&&!S.leave,go(){fx({res:4});}},abroad:{n:'어학 연수',ico:'영어',price:500,d:'어학 능력 +15 · TOEIC 점수에 반영',can:()=>!S.army&&!S.leave,go(){S.lingo=Math.min(S.lingo+15,60);log('어학 연수를 다녀왔다');}}};
const LIFE={flex:{n:'여유 있게',ico:'행복',cost:200,joy:6,d:'추가 소비 학기 200만 · 행복↑'},mid:{n:'보통',ico:'식사',cost:0,joy:0,d:'기본 생활비 학기 240만 (등록금·월세 별도)'},cheap:{n:'절약',ico:'영수증',cost:-100,joy:-5,d:'생활비 학기 100만 절감 · 행복↓'}};
const PORT={dep:{n:'예금',ico:'통장',mu:3,sd:0,d:'게임 내 연 3% · 학기 1.5%'},stock:{n:'주식',ico:'재정',mu:6,sd:20,d:'게임 내 연 기대 6% · 손실 가능'},coin:{n:'코인',ico:'코인',mu:0,sd:80,d:'게임 내 초고변동 자산 · 기대 수익 보장 없음'}};
const gauss=()=>Math.sqrt(-2*Math.log(1-rnd()))*Math.cos(2*Math.PI*rnd());
const yieldPct=k=>{const P=PORT[k]||PORT.dep;return Math.max(P.mu/2+P.sd/Math.SQRT2*gauss(),-80);};
const store={get(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}},remove(k){try{localStorage.removeItem(k);}catch(e){}}};
function save(){if(!S)return false;return store.set(SAVE_KEY,S);}
function dogam(kind,n){const d=store.get('nobel.dogam')||{titles:[],endings:[]};if(!d[kind].includes(n)){d[kind].push(n);store.set('nobel.dogam',d);}}
// Node의 회귀 테스트와 브라우저 화면이 동일한 엔진을 쓴다.
globalThis.G={newLife,advance,resolve,view,reveal,fastForward,focus,relAct,relCan,relCount,tutorProfile,admit,admitP,entryScholar,schoolStats,academicBonus,activityReason,pAct,roll,chance,prob,fx,netAsset,budget,enter,finish,josa,natural,uniqueName,archiveLife,restoreSlot,RACT,BUY,LIFE,PORT,UGF,ACTS,STATS,pts,get S(){return S;}};
