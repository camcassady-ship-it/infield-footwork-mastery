'use strict';
let guide,demoClips={},active=1,picks=[];
try{const saved=JSON.parse(localStorage.getItem('footwork-picks-v2')||'[]');if(Array.isArray(saved))picks=[...new Set(saved.filter(n=>Number.isInteger(n)&&n>=1&&n<=36))].slice(0,3)}catch{}
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortTitles=['Through & sweep','Routine & lateral','Adjust & crossover','Infield-in shuffles','Slow roller & drop','Charge & jump throw','Chopper & field-with','Hinge & backhand','Boot, right & rake','Routine & do or die','Chopper & no-step','Boot & sit back'];
const SCALE=14,START=[67,218],HOME_DELTA=[49,-183],HOME_LEN=Math.hypot(HOME_DELTA[0],HOME_DELTA[1]);
const FWD=[HOME_DELTA[0]/HOME_LEN,HOME_DELTA[1]/HOME_LEN],LEFT=[-FWD[1],FWD[0]];
const flip=([x,y])=>[x,290-y],FIRST=flip([212,131]);
const num=n=>Math.round(n*10)/10;
function arrow(cx,cy,a,n,color){let out='';for(let j=0;j<n;j++){const d=(j-(n-1)/2)*6.3,px=cx+d*Math.cos(a),py=cy+d*Math.sin(a),size=4.3,tx=px+size*.55*Math.cos(a),ty=py+size*.55*Math.sin(a),bx=px-size*.65*Math.cos(a),by=py-size*.65*Math.sin(a),dx=-Math.sin(a)*size*.65,dy=Math.cos(a)*size*.65;out+=`<polygon points="${num(tx)},${num(ty)} ${num(bx+dx)},${num(by+dy)} ${num(bx-dx)},${num(by-dy)}" fill="${color}"/>`}return out}
function line(a,b,n,color){const len=Math.hypot(b[0]-a[0],b[1]-a[1]);const path=`<path d="M${num(a[0])},${num(a[1])} L${num(b[0])},${num(b[1])}" fill="none" stroke="${color}" stroke-width="1.3"/>`;if(len<13)return path;return path+arrow((a[0]+b[0])/2,(a[1]+b[1])/2,Math.atan2(b[1]-a[1],b[0]-a[0]),n,color)}
function movementCues(play) {
  return play.cues.split(/\.(?:"(?=\s|$))?\s+/).filter(Boolean)
    .map(cue => cue.replace(/\.$/, '').replace(/^"([^"]+)$/, '$1'));
}
function mapLocal(x, y) {
  return flip([START[0] + (x * LEFT[0] + y * FWD[0]) * SCALE, START[1] + (x * LEFT[1] + y * FWD[1]) * SCALE]);
}
function infield() {
  const home=[116,35], first=[212,131], bases=[home,first,[116,227],[20,131]];
  let svg=`<path d="M${flip(home)} L${flip(first)} L${flip(bases[2])} L${flip(bases[3])} Z" fill="none" stroke="#bcc6b4" stroke-width=".8"/><path d="M${flip([0,151])} L${flip(home)} L${flip([234,153])}" fill="none" stroke="#bcc6b4" stroke-width=".8"/>`;
  bases.forEach(([x,y])=>{const p=flip([x,y]);svg+=`<path d="M${p[0]},${p[1]-3} l3,3 -3,3 -3,-3 Z" fill="#f7f5ef" stroke="#bcc6b4" stroke-width=".8"/>`});
  svg+=`<g fill="#6a7462" font-family="Arial,sans-serif" font-size="7.5"><text x="104" y="274">HOME</text><text x="218" y="162">1B</text><text x="110" y="79">2B</text><text x="7" y="175">3B</text></g>`;
  return svg + `<circle cx="67" cy="72" r="3.4" fill="#22261f"/><text x="59" y="62" fill="#22261f" font-family="Arial,sans-serif" font-size="8" font-weight="bold">SS</text>`;
}
function centerline(steps) {
  const pts = [[0, 0]];
  for (let i = 0; i < steps.length - 1; i++) pts.push([(steps[i].x + steps[i + 1].x) / 2, (steps[i].y + steps[i + 1].y) / 2]);
  pts.push([steps.at(-1).x, steps.at(-1).y]);
  const cleaned = [pts[0]];
  for (const point of pts.slice(1)) {
    const prev = cleaned.at(-1);
    if (Math.hypot(point[0] - prev[0], point[1] - prev[1]) > 0.22) cleaned.push(point);
  }
  return cleaned.length > 1 ? cleaned : pts;
}
function segmentPace(play, index, count) {
  const finish = play.path.finish, t = count <= 1 ? 1 : index / (count - 1);
  if (finish === 'run' || finish === 'jump') return t > 0.62 ? 3 : 2;
  if (play.id === 35 || finish === 'replace') return 1;
  return t > 0.72 ? 1 : 2;
}
function bootKink(points, field) {
  let best = 0, bestD = Infinity;
  points.forEach((point, i) => {
    const d = Math.hypot(point[0] - field[0], point[1] - field[1]);
    if (d < bestD) { bestD = d; best = i; }
  });
  if (best >= points.length - 1) return points;
  const a = points[best], b = points[best + 1];
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const kink = [(a[0] + b[0]) / 2 - dy / len * 0.28, (a[1] + b[1]) / 2 + dx / len * 0.28];
  const out = points.slice();
  out.splice(best + 1, 0, kink);
  return out;
}
function playRoute(play, color = '#bb471f') {
  const field = mapLocal(play.path.field.x, play.path.field.y);
  let local = centerline(play.path.steps);
  if (play.path.recover) local = bootKink(local, [play.path.field.x, play.path.field.y]);
  const pts = local.map(([x, y]) => mapLocal(x, y));
  let svg = '';
  for (let j = 0; j < pts.length - 1; j++) svg += line(pts[j], pts[j + 1], segmentPace(play, j, pts.length - 1), color);
  const last = pts.at(-1), prev = pts.at(-2) || last;
  const finish = play.path.finish;
  let release = last;
  if (finish === 'run' || finish === 'jump') {
    const dx = last[0] - prev[0], dy = last[1] - prev[1], len = Math.hypot(dx, dy) || 1;
    release = [last[0] + dx / len * (finish === 'jump' ? 34 : 26), last[1] + dy / len * (finish === 'jump' ? 34 : 26)];
    svg += line(last, release, 3, color);
  } else if (finish === 'nostep') {
    release = field;
  } else if (finish === 'fake') {
    const dx = FIRST[0] - last[0], dy = FIRST[1] - last[1], len = Math.hypot(dx, dy) || 1;
    const end = [last[0] + dx / len * 22, last[1] + dy / len * 22];
    svg += `<path d="M${num(last[0])},${num(last[1])} L${num(end[0])},${num(end[1])}" fill="none" stroke="${color}" stroke-width="1.1" stroke-dasharray="3 3" opacity=".45"/>`;
  } else {
    const dx = FIRST[0] - last[0], dy = FIRST[1] - last[1], len = Math.hypot(dx, dy) || 1;
    release = [last[0] + dx / len * 10, last[1] + dy / len * 10];
    svg += line(last, release, 1, color);
  }
  if (finish !== 'fake') {
    const dx = FIRST[0] - release[0], dy = FIRST[1] - release[1], ln = Math.hypot(dx, dy) || 1;
    svg += `<path d="M${num(release[0] + dx / ln * 5)},${num(release[1] + dy / ln * 5)} L${num(FIRST[0] - dx / ln * 5)},${num(FIRST[1] - dy / ln * 5)}" fill="none" stroke="${color}" stroke-width=".8" stroke-dasharray="3 3"/>`;
  }
  svg += `<circle cx="${num(field[0])}" cy="${num(field[1])}" r="4.8" fill="#ecefe6" stroke="${color}" stroke-width="1.7"/><text x="${num(field[0] - 14)}" y="${num(field[1] + 14)}" fill="${color}" font-family="Arial,sans-serif" font-size="9" font-weight="bold">F</text>`;
  return svg;
}
const DIAGRAM_BOX = '-36 0 292 292';
function diagram(play) {
  return `<svg viewBox="${DIAGRAM_BOX}" role="img" aria-label="${esc(play.name)}: shortstop to first base. ${esc(play.cues)}">${infield()}${playRoute(play)}</svg>`;
}
function sequenceGraphic(plays) {
  const colors = ['#a63c17', '#145d94', '#546720'];
  const routes = plays.map((play, i) => `<g data-route-line="${play.id}">${playRoute(play, colors[i])}</g>`).join('');
  const legend = plays.map((play, i) =>
    `<label><input type="checkbox" data-route="${play.id}" checked><span class="route-swatch" style="background:${colors[i]}" aria-hidden="true"></span>Play ${play.id} · ${esc(play.name)}</label>`).join('');
  return `<svg viewBox="${DIAGRAM_BOX}" role="img" aria-label="Three routes overlaid on one infield">${infield()}${routes}</svg>
    <div class="route-legend" role="group" aria-label="Show or hide each route">${legend}</div>`;
}
function playBody(p) {
  return `<div class="play-body"><div class="diagram-examples"><figure class="field-diagram"><div class="diagram-stage">${diagram(p)}</div><figcaption>SS = start &nbsp; · &nbsp; F = field &nbsp; · &nbsp; Dashed line = throw</figcaption></figure>${exampleButtons(p)}</div><div><div class="cues-title">MOVEMENT CUES</div><ol class="cue-list">${movementCues(p).map(s=>`<li>${esc(s.replace(/\.$/,''))}</li>`).join('')}</ol></div></div>`;
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
