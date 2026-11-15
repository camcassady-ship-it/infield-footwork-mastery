import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const sitsSrc = html.slice(html.indexOf('const SITS ='), html.indexOf('\n];', html.indexOf('const SITS =')) + 3);
const engineSrc = html.slice(html.indexOf('const PT='), html.indexOf('// ---------- SVG field ----------'));
const api = new Function(`${sitsSrc}\n${engineSrc}\nreturn {SITS, START, compile, at, POS, dist:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])};`)();
const { SITS, START, compile, at, POS } = api;

function samples(S) {
  const C = compile(S);
  const frames = [];
  for (let t = 0; t <= C.end + 0.001; t += 0.12) {
    const pos = {};
    for (const p of POS) pos[p] = at(C.tr[p], t);
    for (const id of Object.keys(C.rtr)) if (C.rtr[id]) pos[id] = at(C.rtr[id], t);
    frames.push({ t, pos, ball: C.ball });
  }
  return { C, frames };
}

test('the original 28 situations are unchanged and still compile', () => {
  assert.equal(SITS.length, 67);
  for (let i = 0; i < 28; i++) assert.equal(SITS[i].id, 's' + (i + 1));
  assert.equal(SITS[0].group.includes('Bunt'), false);
  const first = compile(SITS[0]);
  assert.match(first.beats[0][1], /Pitch/);
  assert.match(first.beats[1][1], /Base hit/);
  for (const S of SITS.slice(0, 28)) {
    const C = compile(S);
    assert.ok(C.end > 1, S.id);
    assert.ok(C.ball.length >= 3, S.id);
    for (const p of POS) assert.equal(C.tr[p].kf[0].p[0], START[p][0], S.id + ' ' + p);
  }
});

test('eight bunt plays follow the first 28, in one group, with a job for every position', () => {
  const bunts = SITS.slice(28, 36);
  assert.deepEqual(bunts.map(s => s.id), ['s29', 's30', 's31', 's32', 's33', 's34', 's35', 's36']);
  for (const S of bunts) {
    assert.equal(S.group, 'Bunt Defense');
    for (const p of POS) assert.ok(S.jobs[p] && S.jobs[p].length > 20, S.id + ' ' + p);
    assert.ok((S.notes && S.notes.length) || (S.assumed && S.assumed.length), S.id);
  }
});

test('outfielders keep the shallower defaults unless a play moves them', () => {
  assert.deepEqual(START.LF, [-129.8, 218.8]);
  assert.deepEqual(START.CF, [0, 256]);
  assert.deepEqual(START.RF, [129.8, 218.8]);
  for (const S of SITS.slice(28)) {
    assert.equal(S.start && S.start.LF, undefined, S.id);
    assert.equal(S.start && S.start.CF, undefined, S.id);
    assert.equal(S.start && S.start.RF, undefined, S.id);
    const C = compile(S);
    for (const p of ['LF', 'CF', 'RF']) assert.deepEqual(C.tr[p].kf[0].p, START[p], S.id + ' ' + p);
  }
});

test('runner-at-first bunts start the third baseman about 20 feet in on the grass', () => {
  for (const id of ['s29', 's30', 's31', 's32', 's33']) {
    const S = SITS.find(s => s.id === id);
    const spot = S.start['3B'];
    const bag = [-63.6, 63.6];
    const d = Math.hypot(spot[0] - bag[0], spot[1] - bag[1]);
    assert.ok(d > 16 && d < 26, id + ' ' + d.toFixed(1));
    assert.ok(spot[0] > bag[0], id + ' stays on the fair side of the line');
  }
});

test('runners at first and second start the corners at the playbook depths', () => {
  for (const id of ['s34', 's35', 's36']) {
    const S = SITS.find(s => s.id === id);
    const first = Math.hypot(S.start['1B'][0] - 63.6, S.start['1B'][1] - 63.6);
    const third = Math.hypot(S.start['3B'][0] + 63.6, S.start['3B'][1] - 63.6);
    assert.ok(first > 16 && first < 26, id + ' 1B ' + first.toFixed(1));
    assert.ok(third > 8 && third < 16, id + ' 3B ' + third.toFixed(1));
  }
});

test('pick-off plays throw the ball to the covering fielder', () => {
  const toFirst = compile(SITS.find(s => s.id === 's33'));
  const last = toFirst.ball[toFirst.ball.length - 1];
  assert.ok(Math.hypot(last.p[0] - 66, last.p[1] - 66) < 12, JSON.stringify(last.p));
  assert.match(toFirst.beats.map(b => b[1]).join(' '), /Pick-off/);
  const toSecond = compile(SITS.find(s => s.id === 's36'));
  const end = toSecond.ball[toSecond.ball.length - 1];
  assert.ok(end.p[1] > 110, JSON.stringify(end.p));
  assert.ok(Math.abs(end.p[0]) < 20, JSON.stringify(end.p));
});

test('the pitchout pick throws through the catcher to the second baseman at first', () => {
  const C = compile(SITS.find(s => s.id === 's32'));
  const text = C.beats.map(b => b[1]).join(' | ');
  assert.match(text, /Pitchout/);
  assert.match(text, /second baseman at first/);
  const end = C.ball[C.ball.length - 1].p;
  assert.ok(end[0] > 55 && end[1] > 55 && end[1] < 90, JSON.stringify(end));
});

test('double-steal and pick-off groups are complete', () => {
  const ds = SITS.filter(s => s.group === '1st & 3rd / Double Steal Defense');
  const po = SITS.filter(s => s.group === 'Pick-Off Plays');
  assert.equal(ds.length, 8);
  assert.equal(po.length, 13);
  assert.deepEqual(ds.map(s => s.id), ['s37','s38','s39','s40','s41','s42','s43','s44']);
  assert.deepEqual(po.map(s => s.id), ['s45','s46','s47','s48','s49','s50','s51','s52','s53','s54','s55','s56','s57']);
  for (const S of ds.concat(po)) {
    for (const p of POS) assert.ok(S.jobs[p] && S.jobs[p].length > 12, S.id + ' ' + p);
    const C = compile(S);
    assert.ok(C.beats.some(b => /break|Pick|Throw|throw|Pitch|fake|Daylight|Lead|Glove|Head|Sign|step|out|Runner/i.test(b[1])), S.id + ' ' + C.beats.map(b => b[1]).join(' | '));
  }
  const daylight = compile(SITS.find(s => s.id === 's50'));
  assert.match(daylight.beats.map(b => b[1]).join(' '), /Daylight/);
  const stretch = compile(SITS.find(s => s.id === 's43'));
  assert.match(stretch.beats.map(b => b[1]).join(' '), /stretch/i);
});

test('double-steal runners start 12 ft off the bag and hold until delivery', () => {
  const B1 = [63.6, 63.6], B2 = [0, 127.3], B3 = [-63.6, 63.6], H = [0, 0];
  const next = {R1: B2, R3: H};
  const base = {R1: B1, R3: B3};
  function depart(track) {
    const p0 = track.kf[0].p;
    for (let i = 1; i < track.kf.length; i++) {
      const k = track.kf[i];
      if (Math.hypot(k.p[0] - p0[0], k.p[1] - p0[1]) > 0.4) return track.kf[i - 1].t;
    }
    return Infinity;
  }
  const plays = SITS.filter(s => s.group === '1st & 3rd / Double Steal Defense');
  assert.equal(plays.length, 8);
  for (const S of plays) {
    const C = compile(S);
    const delivery = C.ball[1].t;
    assert.ok(delivery > 0.2, S.id);
    for (const id of S.runners) {
      const track = C.rtr[id];
      const start = track.kf[0].p;
      const bag = base[id], nxt = next[id];
      const off = Math.hypot(start[0] - bag[0], start[1] - bag[1]);
      assert.ok(Math.abs(off - 12) < 0.15, S.id + ' ' + id + ' lead ' + off.toFixed(2));
      const dx = nxt[0] - bag[0], dy = nxt[1] - bag[1];
      const sx = start[0] - bag[0], sy = start[1] - bag[1];
      const cross = Math.abs(dx * sy - dy * sx) / Math.hypot(dx, dy);
      assert.ok(cross < 0.2, S.id + ' ' + id + ' off the baseline ' + cross.toFixed(2));
      assert.ok(dx * sx + dy * sy > 0, S.id + ' ' + id + ' faces the next base');
      const leave = depart(track);
      const stretch = S.id === 's43' && id === 'R1';
      if (stretch) {
        assert.ok(leave > 0.05 && leave < delivery, S.id + ' stretch ' + leave + ' before ' + delivery);
      } else {
        assert.ok(leave >= delivery - 0.021, S.id + ' ' + id + ' left at ' + leave + ' before delivery ' + delivery);
      }
      const until = stretch ? leave : delivery;
      for (let t = 0; t < until - 0.02; t += 0.05) {
        const p = at(track, t);
        const moved = Math.hypot(p[0] - start[0], p[1] - start[1]);
        assert.ok(moved < 0.2, S.id + ' ' + id + ' moved ' + moved.toFixed(2) + ' at t=' + t.toFixed(2));
      }
    }
  }
});

test('drills add extras, multi-ball paths, and a job for every position', () => {
  const drills = SITS.filter(s => s.group === 'Drills');
  assert.equal(drills.length, 10);
  assert.deepEqual(drills.map(s => s.id), ['s58','s59','s60','s61','s62','s63','s64','s65','s66','s67']);
  for (const S of drills) {
    for (const p of POS) assert.ok(S.jobs[p] && S.jobs[p].length > 12, S.id + ' ' + p);
    assert.ok(S.drill && S.balls && S.balls.length >= 1, S.id);
    assert.ok(S.caps && S.caps.length >= 2, S.id);
    const C = compile(S);
    assert.ok(C.balls && C.balls.length === S.balls.length, S.id);
    assert.ok(C.xtr && Object.keys(C.xtr).length === (S.extras||[]).length, S.id);
    for (const ball of C.balls) {
      for (const k of ball) {
        assert.ok(Math.hypot(k.p[0], k.p[1]) < 300, S.id + ' ball ' + k.p);
      }
    }
  }
  const doubled = SITS.find(s => s.id === 's62');
  assert.ok(doubled.extras.some(e => e.label === 'LF②'));
  assert.ok(doubled.extras.some(e => e.label === 'Fungo'));
  assert.equal(doubled.balls.length, 12);
  const horn = SITS.find(s => s.id === 's65');
  assert.equal(horn.balls.length, 8);
});

test('each drill plays every fielder’s rep, in the book order', () => {
  const order = {
    s58: ['3B', 'SS', '2B', '1B', 'C'],
    s59: ['3B', 'SS', '2B', '1B', 'C'],
    s60: ['3B', 'SS', '2B', '1B'],
    s61: ['3B', 'SS', '2B', '1B'],
    s62: ['LF', 'LF', 'CF', 'CF', 'RF', 'RF', 'LF', 'LF', 'CF', 'CF', 'RF', 'RF'],
    s63: ['CF', 'RF', 'CF', 'RF'],
    s64: ['LF', 'LF', 'CF', 'CF', 'RF', 'RF'],
    s65: ['3B', '3B', 'SS', 'SS', '2B', '2B', '1B', '1B'],
    s66: ['3B', '3B', 'SS', 'SS', '2B', '2B', '1B', '1B'],
    s67: ['3B', '3B', 'SS', 'SS', '2B', '2B', '1B', '1B', 'C']
  };
  for (const [id, pos] of Object.entries(order)) {
    const S = SITS.find(s => s.id === id);
    assert.deepEqual(S.reps.map(r => r.pos), pos, id);
    assert.equal(S.caps.filter(c => /^Rep \d+ of \d+:/.test(c[1])).length, pos.length, id);
    pos.forEach((_, i) => {
      assert.match(S.caps.map(c => c[1]).join('\n'), new RegExp('Rep ' + (i + 1) + ' of ' + pos.length + ':'));
    });
    const notes = [...(S.notes || []), ...(S.assumed || [])].join(' ');
    assert.doesNotMatch(notes, /repeats for the others|one is shown|the same throw repeats|Shown is one/i, id);
    const times = S.reps.map(r => r.t);
    for (let i = 1; i < times.length; i++) assert.ok(times[i] > times[i - 1], id + ' rep order');
    const C = compile(S);
    assert.ok(C.end > times[times.length - 1] + 0.4, id + ' timeline covers the last rep');
    if (S.balls.length === pos.length) {
      S.reps.forEach((r, i) => assert.equal(S.balls[i][0].t, r.t, id + ' ball ' + i));
    }
  }
  const out = SITS.find(s => s.id === 's62');
  const titles = out.caps.filter(c => c[1].startsWith('Rep')).map(c => c[1]);
  assert.match(titles[0], /Left field ① to 2nd/);
  assert.match(titles[1], /Left field ② to 3rd/);
  assert.match(titles[3], /shortstop cuts/);
  assert.match(titles[6], /Left field ② to 2nd/);
  assert.match(titles[11], /Right field ① to 3rd/);
  const home = SITS.find(s => s.id === 's64').caps.filter(c => c[1].startsWith('Rep')).map(c => c[1]);
  assert.match(home[0], /Left field/);
  assert.match(home[2], /Center field/);
  assert.match(home[4], /Right field/);
});

test('bunt plays stay on the field and do not stack two fielders', () => {
  const problems = [];
  for (const S of SITS.slice(28)) {
    const { frames } = samples(S);
    for (const frame of frames) {
      for (const [name, p] of Object.entries(frame.pos)) {
        if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) problems.push(S.id + ' bad ' + name);
        const r = Math.hypot(p[0], p[1]);
        if (r > 305 || p[0] < -216 || p[0] > 216 || p[1] < -40 || p[1] > 308) {
          problems.push(`${S.id} t=${frame.t.toFixed(2)} ${name} off [${p.map(n => n.toFixed(0))}]`);
        }
      }
      const names = Object.keys(frame.pos).filter(n => POS.includes(n));
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const a = frame.pos[names[i]], b = frame.pos[names[j]];
          const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          if (d < 22) problems.push(`${S.id} t=${frame.t.toFixed(2)} ${names[i]}~${names[j]} ${d.toFixed(1)}`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});
