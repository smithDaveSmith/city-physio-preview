'use strict';
document.documentElement.classList.add('js');
const menu=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#main-navigation');
function closeMenu(){navigation?.classList.remove('is-open');menu?.setAttribute('aria-expanded','false');}
menu?.addEventListener('click',()=>{const expanded=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!expanded));navigation.classList.toggle('is-open',!expanded);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
navigation?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
const dataElement=document.querySelector('#concern-data');
if(dataElement){const data=JSON.parse(dataElement.textContent);const root=document.querySelector('#concern-link').getAttribute('href').split('#')[0];document.querySelectorAll('[data-concern]').forEach(button=>{button.addEventListener('click',()=>{const item=data.find(c=>c.id===button.dataset.concern);if(!item)return;document.querySelectorAll('[data-concern]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});document.querySelector('#concern-title').textContent=item.heading;document.querySelector('#concern-text').textContent=item.text;document.querySelector('#concern-link').href=root+'#'+item.service;});});}
