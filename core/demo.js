/* Demo para mostrar el producto desde el celular (UC-020): barra de ejemplos, Funciones, pedido como chat
   de ejemplo (AC-002-5) y "Tu cliente", un catálogo que se arma en el momento con fotos del celular (AC-020-2).
   Solo existe en la base y el catálogo la carga solo con demo=1 (AC-020-1): un comprador nunca la descarga. */
import { esc } from './datos.js';

const $=id=>document.getElementById(id);
// Ejemplos reales (Pueyrredón y PLED) y dos comercios inventados de otros rubros, para no parecer atados a uno solo.
export const EJEMPLOS=[['pueyrredon','Mayorista'],['pled','Minorista'],['ropa','Ropa'],['dietetica','Dietética'],['propia','Tu cliente']];
const SW=['#06518b','#111c2e','#0f766e','#b91c1c','#7c3aed','#c2410c','#1f2937','#be185d'];

const BARRA=`<div class="demobar" id="demobar">
  <span class="demo-tag">Demo</span>
  <div class="demo-ex" id="demoEx" role="tablist" aria-label="Ejemplos"></div>
  <button class="demo-fx" id="demoFx" type="button" aria-label="Funciones"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg><span class="fx-l">Funciones</span></button>
</div>`;
const HOJAS=`
<section class="sheet chat" id="shChat" aria-label="Así le llega al negocio" hidden>
  <div class="sh-head"><h2>Así le llega al negocio</h2><button class="x" data-close type="button" aria-label="Cerrar">✕</button></div>
  <div class="ch-top"><div class="ch-av" id="chAv"></div><div><b id="chName"></b><small>WhatsApp del negocio</small></div></div>
  <div class="ch-body"><div class="bub" id="bub"></div></div>
  <p class="ch-note">En la versión real se abre WhatsApp con este mensaje listo para enviar.</p>
</section>

<section class="sheet" id="shFx" aria-label="Funciones" hidden>
  <div class="sh-head"><h2>Mostrá cómo funciona</h2><button class="x" data-close type="button" aria-label="Cerrar">✕</button></div>
  <div class="sh-body fx">
    <button class="fx-row" id="fxOrder" type="button"><i>1</i><span><b>Ver un pedido de ejemplo</b><small>Suma productos y muestra cómo le llega el pedido al negocio</small></span></button>
    <div class="fx-row as-lbl"><i>2</i><span><b>Mostrar u ocultar precios</b><small id="fxPriceHint">Cada negocio elige si los muestra</small></span><button class="sw" id="fxPrice" role="switch" aria-checked="false" type="button"><span></span></button></div>
    <div class="fx-row as-lbl col"><span class="lbl-sm">Color de la marca</span><div class="sws" id="sws"></div></div>
    <button class="fx-row" id="fxEdit" type="button" hidden><i>3</i><span><b>Editar este negocio</b><small>Nombre, color, logo y productos</small></span></button>
  </div>
</section>

<section class="sheet tall" id="shEdit" aria-label="Armá el catálogo" hidden>
  <div class="sh-head"><h2>Armá el catálogo de tu cliente</h2><button class="x" data-close type="button" aria-label="Cerrar">✕</button></div>
  <div class="sh-body">
    <label class="fld"><span>Nombre del negocio</span><input id="eName" maxlength="40" placeholder="Ej.: Ferretería El Tornillo"></label>
    <label class="fld"><span>Rubro o frase corta</span><input id="eSub" maxlength="60" placeholder="Ej.: Herramientas y bulonería"></label>
    <div class="fld"><span>Logo <i>(opcional)</i></span><label class="up"><input id="eLogo" type="file" accept="image/*" class="vh"><span id="eLogoLbl">Elegir foto del logo</span></label></div>
    <div class="fld"><span>Productos</span>
      <div class="eprods" id="eProds"></div>
      <label class="up add"><input id="eAdd" type="file" accept="image/*" class="vh">+ Sacar o elegir foto de un producto</label>
    </div>
    <button class="b b-brand b-big" id="eDone" type="button">Ver su catálogo</button>
    <button class="b b-ghost" id="eReset" type="button">Empezar de cero</button>
  </div>
</section>`;

/* ---------- Tu cliente: queda guardado solo en este celular ---------- */
const PROPIA_BASE={id:'propia',nombre:'',bajada:'',tipo:'Minorista',logo:'',color:'#0f766e',precios:true,productos:[]};
// Lo armado con la clave anterior se pasa una vez a la nueva.
const PROPIA='catalogo_propia',PROPIA_ANTERIOR='mostrador_propia';

// app: lo que el catálogo comparte con la demo (core/catalogo.js).
export function iniciarDemo(app){
  const {ls,toast,open,close,theme,render,grid,cartUI,lines,logoHTML}=app;
  document.body.insertAdjacentHTML('afterbegin',BARRA);
  $('toast').insertAdjacentHTML('beforebegin',HOJAS);
  document.body.classList.add('has-demo');

  function leerPropia(){
    const s=ls.get(PROPIA,null);if(s)return s;
    const v=ls.get(PROPIA_ANTERIOR,null);
    if(v&&ls.set(PROPIA,v))try{localStorage.removeItem(PROPIA_ANTERIOR)}catch(e){}
    return v;
  }
  const tiendaPropia=()=>Object.assign({},PROPIA_BASE,leerPropia()||{});

  // AC-002-5: en la demo el pedido se muestra como chat de ejemplo y no abre WhatsApp.
  function chat(msg){
    const T=app.T;
    $('chAv').innerHTML=logoHTML('av');$('chName').textContent=T.nombre||'Tu negocio';
    const h=new Date();$('bub').innerHTML=esc(msg).replace(/\n/g,'<br>')+`<small>${String(h.getHours()).padStart(2,'0')}:${String(h.getMinutes()).padStart(2,'0')}</small>`;
    open('shChat');
  }

  function alRenderizar(){
    const T=app.T;
    $('demoEx').innerHTML=EJEMPLOS.map(([id,l])=>`<button type="button" role="tab" aria-selected="${T.id===id}" data-t="${id}">${l}</button>`).join('');
    // Con cinco ejemplos la barra no entra a 375 px: el elegido queda siempre a la vista.
    $('demoEx').querySelector('[aria-selected="true"]')?.scrollIntoView({inline:'center',block:'nearest'});
    const has=T.productos.some(p=>p.p!=null&&p.p!=='');
    $('fxPrice').setAttribute('aria-checked',app.precios);$('fxPrice').disabled=!has&&T.id!=='propia';
    $('fxPriceHint').textContent=has||T.id==='propia'?'Cada negocio elige si los muestra':'Este ejemplo es mayorista: muestra el catálogo y el cliente consulta';
    $('sws').innerHTML=[T.colorOrig,...SW.filter(c=>c!==T.colorOrig)].slice(0,8).map(c=>`<button type="button" style="--c:${c}" aria-label="Color ${c}" aria-pressed="${c===T.color}" data-c="${c}"></button>`).join('');
    $('fxEdit').hidden=T.id!=='propia';
  }
  // Texto de la grilla vacía en "Tu cliente".
  const vacio=()=>app.T.id==='propia'?'<b>Todavía no hay productos.</b><br>Sacales una foto a 3 o 4 productos del cliente y armá su catálogo en un minuto.<br><button class="b b-brand" type="button" id="eStart">Armar catálogo</button>':'';
  document.addEventListener('click',e=>{if(e.target.closest('#eStart'))openEdit()});

  $('demoEx').onclick=e=>{const b=e.target.closest('button');if(!b)return;const u=new URL(location.href);u.searchParams.set('t',b.dataset.t);
    history.replaceState(null,'',u);app.load(b.dataset.t).then(()=>{if(b.dataset.t==='propia'&&!app.T.productos.length)openEdit()})};
  $('demoFx').onclick=()=>open('shFx');
  $('fxPrice').onclick=()=>{app.precios=!app.precios;render();$('fxPrice').setAttribute('aria-checked',app.precios);toast(app.precios?'Precios visibles':'Precios ocultos: el cliente consulta por WhatsApp')};
  $('sws').onclick=e=>{const b=e.target.closest('button');if(!b)return;app.T.color=b.dataset.c;theme(app.T.color);alRenderizar();if(app.T.id==='propia')saveP()};
  $('fxOrder').onclick=()=>{close();if(location.hash){location.hash=''}
    const cart=app.cart;
    if(!Object.keys(cart).length)app.T.productos.slice(0,3).forEach((p,i)=>cart[p.id]=i?1:2);grid();cartUI();
    if(!Object.keys(cart).length){toast('Primero cargá algún producto');return}
    setTimeout(()=>{lines();open('shCart')},150)};
  $('fxEdit').onclick=()=>openEdit();

  /* ---------- Armar el negocio del cliente ---------- */
  function saveP(){const {colorOrig,...s}=app.T;if(!ls.set(PROPIA,s))toast('No hay más lugar en este celular: quitá algún producto')}
  function shrink(file,max){return new Promise((ok,ko)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
    c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',.8))};im.onerror=ko;im.src=u})}
  function openEdit(){$('eName').value=app.T.nombre||'';$('eSub').value=app.T.bajada||'';eProds();open('shEdit')}
  function eProds(){
    $('eProds').innerHTML=app.T.productos.map((p,i)=>`<div class="ep" data-i="${i}"><img src="${esc(p.img)}" alt=""><div><input data-f="n" value="${esc(p.n)}" placeholder="Nombre del producto" maxlength="50"><input data-f="p" value="${p.p??''}" inputmode="numeric" placeholder="Precio (opcional)"></div><button type="button" class="x" aria-label="Quitar">✕</button></div>`).join('');
    $('eLogoLbl').textContent=app.T.logo?'Cambiar logo':'Elegir foto del logo';
  }
  $('eProds').oninput=e=>{const i=+e.target.closest('.ep').dataset.i,f=e.target.dataset.f,v=e.target.value,P=app.T.productos;
    if(f==='p'){const n=parseInt(v.replace(/\D/g,''),10);P[i].p=isNaN(n)?null:n}else P[i].n=v;saveP()};
  $('eProds').onclick=e=>{if(!e.target.closest('.x'))return;app.T.productos.splice(+e.target.closest('.ep').dataset.i,1);saveP();eProds()};
  $('eAdd').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
    try{const img=await shrink(f,520);app.T.productos.push({id:'p'+Date.now(),n:'',img,p:null});saveP();eProds();
      const last=$('eProds').lastElementChild;last&&last.querySelector('input').focus()}catch(err){toast('No se pudo abrir esa foto')}};
  $('eLogo').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{app.T.logo=await shrink(f,300);app.T.logoCuadrado=true;saveP();eProds();render()}catch(err){toast('No se pudo abrir esa foto')}};
  $('eName').oninput=()=>{app.T.nombre=$('eName').value;saveP()};$('eSub').oninput=()=>{app.T.bajada=$('eSub').value;saveP()};
  $('eDone').onclick=()=>{const T=app.T;T.productos.forEach((p,i)=>{if(!p.n)p.n='Producto '+(i+1)});app.precios=T.productos.some(p=>p.p);T.precios=app.precios;saveP();close();render()};
  $('eReset').onclick=()=>{try{localStorage.removeItem(PROPIA)}catch(e){}app.T=Object.assign({},PROPIA_BASE,{colorOrig:PROPIA_BASE.color,productos:[]});theme(app.T.color);render();openEdit()};

  return {ids:EJEMPLOS.map(([id])=>id),tiendaPropia,chat,alRenderizar,vacio,
    alAbrir(){if(app.T.id==='propia'&&!app.T.productos.length)openEdit()}};
}
