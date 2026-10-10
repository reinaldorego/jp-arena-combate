export type WeaponId='machinegun'|'rifle'|'bazooka';
export const weaponOrder:WeaponId[]=['machinegun','rifle','bazooka'];
export const weapons={
 machinegun:{name:'METRALHADORA',magazine:30,damage:22,head:44,interval:.065,reload:1.35,spread:.012,auto:true},
 rifle:{name:'RIFLE',magazine:8,damage:85,head:170,interval:.55,reload:1.8,spread:.002,auto:false},
 bazooka:{name:'BAZUCA',magazine:1,damage:160,head:160,interval:.8,reload:2.8,spread:0,auto:true}
} as const;
export interface WeaponState{ammo:number;reserve:number;cooldown:number;reload:number;spray:number}
export function loadout(ammoScale:number):Record<WeaponId,WeaponState>{
 const make=(id:WeaponId,reserve:number)=>({ammo:weapons[id].magazine,reserve:Math.floor(reserve*ammoScale),cooldown:0,reload:0,spray:0});
 return{machinegun:make('machinegun',180),rifle:make('rifle',36),bazooka:make('bazooka',8)};
}