/* Preview-only FrightWatch promotion. Source page/header markup stays untouched. */
(() => {
'use strict';
if(/(?:^|\/)frightwatch(?:\.html|\/|$)/i.test(location.pathname))return;
const header=document.querySelector('header.hub-header') || document.querySelector('header.header') || document.querySelector('body > header');
if(!header||document.querySelector('.fr-watch-promo'))return;
const link=document.createElement('a');link.className='fr-watch-promo';link.href='/frightwatch.html';
link.setAttribute('aria-label','FrightWatch — explore the upcoming free independent horror streaming showcase');
const picture=document.createElement('picture');
const source=document.createElement('source');source.media='(max-width:700px)';source.srcset='/assets/frightwatch/frightwatch-banner-mobile.webp';
const img=document.createElement('img');img.src='/assets/frightwatch/frightwatch-banner.webp';img.alt='Frightertainment presents FrightWatch. Enjoy free movies. Click here.';img.loading='eager';img.decoding='async';img.fetchPriority='high';
img.addEventListener('error',()=>{link.dataset.imageError='true';});
picture.append(source,img);
const fallback=document.createElement('span');fallback.className='fr-watch-promo__placeholder';fallback.setAttribute('aria-hidden','true');
const name=document.createElement('strong');name.textContent='FRIGHTWATCH';const detail=document.createElement('small');detail.textContent='FREE HORROR STREAMING · COMING SOON →';
fallback.append(name,detail);
link.append(picture,fallback);header.insertAdjacentElement('afterend',link);
})();
