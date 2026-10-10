export function mobileControls(callbacks:{look:(x:number,y:number)=>void;reload:()=>void;pause:()=>void;weapon:()=>void}){
 const enabled=matchMedia('(pointer:coarse)').matches;
 const state={enabled,x:0,z:0,fire:false,aim:false,fly:false,firePressed:false,jumpPressed:false};
 document.body.classList.toggle('touch-mode',enabled);
 const panel=document.createElement('div');panel.id='touch-controls';panel.className='hidden';
 panel.innerHTML=`<div id="touch-look" aria-label="Arraste para olhar"></div><div id="joystick" aria-label="Arraste para mover"><i></i></div><div class="touch-top"><button data-tap="pause">PAUSA</button></div><div class="touch-actions"><button data-toggle="aim" aria-pressed="false">MIRA</button><button data-hold="fire" class="touch-fire">ATIRAR<br>↔ ARRASTE</button><button data-tap="weapon" aria-label="Alternar arma">ARMA</button><button data-hold="fly" aria-label="Segure para pular ou voar">PULAR / JET</button><button data-tap="reload">RECARREGAR</button></div>`;
 document.body.append(panel);
 let moveId:number|null=null,lookId:number|null=null,lastX=0,lastY=0;
 const pointers=new Map<number,HTMLElement>();
 panel.addEventListener('pointerdown',e=>pointers.set(e.pointerId,(e.target as HTMLElement).closest<HTMLElement>('button,#joystick,#touch-look')??e.target as HTMLElement));
 panel.addEventListener('pointerup',e=>pointers.delete(e.pointerId));
 panel.addEventListener('pointercancel',e=>pointers.delete(e.pointerId));
 const joystick=panel.querySelector<HTMLElement>('#joystick')!,thumb=joystick.querySelector<HTMLElement>('i')!;
 function move(e:PointerEvent){const r=joystick.getBoundingClientRect(),radius=r.width*.35;let x=(e.clientX-r.left-r.width/2)/radius,z=(e.clientY-r.top-r.height/2)/radius;const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}state.x=Math.abs(x)<.08?0:x;state.z=Math.abs(z)<.08?0:z;thumb.style.transform=`translate(${x*radius}px,${z*radius}px)`;}
 joystick.addEventListener('pointerdown',e=>{if(moveId!==null)return;e.preventDefault();moveId=e.pointerId;joystick.setPointerCapture(e.pointerId);move(e);});
 joystick.addEventListener('pointermove',e=>{if(e.pointerId===moveId)move(e);});
 const stopMove=(e:PointerEvent)=>{if(e.pointerId===moveId){moveId=null;state.x=state.z=0;thumb.style.transform='';}};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,stopMove as EventListener);
 const look=panel.querySelector<HTMLElement>('#touch-look')!;
 look.addEventListener('pointerdown',e=>{if(lookId!==null)return;e.preventDefault();lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;look.setPointerCapture(e.pointerId);});
 look.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;callbacks.look(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY;});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])look.addEventListener(type,e=>{if((e as PointerEvent).pointerId===lookId)lookId=null;});
 panel.querySelectorAll<HTMLButtonElement>('[data-hold]').forEach(button=>{
  const key=button.dataset.hold as 'fire'|'fly';let id:number|null=null,x=0,y=0;
  button.addEventListener('pointerdown',e=>{if(id!==null)return;e.preventDefault();id=e.pointerId;x=e.clientX;y=e.clientY;button.setPointerCapture(id);state[key]=true;if(key==='fire')state.firePressed=true;else state.jumpPressed=true;button.classList.add('pressed');});
  button.addEventListener('pointermove',e=>{if(key==='fire'&&e.pointerId===id){callbacks.look(e.clientX-x,e.clientY-y);x=e.clientX;y=e.clientY;}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>{if((e as PointerEvent).pointerId===id){id=null;state[key]=false;button.classList.remove('pressed');}});
 });
 const aim=panel.querySelector<HTMLButtonElement>('[data-toggle="aim"]')!;
 const toggleAim=()=>{state.aim=!state.aim;aim.classList.toggle('pressed',state.aim);aim.setAttribute('aria-pressed',String(state.aim));};
 aim.addEventListener('pointerdown',e=>{e.preventDefault();toggleAim();});
 aim.onclick=e=>{if(e.detail===0)toggleAim();};
 panel.querySelectorAll<HTMLButtonElement>('[data-tap]').forEach(button=>button.onclick=()=>callbacks[button.dataset.tap as Exclude<keyof typeof callbacks,'look'>]());
 return Object.assign(state,{
  reset(){for(const [id,element] of pointers){element.dispatchEvent(new PointerEvent('pointercancel',{pointerId:id}));if(element.hasPointerCapture(id))element.releasePointerCapture(id);}pointers.clear();state.x=state.z=0;state.fire=state.aim=state.fly=state.firePressed=state.jumpPressed=false;moveId=lookId=null;thumb.style.transform='';aim.setAttribute('aria-pressed','false');panel.querySelectorAll('.pressed').forEach(el=>el.classList.remove('pressed'));},
  weaponLabel(name:string){const button=panel.querySelector('[data-tap="weapon"]')!;button.textContent=`ARMA
${name==='METRALHADORA'?'METRALHA':name}`;button.setAttribute('aria-label',`Alternar arma; atual ${name}`);},
  flightLabel(owned:boolean,fuel:number){panel.querySelector('[data-hold="fly"]')!.textContent=owned&&fuel>0?`JET ${Math.ceil(fuel)}s`:'PULAR';},
  show(show:boolean){panel.classList.toggle('hidden',!enabled||!show);}
 });
}
