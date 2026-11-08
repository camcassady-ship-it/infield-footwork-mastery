'use strict';
let currentExample = null;
function exampleButtons(play) {
  const clips = demoClips[play.id] || [];
  if (!clips.length) return `<p class="demo-soon">Demo clip coming soon</p>`;
  return `<div class="example-buttons" role="group" aria-label="Footwork demo for ${esc(play.name)}">${clips.map((clip,i)=>`<button type="button" class="example-button" data-example-play="${play.id}" data-example-index="${i}" aria-expanded="false">Watch the footwork<span>Demo</span></button>`).join('')}</div>`;
}
function closeExample(restoreFocus=true) {
  if (!currentExample) return;
  const {video, overlay, trigger, svg} = currentExample;
  video.pause();video.removeAttribute('src');video.load();overlay.remove();
  svg.removeAttribute('aria-hidden');trigger.setAttribute('aria-expanded','false');
  currentExample=null;
  if (restoreFocus && trigger.isConnected) trigger.focus({preventScroll:true});
}
function playExample(trigger) {
  const clip=(demoClips[trigger.dataset.examplePlay]||[])[Number(trigger.dataset.exampleIndex)];
  if (!clip) return;
  closeExample(false);
  const stage=trigger.closest('.diagram-examples').querySelector('.diagram-stage');
  const playName=trigger.closest('article')?.querySelector('h3')?.textContent || 'this play';
  const overlay=document.createElement('div');overlay.className='example-overlay';
  overlay.setAttribute('role','group');overlay.setAttribute('aria-label',`Footwork demo: ${playName}`);
  overlay.innerHTML=`<button type="button" class="example-close" aria-label="Close footwork demo and return to diagram">✕</button><video controls autoplay muted loop playsinline preload="none" poster="assets/clips/${esc(clip.poster)}" aria-label="Demo: ${esc(playName)}"></video><div class="example-footer"><p><strong>Demo</strong> · Watch the footwork</p><div class="example-tools"><button type="button" data-slow aria-pressed="false">0.5× slow motion</button><button type="button" data-replay>↺ Replay</button></div><span class="example-message" role="status" aria-live="polite"></span></div>`;
  const svg=stage.querySelector('svg'), video=overlay.querySelector('video');
  svg.setAttribute('aria-hidden','true');stage.append(overlay);trigger.setAttribute('aria-expanded','true');
  currentExample={video,overlay,trigger,svg};video.muted=true;video.src=`assets/clips/${clip.file}`;
  const message=overlay.querySelector('.example-message');
  function start(){video.play().catch(()=>{if(currentExample?.video===video)message.textContent='Tap play to watch.'})}
  video.addEventListener('playing',()=>message.textContent='');
  video.addEventListener('error',()=>message.textContent='This example could not load. Please try again.');
  overlay.querySelector('.example-close').onclick=()=>closeExample();
  overlay.querySelector('[data-slow]').onclick=e=>{const slow=video.playbackRate!==0.5;video.playbackRate=slow?0.5:1;e.currentTarget.setAttribute('aria-pressed',String(slow));};
  overlay.querySelector('[data-replay]').onclick=()=>{video.currentTime=0;start()};
  overlay.querySelector('.example-close').focus({preventScroll:true});start();
}
document.addEventListener('click',event=>{const trigger=event.target.closest('[data-example-play]');if(trigger)playExample(trigger)});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&currentExample){event.preventDefault();event.stopImmediatePropagation();closeExample()}},true);
document.addEventListener('play',event=>{if(event.target instanceof HTMLVideoElement && currentExample && event.target!==currentExample.video)closeExample(false)},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)currentExample?.video.pause()});
document.addEventListener('DOMContentLoaded',()=>{
  const dialog=document.querySelector('#practice-dialog');
  document.querySelector('#practice-open').addEventListener('click',()=>closeExample(false));
  dialog.addEventListener('close',()=>closeExample(false));
});
