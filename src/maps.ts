import {Box3,Ray,Vector3} from 'three';

export type MapId='guama'|'jurunas';
export interface Block{x:number;z:number;w:number;d:number;h:number;kind:'wall'|'stall'|'pillar'}
export interface ArenaMap{id:MapId;name:string;theme:string;sky:number;floor:number;wall:number;accent:number;blocks:Block[];boxes:Box3[];spawn:Vector3;gates:Vector3[]}
function makeMap(id:MapId,name:string,theme:string,colors:number[],layout:Block[]):ArenaMap{
 const blocks:Block[]=[{x:-25,z:0,w:2,d:52,h:5,kind:'wall'},{x:25,z:0,w:2,d:52,h:5,kind:'wall'},{x:0,z:-25,w:52,d:2,h:5,kind:'wall'},{x:0,z:25,w:52,d:2,h:5,kind:'wall'},...layout];
 return{id,name,theme,sky:colors[0],floor:colors[1],wall:colors[2],accent:colors[3],blocks,boxes:blocks.map(b=>new Box3(new Vector3(b.x-b.w/2,0,b.z-b.d/2),new Vector3(b.x+b.w/2,b.h,b.z+b.d/2))),spawn:new Vector3(0,0,18),gates:[[-20,-20],[0,-20],[20,-20],[-20,0],[20,0],[-20,20],[20,20]].map(([x,z])=>new Vector3(x,0,z))};
}
export const maps:Record<MapId,ArenaMap>={
 guama:makeMap('guama','MUNDO GUAMÁ','Praça do mercado · luz verde · ruas abertas',[0x253f3d,0x63716a,0x91a898,0x81ffba],[
  {x:-11,z:-8,w:7,d:7,h:3.5,kind:'stall'},{x:11,z:-8,w:7,d:7,h:3.5,kind:'stall'},
  {x:-12,z:9,w:6,d:5,h:2.7,kind:'stall'},{x:12,z:9,w:6,d:5,h:2.7,kind:'stall'},
  {x:0,z:-5,w:3,d:3,h:1.1,kind:'pillar'},
 ]),
 jurunas:makeMap('jurunas','MUNDO JURUNAS','Fortaleza vulcânica · lava · passagens de pedra',[0x301a22,0x51434a,0x77616b,0xff743d],[
  {x:-10,z:-5,w:4,d:13,h:4,kind:'wall'},{x:10,z:5,w:4,d:13,h:4,kind:'wall'},
  {x:0,z:-12,w:8,d:3,h:2.5,kind:'wall'},{x:-10,z:14,w:4,d:4,h:3.8,kind:'pillar'},
  {x:10,z:-16,w:4,d:4,h:3.8,kind:'pillar'},{x:0,z:4,w:3,d:3,h:1.4,kind:'pillar'},
 ])
};
export function free(map:ArenaMap,x:number,z:number,r=.4,y=0){return Math.abs(x)<24-r&&Math.abs(z)<24-r&&!map.blocks.some(b=>y<b.h+.22&&Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r);}
export function wallDistance(map:ArenaMap,origin:Vector3,dir:Vector3){const ray=new Ray(origin,dir),hit=new Vector3();let distance=Infinity;for(const b of map.boxes)if(ray.intersectBox(b,hit))distance=Math.min(distance,origin.distanceTo(hit));return distance;}

// Four-neighbor navigation prevents monsters cutting corners through solid geometry.
export function route(map:ArenaMap,start:Vector3,end:Vector3):Vector3[]{
 const key=(x:number,z:number)=>`${x},${z}`;
 function nearest(p:Vector3){let best=Infinity,result=[0,9];for(let x=-11;x<=11;x++)for(let z=-11;z<=11;z++){const d=(x*2-p.x)**2+(z*2-p.z)**2;if(d<best&&free(map,x*2,z*2,.5)){best=d;result=[x,z];}}return result;}
 const [sx,sz]=nearest(start),[ex,ez]=nearest(end),open=[{x:sx,z:sz,g:0,f:0}],cost=new Map([[key(sx,sz),0]]),prev=new Map<string,string>();let finish='';
 for(let n=0;open.length&&n<600;n++){
  open.sort((a,b)=>b.f-a.f);const c=open.pop()!,ck=key(c.x,c.z);
  if(c.x===ex&&c.z===ez){finish=ck;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=c.x+dx,z=c.z+dz,k=key(x,z),g=c.g+1;if(Math.abs(x)>11||Math.abs(z)>11||!free(map,x*2,z*2,.5)||g>=(cost.get(k)??Infinity))continue;cost.set(k,g);prev.set(k,ck);open.push({x,z,g,f:g+Math.abs(x-ex)+Math.abs(z-ez)});}
 }
 const out:Vector3[]=[];while(finish&&finish!==key(sx,sz)){const [x,z]=finish.split(',').map(Number);out.unshift(new Vector3(x*2,0,z*2));finish=prev.get(finish)??'';}return out;
}
