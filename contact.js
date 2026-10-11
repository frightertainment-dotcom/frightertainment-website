(() => {
  'use strict';
  const form=document.querySelector('#contact-form');
  const status=document.querySelector('#contact-status');
  if(!form||!status)return;
  const emailLink=fields=>{
    const from='From: '+fields.title+'\nReply email: '+fields.email+'\n\n'+fields.message;
    return 'mailto:Frightertainment@gmail.com?subject='+encodeURIComponent(fields.subject)+'&body='+encodeURIComponent(from);
  };
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const fields=Object.fromEntries(new FormData(form));
    const submit=form.querySelector('button[type="submit"]');
    if(submit.disabled)return;
    submit.disabled=true;
    status.replaceChildren(document.createTextNode('Sending your message…'));
    try{
      const response=await fetch('/api/contact',{
        method:'POST',
        headers:{'content-type':'application/json','accept':'application/json'},
        body:JSON.stringify(fields)
      });
      const result=await response.json();
      if(!response.ok||result?.ok!==true||result?.delivered!==true){
        throw new Error('Email delivery unavailable');
      }
      form.reset();
      status.textContent='Your message has been accepted for delivery. Thank you for getting in touch!';
    }catch{
      status.replaceChildren(document.createTextNode('The form could not send your message. Nothing has been submitted. '));
      const link=document.createElement('a');
      link.href=emailLink(fields);
      link.textContent='Open your email app with your message ready';
      status.append(link,document.createTextNode(' — your form text is still here if you want to copy it.'));
    }finally{
      submit.disabled=false;
    }
  });
})();
