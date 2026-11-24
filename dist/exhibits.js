// Sculptures use a shared, vertex-coloured material. Each static workshop is one draw call.
export function makeExhibits(T, scene, projects) {
  const material = new T.MeshStandardMaterial({vertexColors:true, roughness:0.86, metalness:0.025});
  const library = new Map();
  const animations = [];
  const tau = Math.PI * 2;
  const at = (key, geometry) => {
    if (!library.has(key)) library.set(key, geometry().toNonIndexed());
    return library.get(key);
  };
  const boxGeometry = () => at('box', () => new T.BoxGeometry(1,1,1));
  const ballGeometry = (low=false) => at('ball'+low, () => new T.SphereGeometry(1, low?8:14, low?5:9));
  const cylinderGeometry = (a,b,sides) => at('cy'+[a,b,sides], () => new T.CylinderGeometry(a,b,1,sides));
  const torusGeometry = (radius,tube) => at('tor'+[radius,tube], () => new T.TorusGeometry(radius,tube,8,32));
  const pivot = new T.Object3D(), normMatrix = new T.Matrix3(), vert = new T.Vector3(), normal = new T.Vector3();
  const colors = new Map();
  const colour = (hex) => { if (!colors.has(hex)) colors.set(hex, new T.Color(hex)); return colors.get(hex); };
  const cream=0xffebc2, ivory=0xf9f1d9, ink=0x29454a, wood=0xc08b59, gold=0xf5bc55, orange=0xe96a3f, teal=0x378e89;

  class Parts {
    constructor() { this.pos=[]; this.norm=[]; this.col=[]; }
    paint(geo,x,y,z,sx,sy,sz,rx,ry,rz,col,quat=null) {
      pivot.position.set(x,y,z); pivot.scale.set(sx,sy,sz);
      if (quat) pivot.quaternion.copy(quat); else pivot.rotation.set(rx,ry,rz);
      pivot.updateMatrix(); normMatrix.getNormalMatrix(pivot.matrix);
      const p=geo.attributes.position, n=geo.attributes.normal, c=colour(col);
      const count=geo.index?geo.index.count:p.count;
      for(let i=0;i<count;i++) {
        const j=geo.index?geo.index.getX(i):i;
        vert.fromBufferAttribute(p,j).applyMatrix4(pivot.matrix);
        normal.fromBufferAttribute(n,j).applyMatrix3(normMatrix).normalize();
        this.pos.push(vert.x,vert.y,vert.z); this.norm.push(normal.x,normal.y,normal.z);
        this.col.push(c.r,c.g,c.b);
      }
    }
    box(x,y,z,w,h,d,c,rx=0,ry=0,rz=0) {this.paint(boxGeometry(),x,y,z,w,h,d,rx,ry,rz,c);}
    ball(x,y,z,w,h,d,c,low=false) {this.paint(ballGeometry(low),x,y,z,w,h,d,0,0,0,c);}
    cy(x,y,z,rt,rb,h,c,s=16,rx=0,ry=0,rz=0) {this.paint(cylinderGeometry(rt,rb,s),x,y,z,1,h,1,rx,ry,rz,c);}
    ring(x,y,z,r,t,c,rx=0,ry=0,rz=0) {this.paint(torusGeometry(r,t),x,y,z,1,1,1,rx,ry,rz,c);}
    rod(a,b,r,c,s=8) {
      const delta=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]), length=delta.length();
      if (length < 1e-6) return;
      const quaternion=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
      this.paint(cylinderGeometry(1,1,s),(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,length,r,0,0,0,c,quaternion);
    }
    line(points,r,c,sides=7) {for(let k=1;k<points.length;k++) this.rod(points[k-1],points[k],r,c,sides);}
    tri(a,b,c,shade) {
      const indexed = [a,b,c], face = new T.Vector3().crossVectors(new T.Vector3().subVectors(new T.Vector3(...b),new T.Vector3(...a)),new T.Vector3().subVectors(new T.Vector3(...c),new T.Vector3(...a))).normalize();
      const rgb=colour(shade);
      for (const point of indexed) {this.pos.push(...point);this.norm.push(face.x,face.y,face.z);this.col.push(rgb.r,rgb.g,rgb.b);}
    }
    quad(a,b,c,d,col) {this.tri(a,b,c,col); this.tri(a,c,d,col);}
    mesh(name) {
      const geometry=new T.BufferGeometry();
      geometry.setAttribute('position',new T.Float32BufferAttribute(this.pos,3));
      geometry.setAttribute('normal',new T.Float32BufferAttribute(this.norm,3));
      geometry.setAttribute('color',new T.Float32BufferAttribute(this.col,3));
      geometry.computeBoundingSphere();
      const m=new T.Mesh(geometry,material); m.name=name; m.castShadow=m.receiveShadow=true; return m;
    }
  }
  function star(p,x,y,z,r,col) {
    const pts=[];
    for(let i=0;i<10;i++){const angle=Math.PI/2+i*Math.PI/5,rr=i%2?r*.44:r;pts.push([x+rr*Math.cos(angle),y+rr*Math.sin(angle),z]);}
    for(let i=0;i<10;i++) p.tri([x,y,z],pts[i],pts[(i+1)%10],col);
  }
  function footstone(p,x,z,r) {
    p.cy(x,.075,z,r,r*.94,.15,0xbebda3,10);
    p.cy(x,.17,z,r*.96,r,.07,0xeee2c1,10);
  }
  // A layered hip roof: curved tile courses run toward a ridgeline, with swept corner eaves.
  function palaceRoof(p,x,base,z,w,d,h,tiles,trim) {
    const ends=0.52*w;
    function point(side,u,k) {
      const width=w*(1-k)+ends*k, depth=d*(1-k)+.035*k;
      let px,pz;
      if(side===0) {px=u*width;pz=depth;} else if(side===1) {px=width;pz=-u*depth;}
      else if(side===2) {px=-u*width;pz=-depth;} else {px=-width;pz=u*depth;}
      const corner=Math.pow(Math.abs(u),4)*.27*(1-k);
      return [x+px,base+h*(.64*k+.36*k*k)+corner+Math.pow(Math.abs(px/w),5)*.12,z+pz];
    }
    for(let side=0;side<4;side++) {
      const ns=side%2?8:14;
      for(let j=0;j<ns;j++) {
        const u=-1+2*j/ns,v=-1+2*(j+1)/ns;
        for(let q=0;q<4;q++) p.quad(point(side,u,q/4),point(side,v,q/4),point(side,v,(q+1)/4),point(side,u,(q+1)/4),tiles);
        const ea=point(side,u,0),eb=point(side,v,0);
        p.quad(eb,ea,[ea[0],ea[1]-.13,ea[2]],[eb[0],eb[1]-.13,eb[2]],trim);
        p.rod(ea,eb,.055,trim,6);
        const ridgeLine=Array.from({length:5},(_,k)=>point(side,u,k/4));
        p.line(ridgeLine,j===0?.065:.025,j===0?trim:tiles,6);
      }
    }
    p.box(x,base+h+.055,z,2*ends+.2,.13,.15,trim);
    for(const s of [-1,1]) {
      p.line([[x+s*(ends-.08),base+h+.07,z],[x+s*(ends+.13),base+h+.13,z],[x+s*(ends+.20),base+h+.31,z]],.06,trim);
      p.ball(x+s*(ends+.20),base+h+.34,z,.085,.09,.085,trim,true);
    }
  }
  function blossoms(p,x,z) {
    const trunk=0x986951;
    p.rod([x,.12,z],[x+.10,1.08,z+.05],.095,trunk);
    const branches=[[-.38,1.55,.02],[.43,1.47,-.16],[.02,1.77,-.12],[.32,1.67,.17],[-.25,1.35,.29]];
    for(let i=0;i<branches.length;i++){
      const [dx,y,dz]=branches[i];
      p.rod([x+.1,.84,z],[x+dx,y,z+dz],.048,trunk);
      p.ball(x+dx,y,z+dz,.40,.30,.37,i%2?0xf39b98:0xf9b9ab,true);
      p.ball(x+dx-.07,y+.2,z+dz+.025,.20,.13,.19,0xffd5bc,true);
    }
  }
  function addLantern(p,x,y,z,scale=1) {
    p.rod([x,y+.22*scale,z],[x,y+.46*scale,z],.028*scale,gold);
    p.ball(x,y,z,.20*scale,.24*scale,.2*scale,0xff7546);
    for(const s of [-1,1])p.cy(x,y+s*.2*scale,z,.15*scale,.15*scale,.07*scale,gold);
    p.rod([x,y-.23*scale,z],[x,y-.44*scale,z],.026*scale,0xe7ae43);
  }
  function moon(p) {
    footstone(p,-.15,.08,1.75);
    p.cy(-.15,.29,.08,1.36,1.52,.17,0x748d95,16);
    p.cy(-.15,.42,.08,1.3,1.35,.12,0xe3d6b0,16);
    const x=-.22,z=.02;
    p.cy(x,2.47,z,.55,.58,2.95,ivory,20);
    p.cy(x,4.19,z,.34,.55,.53,orange,20);
    p.cy(x,4.64,z,.025,.34,.39,orange,20);
    p.cy(x,4.40,z,.30,.35,.065,cream);
    p.cy(x,1.21,z,.56,.59,.55,orange,20);
    p.cy(x,.80,z,.36,.45,.27,ink);
    p.cy(x,.64,z,.45,.36,.15,0x78847e);
    p.cy(x,1.57,z,.57,.57,.11,cream);
    p.cy(x,3.70,z,.56,.56,.09,0x458b94);
    p.cy(x,2.31,z,.57,.57,.13,orange,20);
    p.cy(x,3.06,z+.54,.238,.238,.11,0x6c857e,20,Math.PI/2);
    p.cy(x,3.07,z+.61,.171,.171,.052,0x3d879c,20,Math.PI/2);
    p.ball(x-.055,3.13,z+.65,.052,.056,.013,0xbce5e3);
    // Twin strap-on boosters give the silhouette a readable shuttle profile.
    for(const s of [-1,1]) {
      p.cy(x+s*.68,1.73,z,.245,.25,1.84,ivory);
      p.cy(x+s*.68,2.81,z,.025,.245,.36,orange);
      p.cy(x+s*.68,.82,z,.26,.28,.28,orange);
      p.cy(x+s*.68,.63,z,.17,.22,.18,ink);
      p.cy(x+s*.68,2.29,z,.25,.25,.10,teal);
      p.rod([x+s*.44,1.27,z-.10],[x+s*1.02,.87,z+.04],.11,orange);
      const tip=[x+s*1.17,.70,z],hi=[x+s*.69,1.70,z],lo=[x+s*.69,.75,z];
      p.tri(tip,hi,lo,orange);p.tri(lo,hi,tip,orange);
    }
    const tx=-1.32,tz=-.79;
    for(const dx of [-.16,.16]) for(const dz of [-.16,.16]) p.rod([tx+dx,.25,tz+dz],[tx+dx,3.44,tz+dz],.052,0xb98150);
    for(let i=0;i<5;i++){
      const y=.55+i*.55;
      p.line([[tx-.18,y,tz+.16],[tx+.18,y+.48,tz+.16],[tx+.18,y,tz+.16],[tx-.18,y,tz+.16]],.044,cream);
    }
    p.box(tx+.35,3.47,tz,.99,.13,.44,0xe6aa61);
    for (const [ax,az] of [[1.40,.73],[1.72,-.16]]) {
      p.cy(ax,.38,az,.11,.14,.68,0x667d79);
      p.box(ax,.72,az,.98,.12,.77,ivory,-.26);
      p.box(ax,.82,az,.89,.048,.68,0x39748a,-.26);
      for(let k=-1;k<=1;k++) p.box(ax+k*.21,.852,az,.025,.025,.66,0xa3d4cc,-.26);
      p.box(ax,.856,az,.86,.025,.021,0xa3d4cc,-.26);
    }
    for(const [rx,rz,size] of [[-1.63,.90,.38],[1.06,1.27,.27],[1.76,-.93,.31]])p.ball(rx,size*.44,rz,size,size*.62,size*.85,0xb8b9a5,true);
  }
  function palace(p,big) {
    const red=big?0xaa4840:0xb85144, redLight=big?0xcb6449:0xd86448,base=big?.73:.48;
    const tile=big?0xe4a93b:0x397875,trim=big?0xf4cf73:0x7cb8a0;
    p.box(0,.14,.10,4.00,.28,2.9,0xcab591);
    p.box(0,.32,.02,3.78,.13,2.68,0xf2ddae);
    if(big){p.box(0,.48,-.09,3.6,.24,2.42,0xccb58d);p.box(0,.65,-.07,3.77,.13,2.52,cream);}
    const steps=big?4:3;
    for(let i=0;i<steps;i++){
      const h=.1+i*(base-.1)/steps;
      p.box(0,h/2,1.95-i*.21,1.51,h,.42,i%2?cream:0xdac8a0);
      if(big)p.box(0,h+.013,1.95-i*.21,.68,.022,.42,0xc8563d);
    }
    p.box(0,base+.82,-.50,3.06,1.51,.81,red);
    for(const col of [-1.56,-.51,.51,1.56]){
      p.cy(col,base+.82,.78,.095,.11,1.56,redLight);
      p.cy(col,base+.05,.78,.16,.17,.11,cream);
      p.cy(col,base+1.49,.78,.15,.15,.12,gold);
      p.box(col,base+1.59,.78,.36,.12,.28,trim);
    }
    for(const dx of [-1.1,0,1.1]) {
      p.box(dx,base+.70,-.068,.68,1.12,.10,ink);
      p.box(dx,base+.68,.008,.57,.95,.075,dx===0?0x81493a:0xba8152);
      for(const cx of [-.16,0,.16]) p.box(dx+cx,base+.83,.052,.025,.59,.025,gold);
      for(const cy of [.71,.93])p.box(dx,base+cy,.059,.49,.025,.025,gold);
    }
    p.box(0,base+1.67,.04,3.84,.19,2.0,red);
    p.box(0,base+1.79,.04,4.06,.09,2.12,gold);
    p.box(0,base+1.67,1.084,.86,.29,.08,ink);
    p.box(0,base+1.67,1.13,.48,.038,.016,gold);
    palaceRoof(p,0,base+1.86,-.04,2.24,1.28,big?.83:.85,tile,trim);
    if(big) {
      p.box(0,base+2.62,-.05,2.47,.43,1.12,red);
      for(let i=-3;i<=3;i++)p.box(i*.33,base+2.68,.535,.12,.18,.09,cream);
      palaceRoof(p,0,base+2.84,-.06,1.64,.91,.67,0xd69b31,trim);
      for(const s of [-1,1]) for(let i=0;i<3;i++){
        const zz=1.36+i*.26; p.cy(s*.94,.43-i*.073,zz,.095,.105,.33,cream);
        p.ball(s*.94,.61-i*.073,zz,.13,.115,.13,cream,true);
      }
      for(const s of [-1,1]) {p.cy(s*1.82,.48,1.2,.19,.26,.25,cream);p.ball(s*1.82,.70,1.2,.24,.29,.23,0xe7b453,true);}
    } else {
      blossoms(p,-2.0,.62);blossoms(p,1.98,-.26);
    }
    for(const s of [-1,1]) addLantern(p,s*1.04,base+1.25,1.03,.83);
  }
  function biscuit(p,x,y,z,r,turn=0) {
    p.cy(x,y,z,r,r,.18,0xd99a50,12,0,turn);
    p.cy(x,y+.105,z,r*.86,r*.90,.06,0xf0be76,12,0,turn);
    for(let i=0;i<5;i++){const a=tau*i/5+turn;p.cy(x+Math.cos(a)*r*.52,y+.147,z+Math.sin(a)*r*.52,.05,.048,.022,0x97633d,8);}
  }
  function book(p,x,y,z,w,d,h,col,turn=0) {
    p.box(x,y+h*.5,z,w*.95,h*.76,d*.95,cream,0,turn);
    p.box(x,y+.025,z,w,.060,d,col,0,turn);p.box(x,y+h-.025,z,w,.060,d,col,0,turn);
    p.box(x-Math.cos(turn)*w*.47,y+h*.5,z+Math.sin(turn)*w*.47,.10,h,d,col,0,turn);
  }
  function tower(p) {
    for(const side of [-1,1])for(const end of [-1,1]){
      p.box(side*1.42,.50,end*.89,.22,.96,.23,0xb87a4f);
      p.box(side*1.42,.14,end*.89,.26,.12,.27,0x93644b);
    }
    p.box(0,.85,0,3.24,.25,2.15,0xaa724e);
    p.box(0,1.04,0,3.55,.26,2.44,0xe9ae68);
    p.box(0,1.18,0,3.55,.055,2.44,0xffcb83);
    const tx=-.75,tz=-.08;
    p.cy(tx,2.17,tz,.81,.81,1.86,0xf3ca81,24);
    p.cy(tx,1.31,tz,.84,.84,.12,teal,24);
    p.cy(tx,1.49,tz,.817,.817,.054,0xe3a34f,24);
    p.cy(tx,2.48,tz,.825,.825,.50,0x57a294,24);
    p.cy(tx,3.18,tz,.89,.89,.16,teal,24);
    p.cy(tx,3.29,tz,.80,.85,.07,0x89c5a6,24);
    p.cy(tx,2.09,tz+.793,.33,.33,.035,ivory,18,Math.PI/2);
    star(p,tx,2.08,tz+.826,.245,orange);
    book(p,.95,1.23,.12,1.30,1.05,.28,0xca6651,-.09);
    book(p,.98,1.51,.08,1.34,1.05,.30,0x638c94,.12);
    book(p,.91,1.81,.12,1.37,1.02,.27,0xe1a64b,-.03);
    for(let i=0;i<3;i++){
      p.box(.87+i*.26,2.09+i*.25,.25-i*.22,.75,.16,.53,[orange,cream,teal][i],0,-.13);
    }
    // Elevated rainbow gantry, raised on miniature timber posts.
    for(const s of [-1,1]){
      p.box(s*.69+.03,2.86,-.67,.13,2.75,.13,wood);
      p.box(s*.69+.03,3.57,-.69,.23,.15,.21,cream);
    }
    p.box(.03,3.65,-.68,1.68,.15,.34,0xad7752);
    const rainbow=[0xe16852,0xf1ab53,0xf4cf6c,0x79b69a,0x67a7ae];
    rainbow.forEach((c,i)=>{
      const r=.88-i*.13;
      const pts=Array.from({length:15},(_,k)=>[.03+Math.cos(k*Math.PI/14)*r,3.70+Math.sin(k*Math.PI/14)*r,-.63]);
      p.line(pts,.081,c,7);
    });
    for(const s of [-1,1]) for(let k=0;k<3;k++) p.ball(s*(.73+k*.11)+.02,3.67+(k===1?.085:0),-.56,.17,.135,.13,cream,true);
    biscuit(p,-1.55,.13,1.00,.37,.3);biscuit(p,.04,1.31,1.01,.28);biscuit(p,1.61,.12,.84,.33,1.2);
  }
  function pumpkin(p,x,y,z,r) {
    for(let j=0;j<7;j++){
      const a=j*tau/7;p.ball(x+Math.cos(a)*r*.38,y+r*.57,z+Math.sin(a)*r*.38,r*.59,r*.67,r*.60,j%2?0xe58238:0xf6a245,true);
    }
    p.rod([x,y+r*1.09,z],[x+.075*r,y+r*1.50,z-.03],r*.105,0x748450);
    for(const s of [-1,1]){
      const ex=x+s*r*.34,ey=y+r*.68,ez=z+r*.90;
      p.tri([ex-.11*r,ey-.09*r,ez],[ex+.12*r,ey-.08*r,ez],[ex,ey+.14*r,ez],ink);
    }
    p.box(x,y+r*.41,z+r*.92,r*.39,.054,r*.085,ink,0,0,-.06);
  }
  function ghost(p,x,y,z) {
    p.ball(x,y,z,.30,.39,.23,0xf6edcf);
    for(let i=-1;i<=1;i++)p.ball(x+i*.19,y-.21,z,.126,.118,.18,0xf6edcf);
    for(const s of [-1,1])p.ball(x+s*.103,y+.075,z+.207,.042,.059,.025,ink);
    p.ball(x,y-.02,z+.239,.031,.046,.016,ink);
  }
  function gable(p,x,y,z,w,h,d,roof,trim) {
    const left=[x-w,y,z+d],ridge=[x,y+h,z+d],right=[x+w,y,z+d];
    const backL=[x-w,y,z-d],backM=[x,y+h,z-d],backR=[x+w,y,z-d];
    p.quad(left,ridge,backM,backL,roof);p.quad(ridge,right,backR,backM,roof);
    p.tri(right,ridge,left,roof);p.tri(backL,backM,backR,roof);
    p.line([left,ridge,right],.075,trim);
    p.line([backL,backM,backR],.055,trim);
    p.rod(ridge,backM,.077,trim);
    for(const s of [-1,1])for(let i=1;i<=3;i++){
      const t=i/4;
      p.rod([x+s*w*t,y+h*(1-t)+.01,z-d],[x+s*w*t,y+h*(1-t)+.01,z+d],.023,trim);
    }
  }
  function window(p,x,y,z,w,h) {
    p.box(x,y,z,w+.09,h+.09,.09,0x514760);
    p.box(x,y,z+.057,w,h,.04,0xffbd63);
    p.box(x,y,z+.083,.044,h,.024,0x75546a);
    p.box(x,y+.08,z+.083,w,.046,.024,0x75546a);
  }
  function haunt(p) {
    p.box(-.53,.16,-.07,2.81,.26,2.10,0x7e7780);
    p.box(-.53,1.09,-.13,2.46,1.74,1.80,0x815685);
    for(const s of [-1,1]) p.box(-.53+s*1.08,1.18,.81,.12,1.66,.11,0x644e73);
    p.box(-.53,1.85,-.12,2.61,.12,1.97,0xbd8ca5);
    gable(p,-.55,1.94,-.13,1.43,1.07,1.02,0x775079,0xba91ad);
    window(p,-.44,1.20,.79,.47,.64);window(p,-1.25,1.20,.79,.41,.59);
    p.cy(-.54,2.22,.925,.18,.18,.062,gold,12,Math.PI/2);
    p.box(.33,1.77,-.18,1.0,3.28,1.18,0x674d78);
    for(const s of [-1,1]) p.box(.33+s*.43,2.11,.44,.085,2.38,.085,0xa47fa5);
    window(p,.33,2.80,.47,.42,.52);
    p.box(.33,3.38,-.17,1.15,.13,1.37,0xb98caa);
    p.cy(.33,3.90,-.17,.06,.89,1.16,0x6c5080,4,0,Math.PI/4);
    p.ball(.33,4.50,-.17,.093,.12,.093,gold);
    p.rod([.33,4.47,-.17],[.33,4.91,-.17],.028,0x76596d);
    p.tri([.33,4.89,-.17],[.33,4.69,-.17],[.73,4.79,-.17],orange);
    p.box(.31,.79,.47,.51,1.02,.11,0x413e52);
    p.box(.31,.77,.539,.37,.87,.06,0x9e6a68);
    p.ball(.42,.80,.575,.045,.045,.025,gold);
    pumpkin(p,-1.49,.045,1.31,.46);pumpkin(p,-.91,.035,1.56,.27);
    // A twisting pair of rails and cross-ties recalls the real pumpkin coaster.
    const railPoint=(i,offset=0)=>{
      const t=i/22,a=-.48+t*Math.PI*1.63;
      const rx=1.33+offset,rz=.92+offset;
      return [.54+Math.cos(a)*rx,.47+.17*Math.sin(a)+1.60*Math.pow(Math.sin(Math.PI*t),2),.55+Math.sin(a)*rz];
    };
    for(const d of [-.13,.13]) p.line(Array.from({length:23},(_,i)=>railPoint(i,d)),.050,0xf1b565);
    for(let i=0;i<=22;i++){
      p.rod(railPoint(i,-.17),railPoint(i,.17),.039,0x8c5e60);
      if(i%4===0){const q=railPoint(i);p.rod([q[0]+.02,.08,q[2]],[q[0],q[1]-.06,q[2]],.063,0x82686d);}
    }
    const coach=railPoint(9);pumpkin(p,coach[0],coach[1]+.035,coach[2],.26);
  }
  function travelVan() {
    const p=new Parts(), red=0xdf6440, tire=0x343e41,glass=0x679ba1;
    p.box(0,.28,0,1.00,.17,1.60,0x544c42);
    p.box(0,.49,0,1.04,.34,1.63,red);
    p.box(0,.65,.01,1.07,.10,1.65,cream);
    p.box(0,.84,-.10,.99,.35,1.34,cream);
    p.box(0,1.035,-.105,1.08,.10,1.44,ivory);
    p.box(0,.86,.585,.85,.25,.044,glass,-.11);
    p.box(0,.855,.610,.037,.25,.024,ivory,-.11);
    p.box(0,.83,-.787,.79,.22,.038,glass);
    for(const side of [-1,1]){
      for(let i=0;i<3;i++)p.box(side*.506,.848,-.51+i*.392,.024,.23,.32,glass);
      p.box(side*.537,.564,.09,.014,.047,.10,cream);
      p.box(side*.55,.62,.48,.028,.034,.13,0x915942);
      for(const z of [-.52,.55]){
        p.cy(side*.516,.30,z,.237,.237,.145,tire,18,0,0,Math.PI/2);
        p.cy(side*.594,.30,z,.125,.125,.022,ivory,16,0,0,Math.PI/2);
        p.cy(side*.610,.30,z,.069,.069,.027,0xd8885d,14,0,0,Math.PI/2);
      }
      p.cy(side*.345,.545,.823,.091,.091,.057,ivory,14,Math.PI/2);
      p.box(side*.372,.48,-.827,.13,.13,.040,0xc84c36);
    }
    p.box(0,.362,.836,.91,.087,.10,cream);p.box(0,.362,-.83,.91,.087,.10,cream);
    p.box(0,.512,.835,.28,.103,.029,ink);
    p.box(0,.512,.853,.20,.031,.012,cream);
    for(const s of [-1,1])p.rod([s*.37,1.13,-.62],[s*.37,1.13,.35],.024,0x777969);
    for(const z of [-.52,.18])p.rod([-.38,1.12,z],[.38,1.12,z],.030,0x777969);
    p.box(.06,1.232,-.21,.62,.19,.49,0xbf864f,0,-.05);
    for(const s of [-1,1])p.box(.06+s*.20,1.236,-.21,.048,.20,.50,cream,0,-.05);
    const car=new T.Group();car.name='放映岛旅行车';car.add(p.mesh('旅行车与行李架'));return car;
  }
  const build={moon,palace1:p=>palace(p,false),palace2:p=>palace(p,true),tower,haunt};
  const turns={moon:-.32,palace1:.20,palace2:-.40,tower:-.30,haunt:.24};
  for (const project of projects) {
    if (!build[project.id]) continue;
    const p=new Parts();build[project.id](p);
    const group=new T.Group();
    group.position.set(project.position[0],0,project.position[1]);group.rotation.y=turns[project.id];
    group.name=project.id;group.userData.projectId=project.id;
    const mesh=p.mesh(project.id+'-miniature');mesh.userData.projectId=project.id;
    group.add(mesh);scene.add(group);
    if(project.id==='moon') {
      const beacon=new Parts();beacon.ball(-1.31,3.61,-.80,.10,.12,.10,0xfb9b3d);
      const glow=beacon.mesh('发射台信标'); glow.userData.projectId=project.id; group.add(glow);
      animations.push(t=>{glow.visible=Math.sin(t*2.0)>-.49;});
    }
    if(project.id==='haunt') {
      const spirit=new Parts();ghost(spirit,0,0,0);
      const sprite=spirit.mesh('屋檐游魂');sprite.userData.projectId=project.id;group.add(sprite);
      sprite.position.set(-1.64,2.98,.09);
      animations.push(t=>{sprite.position.y=2.98+Math.sin(t*1.35)*.13;sprite.rotation.z=Math.sin(t*.86)*.08;});
    }
  }
  const car=travelVan();scene.add(car);
  for(const shape of library.values()) shape.dispose();
  return {car,update(t){for(const animate of animations)animate(t);}};
}
