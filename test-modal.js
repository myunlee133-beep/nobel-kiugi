// node test-modal.js — 실제 화면 코드와 엔진을 함께 실행하는 DOM 하니스. 브라우저 렌더링·레이아웃 검증은 별도입니다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/nobel.html', 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const elements = {};
const document = { activeElement: null, getElementById: id => elements[id] };
class Element {
  constructor(parent = null) { this.parent = parent; this.innerHTML = ''; this.dataset = {}; this.scrollTop = 0; this.listeners = {}; this.disabled = false; }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  contains(node) { return node && node.parent === this; }
  focus() { document.activeElement = this; }
  closest(selector) { return selector === '[data-a]' && this.dataset.a ? this : null; }
  querySelectorAll(selector) {
    if (!selector.startsWith('button')) return [];
    return [...this.innerHTML.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(m => {
      const node = new Element(this);
      for (const a of m[1].matchAll(/data-([a-z]+)="([^"]*)"/g)) node.dataset[a[1]] = a[2];
      node.disabled = /\sdisabled(?:\s|$)/.test(m[1]); node.innerHTML = m[2];
      return node;
    }).filter(node => !selector.includes(':not(:disabled)') || !node.disabled);
  }
  querySelector(selector) {
    if (selector === '#decision-title') return this.innerHTML.includes('id="decision-title"') ? new Element(this) : null;
    if (selector === '.scroll') return this.innerHTML.includes('class="scroll') ? new Element(this) : null;
    if (selector.startsWith('button')) return this.querySelectorAll(selector)[0] || null;
    return null;
  }
}
const app = elements.app = new Element();
const dialog = elements['decision-modal'] = new Element();
dialog.open = false;
dialog.opens = 0;
dialog.closes = 0;
dialog.showModal = () => { dialog.open = true; dialog.opens++; };
dialog.close = () => { dialog.open = false; dialog.closes++; };
const local = new Map();
const context = vm.createContext({ NobelScenarioData:require('./scenario-data.js'), NobelScenarioEngine:require('./scenario-engine.js'), document, window: { matchMedia: () => ({matches: true}) },
  localStorage: { getItem: key => local.get(key) || null, setItem: (key, value) => local.set(key, value) },
  setTimeout: () => 1, setInterval: () => 1, clearTimeout() {}, clearInterval() {}, console });
vm.runInContext(source.replace("  S=store.get('nobel.life');", "  globalThis.UI={ui,render,onAction}; S=store.get('nobel.life');"), context);
const run = code => vm.runInContext(code, context);
const action = (a, v, disabled = false) => {
  const target = new Element(dialog); target.dataset = {a, v: String(v)}; target.disabled = disabled;
  context.UI.onAction({target});
};
assert.equal(dialog.open, false, 'home has no decision');
run("newLife({seed:7,gender:'여'}); S.q=[{k:'event',id:'m_night',w:10}]; S.pend=null; S.res=41; S.cha=53; UI.ui.screen='game'; UI.render();");
assert.equal(dialog.open, true);
assert.match(dialog.innerHTML, /중간고사 전날/);
assert.match(dialog.innerHTML, /연구력 41 · 매력 53/);
const choices = dialog.querySelectorAll('button');
assert.equal(choices.length, 3);
assert.deepEqual(choices.map(b => b.dataset.v), ['0', '1', '2']);
assert.deepEqual(choices.map(b => b.disabled), [false, true, false]);
assert.match(choices[1].innerHTML, /연구력 60 필요/);
assert.match(choices[2].innerHTML, /is-good/);
const before = run('JSON.stringify(S)');
action('res', 1, true);
assert.equal(run('JSON.stringify(S)'), before, 'disabled click has no effect');
action('res', 1);
assert.equal(run('JSON.stringify(S)'), before, 'locked index cannot bypass the control');
action('res', 99);
assert.equal(run('JSON.stringify(S)'), before, 'out-of-range index is ignored');
const opens = dialog.opens;
action('res', 2);
assert.equal(run('S.q[0].k'), 'msg');
assert.match(dialog.innerHTML, /선택의 결과/);
assert.match(dialog.innerHTML, /선배가 족보와 함께/);
assert.match(dialog.innerHTML, /decision-note/);
assert.equal(dialog.opens, opens, 'event to result keeps one modal open');
action('res', 0);
assert.equal(dialog.open, false);
assert.ok(document.activeElement.parent === app, 'focus returns to the game');
run("S.q=[{k:'event',id:'m_night'},{k:'event',id:'m_weekend'}]; UI.render();");
action('res', 0); action('res', 0);
assert.equal(dialog.open, true, 'next queued choice stays modal');
assert.match(dialog.innerHTML, /아무 일정 없는 주말/);
let cancelled = false;
dialog.listeners.cancel({preventDefault(){cancelled=true;}});
assert.equal(cancelled, true);
assert.equal(run('S.q[0].id'), 'm_weekend', 'Escape cannot skip a decision');
run("S.q=[]; UI.ui.sheet='retire'; UI.render();");
assert.match(dialog.innerHTML, /학계를 떠날까요/);
dialog.listeners.cancel({preventDefault(){}});
assert.equal(dialog.open, false);
assert.equal(run('!!S.end'), false, 'Escape cancels retirement');
run("S.pend=null; S.q=[{k:'msg',title:'<img src=x>',body:'<script>alert(1)</script>',stamp:'<b>메달</b>'}]; UI.render();");
assert.match(dialog.innerHTML, /&lt;img src=x&gt;/);
assert.match(dialog.innerHTML, /&lt;script&gt;/);
assert.doesNotMatch(dialog.innerHTML, /<script>/);
action('res', 0);
run("UI.ui.sheet='retire'; UI.render();");
action('retireYes', 1);
assert.equal(run('!!S.end'), true, 'explicit retirement action still works');
assert.equal(dialog.open, false);
run("newLife({seed:9,gender:'여'}); S.q=[]; Narrative.beginTurn(); const csvCard=Narrative.activate('UG001_V01',{turn:0,w:2}); S.q=[csvCard]; UI.ui.screen='game'; UI.render();");
assert.equal(dialog.open,true);
assert.match(dialog.innerHTML,/수강 신청의 마지막 한 자리/);
assert.match(dialog.innerHTML,/decision-tradeoff/);
assert.match(dialog.innerHTML,/남은 재량 시간/);
action('res',0);
assert.match(dialog.innerHTML,/필수 과목을 우선하는 시간표로 선택/);
action('res',0);
assert.equal(dialog.open,false);
console.log('Modal event/result chains, locked choices, focus, Escape, retirement and escaping: passed (DOM harness; no browser rendering).');
