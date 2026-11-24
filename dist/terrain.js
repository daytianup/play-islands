// Low-poly island relief and hand-drawn coastal details share a few geometry batches.
export function makeTerrain(T, scene) {
  const world = new T.Group();
  world.name = 'Archipelago and harbour';
  scene.add(world);
  const waterY = -0.9;
  const tau = Math.PI * 2;
  let seed = 24835;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  }
  const pick = list => list[Math.floor(random() * list.length)];
  const v = (x, y, z) => new T.Vector3(x, y, z);
  const scratchColor = new T.Color();
  const colorCache = new Map();
  function color(value) {
    if (!colorCache.has(value)) {
      scratchColor.set(value);
      colorCache.set(value, [scratchColor.r, scratchColor.g, scratchColor.b]);
    }
    return colorCache.get(value);
  }

  function batch() { return { p: [], n: [], c: [] }; }
  const solids = batch(), sea = batch(), markings = batch();
  function triangle(b, a, d, e, hex) {
    const normal = d.clone().sub(a).cross(e.clone().sub(a)).normalize();
    const c = color(hex);
    for (const point of [a, d, e]) {
      b.p.push(point.x, point.y, point.z);
      b.n.push(normal.x, normal.y, normal.z);
      b.c.push(...c);
    }
  }
  function quad(b, a, d, e, f, hex) {
    triangle(b, a, d, e, hex);
    triangle(b, a, e, f, hex);
  }
  function meshFor(b, material, name, shadow) {
    if (!b.p.length) return null;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(b.p, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(b.n, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(b.c, 3));
    g.computeBoundingSphere();
    const m = new T.Mesh(g, material);
    m.name = name;
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    return m;
  }
  const shapes = {
    box: new T.BoxGeometry(1, 1, 1).toNonIndexed(),
    prism: new T.CylinderGeometry(1, 1, 1, 10).toNonIndexed(),
    cone: new T.ConeGeometry(1, 1, 8).toNonIndexed(),
    pole: new T.CylinderGeometry(1, 1, 1, 6).toNonIndexed(),
    leaf: new T.IcosahedronGeometry(1, 0),
    roundLeaf: new T.DodecahedronGeometry(1, 0),
  };
  const transform = new T.Object3D(), normalMatrix = new T.Matrix3(), pos = new T.Vector3(), normal = new T.Vector3();
  function piece(b, kind, x, y, z, sx, sy, sz, hex, ry=0, rz=0, rx=0) {
    const geometry = shapes[kind];
    transform.position.set(x, y, z);
    transform.rotation.set(rx, ry, rz);
    transform.scale.set(sx, sy, sz);
    transform.updateMatrix();
    normalMatrix.getNormalMatrix(transform.matrix);
    const c = color(hex), p = geometry.getAttribute('position'), n = geometry.getAttribute('normal');
    for (let i=0; i<p.count; i++) {
      pos.fromBufferAttribute(p, i).applyMatrix4(transform.matrix);
      normal.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize();
      b.p.push(pos.x, pos.y, pos.z); b.n.push(normal.x, normal.y, normal.z); b.c.push(...c);
    }
  }
  const box = (x,y,z,w,h,d,col,yaw=0) => piece(solids,'box',x,y,z,w,h,d,col,yaw);
  function beam(a, b, width, hex, thickness=width) {
    const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
    const len=Math.hypot(dx,dy,dz), centre=a.clone().add(b).multiplyScalar(.5);
    const q=new T.Quaternion().setFromUnitVectors(v(0,1,0),v(dx/len,dy/len,dz/len));
    const e=new T.Euler().setFromQuaternion(q,'XYZ');
    piece(solids,'box',centre.x,centre.y,centre.z,width,len,thickness,hex,e.y,e.z,e.x);
  }
  function disk(b,x,z,y,rx,rz,c,div=32) {
    for(let i=0;i<div;i++) {
      const a=tau*i/div, n=tau*(i+1)/div;
      triangle(b,v(x,y,z),v(x+Math.cos(n)*rx,y,z+Math.sin(n)*rz),v(x+Math.cos(a)*rx,y,z+Math.sin(a)*rz),c);
    }
  }
  function ribbon(b, points, width, hex) {
    const edges=points.map((p,i) => {
      const prev=points[Math.max(i-1,0)],next=points[Math.min(points.length-1,i+1)];
      const dx=next.x-prev.x,dz=next.z-prev.z,len=Math.hypot(dx,dz)||1;
      const sx=-dz/len*width/2,sz=dx/len*width/2;
      return [v(p.x+sx,p.y,p.z+sz),v(p.x-sx,p.y,p.z-sz)];
    });
    for(let i=1;i<edges.length;i++) {
      quad(b,edges[i-1][0],edges[i][0],edges[i][1],edges[i-1][1],hex);
    }
  }

  const islands = [
    {id:'hub',x:0,z:1.4,rx:4.6,rz:3.9,angle:.10,seed:.4,grass:'#b9c682',lip:'#a6b975',road:'#e8ca92'},
    {id:'moon',x:-11,z:-5,rx:4.95,rz:3.95,angle:-.16,seed:2.3,grass:'#c6c6ad',lip:'#a7ac9d',road:'#e1cfac'},
    {id:'palace1',x:0,z:-12,rx:5.0,rz:3.8,angle:.08,seed:3.8,grass:'#abc184',lip:'#8ca97a',road:'#ead2a3'},
    {id:'palace2',x:11,z:-5,rx:4.9,rz:4.05,angle:.19,seed:4.9,grass:'#abc18b',lip:'#96ae7f',road:'#ebcfa4'},
    {id:'tower',x:-8,z:8,rx:5.05,rz:3.9,angle:-.08,seed:1.2,grass:'#d1c589',lip:'#aeb882',road:'#eed5a2'},
    {id:'haunt',x:9,z:8,rx:4.9,rz:3.85,angle:.13,seed:5.8,grass:'#a4b394',lip:'#8fa091',road:'#e2c899'}
  ];
  const hub=islands[0], divisions=42;
  function rim(i,a,k,y) {
    const undulation=1 + .048*Math.sin(3*a+i.seed)+.039*Math.cos(5*a-i.seed)+.022*Math.sin(8*a+i.seed*.61);
    const xx=Math.cos(a)*i.rx*k*undulation, zz=Math.sin(a)*i.rz*k*undulation;
    const co=Math.cos(i.angle),si=Math.sin(i.angle);
    return v(i.x+xx*co-zz*si,y,i.z+xx*si+zz*co);
  }
  function arc(b, i, from, to, factor, y, width, col) {
    const points=[], n=Math.max(8,Math.floor((to-from)*12));
    for(let t=0;t<=n;t++) points.push(rim(i,from+(to-from)*t/n,factor,y));
    ribbon(b,points,width,col);
  }
  function cliff(i) {
    // Shelf rings widen into sandy shallows; the lowest ring sits just below the tide line.
    const rings=[[.9,.001],[.953,-.08],[.988,-.30],[1.015,-.55],[1.07,-.63],[1.105,-.82],[1.12,-.96]];
    for(let idx=0;idx<divisions;idx++) {
      const a=tau*idx/divisions,n=tau*(idx+1)/divisions;
      triangle(solids,v(i.x,.001,i.z),rim(i,n,.90,.001),rim(i,a,.90,.001),i.grass);
      const colors=[i.grass,i.lip,pick(['#b79473','#c29d76','#b89776','#bd9877']), '#cfb28b','#e6c89a','#f0d8ad'];
      for(let j=0;j<rings.length-1;j++) {
        const [k,y]=rings[j],[nk,ny]=rings[j+1];
        quad(solids,rim(i,a,k,y),rim(i,n,k,y),rim(i,n,nk,ny),rim(i,a,nk,ny),colors[j]);
      }
      // Quiet, irregular pale bands put each island in a shallow lagoon.
      const bands=[[1.10,1.18,'#c7e4d6'],[1.18,1.34,'#a1d1c5'],[1.34,1.48,'#a7d6cd']];
      for(const [inn,out,col] of bands)
        quad(sea,rim(i,a,inn,waterY+.011),rim(i,n,inn,waterY+.011),rim(i,n,out,waterY+.011),rim(i,a,out,waterY+.011),col);
    }
    arc(sea,i,.12,1.67,1.15,waterY+.026,.056,'#edf1d9');
    arc(sea,i,1.78,2.24,1.17,waterY+.026,.042,'#edf1d9');
    arc(sea,i,3.65,4.96,1.16,waterY+.026,.049,'#d9ede1');
    arc(sea,i,5.5,6.10,1.26,waterY+.025,.032,'#d1e8db');
  }
  for(const i of islands) cliff(i);

  // A small quay and broad ochre promenade leave the van fully visible.
  disk(markings,hub.x,hub.z,.016,2.01,1.73,hub.road);
  disk(markings,hub.x,hub.z,.020,1.32,1.14,'#e9d6aa');
  function courtyard(i) {
    disk(markings,i.x,i.z,.012,i.rx*.60,i.rz*.57,i.road,30);
  }
  function post(x,z,y,scale=1) {
    box(x,y+.21*scale,z,.123*scale,.51*scale,.125*scale,'#926b53');
    box(x,y+.47*scale,z,.15*scale,.065*scale,.15*scale,'#ecd0a2');
  }
  const passages=[];
  function makeBridge(i) {
    const dx=i.x-hub.x,dz=i.z-hub.z,d=Math.hypot(dx,dz),ux=dx/d,uz=dz/d;
    const adjacent=(isle,fromX,fromZ) => {
      const co=Math.cos(isle.angle),si=Math.sin(isle.angle);
      const xx=fromX*co+fromZ*si,zz=-fromX*si+fromZ*co;
      return 1/Math.hypot(xx/isle.rx,zz/isle.rz);
    };
    const near=adjacent(hub,ux,uz)*.79, far=d-adjacent(i,-ux,-uz)*.76;
    const start=v(hub.x+ux*near,0,hub.z+uz*near),end=v(hub.x+ux*far,0,hub.z+uz*far);
    const length=far-near,width=i.id==='palace1'?1.82:1.68,yaw=Math.atan2(ux,uz);
    const point=(t,side,y) => v(hub.x+ux*t+uz*side,y,hub.z+uz*t-ux*side);
    const path=[v(hub.x,.023,hub.z),point(near-.75,.10,.023),point(near,0,.023)];
    ribbon(markings,path,1.51,hub.road);
    ribbon(markings,[point(far,0,.025),point(far+.9,.10,.025),point(d,-.25,.025)],1.55,i.road);
    passages.push({start,end,width});
    for(const s of [-1,1]) {
      const side=s*(width*.38);
      const a=point(near,side,-.12),b=point(far,side,-.12);
      beam(a,b,.16,'#926a51');
    }
    const count=Math.ceil(length/.31);
    const plankColors=['#c89a6c','#d4a775','#dfb384','#d4a878','#dfb482'];
    for(let k=0;k<count;k++) {
      const t=near+(k+.5)*length/count, p=point(t,0,.016);
      box(p.x,.016,p.z,width+(random()-.5)*.065,.105,length/count-.019,pick(plankColors),yaw);
      if(k%3===0) {
        const p1=point(t+.034,-width*.36,.071),p2=point(t+.034,-width*.16,.071);
        ribbon(markings,[p1,p2],.014,'#c29068');
      }
    }
    const sections=Math.max(2,Math.ceil(length/1.55));
    for(const s of [-1,1]) {
      for(let k=0;k<=sections;k++) {
        const t=near+(far-near)*k/sections, p=point(t,s*(width/2+.065),0);
        box(p.x,-.25,p.z,.14,1.41,.14,'#926c54',yaw);
        box(p.x,.48,p.z,.17,.07,.17,'#f4daad',yaw);
        if(k===0||k===sections) box(p.x,.31,p.z,.15,.09,.15,'#eee0b3',yaw);
        if(k<sections) {
          const n=point(t+(far-near)/sections,s*(width/2+.065),.33);
          const a=point(t,s*(width/2+.065),.33),m=a.clone().lerp(n,.5);m.y-=.085;
          beam(a,m,.028,'#ead2a7');beam(m,n,.028,'#ead2a7');
        }
      }
    }
  }
  for(const i of islands.slice(1)) {courtyard(i);makeBridge(i);}

  function pine(x,z,s,scheme) {
    piece(solids,'pole',x,.52*s,z,.112*s,1.04*s,.11*s,'#866a4f',.25);
    const palette=scheme||['#6d9980','#83ad88','#9ebc8b'];
    piece(solids,'cone',x,.85*s,z,.67*s,1.14*s,.59*s,palette[0],.16);
    piece(solids,'cone',x,1.23*s,z,.53*s,1.03*s,.50*s,palette[1],.43);
    piece(solids,'cone',x,1.56*s,z,.35*s,.84*s,.34*s,palette[2],.11);
  }
  function broadTree(x,z,s,blossom=false) {
    piece(solids,'pole',x,.60*s,z,.115*s,1.17*s,.12*s,'#907559',.22,.08);
    beam(v(x,.71*s,z),v(x+.38*s,1.18*s,z+.04*s),.093*s,'#92765b');
    const p=blossom?['#ce9a88','#e1aa98','#e9c0ab']:['#789c72','#94b37c','#adc592'];
    piece(solids,'roundLeaf',x-.12*s,1.45*s,z,.69*s,.75*s,.60*s,p[0],1.2);
    piece(solids,'leaf',x+.37*s,1.29*s,z+.08*s,.48*s,.52*s,.44*s,p[1],.3);
    piece(solids,'leaf',x-.12*s,1.85*s,z,.42*s,.40*s,.43*s,p[2],.8);
  }
  function stone(x,z,sz,scheme='green') {
    const p=scheme==='moon'?['#9fa7a0','#b2b9ac','#c6c5b0']:['#94a48a','#a9b199','#bac0a0'];
    piece(solids,'leaf',x,sz*.19,z,sz*.79,sz*.49,sz*.66,pick(p),random()*tau,random()*.18);
    piece(solids,'leaf',x+.58*sz,.13*sz,z+.33*sz,.41*sz,.26*sz,.36*sz,p[2],random()*tau);
  }
  function grass(x,z,s,shade,flower=false) {
    for(let j=-1;j<=1;j++) {
      piece(solids,'cone',x+j*.065*s,.17*s,z+.025*s*j,.040*s,(.34-.035*Math.abs(j))*s,.043*s,shade,.1,j*-.22);
    }
    if(flower) {
      piece(solids,'leaf',x,.35*s,z,.093*s,.068*s,.083*s,pick(['#f4ce80','#f2d9b5','#deab88']),.16);
    }
  }
  function scatter(i) {
    const direction=Math.atan2(hub.z-i.z,hub.x-i.x);
    const clear=(a) => Math.abs(Math.atan2(Math.sin(a-direction),Math.cos(a-direction)))>.58;
    const garden=i.id==='palace1'||i.id==='palace2';
    if(i.id!=='hub') {
      for(let j=0;j<10;j++) {
        const a=tau*(j+.24+random()*.29)/10;
        if(!clear(a))continue;
        const loc=rim(i,a,.78+random()*.07,.01);
        if(i.id==='moon') { if(j%3!==2)stone(loc.x,loc.z,.45+random()*.48,'moon'); }
        else if((Math.sin(a)<.10 && j%2===0)|| (garden&&j===2)) {
          if(garden||i.id==='tower') broadTree(loc.x,loc.z,.70+random()*.2,garden&&j%3!==0);
          else pine(loc.x,loc.z,.78+random()*.3,['#658879','#789d81','#93ad87']);
        } else if(j%3===1) {
          stone(loc.x,loc.z,.43+random()*.26);
        } else {
          piece(solids,'leaf',loc.x,.23,loc.z,.46,.31,.36,pick(['#8fae75','#9fb77f','#93b284']),random()*tau);
          piece(solids,'leaf',loc.x+.27,.14,loc.z+.12,.27,.21,.28,'#b7c789',random()*tau);
        }
      }
    }
    for(let j=0;j<25;j++) {
      const a=random()*tau;
      if(!clear(a)||i.id==='hub'&&j%2)continue;
      const loc=rim(i,a,.71+random()*.16,.013);
      grass(loc.x,loc.z,.42+random()*.59,pick(i.id==='moon'?['#a0a993','#bbc1ad']:['#8fa666','#9aab70','#91ae7a']),garden||i.id==='tower');
    }
  }
  for(const i of islands)scatter(i);
  // Harbour furniture is on the west and east shoulders, clear of the radial lanes.
  function lamp(x,z,yaw=0) {
    piece(solids,'prism',x,.073,z,.17,.14,.17,'#ac997b');
    piece(solids,'pole',x,.62,z,.054,1.04,.054,'#637d72');
    piece(solids,'prism',x,1.19,z,.13,.075,.13,'#61796e',yaw);
    box(x,1.33,z,.19,.21,.19,'#f9e9bc',yaw);
    piece(solids,'cone',x,1.52,z,.20,.16,.20,'#668375',yaw);
  }
  lamp(2.97,2.60);
  // Low quay bollards, coiled-rope wharf, and candy-striped harbour marker.
  for(let k=0;k<10;k++) box(-.30+k*.22,-.10,4.95,.21,.13,1.05,'#cda376');
  for(const xx of [-.35,1.72])for(const zz of [4.47,5.4])post(xx,zz,-.14,.90);
  for(const [x,z] of [[-.52,3.91],[1.27,4.07]]) {
    piece(solids,'prism',x,.09,z,.13,.18,.13,'#717c6c');piece(solids,'prism',x,.20,z,.19,.055,.19,'#a99877');
  }
  function stripedPole(x,z,y,s) {
    for(let k=0;k<4;k++)piece(solids,'pole',x,y+(.15+k*.29)*s,z,.095*s,.30*s,.095*s,k%2?'#f7e4bf':'#d6835c');
    piece(solids,'cone',x,y+1.28*s,z,.15*s,.23*s,.15*s,'#b36549');
  }
  stripedPole(.74,5.29,-.08,.9);
  // Docked wooden skiff, curved hull and contrasting loose oars.
  function skiff(x,z,yaw) {
    const pt=(xx,yy,zz)=>v(x+xx*Math.cos(yaw)+zz*Math.sin(yaw),yy,z-xx*Math.sin(yaw)+zz*Math.cos(yaw));
    const hull=[[-.07,-1.0],[.28,-.74],[.38,-.1],[.31,.65],[.11,.92],[-.16,.88],[-.34,.49],[-.38,-.30],[-.28,-.75]];
    for(let j=0;j<hull.length;j++){
      const a=hull[j],b=hull[(j+1)%hull.length],scaled=(p,k,h)=>pt(p[0]*k,h,p[1]*k);
      quad(solids,scaled(a,1,-.49),scaled(b,1,-.49),scaled(b,.63,-.87),scaled(a,.63,-.87),'#ba7454');
      quad(solids,scaled(a,.84,-.49),scaled(a,1,-.49),scaled(b,1,-.49),scaled(b,.84,-.49),'#f2d8a7');
      triangle(solids,pt(0,-.51,0),scaled(b,.84,-.49),scaled(a,.84,-.49),'#845f4e');
    }
    for(const zz of [-.41,.31]){const p=pt(0,-.45,zz);box(p.x,p.y,p.z,.57,.055,.12,'#d7b68a',yaw);}
    beam(pt(-.25,-.38,-.62),pt(.28,-.34,.79),.047,'#dbbb91');
  }
  skiff(.73,6.14,-1.31);

  // Five different garden treatments tell visitors which dock they are approaching.
  function ellipseMark(x,z,y,rx,rz,weight,col,start=0,end=tau) {
    const points=[];
    for(let j=0;j<=34;j++){
      const a=start+(end-start)*j/34;
      points.push(v(x+Math.cos(a)*rx,y,z+Math.sin(a)*rz));
    }
    ribbon(markings,points,weight,col);
  }
  // Tiny working harbour light and painted four-point compass at the arrival plaza.
  {
    const x=-3.33,z=1.16;
    disk(markings,x,z,.023,.60,.50,'#dcc697');
    for (const [h,rad,height,c] of [[.16,.39,.30,'#d6c5a1'],[.42,.30,.24,'#c8795a'],[.64,.29,.20,'#f3dec0'],[.84,.25,.20,'#c8795a'],[1.03,.22,.18,'#f3dec0']])
      piece(solids,'prism',x,h,z,rad,height,rad,c,.3);
    piece(solids,'prism',x,1.17,z,.31,.085,.31,'#6f8b7b',.3);
    piece(solids,'prism',x,1.33,z,.205,.25,.205,'#f6d77e',.3);
    for(const a of [0,2.1,4.2])piece(solids,'pole',x+Math.cos(a)*.19,1.34,z+Math.sin(a)*.19,.021,.28,.021,'#687c70');
    piece(solids,'cone',x,1.53,z,.32,.21,.32,'#a75c49',.3);
    piece(solids,'pole',x,1.69,z,.035,.16,.035,'#946551');
    ellipseMark(0,1.4,.034,1.29,1.13,.042,'#bbac83');
    for(let j=0;j<4;j++){
      const a=j*Math.PI/2+.22,dx=Math.cos(a),dz=Math.sin(a);
      const center=v(0,.035,1.4),tip=v(dx*.98,.035,1.4+dz*.98);
      triangle(markings,center,tip,v(-dz*.17,.035,1.4+dx*.17),j%2?'#eadaba':'#bcb18b');
      triangle(markings,center,v(dz*.17,.035,1.4-dx*.17),tip,j%2?'#d6c499':'#f2e1b9');
    }
  }
  function courtyardLamp(x,z,s) {
    piece(solids,'prism',x,.07*s,z,.18*s,.14*s,.18*s,'#a0a68b');
    piece(solids,'pole',x,.64*s,z,.042*s,1.18*s,.042*s,'#827361');
    piece(solids,'prism',x,1.29*s,z,.17*s,.23*s,.17*s,'#c77955',.26);
    piece(solids,'prism',x,1.41*s,z,.10*s,.045*s,.10*s,'#a16b4e');
    piece(solids,'pole',x,1.08*s,z,.024*s,.12*s,.024*s,'#e4ac53');
  }
  courtyardLamp(-2.05,-9.96,.95);courtyardLamp(2.12,-10.02,.95);
  courtyardLamp(8.15,-3.62,.83);courtyardLamp(10.19,-2.20,.83);
  // The courtyard pool, lotus leaves and rock garden sit beside the palace steps.
  disk(markings,12.82,-3.18,.021,.99,.54,'#a5b59b',24);
  disk(markings,12.82,-3.18,.026,.85,.42,'#8fb8a7',24);
  for(const [dx,dz] of [[-.38,.03],[.15,-.17],[.35,.07]]) {
    disk(markings,12.82+dx,-3.18+dz,.031,.115,.081,'#a7bf86',10);
    piece(solids,'leaf',12.82+dx+.035,.072,-3.18+dz,.045,.035,.045,'#e0af9d');
  }
  for(const [x,z,r] of [[-13.55,-5.89,.46],[-13.13,-4.01,.32],[-10.84,-7.44,.55],[-9.25,-7.23,.29]]){
    disk(markings,x,z,.019,r,r*.68,'#acb3a2',22);
    disk(markings,x+.035,z+.035,.023,r*.81,r*.47,'#c4c6af',22);
    ellipseMark(x,z,.031,r,r*.68,.033,'#e0d9bc',.09,2.62);
  }
  // Salt-tolerant pines, soft pink plum blossoms and a small flag line at the tabletop.
  broadTree(-2.83,-13.70,1.16,true);
  broadTree(12.92,-7.23,1.06,true);
  pine(11.98,8.62,.79,['#5e8278','#749485','#91a997']);
  pine(12.32,7.82,1.05,['#617e76','#719084','#8ea99a']);
  const pennantA=v(-11.55,1.21,8.18),pennantB=v(-10.86,1.18,9.66);
  for(const q of [pennantA,pennantB])piece(solids,'pole',q.x,.61,q.z,.05,1.21,.05,'#9e8059');
  beam(pennantA,pennantB,.025,'#8e826a');
  for(let n=0;n<5;n++){
    const a=pennantA.clone().lerp(pennantB,.055+n*.18),b=pennantA.clone().lerp(pennantB,.18+n*.18);
    const c=a.clone().lerp(b,.5);c.y-=.23;
    const hue=['#dc8c64','#f1c46e','#74a799'][n%3];
    triangle(solids,a,b,c,hue);triangle(solids,b,a,c,hue);
  }

  // Little patches of reflected sky, rocks, surf lines, and colourful channel buoys.
  function wave(x,z,len,yaw,width=.042,tone='#d1e8dd') {
    const ps=[];
    for(let j=0;j<7;j++) {
      const u=(j/6-.5)*len,k=Math.sin((j/6)*Math.PI*1.6)*.060;
      ps.push(v(x+u*Math.cos(yaw)-k*Math.sin(yaw),waterY+.036,z+u*Math.sin(yaw)+k*Math.cos(yaw)));
    }
    ribbon(sea,ps,width,tone);
  }
  for(let j=0;j<290;j++){
    const x=(random()-.5)*89,z=(random()-.5)*77;
    if(islands.some(i=>Math.hypot((x-i.x)/(i.rx*1.18),(z-i.z)/(i.rz*1.18))<1))continue;
    const len=.27+random()*1.45,yaw=-.11+random()*.24;
    wave(x,z,len,yaw,.024+random()*.023,pick(['#bddfd5','#c4e1d6','#c6e3d8','#b5dad0']));
    if(j%4===0)wave(x+.34,z+.19,len*.57,yaw,.033,'#c2dfd5');
  }
  function buoy(x,z,accent) {
    disk(sea,x,z,waterY+.056,.44,.31,'#92c6bd',20);
    piece(solids,'prism',x,-.68,z,.20,.38,.20,accent);
    piece(solids,'prism',x,-.55,z,.205,.12,.205,'#f5e8cc');
    piece(solids,'cone',x,-.38,z,.19,.27,.19,accent);
    piece(solids,'pole',x,-.22,z,.049,.22,.049,'#728678');
    wave(x-.17,z+.48,1.06,.05,.035,'#dcf0df');
  }
  buoy(-14,1.65,'#be7860');buoy(14.9,1.55,'#b96952');buoy(-1.8,8.6,'#d5955b');
  function shoal(x,z,s) {
    disk(sea,x,z,waterY+.015,.96*s,.60*s,'#a2cfc3');
    piece(solids,'leaf',x,-.83+.16*s,z,.61*s,.43*s,.48*s,'#98a899',.65);
    piece(solids,'leaf',x+.60*s,-.83+.08*s,z+.17*s,.32*s,.20*s,.25*s,'#b1bba6',.42);
    wave(x+.03,z+.62*s,s*1.36,.04,.045,'#dcedde');
  }
  shoal(-17.1,-.5,.81);shoal(15.5,7.5,.64);shoal(3.7,12.2,.53);shoal(7.2,-14.2,.57);

  const water = new T.Mesh(new T.PlaneGeometry(400,400),new T.MeshBasicMaterial({ color:0xaad9d1 }));
  water.name='Sea salt water';water.rotation.x=-Math.PI*.5;water.position.y=waterY;world.add(water);
  const lit=new T.MeshStandardMaterial({vertexColors:true,roughness:.91,metalness:0});
  const ink=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,toneMapped:false});
  world.add(meshFor(sea,ink,'Coastal shallows and currents',false));
  world.add(meshFor(solids,lit,'Cliffs, bridges, docks and gardens',true));
  const roadMesh=meshFor(markings,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}),'Harbour lanes',false);
  roadMesh.receiveShadow=true;world.add(roadMesh);
  // Gliding shorebirds are one small animated mesh.
  const flock=batch();
  for(const [xx,zz,scale] of [[0,0,1],[.69,.46,.66],[-.5,.77,.60]]){
    const a=v(xx-.47*scale,0,zz+.12*scale),b=v(xx-.14*scale,.04*scale,zz-.04*scale);
    const c=v(xx,.00,zz+.02*scale),d=v(xx+.17*scale,.05*scale,zz-.08*scale),e=v(xx+.43*scale,.01*scale,zz+.10*scale);
    beamBird(a,b,c,d,e);
    function beamBird(a,b,c,d,e) {
      for (const [p,q] of [[a,b],[b,c],[c,d],[d,e]]) {
        const p1=p.clone(),q1=q.clone(); p1.z+=.07*scale;q1.z+=.06*scale;
        quad(flock,p,p1,q1,q,'#faf5d9');
      }
    }
  }
  const birds=meshFor(flock,ink,'Harbour terns',false);
  world.add(birds);
  function update(t) {
    birds.position.set(-15+Math.sin(t*.10)*.95,2.75+.19*Math.sin(t*.80),.50+.56*Math.cos(t*.16));
    birds.rotation.y=.12+.20*Math.sin(t*.15);
  }
  function isDriveable(x,z) {
    // Clip the car to the turf, with a wheel-width margin on the boardwalks.
    for(const i of islands){
      const dx=x-i.x,dz=z-i.z,co=Math.cos(i.angle),si=Math.sin(i.angle);
      const xx=dx*co+dz*si,zz=-dx*si+dz*co;
      const a=Math.atan2(zz/i.rz,xx/i.rx);
      const edge=1+.048*Math.sin(3*a+i.seed)+.039*Math.cos(5*a-i.seed)+.022*Math.sin(8*a+i.seed*.61);
      if(Math.hypot(xx/i.rx,zz/i.rz)<.935*edge)return true;
    }
    for(const p of passages){
      const dx=p.end.x-p.start.x,dz=p.end.z-p.start.z;
      const f=Math.max(0,Math.min(1,((x-p.start.x)*dx+(z-p.start.z)*dz)/(dx*dx+dz*dz)));
      if(Math.hypot(x-p.start.x-dx*f,z-p.start.z-dz*f)<p.width*.5-.07)return true;
    }
    return false;
  }
  update(0);
  Object.values(shapes).forEach(g=>g.dispose());
  return {update,isDriveable};
}
