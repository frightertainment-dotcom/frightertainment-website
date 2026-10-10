(() => {
  const form=document.querySelector('#contact-form'),status=document.querySelector('#contact-status');
  if(!form)return;
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const fields=Object.fromEntries(new FormData(form));
    const button=form.querySelector('button[type="submit"]');button.disabled=true;status.textContent='Sending…';
    try{
      const response=await fetch('/api/contact',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(fields)});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error || 'Message could not be sent');
      form.reset();status.textContent='Your message was sent. Thank you.';
    }catch{
      status.replaceChildren(document.createTextNode('The direct form is unavailable. '));
      const link=document.createElement('a');link.textContent='Open your email app with this message';
      link.href='mailto:Frightertainment@gmail.com?subject='+encodeURIComponent(fields.subject)+'&body='+encodeURIComponent('Title: '+fields.title+'\n\n'+fields.message);
      status.append(link,document.createTextNode(' or use the address below.'));
    }finally{button.disabled=false;}
  });
})();
