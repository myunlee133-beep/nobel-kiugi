/* CSV v2 narrative adapter. Conditions are interpreted as data; no CSV code is evaluated. */
(function(root){
  'use strict';
  const api={create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NobelScenarioEngine=api;
  function create(host,data){
    const pool=data.pool, bases=new Map(data.situations.map(x=>[x.id,x]));
    const variants=new Map(data.variants.map(x=>[x.id,x])), follows=new Map(data.followups.map(x=>[x.id,x]));
    const grouped=new Map(), stageCache=new Map();
    for(const v of data.variants){if(!grouped.has(v.situation))grouped.set(v.situation,[]);grouped.get(v.situation).push(v);}
    const copy=x=>JSON.parse(JSON.stringify(x)), clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
    const state=()=>host.state(), time=c=>c&&Number.isInteger(c.turn)?c.turn:state().pend?state().t-1:state().t;
    const labels={ug:'학부생',ms:'석사과정',phd:'박사과정',pd:'박사후연구원',ap:'조교수',asc:'부교수',prof:'정교수'};
    const names={res:'연구력',lec:'강의력',eco:'영업력',cha:'매력',hp:'체력',joy:'행복',money:'잔고',prog:'연구 진행'};
    function ensure(){
      const S=state();if(!S)return null;
      const d=S.scenario||(S.scenario={version:2,lifeId:'life-'+Math.abs(S.seed||1),serial:0,history:[],seen:{},variantTurns:{},scopes:{},relationships:{},tokens:[],claims:{},bands:{},facts:{}});
      for(const [k,v]of Object.entries({history:[],seen:{},variantTurns:{},scopes:{},relationships:{},tokens:[],claims:{},bands:{},facts:{},calendar:{turn:-1,free:4},institution:{support:2}}))if(d[k]==null)d[k]=copy(v);
      d.serial=d.serial||0;d.lifeId=d.lifeId||'life-'+Math.abs(S.seed||1);
      const F=d.facts;
      F.features=F.features||{professorLife:false};F.household=F.household||{hasChild:false,cohabit:false,careConflict:false};
      F.household.housingType=S.home?'own':'rent';
      F.milestone=F.milestone||{};F.finance=F.finance||{entryScholarshipReceived:S.ugTier===1,scholarshipActive:false,studentLoanBalance:0};
      if(!F.military){const discharged=(S.log||[]).some(h=>h.s==='전역');F.military={route:S.army>0?'active':discharged?'completed_active':S.armyDone?'unknown':S.defer?'deferred':'none',specialEligible:false,selectionPending:false,completionConfirmed:discharged};}
      F.activity=F.activity||{};F.recognition=F.recognition||{materialsRequested:false};
      F.household.hasChild=!!(S.children&&S.children.length)||F.household.hasChild;
      for(const k of ['res','lec','eco','cha'])if(!d.bands[k])d.bands[k]={value:band(S[k]),samples:[S[k]],candidate:null,count:0};
      return d;
    }
    function band(n){return n<35?'기초':n<55?'안정':n<75?'숙련':'탁월';}
    function school(){return host.school();}
    function entity(base){
      const S=state(), d=ensure(), chain=base.chain;
      if(chain==='C02')return d.lifeId+':rival:'+(S.rival.id||S.rival.name);
      if(chain==='C06'){const p=S.partner||S.ppl?.[0];return d.lifeId+':person:'+(p?(p.id||p.name||p.n):base.id);}
      if(chain==='C03')return d.lifeId+':mentor:'+(S.lab?(S.lab.prof||S.lab.school):base.id);
      if(chain==='C16'){
        const condition=JSON.stringify(pool[base.condition]),roster=condition.includes('applicantCount')?S.applicants:condition.includes('alumniCount')?S.alumni:S.students,p=roster?.[0];
        return d.lifeId+':student:'+(p?(p.id||p.name||p.n):base.id);
      }
      if(chain==='C19')return d.lifeId+':lab:'+(S.lab?S.lab.school:school());
      if(['C24','C25'].includes(chain))return d.lifeId+':activity-track:'+chain+':'+S.field;
      return d.lifeId+':track:'+S.field;
    }
    const scopeKey=(chain,id)=>chain+'|'+id;
    function local(base,id){const d=ensure(), key=scopeKey(base.chain,id)+'|'+base.id;return d.scopes[key]||(d.scopes[key]={checkpoint:0});}
    function environment(base,card){
      const S=state(),d=ensure(),turn=time(card),id=card&&card.entityId||entity(base), key=scopeKey(base.chain,id), localState=local(base,id);
      const records=d.history.filter(h=>h.turn<=turn&&h.scope&&h.scope.chain===base.chain&&h.scope.entity===id);
      const pending=d.tokens.filter(t=>t.active&&t.kind==='repair'&&t.entityId===id&&t.chain===base.chain);
      const context=Object.assign({entityId:id,relationshipTrust:d.relationships[key]||0,
        schoolServiceAvailable:d.institution.support>0,resourceConstraint:d.institution.support===0,
        unresolvedCase:pending.length>0,oldCommitmentActive:pending.some(t=>t.mandatory&&turn-t.created>=4),
        commitmentConflicts:pending.some(t=>t.mandatory)&&d.calendar.free<2,
        previousAttemptExists:records.some(h=>h.tags.includes('attempt_failed')),
        gapConfirmed:false,mustDeliver:pending.some(t=>t.mandatory),deadlinePassed:pending.some(t=>t.mandatory&&(t.deadline??t.due)<turn),counterpartyRole:'peer'},localState.context||{},card&&card.context||{});
      localState.oldCommitmentOverdue=pending.some(t=>t.mandatory&&(t.deadline??t.due)<turn&&t.remaining>0);
      const milestone={...d.facts.milestone,defenseScheduled:S.q.some(c=>c.k==='defense')};
      let activity={...d.facts.activity,current:d.facts.activity.turn===turn};
      if(S.act&&d.calendar.turn===turn)activity={kind:S.act,current:true,eligible:true,accepted:false,finalist:false,awarded:false,prizePaid:false,travelGrantRequiresLanguage:false,turn,phase:card&&card.w>=14?'attending':card&&card.w>=6?'develop':'prepare'};
      const env={...S,...d.facts,age:20+Math.floor(turn/2),ended:!!S.end,schoolTier:S.lab?S.lab.pres:S.ugTier,
        exempt:!!S.exempt,defer:!!S.defer,partner:S.partner?{...S.partner,wed:!!S.partner.wed}:null,
        school:school(),stage_label:S.army>0?'군 복무자':labels[S.stage]||S.stage,
        paperPoints:(S.papers||[]).reduce((n,p)=>n+p.pt,0),hasPartner:!!S.partner,
        studentCount:(S.students||[]).length,applicantCount:(S.applicants||[]).length,alumniCount:(S.alumni||[]).length,
        admission:{acceptedOffers:(S.q.find(c=>c.k==='offers')?.list||[]).filter(o=>o.ok).length},milestone,activity,
        langStatus:{present:!!S.lang,remainingTurns:S.lang?S.lang.t+4-S.t:0},
        calendar:{...d.calendar,noProtectedRest:(S.alloc?.rest||0)<=10},institution:d.institution,
        cash:{available:S.money-(d.reservedCash||0)},reservedCash:d.reservedCash||0,
        band:Object.fromEntries(Object.entries(d.bands).map(([k,v])=>[k,v.value])),context,
        postState:localState,postChoice:S,history:d.history,currentTurn:turn,field:S.field,currentSchool:school()};
      return env;
    }
    function get(env,path){
      if(typeof path!=='string')return path;
      if(path[0]==='$')path=path.slice(1);
      return path.split('.').reduce((o,k)=>o==null?undefined:o[k],env);
    }
    function bind(value,env){return typeof value==='string'&&value.startsWith('$')?get(env,value):value;}
    function historyMatches(spec,env){
      let rows=(env.history||[]).filter(h=>Number.isFinite(h.turn)&&h.turn<=env.currentTurn);
      if(typeof spec.window==='number')rows=rows.filter(h=>h.turn>env.currentTurn-spec.window);
      for(const[k,v]of Object.entries(spec.scope||{}))rows=rows.filter(h=>h.scope&&h.scope[k]===bind(v,env));
      if(spec.tag)rows=rows.filter(h=>(h.tags||[]).includes(spec.tag));
      if(spec.situations)rows=rows.filter(h=>spec.situations.includes(h.situation));
      return rows;
    }
    function test(condition,env){
      if(condition==null)return false;
      if(Object.keys(condition).length===0)return true;
      return Object.entries(condition).every(([op,arg])=>{
        if(op==='all')return arg.every(c=>test(c,env));
        if(op==='any')return arg.some(c=>test(c,env));
        if(op==='history'){
          const rows=historyMatches(arg,env), turns=[...new Set(rows.map(h=>h.turn))];
          return (arg.distinctTurns?turns.length:rows.length)>=(arg.min||1)&&(!arg.minSpanTurns||turns.length>1&&Math.max(...turns)-Math.min(...turns)>=arg.minSpanTurns);
        }
        if(op==='sequence'){
          const rows=historyMatches(arg,env).sort((a,b)=>a.turn-b.turn);let after=-Infinity;
          for(const tag of arg.tags){const hit=rows.find(h=>h.turn>=after+(arg.minGap||1)&&(h.tags||[]).includes(tag));if(!hit)return false;after=hit.turn;}
          return true;
        }
        const actual=get(env,arg[0]), expected=bind(arg[1],env);
        if(actual===undefined||expected===undefined)return false;
        if(op==='eq')return actual===expected;
        if(op==='in')return Array.isArray(expected)&&expected.includes(actual);
        if(op==='gte')return actual>=expected;
        if(op==='lte')return actual<=expected;
        if(op==='lt')return actual<expected;
        if(op==='gt')return actual>expected;
        return false;
      });
    }
    function render(template,base,env,origin){
      const replacements={...env,field_hook:base.fieldBodies?.[env.field]||base.trigger||'',origin};
      return String(template||'').replace(/\{([\w.]+)\}/g,(_,key)=>{const value=get(replacements,key);return value==null?'':String(value);});
    }
    function probability(choice,env){
      const spec=pool[choice.judge];if(spec.type==='certain')return null;
      const score=Object.entries(spec.weights).reduce((s,[k,w])=>s+Number(env[k]||0)*w,0);
      return clamp(Math.round(50+2*(score-spec.req)+(spec.historyBonus||0)-(env.hp<25?(spec.hpPenaltyUnder25||0):0)),...(spec.clamp||[5,95]));
    }
    function selectable(choice,env){
      const expense=pool[choice.cost]||{}, reserve=Math.max(choice.reserve||0,pool[choice.okState]?.inc?.reservedCash||0);
      const needed=Math.max(0,-(expense.money||0))+reserve;
      const cancellation=pool[choice.okState]?.set?.cancelOneOptionalTask;
      const canCancel=!cancellation||(state().pend||[]).some(l=>!l.scenarioSlot&&!l.ev&&l.k!=='rest'&&!l.cancelled);
      return canCancel&&test(pool[choice.condition],env)&&env.calendar.free>=choice.time&&env.institution.support>=choice.support&&(needed===0||env.cash.available>=needed);
    }
    function eligible(base,env){return !ensure().seen[base.id]&&test(pool[base.condition],env);}
    function candidates(stage){
      if(stageCache.has(stage))return stageCache.get(stage);
      const stageByCategory={'학부':'ug','석사':'ms','박사':'phd','포닥':'pd','조교수':'ap','부교수':'asc','정교수':'prof'};
      const list=data.situations.filter(b=>!stageByCategory[b.category]||stageByCategory[b.category]===stage);
      stageCache.set(stage,list);return list;
    }
    function activate(id,card={}){
      const v=variants.get(id);if(!v)return null;const b=bases.get(v.situation),env=environment(b,card);
      if(!eligible(b,env)||!test(pool[v.condition],env)||!v.choices.some(c=>selectable(c,env)))return null;
      const d=ensure(),result={...card,k:'scenario',ev:1,id:v.id,situation:b.id,entityId:env.context.entityId,
        context:copy(env.context),turn:env.currentTurn,instance:d.lifeId+':'+(++d.serial),
        probabilities:v.choices.map(c=>probability(c,env)),rolls:v.choices.map(()=>host.random()*100)};
      d.seen[b.id]=v.id;d.variantTurns[v.variant]=env.currentTurn;
      return result;
    }
    function readyToken(turn){
      const d=ensure();
      for(const t of d.tokens)if(t.active&&!t.mandatory&&t.expires!=null&&turn>t.expires){t.active=false;t.expired=true;}
      const priority=t=>(t.kind==='repair'?2:0)+(t.mandatory?1:0);
      return d.tokens.filter(t=>t.active&&t.due<=turn&&t.presentedTurn!==turn).sort((a,b)=>priority(b)-priority(a)||a.due-b.due)[0];
    }
    function followCard(token,stamp={}){
      const f=follows.get(token.followup),b={id:token.origin.situation,chain:token.chain}, env=environment(b,{...stamp,entityId:token.entityId});
      env.token=token;env.case={remainingItems:token.remaining};env.origin=token.origin;
      if(!test(pool[f.condition],env))return null;
      return {...stamp,k:'followup',ev:1,id:f.id,tokenId:token.id,step:token.step,turn:env.currentTurn,entityId:token.entityId};
    }
    function draw(stamp={}){
      const S=state(),d=ensure(),turn=time(stamp);if(S.end||20+Math.floor(turn/2)>=65)return null;
      const t=readyToken(turn);
      if(t){
        if(t.kind==='benefit'&&!t.eventConfirmed){t.presentedTurn=turn;return {...stamp,k:'scenarioInvite',ev:1,tokenId:t.id,turn};}
        const card=followCard(t,stamp);if(card&&view(card).ch.some(c=>!c.lock)){t.presentedTurn=turn;return card;}
      }
      const options=[];
      for(const b of candidates(S.stage)){
        if(d.seen[b.id])continue;const env=environment(b,stamp);if(!eligible(b,env))continue;
        for(const v of grouped.get(b.id))if(test(pool[v.condition],env)&&v.choices.some(c=>selectable(c,env))){
          const last=d.variantTurns[v.variant], frequency=last==null?1.5:turn-last<4?.35:1;
          options.push({v,weight:v.weight*frequency*(v.variant==='V08'&&S.hp<25?10:1)});
        }
      }
      if(!options.length)return null;
      const urgent=S.hp<25?options.filter(x=>x.v.variant==='V08'):[],lottery=urgent.length?urgent:options;
      let cursor=host.random()*lottery.reduce((n,x)=>n+x.weight,0);
      const chosen=lottery.find(x=>(cursor-=x.weight)<0)||lottery[lottery.length-1];
      return activate(chosen.v.id,stamp);
    }
    function view(card){
      const d=ensure(),S=state();
      if(card.k==='scenarioInvite'){
        const token=d.tokens.find(t=>t.id===card.tokenId),f=follows.get(token.followup);
        return {title:'후속 연락',heading:f.title,body:token.origin.title+'에서 남긴 기록을 바탕으로 후속 제안이 도착했다.\n\n'+f.body,ch:[{l:'내용을 확인한다'}]};
      }
      if(card.k==='followup'){
        const token=d.tokens.find(t=>t.id===card.tokenId),f=follows.get(token.followup),base=bases.get(token.origin.situation),env=environment(base,card);
        env.token=token;env.case={remainingItems:token.remaining};env.origin=token.origin;
        return {title:token.kind==='repair'?'이어지는 보완':'후속 기회',heading:f.title,
        body:f.body+'\n\n이전 기록: '+token.origin.title,note:'남은 재량 시간 '+d.calendar.free+(token.kind==='repair'?' · 보완할 항목 '+token.remaining:''),
          ch:f.choices.map(c=>({l:c.label,tag:'시간 '+c.timeCost,lock:!test(c.selectionCondition,env)}))};
      }
      const v=variants.get(card.id),b=bases.get(v.situation),env=environment(b,card);
      const arc=data.arcs.find(a=>a.situation===b.id&&test(pool[a.condition],env));
      const prior=arc?d.history.filter(h=>h.turn<env.currentTurn&&h.scope?.entity===card.entityId&&arc.previous.includes(h.situation)):[];
      const memory=prior.length?'\n\n이어지는 기록 · '+arc.name+' — '+[...new Set(prior.map(h=>bases.get(h.situation)?.title||h.situation))].join(', '):'';
      return {title:'이번 주의 선택',heading:b.fieldTitles[S.field]||b.title,body:render(v.body,b,env)+memory,
        note:'남은 재량 시간 '+d.calendar.free+' · 기관 지원 '+d.institution.support+' · 사용 가능 '+Math.floor(env.cash.available).toLocaleString('ko-KR')+'만 원',
        ch:v.choices.map((c,i)=>({l:c.label,detail:c.tradeoff,
          tag:[card.probabilities[i]==null?'':card.probabilities[i]+'%',c.time?'시간 '+c.time:'',c.support?'기관 지원 '+c.support:'',pool[c.cost]?.money?'지출 '+(-pool[c.cost].money)+'만 원':''].filter(Boolean).join(' · '),lock:!selectable(c,env)}))};
    }
    function record(base,card,spec,choice,env){
      const d=ensure(),append=spec.append||{},tags=[...(append.tags||[])];
      for(const rule of spec.conditionalTags||[])if(test(rule.if,env))tags.push(...rule.tags);
      const h={turn:env.currentTurn,situation:base.id,variant:card.id.split('_').pop(),choice,
        outcome:append.outcome||'completed',scope:{chain:base.chain,entity:card.entityId},tags:[...new Set(tags)],school:school(),field:state().field,
        arcs:data.arcs.filter(a=>a.situation===base.id).map(a=>a.id)};
      d.history.push(h);
      const key=scopeKey(base.chain,card.entityId);d.relationships[key]=clamp((d.relationships[key]||0)+(spec.relationshipDelta||0),-5,5);
      return h;
    }
    function changeState(spec,base,card){
      const d=ensure(),l=local(base,card.entityId);
      for(const[k,n]of Object.entries(spec.inc||{})){
        if(k==='reservedCash'){d.reservedCash=Math.max(0,(d.reservedCash||0)+n);continue;}
        l[k]=(l[k]||0)+n;if(k==='checkpoint')l[k]=clamp(l[k],0,3);
      }
      Object.assign(l,spec.set||{});
      if(l.cancelOneOptionalTask){
        const task=(state().pend||[]).find(x=>!x.scenarioSlot&&!x.ev&&x.k!=='rest'&&!x.cancelled);
        if(task){
          for(const[k,n]of Object.entries(task.d||{}))if(n>0&&['res','lec','eco','cha'].includes(k)){state()[k]=Math.max(0,state()[k]-n);task.d[k]=0;}
          task.cancelled=true;task.s='추가 일정을 하나 취소하고 충분히 쉬었다.';task.t='0';l.optionalTaskCancelled=true;
        }
      }
      return l;
    }
    function reserve(spec,base,card,choice,env){
      if(!spec||!spec.candidate)return;
      const d=ensure(),claim=card.instance+':'+spec.candidate;if(d.tokens.some(t=>t.claim===claim))return;
      const l=local(base,card.entityId),mandatory=!!spec.mandatoryWhileUnresolved||(l.integrityDebt||0)>0;
      const origin={situation:base.id,title:base.fieldTitles[state().field]||base.title,choice,entityId:card.entityId,chain:base.chain,sourceStage:state().stage,field:state().field,school:school()};
      d.tokens.push({id:d.lifeId+':case:'+ ++d.serial,claim,followup:spec.candidate,chain:base.chain,entityId:card.entityId,
        kind:spec.kind,active:true,applied:false,eventConfirmed:!spec.requireEventConfirmation,mandatory,
        created:env.currentTurn,due:env.currentTurn+(spec.earliestAfterTurns||1),deadline:env.currentTurn+(spec.earliestAfterTurns||1),expires:mandatory?null:env.currentTurn+(spec.latestAfterTurns||8),
        remaining:spec.kind==='repair'?Math.max(1,l.integrityDebt||l.attemptsNeedingRepair||1):0,step:0,origin});
    }
    function message(title,body){state().q.unshift({k:'msg',title,body,ev:1});}
    function resolve(index){
      const S=state(),d=ensure(),card=S.q[0];if(!card||!Number.isInteger(index))return false;
      const visible=view(card);if(!visible.ch[index]||visible.ch[index].lock)return false;
      if(card.k==='scenarioInvite'){
        const t=d.tokens.find(t=>t.id===card.tokenId);S.q.shift();t.eventConfirmed=true;
        const next=followCard(t,{turn:card.turn,w:card.w,mo:card.mo});if(next)S.q.unshift(next);return true;
      }
      if(card.k==='followup'){
        const t=d.tokens.find(t=>t.id===card.tokenId),claim=t.id+':'+card.step;if(d.claims[claim]||!t.active)return false;
        const f=follows.get(t.followup),c=f.choices[index],base=bases.get(t.origin.situation),l=local(base,t.entityId);
        if(t.deadline==null)t.deadline=t.due;
        d.calendar.free-=c.timeCost;d.claims[claim]=true;S.q.shift();
        const repair=c.effect.caseRepair||0;t.remaining=Math.max(0,t.remaining-repair);
        l.integrityDebt=Math.max(0,(l.integrityDebt||0)-Math.min(repair,c.effect.removeOwnActionDebtUpTo||0));
        if(c.effect.freezeUnverifiedClaims)l.claimsFrozen=true;
        l.checkpoint=clamp((l.checkpoint||0)+(c.effect.checkpoint||0),0,3);
        const closed=t.kind==='benefit'||t.remaining===0||(c.closesIfVoluntary&&!t.mandatory);
        if(closed){t.active=false;t.applied=true;t.closedAt=card.turn;if(c.code==='C')l.opportunitiesDeclined=(l.opportunitiesDeclined||0)+1;}
        else{t.step++;t.due=card.turn+(c.ifStillOpen?.nextDueInTurns||1);t.presentedTurn=card.turn;}
        d.history.push({turn:card.turn,situation:base.id,variant:f.id,choice:c.code,outcome:closed?'completed':'needs_repair',scope:{chain:base.chain,entity:t.entityId},
          tags:repair?['contact',...(t.remaining===0?['repair_completed','verification_completed']:['repair_partial'])]:['contact']});
        const status=t.kind==='repair'?'\n\n남은 보완 항목: '+t.remaining+(closed?' · 이 보완 절차 종료':' · 다음 학기에 계속'):'';
        message('후속 선택의 결과',c.text+status);return true;
      }
      if(d.claims[card.instance])return false;
      const v=variants.get(card.id),base=bases.get(v.situation),c=v.choices[index],env=environment(base,card),before={};
      for(const k of ['res','lec','eco','cha','joy','hp','money','prog'])before[k]=S[k];
      const p=card.probabilities[index],ok=p==null||card.rolls[index]<clamp(p+(S.luck||0),5,95);
      d.claims[card.instance]=true;d.calendar.free-=c.time;d.institution.support-=c.support;S.q.shift();
      host.effect(pool[c.cost],'사건 비용');host.effect(pool[ok?c.okFx:c.noFx],'사건');
      S.hp=clamp(S.hp,0,S.hpMax||100);S.prog=clamp(S.prog,0,Math.max(99,before.prog||0));
      const localState=changeState(pool[ok?c.okState:c.noState],base,card);
      const nextEnv=environment(base,card);nextEnv.postState=localState;nextEnv.postChoice=S;
      record(base,card,pool[ok?c.okMemory:c.noMemory],String.fromCharCode(65+index),nextEnv);
      const reservations=pool[c.follow],code=String.fromCharCode(65+index);
      reserve(reservations[ok?'onSuccess':'onFailure'],base,card,code,nextEnv);
      for(const spec of reservations.conditionalReservations||[])if(test(spec.if,nextEnv))reserve(spec,base,card,code,nextEnv);
      const changes=Object.keys(before).filter(k=>Math.abs(S[k]-before[k])>=.1).map(k=>names[k]+' '+(S[k]>before[k]?'+':'')+Math.round((S[k]-before[k])*10)/10);
      const result=render(ok?c.ok:c.no,base,nextEnv)||'선택한 작업을 진행했다.';
      const differences=Object.fromEntries(Object.keys(before).map(k=>[k,S[k]-before[k]]).filter(([,n])=>Math.abs(n)>=.1));
      S.mid=S.mid||{};for(const k of ['res','lec','eco','cha','joy'])if(differences[k])S.mid[k]=(S.mid[k]||0)+differences[k];
      host.log(host.firstSentence(result));
      const last=S.log[S.log.length-1];if(last)Object.assign(last,{ev:1,w:card.w,mo:card.mo,scenario:card.id,d:differences});
      message(p==null?'선택의 결과':ok?'작업 완료':'보완이 필요한 작업',result+(changes.length?'\n\n'+changes.join(', '):''));
      return true;
    }
    function beginTurn(){
      const S=state(),d=ensure();if(d.calendar.turn===S.t)return;
      d.calendar={turn:S.t,free:4};d.institution={support:2};d.turnStartHp=S.hp;d.turnStartArmy=S.army;
      if(S.army>0)d.facts.military.route='active';
    }
    function endTurn(card){
      const S=state(),d=ensure(),turn=card.t;if(d.lastCompletedTurn===turn)return;d.lastCompletedTurn=turn;
      for(const k of ['res','lec','eco','cha']){
        const b=d.bands[k];b.samples.push(S[k]);b.samples=b.samples.slice(-3);
        const ordered=[...b.samples].sort((a,b)=>a-b),next=band(ordered[Math.floor(ordered.length/2)]);
        if(next===b.candidate)b.count++;else{b.candidate=next;b.count=1;}if(b.count>=2)b.value=next;
      }
      if((S.alloc?.rest||0)<=10&&S.hp-d.turnStartHp<=-15)d.history.push({turn,situation:'semester',scope:{},tags:['overcommit']});
      if(d.turnStartArmy>0&&S.army===0){d.facts.military.route='completed_active';d.facts.military.completionConfirmed=true;d.history.push({turn,situation:'military',scope:{},tags:['discharged']});}
      if(card.gpa!=null)d.facts.finance.scholarshipActive=card.gpa>=4;
      const result=card.out?.[0];
      if(result&&['conf','contest'].includes(S.act))d.facts.activity={kind:S.act,current:true,eligible:true,phase:'result',accepted:!/탈락|불합격/.test(result[3]),finalist:result[3]==='본선 진출',awarded:/상$/.test(result[3]),prizePaid:false,travelGrantRequiresLanguage:false,turn};
    }
    function gate(card,index,before){
      const S=state(),d=ensure();
      if(card.k==='settle')endTurn(card);
      if(card.k==='msEnd')d.facts.milestone.msApproved=true;
      if(card.k==='defense'&&S.q.some(c=>c.k==='phdDone'))d.facts.milestone.phdApproved=true;
      if(card.k==='submit'&&S.papers.length>before.papers)d.facts.milestone.paperAccepted=true;
      if(card.k==='faculty'&&S.stage==='pd'&&index<3)d.facts.milestone.facultyRejected=true;
      if(card.k==='army'&&index===1)d.facts.military.route='deferred';
      if(card.k==='jmy')d.facts.military.route=S.army>0?'special_not_selected':'special_active';
    }
    function endingSummary(){const d=ensure();return {unresolved:d.tokens.filter(t=>t.active&&t.kind==='repair').map(t=>({title:t.origin.title,remaining:t.remaining,mandatory:t.mandatory})),expiredOpportunities:d.tokens.filter(t=>t.expired).length,declinedOpportunities:Object.values(d.scopes).reduce((n,x)=>n+(x.opportunitiesDeclined||0),0)};}
    return {ensure,test,environment,activate,draw,view,resolve,beginTurn,endTurn,gate,endingSummary,
      handles:c=>!!c&&['scenario','followup','scenarioInvite'].includes(c.k),data,
      markSlots(lines){const free=lines.map((_,i)=>i);for(let n=0;n<2&&free.length;n++){const j=Math.floor(host.random()*free.length),i=free.splice(j,1)[0];lines[i].scenarioSlot=true;}return lines;}};
  }
})(globalThis);
