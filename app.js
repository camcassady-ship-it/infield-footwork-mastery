'use strict';
let guide,mlbClips={},active=1,picks=[];
try{const saved=JSON.parse(localStorage.getItem('footwork-picks')||'[]');if(Array.isArray(saved))picks=[...new Set(saved.filter(n=>Number.isInteger(n)&&n>=1&&n<=36))].slice(0,3)}catch{}
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortTitles=['Routine & lateral','Adjust & drop step','Field through & shuffle','Slow roller & crossover','Charge & backhand','Contact & replace','Hinge & charge','Routine & do or die','Chopper & no-step','Recovery & exchange','Routine & do or die*','Chopper & no-step*'];
function arrow(cx,cy,a,n,color){let out='';for(let j=0;j<n;j++){const d=(j-(n-1)/2)*6.3,px=cx+d*Math.cos(a),py=cy+d*Math.sin(a),size=4.3,tx=px+size*.55*Math.cos(a),ty=py+size*.55*Math.sin(a),bx=px-size*.65*Math.cos(a),by=py-size*.65*Math.sin(a),dx=-Math.sin(a)*size*.65,dy=Math.cos(a)*size*.65;out+=`<polygon points="${tx},${ty} ${bx+dx},${by+dy} ${bx-dx},${by-dy}" fill="${color}"/>`}return out}
function line(a,b,n,color){return `<path d="M${a} L${b}" fill="none" stroke="${color}" stroke-width="1.3"/>`+arrow((a[0]+b[0])/2,(a[1]+b[1])/2,Math.atan2(b[1]-a[1],b[0]-a[0]),n,color)}
const runningReleases = new Set([15,17,20,24,30,33]);
function movementCues(play) {
  return play.cues.split(/\.(?:"(?=\s|$))?\s+/).filter(Boolean)
    .map(cue => cue.replace(/\.$/, '').replace(/^"([^"]+)$/, '$1'));
}
function infield() {
  const home=[116,35], first=[212,131], bases=[home,first,[116,227],[20,131]];
  const flip=([x,y])=>[x,290-y];
  let svg=`<path d="M${flip(home)} L${flip(first)} L${flip(bases[2])} L${flip(bases[3])} Z" fill="none" stroke="#bcc6b4" stroke-width=".8"/><path d="M${flip([0,151])} L${flip(home)} L${flip([234,153])}" fill="none" stroke="#bcc6b4" stroke-width=".8"/>`;
bases.forEach(([x,y])=>{const p=flip([x,y]);svg+=`<path d="M${p[0]},${p[1]-3} l3,3 -3,3 -3,-3 Z" fill="#f7f5ef" stroke="#bcc6b4" stroke-width=".8"/>`});
svg+=`<g fill="#6a7462" font-family="Arial,sans-serif" font-size="7.5"><text x="104" y="274">HOME</text><text x="218" y="162">1B</text><text x="110" y="79">2B</text><text x="7" y="175">3B</text></g>`;
  return svg + `<circle cx="67" cy="72" r="3.4" fill="#22261f"/><text x="59" y="62" fill="#22261f" font-family="Arial,sans-serif" font-size="8" font-weight="bold">SS</text>`;
}
function approachPaces(play) {
  if ([26, 35].includes(play.id)) return [2, 1];
  return guide.paces[play.mode];
}

function playRoute(play, color = '#bb471f') {
const mode=play.mode,id=play.id,start=[67,218],first=[212,131],norm=Math.hypot(49,-183),f=[49/norm,-183/norm],l=[-f[1],f[0]],flip=([x,y])=>[x,290-y],pts=guide.routes[mode].map(([u,v])=>flip([start[0]+u*l[0]+v*f[0],start[1]+u*l[1]+v*f[1]])),speeds=approachPaces(play);
const field = pts.at(-1), [fx,fy] = field, firstSvg = flip(first);
const lastApproach = pts.at(-2);
const running = runningReleases.has(id);
const target = running ? field.map((value, axis) => 2*value-lastApproach[axis]) : firstSvg;
const direction = target.map((value, axis) => value-field[axis]);
const length = Math.hypot(...direction);
const dist = running ? 48 : [21,27,36].includes(id) ? 0 : 10;
const release = field.map((value, axis) => value + direction[axis]/length*dist);
const dx = firstSvg[0]-release[0], dy = firstSvg[1]-release[1], ln = Math.hypot(dx,dy);
let svg = '';
for(let j=0;j<pts.length-1;j++)svg+=line(pts[j],pts[j+1],speeds[j],color);if(dist)svg+=line([fx,fy],release,speeds.at(-1)>=2?2:1,color);
svg+=`<path d="M${[release[0]+dx/ln*5,release[1]+dy/ln*5]} L${[firstSvg[0]-dx/ln*5,firstSvg[1]-dy/ln*5]}" stroke="${color}" stroke-width=".8" stroke-dasharray="3 3"/><circle cx="${fx}" cy="${fy}" r="4.8" fill="#ecefe6" stroke="${color}" stroke-width="1.7"/><text x="${fx-14}" y="${fy+14}" fill="${color}" font-family="Arial,sans-serif" font-size="9" font-weight="bold">F</text>`;return svg}

function diagram(play) {
  const viewBox = runningReleases.has(play.id) ? '-42 0 292 292' : '-8 0 258 292';
  return `<svg viewBox="${viewBox}" role="img" aria-label="${esc(play.name)}: shortstop to first base. ${esc(play.cues)}">${infield()}${playRoute(play)}</svg>`;
}
function sequenceGraphic(plays) {
  const colors = ['#a63c17', '#145d94', '#546720'];
  const routes = plays.map((play, i) =>
    `<g data-route-line="${play.id}">${playRoute(play, colors[i])}</g>`).join('');
  const legend = plays.map((play, i) =>
    `<label><input type="checkbox" data-route="${play.id}" checked><span class="route-swatch" style="background:${colors[i]}" aria-hidden="true"></span>Play ${play.id} · ${esc(play.name)}</label>`).join('');
  return `<svg viewBox="-42 0 292 292" role="img" aria-label="Three routes overlaid on one infield">${infield()}${routes}</svg>
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
function togglePick(id){if(picks.includes(id)){picks=picks.filter(n=>n!==id);notify(`Play ${id} removed from today.`)}else{if(picks.length>=3){notify('Three plays selected. Remove one to add another.');return}picks.push(id);notify(`Play ${id} added. ${picks.length} of 3 selected.`)}try{localStorage.setItem('footwork-picks',JSON.stringify(picks))}catch{}updatePicks()}
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
Promise.all(['data.json','clips.json'].map(url=>fetch(url).then(r=>{if(!r.ok)throw Error('Unable to load guide');return r.json()}))).then(([d,c])=>{guide=d;mlbClips=c;$('#sequence-nav').innerHTML=d.sequences.map(s=>`<button class="seq-button" data-seq="${s.id}" aria-label="Sequence ${s.id}: ${esc(shortTitles[s.id-1])}"><span class="seq-num">${String(s.id).padStart(2,'0')}</span><span>${esc(shortTitles[s.id-1])}</span></button>`).join('');$('#sequence-select').innerHTML=d.sequences.map(s=>`<option value="${s.id}">${String(s.id).padStart(2,'0')} · ${esc(shortTitles[s.id-1])}</option>`).join('');$('#sequence-select').addEventListener('change',e=>select(Number(e.target.value)));navigateFromHash(false);
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
