'use strict';
let guide,demoClips={},active=1,picks=[];
try{const saved=JSON.parse(localStorage.getItem('footwork-picks-v2')||'[]');if(Array.isArray(saved))picks=[...new Set(saved.filter(n=>Number.isInteger(n)&&n>=1&&n<=36))].slice(0,3)}catch{}
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortTitles=['Through & sweep','Routine & lateral','Adjust & crossover','Infield-in shuffles','Slow roller & drop','Charge & jump throw','Chopper & field-with','Hinge & backhand','Boot, right & rake','Routine & do or die','Chopper & no-step','Boot & sit back'];
const DIAG={s:34};
const FIELD_WORD={centered:'centered',forehand:'forehand',backhand:'backhand','1-handed':'one hand',barehand:'barehand',boot:'boot'};
const FINISH_WORD={set:'set feet',replace:'replace feet',stepThrough:'step through',run:'throw on the run',jump:'jump throw',nostep:'no-step throw',fake:'arm fake'};
const num=n=>Math.round(n*10)/10;
function movementCues(play) {
  return play.cues.split(/\.(?:"(?=\s|$))?\s+/).filter(Boolean)
    .map(cue => cue.replace(/\.$/, '').replace(/^"([^"]+)$/, '$1'));
}
function loc(x, y) { return [x * DIAG.s, y * DIAG.s]; }
function playPoints(play) {
  const pts = [[0, 0], ...play.path.steps.map(step => loc(step.x, step.y)), loc(play.path.field.x, play.path.field.y)];
  if (play.path.recover) pts.push(loc(play.path.recover.x, play.path.recover.y));
  const last = pts[pts.length - 1];
  pts.push(towardFirst(last, 42));
  pts.push([loc(play.path.field.x, play.path.field.y)[0], loc(play.path.field.x, play.path.field.y)[1] + 40]);
  return pts;
}
function viewFor(plays) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const play of plays) for (const [x, y] of playPoints(play)) {
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  minX -= 58; maxX += 58; minY -= 42; maxY += 36;
  if (maxX - minX < 210) { const d = (210 - (maxX - minX)) / 2; minX -= d; maxX += d; }
  if (maxY - minY < 180) { const d = (180 - (maxY - minY)) / 2; minY -= d; maxY += d; }
  return {x: minX, y: minY, w: maxX - minX, h: maxY - minY};
}
function smooth(points) {
  if (points.length < 2) return '';
  let d = `M${num(points[0][0])},${num(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${num(c1[0])},${num(c1[1])} ${num(c2[0])},${num(c2[1])} ${num(p2[0])},${num(p2[1])}`;
  }
  return d;
}
function towardFirst(from, len) {
  const dir = [0.85, 0.53], n = Math.hypot(dir[0], dir[1]);
  return [from[0] + dir[0] / n * len, from[1] + dir[1] / n * len];
}
function arrowHead(from, to, color) {
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]), s = 5.2;
  const b = [to[0] - Math.cos(a) * s, to[1] - Math.sin(a) * s];
  const p = [b[0] + Math.cos(a + 2.4) * s, b[1] + Math.sin(a + 2.4) * s];
  const q = [b[0] + Math.cos(a - 2.4) * s, b[1] + Math.sin(a - 2.4) * s];
  return `<polygon points="${num(to[0])},${num(to[1])} ${num(p[0])},${num(p[1])} ${num(q[0])},${num(q[1])}" fill="${color}"/>`;
}
function yard(box) {
  return `<rect x="${num(box.x)}" y="${num(box.y)}" width="${num(box.w)}" height="${num(box.h)}" fill="#e7efe0"/>
    <text x="${num(box.x + box.w / 2)}" y="${num(box.y + 14)}" text-anchor="middle" fill="#6a7462" font-family="Arial,sans-serif" font-size="9">OUTFIELD</text>
    <text x="${num(box.x + box.w / 2)}" y="${num(box.y + box.h - 8)}" text-anchor="middle" fill="#6a7462" font-family="Arial,sans-serif" font-size="9">HOME</text>
    <text x="${num(box.x + box.w - 8)}" y="${num(box.y + 14)}" text-anchor="end" fill="#6a7462" font-family="Arial,sans-serif" font-size="9">2B · LEFT</text>
    <text x="${num(box.x + 8)}" y="${num(box.y + 14)}" fill="#6a7462" font-family="Arial,sans-serif" font-size="9">RIGHT · 3B</text>
    <circle cx="0" cy="0" r="3.4" fill="#22261f"/><text x="0" y="-9" text-anchor="middle" fill="#22261f" font-family="Arial,sans-serif" font-size="9" font-weight="700">SS</text>`;
}
function fieldMark(play, color) {
  const path = play.path, f = loc(path.field.x, path.field.y);
    const word = {centered:'2H', forehand:'FH', backhand:'BH', '1-handed':'1H', barehand:'bare', boot:'boot'}[path.field.type];
  let svg = `<circle cx="${num(f[0])}" cy="${num(f[1])}" r="8.5" fill="#fff" stroke="${color}" stroke-width="1.8"/>
    <text x="${num(f[0])}" y="${num(f[1] + 3)}" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif" font-size="8" font-weight="700">F</text>
    <text x="${num(f[0] - 12)}" y="${num(f[1] - 6)}" text-anchor="end" fill="#5c6754" font-family="Arial,sans-serif" font-size="8" font-weight="700">${word}</text>`;
  if (path.recover) {
    const r = loc(path.recover.x, path.recover.y);
    svg += `<path d="M${num(f[0])},${num(f[1])} L${num(r[0])},${num(r[1])}" fill="none" stroke="#3c6b32" stroke-width="1.1" stroke-dasharray="2 2"/>
      <circle cx="${num(r[0])}" cy="${num(r[1])}" r="8" fill="#fff" stroke="#3c6b32" stroke-width="1.4"/>
      <text x="${num(r[0] + 11)}" y="${num(r[1] + 3)}" text-anchor="start" fill="#24501c" font-family="Arial,sans-serif" font-size="8" font-weight="700">bare</text>`;
  }
  return svg;
}
function ballPath(play) {
  const f = loc(play.path.field.x, play.path.field.y);
  const ball = [f[0], f[1] + 34];
  return `<path d="M${num(ball[0])},${num(ball[1])} L${num(f[0])},${num(f[1])}" fill="none" stroke="#3c6b32" stroke-width="1.3" stroke-dasharray="1.6 2.2"/>
    <circle cx="${num(ball[0])}" cy="${num(ball[1])}" r="3.6" fill="#f7f4ea" stroke="#3c6b32" stroke-width="1.2"/>`;
}
function finishMark(play, color) {
  const path = play.path, steps = path.steps;
  const last = path.recover ? loc(path.recover.x, path.recover.y) : loc(steps.at(-1).x, steps.at(-1).y);
  const prev = loc(steps.at(-2)?.x ?? steps.at(-1).x, steps.at(-2)?.y ?? steps.at(-1).y - 0.4);
  if (path.finish === 'fake') {
    const end = towardFirst(last, 28);
    return `<path d="M${num(last[0])},${num(last[1])} L${num(end[0])},${num(end[1])}" fill="none" stroke="#5c6754" stroke-width="1.4" stroke-dasharray="2 2.2"/>
      <text x="${num(end[0] + 3)}" y="${num(end[1] + 3)}" fill="#5c6754" font-family="Arial,sans-serif" font-size="8" font-weight="700">FAKE</text>`;
  }
  let svg = '', from = last;
  if (path.finish === 'jump') {
    const land = towardFirst(last, 20);
    const cx = (last[0] + land[0]) / 2, cy = Math.min(last[1], land[1]) - 18;
    svg += `<path d="M${num(last[0])},${num(last[1])} Q${num(cx)},${num(cy)} ${num(land[0])},${num(land[1])}" fill="none" stroke="${color}" stroke-width="1.5"/>
      <text x="${num(cx)}" y="${num(cy - 3)}" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif" font-size="8">jump</text>`;
    from = land;
  } else if (path.finish === 'run') {
    const dx = last[0] - prev[0], dy = last[1] - prev[1], len = Math.hypot(dx, dy) || 1;
    const tip = [last[0] + dx / len * 24, last[1] + dy / len * 24];
    svg += `<path d="M${num(last[0])},${num(last[1])} L${num(tip[0])},${num(tip[1])}" fill="none" stroke="${color}" stroke-width="1.6"/>${arrowHead(last, tip, color)}`;
    from = tip;
  }
  const end = towardFirst(from, path.finish === 'nostep' ? 36 : 28);
  svg += `<path d="M${num(from[0])},${num(from[1])} L${num(end[0])},${num(end[1])}" fill="none" stroke="${color}" stroke-width="1.15" stroke-dasharray="3 2.4"/>`;
  if (path.finish === 'nostep') svg += `<text x="${num(from[0] - 4)}" y="${num(from[1] - 12)}" text-anchor="end" fill="${color}" font-family="Arial,sans-serif" font-size="8">no step</text>`;
  return svg;
}
function footprints(steps) {
  return steps.map((step, i) => {
    const [x, y] = loc(step.x, step.y);
    const nxt = steps[i + 1] || step, prv = steps[i - 1] || {x: step.x, y: step.y - 0.45};
    const ang = Math.atan2(nxt.y - prv.y, nxt.x - prv.x) * 180 / Math.PI - 90;
    const fill = step.foot === 'L' ? '#1d5f98' : '#c2511a';
    const side = step.foot === 'L' ? 'left' : 'right';
    return `<g transform="translate(${num(x)},${num(y)})"><title>Step ${i + 1}: ${side} foot, ${step.kind}</title>
      <g transform="rotate(${num(ang)})"><ellipse cx="0" cy="1" rx="7" ry="9.2" fill="${fill}"/></g>
      <text x="0" y="3.5" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="9" font-weight="700">${i + 1}</text></g>`;
  }).join('');
}
function playRoute(play, color = '#b34315', detailed = true) {
  const pts = play.path.steps.map(step => loc(step.x, step.y));
  if (play.path.recover) pts.push(loc(play.path.recover.x, play.path.recover.y));
  let svg = `<path d="${smooth(pts)}" fill="none" stroke="${detailed ? '#5d6756' : color}" stroke-width="${detailed ? 1.7 : 2.6}" stroke-linecap="round"/>`;
  if (detailed) svg += ballPath(play) + footprints(play.path.steps);
  svg += fieldMark(play, color) + finishMark(play, color);
  return svg;
}
function diagram(play) {
  const field = FIELD_WORD[play.path.field.type], finish = FINISH_WORD[play.path.finish], box = viewFor([play]);
  return `<svg viewBox="${num(box.x)} ${num(box.y)} ${num(box.w)} ${num(box.h)}" role="img" aria-label="${esc(play.name)}. Numbered left and right footprints. Field ${field}. ${finish}.">${yard(box)}${playRoute(play)}</svg>`;
}
function sequenceGraphic(plays) {
  const colors = ['#a63c17', '#145d94', '#546720'];
  const box = viewFor(plays);
  const routes = plays.map((play, i) => `<g data-route-line="${play.id}">${playRoute(play, colors[i], false)}</g>`).join('');
  const legend = plays.map((play, i) =>
    `<label><input type="checkbox" data-route="${play.id}" checked><span class="route-swatch" style="background:${colors[i]}" aria-hidden="true"></span>Play ${play.id} · ${esc(play.name)}</label>`).join('');
  return `<svg viewBox="${num(box.x)} ${num(box.y)} ${num(box.w)} ${num(box.h)}" role="img" aria-label="Three routes overlaid on one infield">${yard(box)}${routes}</svg>
    <div class="route-legend" role="group" aria-label="Show or hide each route">${legend}</div>`;
}
function playBody(p) {
  return `<div class="play-body"><div class="diagram-examples"><figure class="field-diagram"><div class="diagram-stage">${diagram(p)}</div><figcaption>L / R = feet in order &nbsp; · &nbsp; F = field &nbsp; · &nbsp; Dotted = ball &nbsp; · &nbsp; Dashed = throw</figcaption></figure>${exampleButtons(p)}</div><div><div class="cues-title">MOVEMENT CUES</div><ol class="cue-list">${movementCues(p).map(s=>`<li>${esc(s.replace(/\.$/,''))}</li>`).join('')}</ol></div></div>`;
}
function render(){closeExample(false);const seq=guide.sequences[active-1];
const plays=guide.plays.slice((active-1)*3,active*3);$('#sequence-heading').innerHTML=`<div class="sequence-kicker">SEQUENCE ${String(active).padStart(2,'0')} <span>PLAYS ${active*3-2}–${active*3}</span></div><h2>${esc(seq.title)}</h2><p>${esc(seq.description)}</p>`;
$('#sequence-heading').insertAdjacentHTML('beforeend', `<nav class="play-jumps" aria-label="Jump to a play">${plays.map(play=>`<a href="#play-${play.id}">${play.id} · ${esc(play.name)}</a>`).join('')}</nav>`);
$('#sequence-overview').innerHTML=sequenceGraphic(plays);
$('#plays').innerHTML=plays.map(p=>`<article class="play" id="play-${p.id}" tabindex="-1"><div class="play-top"><div><div class="play-label">PLAY ${String(p.id).padStart(2,'0')}</div><h3>${esc(p.name)}</h3></div><button class="pick-button" data-pick="${p.id}" aria-pressed="${picks.includes(p.id)}" aria-label="${picks.includes(p.id)?'Remove':'Add'} play ${p.id} ${esc(p.name)} ${picks.includes(p.id)?'from':'to'} today">${picks.includes(p.id)?'✓ Added':'+ Add to today'}</button></div>${playBody(p)}</article>`).join('');
$('#sequence-select').value=String(active);$('#previous').disabled=active===1;$('#next').disabled=active===12;$('#page-count').textContent=`${String(active).padStart(2,'0')} / 12`;
document.querySelectorAll('.seq-button').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.seq)===active)));updatePicks();}
function select(n,scroll=true){if(!Number.isInteger(n)||n<1||n>12)return;active=n;history.replaceState(null,'',`#sequence-${n}`);render();if(scroll)$('#sequence-content').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
let toastTimer;function notify(msg){$('#status').textContent=msg;$('#status').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#status').classList.remove('show'),3200)}
function togglePick(id){if(picks.includes(id)){picks=picks.filter(n=>n!==id);notify(`Play ${id} removed from today.`)}else{if(picks.length>=3){notify('Three plays selected. Remove one to add another.');return}picks.push(id);notify(`Play ${id} added. ${picks.length} of 3 selected.`)}try{localStorage.setItem('footwork-picks-v2',JSON.stringify(picks))}catch{}updatePicks()}
function updatePicks(){closeExample(false);$('#pick-count').textContent=`${picks.length}/3`;document.querySelectorAll('[data-pick]').forEach(b=>{const id=Number(b.dataset.pick),chosen=picks.includes(id);b.setAttribute('aria-pressed',String(chosen));b.textContent=chosen?'✓ Added':'+ Add to today';b.setAttribute('aria-label',`${chosen?'Remove':'Add'} play ${id} ${guide.plays[id-1].name} ${chosen?'from':'to'} today`)});const selectedPlays = [...picks].sort((a, b) => a - b).map(id => guide.plays[id - 1]);
const comparison = $('#practice-comparison');
comparison.hidden = selectedPlays.length !== 3;
$('#practice-overview').innerHTML = comparison.hidden ? '' : sequenceGraphic(selectedPlays);
$('#picked-list').innerHTML=selectedPlays.map(play => {
  const id = play.id;
  return `<li class="practice-play">
    <div class="play-top">
      <div><div class="play-label">SEQUENCE ${Math.ceil(id / 3)} · PLAY ${String(id).padStart(2,'0')}</div><h3>${esc(play.name)}</h3></div>
      <button class="pick-button" data-remove="${id}" aria-label="Remove play ${id}">Remove</button>
    </div>
    ${playBody(play)}
  </li>`;
}).join('')+(picks.length<3?`<li class="empty-pick">${3-picks.length} ${3-picks.length===1?'spot':'spots'} open. Add plays from any sequence.</li>`:'');}
function openPlay(id) {
  const sequence = Math.ceil(id / 3);
  if (active !== sequence || !$('#play-' + id)) select(sequence, false);
  history.replaceState(null, '', '#play-' + id);
  const play = $('#play-' + id);
  play.focus({preventScroll: true});
  play.scrollIntoView({block: 'start'});
}
function navigateFromHash(scroll = true) {
  const id = Number(location.hash.match(/^#play-(\d+)$/)?.[1]);
  if (guide.plays.some(play => play.id === id)) {
    openPlay(id);
    return;
  }
  const sequence = Number(location.hash.match(/^#sequence-(\d+)$/)?.[1]);
  if (sequence >= 1 && sequence <= 12) select(sequence, scroll);
  else if (!scroll) select(1, false);
}
Promise.all(['data.json','clips.json'].map(url=>fetch(url).then(r=>{if(!r.ok)throw Error('Unable to load guide');return r.json()}))).then(([d,c])=>{guide=d;demoClips=c;$('#sequence-nav').innerHTML=d.sequences.map(s=>`<button class="seq-button" data-seq="${s.id}" aria-label="Sequence ${s.id}: ${esc(shortTitles[s.id-1])}"><span class="seq-num">${String(s.id).padStart(2,'0')}</span><span>${esc(shortTitles[s.id-1])}</span></button>`).join('');$('#sequence-select').innerHTML=d.sequences.map(s=>`<option value="${s.id}">${String(s.id).padStart(2,'0')} · ${esc(shortTitles[s.id-1])}</option>`).join('');$('#sequence-select').addEventListener('change',e=>select(Number(e.target.value)));navigateFromHash(false);
function updateRouteVisibility(event) {
  const toggle = event.target.closest('[data-route]');
  if (!toggle) return;
  const route = event.currentTarget.querySelector(`[data-route-line="${toggle.dataset.route}"]`);
  if (route) route.style.display = toggle.checked ? '' : 'none';
}
$('#sequence-overview').addEventListener('change', updateRouteVisibility);
$('#practice-overview').addEventListener('change', updateRouteVisibility);
$('#sequence-nav').addEventListener('click',e=>{const b=e.target.closest('[data-seq]');if(b)select(Number(b.dataset.seq))});$('#plays').addEventListener('click',e=>{const b=e.target.closest('[data-pick]');if(b)togglePick(Number(b.dataset.pick))});$('#picked-list').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){togglePick(Number(b.dataset.remove));($('#picked-list [data-remove]') || $('#practice-close')).focus({preventScroll:true})}});$('#previous').onclick=()=>select(active-1);$('#next').onclick=()=>select(active+1);$('#practice-open').onclick=()=>$('#practice-dialog').showModal();$('#practice-close').onclick=()=>$('#practice-dialog').close();$('#practice-dialog').addEventListener('click',e=>{if(e.target===$('#practice-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});window.addEventListener('hashchange', () => navigateFromHash());
document.addEventListener('click', event => {
  const link = event.target.closest('.play-jumps a');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openPlay(Number(link.hash.slice(6)));
});
}).catch(()=>{$('#sequence-heading').innerHTML='<h2>The guide could not load</h2><p>Please refresh the page to try again.</p>'});
