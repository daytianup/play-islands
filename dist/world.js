import * as T from './lib/three.module.js';
import {makeTerrain} from './terrain.js';
import {makeExhibits} from './exhibits.js';

export function createWorld({host,projects,pinMap,proximity,play,blocked,onContextLost}){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  gl.shadowMap.enabled=true;gl.shadowMap.type=T.PCFSoftShadowMap;
  gl.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<760?1.7:1.65));
  host.appendChild(gl.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#aad9d1');
  scene.add(new T.HemisphereLight('#fff6e0','#a0bbc1',1.85));
  const sun=new T.DirectionalLight('#ffeed6',2.2);sun.position.set(-14,27,16);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-23,right:23,top:24,bottom:-24,near:1,far:75});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.camera.updateProjectionMatrix();scene.add(sun);
  const terrain=makeTerrain(T,scene), {car,update:updateExhibits}=makeExhibits(T,scene,projects);
  const eye=new T.OrthographicCamera(-25,25,18,-18,.1,150), focus=new T.Vector3(), wanted=new T.Vector3(),offset=new T.Vector3(0,39,46);
  const pinWorld=new T.Vector3(), ray=new T.Raycaster(), pointer=new T.Vector2();
  const where=projects.map(project=>({project,button:pinMap.get(project.id),pos:new T.Vector3(project.position[0],.12,project.position[1]+2.3)}));
  const pickable=scene.children.filter(o=>o.userData.projectId);
  const carStart=new T.Vector3(0,.075,1.4);
  car.position.copy(carStart);car.rotation.y=-.52;
  const vel=new T.Vector2(), pressed=new Set();
  const routes=projects.map(({position:[x,z]})=>{
    const dir=new T.Vector2(x,z-carStart.z),length=dir.length();return {length,dir:dir.normalize()};
  });
  let width=0,height=0,span=1,targetSpan=1,driving=false,nearest=null,elapsed=0,lastTime=0,dead=false,dirty=true;
  function releaseKeys(){pressed.clear();vel.set(0,0)}
  function measure(){width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;gl.setSize(width,height,false);dirty=true;cameraGoal();span=targetSpan;focus.copy(wanted);placeCamera()}
  function cameraGoal(){
    const aspect=width/height, portrait=width<=760&&height>width;
    if(driving){
      targetSpan=portrait?16.5:Math.max(28,aspect*17.5);
      wanted.set(car.position.x,0,car.position.z-(portrait?1.2:0));
    }else if(portrait){
      targetSpan=35.5;wanted.set(0,0,-.5-(height>600?3.2:1.2));
    }else{
      targetSpan=Math.max(48.5,aspect*23.5);wanted.set(-targetSpan*(width>760?.129:.105),0,-1.2);
    }
  }
  function placeCamera(){const v=span/(width/height);Object.assign(eye,{left:-span/2,right:span/2,top:v/2,bottom:-v/2});eye.updateProjectionMatrix();eye.position.copy(focus).add(offset);eye.lookAt(focus);eye.updateMatrixWorld()}
  function refreshNear(){
    let closest=null,distance=Infinity;
    for(const p of projects){const d=Math.hypot(p.position[0]-car.position.x,p.position[1]-car.position.z);if(d<4.8&&d<distance){closest=p;distance=d}}
    if(nearest!==closest||dirty){nearest=closest;proximity(closest)}
  }
  function canRoll(x,z){
    if(!terrain.isDriveable(x,z))return false;
    return projects.every(p=>Math.hypot(x-p.position[0],z-p.position[1])>1.95);
  }
  function advance(dt){
    const x=Number(pressed.has('ArrowRight'))-Number(pressed.has('ArrowLeft'));
    const z=Number(pressed.has('ArrowDown'))-Number(pressed.has('ArrowUp'));
    const mag=Math.hypot(x,z),speed=6.3,acc=1-Math.exp(-dt*(mag?8:13));
    let aimX=mag?x/mag:0,aimZ=mag?z/mag:0;
    for(const {dir,length} of routes){
      const cx=car.position.x,cz=car.position.z-carStart.z,along=cx*dir.x+cz*dir.y;
      const side=-cx*dir.y+cz*dir.x,alignment=aimX*dir.x+aimZ*dir.y;
      if(along<1.3||along>length-2.4||Math.abs(side)>1.45||Math.abs(alignment)<.9)continue;
      const center=T.MathUtils.clamp(side*.8,-.65,.65);
      aimX=dir.x*Math.sign(alignment)+dir.y*center;
      aimZ=dir.y*Math.sign(alignment)-dir.x*center;
      break;
    }
    vel.x+=(speed*aimX-vel.x)*acc;vel.y+=(speed*aimZ-vel.y)*acc;
    if(vel.lengthSq()<.0006)return;
    const nx=car.position.x+vel.x*dt,nz=car.position.z+vel.y*dt;
    if(canRoll(nx,nz)){car.position.x=nx;car.position.z=nz}
    else if(canRoll(nx,car.position.z)){car.position.x=nx;vel.y=0}
    else if(canRoll(car.position.x,nz)){car.position.z=nz;vel.x=0}
    else vel.multiplyScalar(.25);
    if(mag){const direction=Math.atan2(aimX,aimZ),angle=direction-car.rotation.y;car.rotation.y+=Math.atan2(Math.sin(angle),Math.cos(angle))*(1-Math.exp(-11*dt))}
    car.position.y=.075+(reduced?0:Math.sin(elapsed*20)*.008*Math.min(1,vel.length()/5));refreshNear();
  }
  function positionPins(){
    const inset=12;
    for(const {pos,button} of where){
      pinWorld.copy(pos).project(eye);const x=(pinWorld.x+1)*width*.5,y=(1-pinWorld.y)*height*.5+5;
      const visible=x>inset&&x<width-inset&&y>inset+30&&y<height-inset-20;
      button.hidden=!visible;
      if(visible){button.style.left=x.toFixed(1)+'px';button.style.top=y.toFixed(1)+'px'}
    }
  }
  function render(stamp){
    if(dead)return;requestAnimationFrame(render);if(document.hidden)return;
    const dt=Math.min(.05,(stamp-(lastTime||stamp))/1000);lastTime=stamp;
    if(blocked())return;
    elapsed+=dt;
    if(driving)advance(dt);
    cameraGoal();
    const damp=reduced?1:1-Math.exp(-dt*5.4);
    focus.lerp(wanted,damp);span+=(targetSpan-span)*damp;placeCamera();positionPins();
    if(!reduced){terrain.update(elapsed);updateExhibits(elapsed)}
    gl.render(scene,eye);dirty=false;
  }
  function hit(e){const rect=gl.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);ray.setFromCamera(pointer,eye);const surface=ray.intersectObjects(pickable,true)[0];return surface&&projects.find(p=>p.id===surface.object.userData.projectId)}
  let down=null;
  gl.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY}});
  gl.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)return;down=null;const p=hit(e);if(p&&!blocked())play(p)});
  gl.domElement.addEventListener('pointercancel',()=>{down=null});
  gl.domElement.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')gl.domElement.style.cursor=hit(e)?'pointer':'default'});
  gl.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();dead=true;observer.disconnect();gl.domElement.remove();onContextLost()});
  const observer=new ResizeObserver(measure);observer.observe(host);measure();positionPins();gl.render(scene,eye);requestAnimationFrame(render);
  return {key(code,state){if(state)pressed.add(code);else pressed.delete(code)},releaseKeys,refreshNear,setDrive(active){
    if(driving===active)return;driving=active;dirty=true;releaseKeys();if(!active){car.position.copy(carStart);car.rotation.y=-.52;nearest=null;proximity(null)}else refreshNear();
  }};
}
