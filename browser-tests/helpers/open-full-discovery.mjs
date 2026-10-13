/* Legacy functional checks open the native discovery disclosure where present. */
const routes=new Set(['/movies.html','/tv-shows.html','/indie-movies.html','/podcasts.html','/games.html']);
export async function openCompleteDiscovery(page) {
 let pathname='';
 try{pathname=new URL(page.url()).pathname;}catch{}
 if(!routes.has(pathname))return;
 const details=page.locator('details.fr-v5-deeper');
 await details.waitFor({state:'visible',timeout:12000});
 if((await details.getAttribute('open'))===null){
  await details.locator(':scope > summary').click();
 }
}
export async function navigateLegacy(page,href,options){
 const response=await page.goto(href,options);
 await openCompleteDiscovery(page);
 return response;
}
