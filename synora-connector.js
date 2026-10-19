/* =====================================================================
   Synora AI — Connector (Menu → Connector)
   Adds: Plugin tab (GitHub, GitLab) + Provider tab (100+ AI API providers),
   the provider connect bottom sheet (API Key, Model ID, Max Tokens,
   Capabilities, Save & Test) and the Custom Provider button that opens the
   old Set Up AI page.
   Load once, after the main app script:
     <script src='synora-connector.js'></script>
   ===================================================================== */
(function(){
'use strict';
if(window.__synoraConnectorInit)return;
window.__synoraConnectorInit=true;
if(typeof S==='undefined'){console.error('Synora Connector: app state not found');return;}

/* ---------------- helpers ---------------- */
function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function one(id){return document.getElementById(id);}
function bindLogos(root){qa('img',root).forEach(function(im){if(im.dataset.b)return;im.dataset.b='1';im.addEventListener('error',function(){var p=im.parentNode;im.remove();if(p)p.classList.add('nl');});});}

/* ---------------- plugins ---------------- */
var PLUGINS=[
 {id:'github',name:'GitHub',host:'github.com',desc:'Repositories, issues and code search.',api:'https://api.github.com/user',label:'Personal access token',hint:'ghp_... (scope: repo)'},
 {id:'gitlab',name:'GitLab',host:'gitlab.com',desc:'Projects, merge requests and pipelines.',api:'https://gitlab.com/api/v4/user',label:'Personal access token',hint:'glpat-... (scope: api)'}
];

/* ---------------- providers (name, base url, host, third-party) ---------------- */
var P_RAW=[
['OpenAI','https://api.openai.com/v1','api.openai.com',0],
['Anthropic','https://api.anthropic.com/v1','anthropic.com',0],
['Google Gemini','https://generativelanguage.googleapis.com/v1beta/openai','generativelanguage.googleapis.com',0],
['DeepSeek','https://api.deepseek.com/v1','deepseek.com',0],
['xAI Grok','https://api.x.ai/v1','x.ai',0],
['Moonshot Kimi','https://api.moonshot.ai/v1','moonshot.ai',0],
['Moonshot Kimi (CN)','https://api.moonshot.cn/v1','moonshot.cn',0],
['Z.ai GLM','https://api.z.ai/api/paas/v4','z.ai',0],
['Zhipu BigModel','https://open.bigmodel.cn/api/paas/v4','bigmodel.cn',0],
['Alibaba Qwen','https://dashscope-intl.aliyuncs.com/compatible-mode/v1','aliyuncs.com',0],
['Alibaba Bailian (CN)','https://dashscope.aliyuncs.com/compatible-mode/v1','aliyuncs.com',0],
['Mistral','https://api.mistral.ai/v1','mistral.ai',0],
['Mistral Codestral','https://codestral.mistral.ai/v1','mistral.ai',0],
['Meta Llama API','https://api.llama.com/compat/v1','llama.com',0],
['Perplexity','https://api.perplexity.ai','perplexity.ai',0],
['Cohere','https://api.cohere.ai/compatibility/v1','cohere.ai',0],
['Groq','https://api.groq.com/openai/v1','groq.com',0],
['Cerebras','https://api.cerebras.ai/v1','cerebras.ai',0],
['SambaNova','https://api.sambanova.ai/v1','sambanova.ai',0],
['NVIDIA NIM','https://integrate.api.nvidia.com/v1','nvidia.com',0],
['AI21 Labs','','ai21.com',0],
['IBM watsonx','','ibm.com',0],
['Azure OpenAI','','azure.com',0],
['Amazon Bedrock','','aws.amazon.com',0],
['Google Vertex AI','','cloud.google.com',0],
['Databricks','','databricks.com',0],
['Oracle OCI GenAI','','oracle.com',0],
['Snowflake Cortex','','snowflake.com',0],
['Writer Palmyra','','writer.com',0],
['Reka AI','','reka.ai',0],
['Aleph Alpha','','aleph-alpha.com',0],
['Baidu Qianfan','https://qianfan.baidubce.com/v2','baidubce.com',0],
['Tencent Hunyuan','https://api.hunyuan.cloud.tencent.com/v1','tencent.com',0],
['MiniMax','','minimax.io',0],
['StepFun','https://api.stepfun.com/v1','stepfun.com',0],
['01.AI Yi','https://api.lingyiwanwu.com/v1','lingyiwanwu.com',0],
['Baichuan','https://api.baichuan-ai.com/v1','baichuan-ai.com',0],
['iFlytek Spark','','xfyun.cn',0],
['SenseTime SenseNova','','sensetime.com',0],
['ByteDance Doubao','https://ark.cn-beijing.volces.com/api/v3','volces.com',0],
['Upstage Solar','https://api.upstage.ai/v1/solar','upstage.ai',0],
['Naver HyperCLOVA X','','naver.com',0],
['Kakao KoGPT','','kakao.com',0],
['Yandex GPT','','yandex.cloud',0],
['GigaChat','','sber.ru',0],
['Sarvam AI','https://api.sarvam.ai/v1','sarvam.ai',0],
['Jina AI','https://api.jina.ai/v1','jina.ai',0],
['Voyage AI','https://api.voyageai.com/v1','voyageai.com',0],
['Poolside','','poolside.ai',0],
['Adept','','adept.ai',0],
['Stability AI','','stability.ai',0],
['Inflection AI','','inflection.ai',0],
['Character.AI','','character.ai',0],
['OpenRouter','https://openrouter.ai/api/v1','openrouter.ai',1],
['Together AI','https://api.together.xyz/v1','together.xyz',1],
['Fireworks AI','https://api.fireworks.ai/inference/v1','fireworks.ai',1],
['DeepInfra','https://api.deepinfra.com/v1/openai','deepinfra.com',1],
['Novita AI','https://api.novita.ai/v3/openai','novita.ai',1],
['Hyperbolic','https://api.hyperbolic.xyz/v1','hyperbolic.xyz',1],
['Lambda','https://api.lambdalabs.com/v1','lambdalabs.com',1],
['Anyscale','https://api.endpoints.anyscale.com/v1','anyscale.com',1],
['Lepton AI','','lepton.ai',1],
['Baseten','','baseten.co',1],
['Predibase','','predibase.com',1],
['Kluster.ai','https://api.kluster.ai/v1','kluster.ai',1],
['Featherless AI','https://api.featherless.ai/v1','featherless.ai',1],
['Chutes','https://llm.chutes.ai/v1','chutes.ai',1],
['Nebius AI Studio','https://api.studio.nebius.ai/v1','nebius.com',1],
['Scaleway Generative APIs','https://api.scaleway.ai/v1','scaleway.com',1],
['OVHcloud AI Endpoints','https://oai.endpoints.kepler.ai.cloud.ovh.net/v1','ovhcloud.com',1],
['DigitalOcean Gradient','https://inference.do-ai.run/v1','digitalocean.com',1],
['Cloudflare Workers AI','','cloudflare.com',1],
['Modal','','modal.com',1],
['RunPod','','runpod.io',1],
['Hugging Face','https://router.huggingface.co/v1','huggingface.co',1],
['GitHub Models','https://models.inference.ai.azure.com','github.com',1],
['Vercel AI Gateway','https://ai-gateway.vercel.sh/v1','vercel.com',1],
['Weights & Biases','https://api.inference.wandb.ai/v1','wandb.ai',1],
['Nous Research','https://inference-api.nousresearch.com/v1','nousresearch.com',1],
['AI/ML API','https://api.aimlapi.com/v1','aimlapi.com',1],
['Eden AI','','edenai.co',1],
['Requesty','https://router.requesty.ai/v1','requesty.ai',1],
['Portkey','','portkey.ai',1],
['Venice AI','https://api.venice.ai/api/v1','venice.ai',1],
['Pollinations','https://text.pollinations.ai/openai','pollinations.ai',1],
['SiliconFlow','https://api.siliconflow.cn/v1','siliconflow.cn',1],
['ModelScope','https://api-inference.modelscope.cn/v1','modelscope.cn',1],
['tokenharbor','','tokenharbor.com',1],
['Codecraftapi','','codecraftapi.com',1],
['muse-spark','','muse-spark.ai',1],
['Xiaomi MiMo','','xiaomi.com',1],
['Replicate','','replicate.com',1],
['fal.ai','','fal.ai',1],
['OpenPipe','','openpipe.ai',1],
['Inception Labs','','inceptionlabs.ai',1],
['Arcee AI','','arcee.ai',1],
['Liquid AI','','liquid.ai',1],
['Nomic AI','','nomic.ai',1],
['Redpill','','redpill.ai',1],
['ElectronHub','','electronhub.ai',1],
['Ollama (local)','http://localhost:11434/v1','ollama.com',1],
['LM Studio (local)','http://localhost:1234/v1','lmstudio.ai',1],
['llama.cpp (local)','http://localhost:8080/v1','github.com',1],
['vLLM (local)','http://localhost:8000/v1','vllm.ai',1],
['LocalAI (local)','http://localhost:8080/v1','localai.io',1],
['Jan (local)','http://localhost:1337/v1','jan.ai',1],
['KoboldCpp (local)','http://localhost:5001/v1','github.com',1],
['Text Generation WebUI','http://localhost:5000/v1','github.com',1],
['GPT4All (local)','http://localhost:4891/v1','gpt4all.io',1],
['LiteLLM Proxy (local)','http://localhost:4000/v1','litellm.ai',1],
['Docker Model Runner','http://localhost:12434/engines/v1','docker.com',1],
['AnythingLLM (local)','','anythingllm.com',1],
['Open WebUI (local)','','openwebui.com',1],
['Msty (local)','','msty.app',1]
];
var PROVIDERS=P_RAW.map(function(r,i){
 return {id:'pv'+i+'-'+String(r[0]).toLowerCase().replace(/[^a-z0-9]+/g,''),name:r[0],base:r[1],host:r[2],tp:!!r[3]};
});
var CAPS=[['chat','Chat'],['stream','Streaming'],['vision','Vision (images)'],['tools','Function calling / Tools'],['json','JSON mode'],['reasoning','Reasoning effort'],['embeddings','Embeddings'],['image','Image generation']];

/* ---------------- storage ---------------- */
var LS='flay.plugins.v1';
function plugins(){try{return JSON.parse(localStorage.getItem(LS)||'[]')||[];}catch(e){return [];}}
function savePlugins(v){try{localStorage.setItem(LS,JSON.stringify(v));}catch(e){}}
function pluginRec(id){var a=plugins();for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;}
function providerRec(pr){
 var a=S.settings.providers||[],i;
 for(i=0;i<a.length;i++)if(a[i].cvId===pr.id)return a[i];
 for(i=0;i<a.length;i++)if(a[i].name===pr.name)return a[i];
 return null;
}
function capsOf(rec){var c=[];if(rec.stream)c.push('stream');if(rec.supportsReasoning)c.push('reasoning');if(rec.vision)c.push('vision');if(rec.tools)c.push('tools');if(rec.jsonMode)c.push('json');if(rec.embeddings)c.push('embeddings');if(rec.imageGen)c.push('image');return c;}

/* ---------------- small views ---------------- */
function logo(host,name){
 var L=String(name||'?').charAt(0).toUpperCase();
 return '<span class=\'cv-logo\' data-l=\''+esc(L)+'\'><img loading=\'lazy\' alt=\'\' src=\'https://www.google.com/s2/favicons?domain='+encodeURIComponent(host||'')+'&sz=128\'></span>';
}
var CV_ICON="<svg viewBox='0 0 24 24' fill='none' stroke='url(#fdGrad)' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M9 2v5'/><path d='M15 2v5'/><path d='M6.5 7h11v3.5a5.5 5.5 0 0 1-11 0z'/><path d='M12 16v6'/></svg>";

/* ---------------- screen ---------------- */
var screen=document.createElement('section');
screen.className='screen';
screen.id='screen-connector';
screen.innerHTML=
 '<header class=\'topbar\'>'
+'<button class=\'ibtn\' id=\'cvMenu\' data-menu aria-label=\'Menu\'><svg class=\'ic\'><use href=\'#i-menu\'/></svg></button>'
+'<div class=\'tb-title cv-title\'>Connector</div>'
+'<button class=\'ibtn\' id=\'cvCustom\' aria-label=\'Custom provider\'><svg class=\'ic\'><use href=\'#i-plus\'/></svg></button>'
+'</header>'
+'<nav class=\'tabs\' id=\'cvTabs\'>'
+'<button data-ctab=\'plugin\' class=\'on\'><svg class=\'ic xs\'><use href=\'#i-tools\'/></svg><span>Plugin</span></button>'
+'<button data-ctab=\'provider\'><svg class=\'ic xs\'><use href=\'#i-cloud\'/></svg><span>Provider</span></button>'
+'</nav>'
+'<div class=\'pane on\' id=\'cvPanePlugin\'><div class=\'scrollpane\'><div class=\'pwrap\'><div class=\'cv-grid\' id=\'cvPluginList\'></div></div></div></div>'
+'<div class=\'pane\' id=\'cvPaneProvider\'>'
+'<div class=\'cv-searchwrap\'><div class=\'cv-searchbox\'><span class=\'cv-sic\'><svg class=\'ic sm\'><use href=\'#i-search\'/></svg></span><input class=\'inp\' id=\'cvSearch\' placeholder=\'Search providers\' autocomplete=\'off\'></div>'
+'<div class=\'cv-filters\' id=\'cvFilters\'><button class=\'mopt on\' data-flt=\'all\'>All</button><button class=\'mopt\' data-flt=\'official\'>Official</button><button class=\'mopt\' data-flt=\'tp\'>Third-party</button></div></div>'
+'<div class=\'scrollpane\'><div class=\'pwrap\'><div class=\'cv-grid\' id=\'cvProvList\'></div></div></div>'
+'</div>';
document.body.appendChild(screen);

/* ---------------- style ---------------- */
var st=document.createElement('style');
st.id='synora-connector-style';
st.textContent=[
'#screen-connector .cv-title{text-align:center;letter-spacing:-.01em}',
'.cv-searchwrap{flex:none;display:flex;flex-direction:column;gap:10px;padding:10px 14px 2px}',
'.cv-searchbox{position:relative;display:flex;align-items:center}',
'.cv-searchbox .inp{padding-left:42px}',
'.cv-sic{position:absolute;left:14px;color:var(--text2);display:flex;pointer-events:none;z-index:1}',
'.cv-filters{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}',
'.cv-filters::-webkit-scrollbar{display:none}',
'.cv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}',
'.cv-card{position:relative;display:grid;grid-template-columns:52px minmax(0,1fr) 40px;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;border:1.5px solid transparent;background:linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(135deg,rgba(255,27,122,.5),rgba(59,130,246,.5)) border-box;box-shadow:0 0 16px rgba(255,27,122,.12)}',
'.cv-card.connected{background:linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(135deg,rgba(16,185,129,.6),rgba(59,130,246,.5)) border-box}',
'.cv-tp{grid-column:1/-1;margin:-2px 0 2px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#FBBF24}',
'.cv-logo{position:relative;width:52px;height:52px;border-radius:15px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:none;box-shadow:0 0 0 1px rgba(255,255,255,.12)}',
'.cv-logo img{width:32px;height:32px;object-fit:contain;display:block}',
'.cv-logo.nl::after{content:attr(data-l);font-weight:800;font-size:20px;color:#334155}',
'.cv-ph .cv-logo{width:58px;height:58px;border-radius:18px}',
'.cv-ph .cv-logo img{width:36px;height:36px}',
'.cv-meta{min-width:0;display:flex;flex-direction:column;gap:2px}',
'.cv-meta b{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.cv-meta span{font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.cv-add{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:none;color:#fff;background:var(--accent-gradient);box-shadow:0 4px 16px rgba(255,27,122,.4);transition:transform .12s}',
'.cv-add.ok{background:linear-gradient(135deg,#10B981,#059669);box-shadow:0 4px 16px rgba(16,185,129,.35)}',
'.cv-add:active{transform:scale(.93)}',
'#cvSheet .cv-panel{position:absolute;left:0;right:0;bottom:0;max-height:88vh;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;background:#090A12;border-top:1px solid var(--border);border-radius:26px 26px 0 0;padding:8px 16px calc(24px + env(safe-area-inset-bottom));animation:cvUp .26s cubic-bezier(.2,.8,.2,1)}',
'@keyframes cvUp{from{transform:translateY(100%)}}',
'.cv-grip{width:44px;height:5px;border-radius:3px;background:rgba(255,255,255,.2);margin:6px auto 14px}',
'.cv-ph{display:flex;align-items:center;gap:12px;margin-bottom:16px}',
'.cv-phinfo{flex:1;min-width:0}',
'.cv-phinfo b{display:block;font-size:17px;font-weight:800}',
'.cv-phinfo span{display:block;margin-top:3px;font-size:12.5px;line-height:1.45;color:var(--text2)}',
'.cv-caps{display:flex;flex-wrap:wrap;gap:8px}',
'.cv-cap{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:9999px;padding:8px 14px;font-size:12.5px;font-weight:600;background:var(--surface);color:var(--text2)}',
'.cv-cap.on{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}',
'.cv-capadd{display:flex;gap:8px;margin-top:10px;align-items:center}',
'.cv-capadd .inp{flex:1}',
'.cv-step{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px;color:var(--text2);min-height:18px}',
'[data-theme=light] #cvSheet .cv-panel{background:#fff}',
'[data-theme=light] .cv-logo{box-shadow:0 0 0 1px rgba(15,23,42,.12)}'
].join('\n');
document.head.appendChild(st);

/* ---------------- sheet ---------------- */
var sheet=document.createElement('div');
sheet.className='overlay';
sheet.id='cvSheet';
sheet.innerHTML="<div class='scrim2'></div><div class='cv-panel' id='cvPanel'></div>";
document.body.appendChild(sheet);
function closeSheet(){sheet.classList.remove('show');one('cvPanel').innerHTML='';}
function openSheet(html){one('cvPanel').innerHTML=html;sheet.classList.add('show');}
sheet.addEventListener('click',function(e){if(e.target.classList&&e.target.classList.contains('scrim2'))closeSheet();});
document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;if(sheet.classList.contains('show')){e.stopImmediatePropagation();e.preventDefault();closeSheet();}},true);

/* ---------------- render lists ---------------- */
var cvFilter='all';
function renderPlugins(){
 var h='';
 PLUGINS.forEach(function(pl){
  var rec=pluginRec(pl.id);
  h+="<div class='cv-card"+(rec?' connected':'')+"' data-plug='"+pl.id+"'>"
   +logo(pl.host,pl.name)
   +"<div class='cv-meta'><b>"+esc(pl.name)+"</b><span>"+(rec?'Connected'+(rec.account?' \u00b7 '+esc(rec.account):''):esc(pl.desc))+"</span></div>"
   +"<button class='cv-add"+(rec?' ok':'')+"' data-plugin='"+pl.id+"' aria-label='Connect "+esc(pl.name)+"'>"+icon(rec?'check':'plus')+"</button>"
   +'</div>';
 });
 var host=one('cvPluginList');host.innerHTML=h;bindLogos(host);
}
function renderProviderList(){
 var q=(one('cvSearch').value||'').trim().toLowerCase(),h='';
 PROVIDERS.forEach(function(pr){
  if(cvFilter==='official'&&pr.tp)return;
  if(cvFilter==='tp'&&!pr.tp)return;
  if(q&&pr.name.toLowerCase().indexOf(q)<0&&pr.host.toLowerCase().indexOf(q)<0)return;
  var rec=providerRec(pr),on=!!(rec&&rec.apiKey&&rec.lastTest);
  var sub=on?('Connected \u00b7 '+esc(rec.model||'no model')):(pr.base?(pr.tp?'Aggregator / local gateway':'Official API endpoint'):'No preset endpoint');
  h+="<div class='cv-card"+(on?' connected':'')+"' data-pv='"+pr.id+"'>"
   +(pr.tp?"<span class='cv-tp'>Third-party</span>":'')
   +logo(pr.host,pr.name)
   +"<div class='cv-meta'><b>"+esc(pr.name)+"</b><span>"+sub+"</span></div>"
   +"<button class='cv-add"+(on?' ok':'')+"' data-padd='"+pr.id+"' aria-label='Connect "+esc(pr.name)+"'>"+icon(on?'check':'plus')+"</button>"
   +'</div>';
 });
 var host=one('cvProvList');
 host.innerHTML=h||("<div class='note'>"+icon('info','sm')+'<span>No provider matches this search.</span></div>');
 bindLogos(host);
}

/* ---------------- tabs ---------------- */
function setCTab(t){
 qa('#cvTabs button').forEach(function(b){b.classList.toggle('on',b.dataset.ctab===t);});
 one('cvPanePlugin').classList.toggle('on',t==='plugin');
 one('cvPaneProvider').classList.toggle('on',t==='provider');
 one('cvCustom').style.visibility=t==='provider'?'visible':'hidden';
}
function openConnector(){
 renderPlugins();renderProviderList();setCTab('plugin');
 try{openScreen('screen-connector');}catch(e){console.error(e);}
}

/* ---------------- plugin sheet ---------------- */
function plugErr(msg){var e=one('cvPlErr');if(!e)return;e.textContent=msg;e.classList.remove('hidden');}
function openPluginSheet(pl){
 var rec=pluginRec(pl.id),html="<div class='cv-grip'></div><div class='cv-ph'>"+logo(pl.host,pl.name)+"<div class='cv-phinfo'><b>"+esc(pl.name)+"</b><span>"+esc(pl.desc)+"</span></div></div>";
 if(rec){
  html+="<div class='note' style='border-color:rgba(16,185,129,.5)'>"+icon('ok','sm')+'<span>Connected'+(rec.account?' as '+esc(rec.account):'')+'.</span></div>';
  html+="<button class='btn danger big' style='margin-top:12px' id='cvPlOff'>Disconnect</button>";
 }else{
  html+="<div class='field'><label>"+esc(pl.label)+"</label><div class='keybox'><input class='inp' id='cvPlTok' type='password' placeholder='"+esc(pl.hint)+"' autocomplete='off'><button class='ibtn' id='cvPlEye' aria-label='Show token'>"+icon('eye')+'</button></div></div>';
  html+="<div class='err-t hidden' id='cvPlErr'></div><div class='cv-step' id='cvPlStep'></div>";
  html+="<button class='btn primary big' id='cvPlConnect' style='margin-top:12px'>Connect "+esc(pl.name)+'</button>';
 }
 openSheet(html);
 if(rec){
  one('cvPlOff').onclick=function(){
   savePlugins(plugins().filter(function(x){return x.id!==pl.id;}));
   renderPlugins();closeSheet();toast(pl.name+' disconnected.','warn');
  };
  return;
 }
 one('cvPlEye').onclick=function(){var k=one('cvPlTok'),on=k.type==='password';k.type=on?'text':'password';this.innerHTML=icon(on?'x':'eye');};
 one('cvPlConnect').onclick=function(){
  var btn=this,tok=(one('cvPlTok').value||'').trim();
  if(!tok){plugErr('Enter a token first.');return;}
  btn.disabled=true;var step=one('cvPlStep');
  step.innerHTML='<span class=\'spin\'></span><span>Checking the token\u2026</span>';
  fetch(pl.api,{headers:{Authorization:'Bearer '+tok,Accept:'application/json'},signal:withTimeout(15000)})
  .then(function(r){if(!r.ok)throw new Error(describeHttp(r.status,''));return r.json();})
  .then(function(j){
   var acc=j.login||j.username||j.name||'';
   var all=plugins().filter(function(x){return x.id!==pl.id;});
   all.push({id:pl.id,token:tok,account:acc,at:Date.now()});savePlugins(all);
   step.innerHTML=icon('check','sm st-done')+'<span>Connected'+(acc?' as '+esc(acc):'')+'.</span>';
   renderPlugins();toast(pl.name+' connected.','ok');
   setTimeout(closeSheet,700);
  })
  .catch(function(e){btn.disabled=false;step.innerHTML='';plugErr('Could not connect: '+String(e.message||e));});
 };
}

/* ---------------- provider sheet ---------------- */
function pvErr(msg){var e=one('cvErr');e.textContent=msg;e.classList.remove('hidden');}
function openProviderSheet(pr){
 var rec=providerRec(pr)||{};
 var base=pr.base||rec.baseUrl||'';
 var caps=rec.cvCaps?rec.cvCaps.slice():capsOf(rec);
 var custom=rec.capsCustom?rec.capsCustom.slice():[];
 var chips='';
 CAPS.forEach(function(c){chips+="<button type='button' class='cv-cap"+(caps.indexOf(c[0])>=0?' on':'')+"' data-cap='"+c[0]+"'>"+esc(c[1])+'</button>';});
 custom.forEach(function(c){chips+="<button type='button' class='cv-cap on' data-cap='"+esc(c)+"'>"+esc(c)+'</button>';});
 var html="<div class='cv-grip'></div><div class='cv-ph'>"+logo(pr.host,pr.name)
  +"<div class='cv-phinfo'><b>"+esc(pr.name)+"</b><span>"+esc(pr.tp?'Third-party / local gateway':'Official API')+(base?' \u00b7 Base URL preset and hidden':' \u00b7 No preset Base URL')+'</span></div></div>';
 if(!base){
  html+="<div class='note'>"+icon('info','sm')+'<span>This provider has no preset endpoint. Add it once from <b>Set Up AI</b> and it will work here too.</span></div>';
  html+="<button class='btn sm' id='cvGoCustom' style='margin:4px 0 14px'>Open Set Up AI</button>";
 }
 html+="<div class='field'><label>API key</label><div class='keybox'><input class='inp' id='cvKey' type='password' placeholder='sk-...' autocomplete='off' value='"+esc(rec.apiKey||'')+"'><button class='ibtn' id='cvEye' aria-label='Show key'>"+icon('eye')+'</button></div></div>';
 html+="<div class='field'><label>Model ID</label><div class='keybox'><input class='inp' id='cvModel' list='cvModels' placeholder='e.g. gpt-4o-mini' autocomplete='off' value='"+esc(rec.model||'')+"'><button class='btn sm' id='cvFetch'>Fetch</button></div><datalist id='cvModels'></datalist><div class='err-t hidden' id='cvFetchErr'></div></div>";
 html+="<div class='field'><label>Max tokens</label><input class='inp' id='cvMax' type='number' min='16' max='200000' value='"+(rec.maxTokens||4096)+"'></div>";
 html+="<div class='field'><label>Capabilities</label><div class='cv-caps' id='cvCaps'>"+chips+"</div><div class='cv-capadd'><input class='inp' id='cvCapNew' placeholder='Add a capability' autocomplete='off'><button class='btn sm' id='cvCapAdd'>Add</button></div></div>";
 html+="<div class='err-t hidden' id='cvErr'></div><div class='cv-step' id='cvStep'></div>";
 html+="<button class='btn primary big' id='cvSave' style='margin-top:14px'>Save &amp; Test</button>";
 if(rec.apiKey)html+="<button class='btn danger big' id='cvOff' style='margin-top:10px'>Disconnect</button>";
 openSheet(html);
 bindLogos(one('cvPanel'));
 if(rec.models&&rec.models.length)one('cvModels').innerHTML=rec.models.map(function(m){return "<option value='"+esc(m)+"'></option>";}).join('');

 one('cvEye').onclick=function(){var k=one('cvKey'),on=k.type==='password';k.type=on?'text':'password';this.innerHTML=icon(on?'x':'eye');};
 one('cvCaps').addEventListener('click',function(e){var b=e.target.closest('.cv-cap');if(b)b.classList.toggle('on');});
 one('cvCapAdd').onclick=function(){
  var i=one('cvCapNew'),v=(i.value||'').trim();if(!v)return;
  if(!qa('.cv-cap',one('cvCaps')).some(function(c){return c.dataset.cap===v;})){
   var b=document.createElement('button');b.type='button';b.className='cv-cap on';b.dataset.cap=v;b.textContent=v;one('cvCaps').appendChild(b);
  }
  i.value='';
 };
 var go=one('cvGoCustom');
 if(go)go.onclick=function(){closeSheet();try{renderProviders();openScreen('screen-providers');}catch(e){}};
 var off=one('cvOff');
 if(off)off.onclick=function(){
  var ex=providerRec(pr);if(!ex)return closeSheet();
  S.settings.providers=(S.settings.providers||[]).filter(function(x){return x!==ex;});
  if(S.settings.selectedProviderId===ex.id)S.settings.selectedProviderId=null;
  try{saveSettings();updateChips();renderChat();renderProviders();}catch(e){}
  renderProviderList();closeSheet();toast(pr.name+' disconnected.','warn');
 };
 one('cvFetch').onclick=function(){
  var btn=this,err=one('cvFetchErr'),key=(one('cvKey').value||'').trim(),u=base;
  err.classList.add('hidden');
  if(!u){err.textContent='No Base URL for this provider.';err.classList.remove('hidden');return;}
  btn.disabled=true;btn.textContent='Fetching...';
  fetchModels({baseUrl:u,apiKey:key}).then(function(list){
   btn.disabled=false;btn.textContent='Fetch';
   one('cvModels').innerHTML=list.map(function(m){return "<option value='"+esc(m)+"'></option>";}).join('');
   err.textContent=list.length+' models found \u2014 pick one from the list.';err.classList.remove('hidden');
  }).catch(function(e){btn.disabled=false;btn.textContent='Fetch';err.textContent='Model discovery failed: '+String(e.message||e);err.classList.remove('hidden');});
 };
 one('cvSave').onclick=function(){
  var btn=this,step=one('cvStep');
  var key=(one('cvKey').value||'').trim();
  var model=(one('cvModel').value||'').trim();
  var max=parseInt(one('cvMax').value,10);
  one('cvErr').classList.add('hidden');
  if(!base){pvErr('This provider has no preset Base URL. Add it from Set Up AI first.');return;}
  if(!key){pvErr('API key is required.');return;}
  if(!model){pvErr('Model ID is required.');return;}
  if(!max||max<16){pvErr('Max tokens must be a number of 16 or more.');return;}
  var sel=qa('.cv-cap.on',one('cvCaps')).map(function(c){return c.dataset.cap;});
  var customCaps=sel.filter(function(c){return c!==null&&CAPS.every(function(x){return x[0]!==c;});});
  var data={name:pr.name,baseUrl:base,apiKey:key,model:model,models:rec.models||undefined,
   temperature:(rec.temperature!=null?rec.temperature:0.7),maxTokens:max,
   stream:sel.indexOf('stream')>=0,supportsReasoning:sel.indexOf('reasoning')>=0,vision:sel.indexOf('vision')>=0,
   tools:sel.indexOf('tools')>=0,jsonMode:sel.indexOf('json')>=0,embeddings:sel.indexOf('embeddings')>=0,imageGen:sel.indexOf('image')>=0,
   cvCaps:sel,capsCustom:customCaps,cvId:pr.id,lastTest:true,testedAt:Date.now()};
  btn.disabled=true;
  step.innerHTML='<span class=\'spin\'></span><span>Testing '+esc(pr.name)+' / '+esc(model)+'\u2026</span>';
  fetch(chatUrl(base),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
   body:JSON.stringify({model:model,messages:[{role:'user',content:'Reply with exactly: OK'}],max_tokens:16,stream:false}),signal:withTimeout(25000)})
  .then(function(r){if(!r.ok)return r.text().then(function(t){throw new Error(describeHttp(r.status,t));});return r.json();})
  .then(function(j){
   var c=((j.choices&&j.choices[0]&&j.choices[0].message)||{}).content;
   if(c===undefined)throw new Error('Provider replied, but not with a chat completion. Check the API format.');
   var ex=providerRec(pr);
   if(ex)Object.assign(ex,data);else{S.settings.providers=S.settings.providers||[];S.settings.providers.push(Object.assign({id:uid()},data));}
   var saved=providerRec(pr);
   if(saved)S.settings.selectedProviderId=saved.id;
   try{saveSettings();updateChips();renderChat();renderProviders();}catch(e){}
   step.innerHTML=icon('check','sm st-done')+'<span>Connected \u2014 model replied \u201c'+esc(String(c).trim().slice(0,40))+'\u201d.</span>';
   renderProviderList();toast(pr.name+' connected and saved.','ok');
   setTimeout(closeSheet,800);
  })
  .catch(function(e){btn.disabled=false;step.innerHTML='';pvErr('Connection failed: '+String(e.message||e));});
 };
}

/* ---------------- events ---------------- */
one('cvTabs').addEventListener('click',function(e){var b=e.target.closest('button[data-ctab]');if(b)setCTab(b.dataset.ctab);});
one('cvMenu').onclick=function(){try{openDrawer();}catch(e){}};
one('cvCustom').onclick=function(){closeSheet();try{renderProviders();openScreen('screen-providers');}catch(e){}};
one('cvSearch').addEventListener('input',renderProviderList);
one('cvFilters').addEventListener('click',function(e){
 var b=e.target.closest('button[data-flt]');if(!b)return;
 cvFilter=b.dataset.flt;
 qa('#cvFilters button').forEach(function(x){x.classList.toggle('on',x===b);});
 renderProviderList();
});
function bindPluginList(){var host=one('cvPluginList');host.addEventListener('click',function(e){
 var b=e.target.closest('[data-plugin]');if(!b)return;
 var pl=PLUGINS.filter(function(x){return x.id===b.dataset.plugin;})[0];if(pl)openPluginSheet(pl);
});}
function bindProviderList(){var host=one('cvProvList');host.addEventListener('click',function(e){
 var b=e.target.closest('[data-padd]');if(!b)return;
 var pr=PROVIDERS.filter(function(x){return x.id===b.dataset.padd;})[0];if(pr)openProviderSheet(pr);
});}
bindPluginList();bindProviderList();

/* ---------------- menu entry ---------------- */
(function(){
 var nav=document.querySelector("#drawer .fd-item[data-nav='providers']");
 if(!nav)return;
 var lab=nav.querySelector('.fd-label');if(lab)lab.textContent='Connector';
 var ico=nav.querySelector('.fd-ico');if(ico)ico.innerHTML=CV_ICON;
 nav.onclick=function(){try{closeDrawer();}catch(e){}openConnector();};
})();
})();
