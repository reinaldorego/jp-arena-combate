import {Vector3} from 'three';

export const walkSpeed=6;
export const baseMouseSensitivity=.002;
export const hipFov=100;
export const aimFov=50;

// Exponential damping uses seconds, so response stays consistent across frame rates.
export function smoothAim(current:number,held:boolean,dt:number){
 return current+((held?1:0)-current)*(1-Math.exp(-14*dt));
}

export function accelerate(velocity:Vector3,keys:Set<string>,yaw:number,speed:number,dt:number,touch={x:0,z:0}){
 let x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
 let z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
 x+=touch.x;z+=touch.z;
 const length=Math.hypot(x,z);
 if(length>1){x/=length;z/=length;}
 const target=new Vector3((x*Math.cos(yaw)+z*Math.sin(yaw))*speed,0,(-x*Math.sin(yaw)+z*Math.cos(yaw))*speed);
 velocity.lerp(target,1-Math.exp(-(length?12:16)*dt));
 if(!length&&velocity.lengthSq()<.0001)velocity.set(0,0,0);
}
