import {create, all, string} from 'mathjs';
import * as JXG from "jsxgraph";

const SecColor = "#FE8100"

const config = {
  relTol: 1e-12,
  absTol: 1e-15,
  matrix: 'Matrix',
  number: 'number',
  precision: 64,
  predictable: false,
  randomSeed: null
};
const math = create(all, config);
function linspace(start, stop, num, endpoint = true) {
  const div = endpoint ? (num - 1) : num;
  const step = (stop - start) / div;
  return Array.from({length: num}, (_, i) => start + step * i);
}
export class mass_spring_damper {
  m = 1;
  c = 0.1;
  k = 1;
  x = [0.1,0]; //x,xp
  w0 = 1;

  constructor(mass,damping,stiffness,Startbedingungen){
    this.m = mass;
    this.c = damping;
    this.k = stiffness;
    this.x = Startbedingungen;
    this.w0 = math.sqrt(this.m/this.k)
  }

  gettimeseries(tstart,tstop,points){
    return math.range(tstart,tstop,points,true);
  }
  mathspringdamper_sim(t, x_in){
    var xpp = -x_in[1]*this.k/this.m - x_in[0]*this.c/this.m;
    var xp = x_in[1];
    return [xp, xpp];
  }

  dotimestep(dt)
  {
    this.solvemsd([0,dt], x0)
  }
  solvemsd(t_end, x_0){
    let m = this.m;
    let k = this.k;
    let c = this.c;
    function mathspringdamper_sim(t, x_in){
      var xpp = - x_in[0]*k/m - x_in[1]*c/m;
      var xp = x_in[1];
      return [xp, xpp];
    }

    let t_last=0;
    let returnarray = [];
    returnarray.push(x_0[0])
    this.x = x_0;
    let OdeResult =[];


    let OdeResultFull=(math.solveODE(mathspringdamper_sim, [0,t_end], this.x));
    this.x = OdeResultFull.y.at(-1); //letzte position
    return OdeResultFull;
  }
}


document.getScroll = function() {
  if (window.pageYOffset != undefined) {
    return [pageXOffset, pageYOffset];
  } else {
    var sx, sy, d = document,
        r = d.documentElement,
        b = d.body;
    sx = r.scrollLeft || b.scrollLeft || 0;
    sy = r.scrollTop || b.scrollTop || 0;
    console.log(sy);
    return [sy];

  }
}


function livemassspringdamper(plottype = "time",divid, scrollexitation = false )
{

  let t_max = 100;
  let Pointnumber = 200;
  let max_x_width = 30;
  let x_0 = [1,0];

  let t = [0];
  let y = [x_0[0]];
  let yp = [x_0[1]];
  let EKP = []; 
  let p;
  let ypoint = 0;
  let yppoint = 0;
  let EKPpoint = 0;

  let axmin = -0.1;
  if (plottype == "energy")
      axmin=0;
  let axmax = max_x_width+5;

  let last_t = 0
  let board

  //let y= math.zeros(Pointnumber).toArray();
 // let t = math.range(0,10,0.3,true).toArray();
  let scrollold = document.getScroll();

  let MSD = new mass_spring_damper(1, 0.3, 10);
  let g3, ax, ax2
  if (plottype == "time" || plottype == "energy")
  {
    board = JXG.JSXGraph.initBoard(divid,{shadow: true, boundingbox: [0, 2, 40, -2],pan: {enabled:false},showNavigation:false, browserPan: {enabled:false},axis: false, grid: false});

    if (plottype == "time")
      g3 = board.create('curve', [t, y], {strokeColor: SecColor, strokeWidth: '2px', shadow: true});
    if (plottype == "energy")
      g3 = board.create('curve', [y, yp], {strokeColor: SecColor, strokeWidth: '2px', shadow: true});

    ax =  board.create('axis', [[axmin,0], [axmax,0]] ,{shadow:false,ticks: { visible: true,label:{anchorX: 'middle',offset: [0, -20]}} }); //x
    ax2 = board.create('axis', [[axmin,-2],[axmin,2]],{shadow:false,ticks: { visible: true,label:{anchory: 'middle',offset: [-30, 0]}} }); //y

    board.create('ticks',[ax, 30],{ticksDistance:5,shadow:false,minorTicks:4, majorHeight:20, minorHeight:4});
    let Newboundingbox = board.getBoundingBox();
    Newboundingbox[0] = 0-max_x_width*0.2
    Newboundingbox[2] = 0+max_x_width*1.1;

    if (plottype == "energy")
      Newboundingbox = [-1.1,1.1/MSD.w0,1.1,-1.1/MSD.w0];
    board.setBoundingBox(Newboundingbox);
  }
  else if (plottype == "3denergy")
  {
    board = JXG.JSXGraph.initBoard(divid,{boundingbox: [-10,6 , 8, -6],pan: {enabled:false},showNavigation:false,});

    let bound = [-1, 1];
    let view = board.create('view3d',
        [[-6, -3],
          [8, 8],
          [bound, bound, [0, 1]]],
        {
          xPlaneRear: { visible: false },
          yPlaneRear: { visible: false },

          xAxis: { strokeColor: 'blue'},
        });
    let g3 = view.create('curve3d', [y, yp, EKP], {
      strokeWidth: 2, strokeColor: SecColor
    });
    const Daempfungskonstante = MSD.c/(2*Math.sqrt(MSD.m*MSD.k))

    p = view.create('point3d', [ypoint,yppoint,EKPpoint])

    let c = view.create('parametricsurface3d', [
      (t,a) => Math.cos(a)*Math.exp(-t*t*Daempfungskonstante),
      (t,a) => Math.sin(a)*Math.exp(-t*t*Daempfungskonstante),
      (t,a) => Math.exp(-t*t*Daempfungskonstante)*Math.exp(-t*t*Daempfungskonstante),
      [0, Math.sqrt(-1*Math.log(0.01)/Daempfungskonstante)],
        [0,2*Math.PI]
    ],{
      strokeColor: '#BBBBBB'})
  }


  let Lastcycle = Date.now();
  function Calc_and_draw() {
    let scrollnew = document.getScroll();
    if (scrollexitation){
        x_0 = [scrollnew[1]/100-scrollold[1]/100+x_0[0],x_0[1]]}
    scrollold=scrollnew;
    //let Result =math.solveODE(MSD.mathspringdamper_sim, [0, 0.1], x_0)

    let Cycletime = (Date.now()-Lastcycle)/1000
    Lastcycle = Date.now();

    let mindt = math.sqrt(MSD.m/MSD.k)/(3.14*5)


    let out = MSD.solvemsd(Cycletime,x_0);
    for (let i = 1;i<out.t.length;i++){
      t.push(out.t[i]+last_t);
      y.push(out.y[i][0]);
      yp.push(out.y[i][1]);
      EKP.push(
          (1/2*MSD.k*out.y[i][0]*out.y[i][0]+
              1/2*MSD.m*out.y[i][1]*out.y[i][1])/
          (1/2*MSD.k)
      )
      ypoint    = y.slice(-1);
      yppoint   = yp.slice(-1);
      EKPpoint  = EKP.slice(-1);
      if (p != undefined)  p.setPosition([ypoint, yppoint, EKPpoint])
      x_0 = out.y.slice(-1)[0];
    }

    last_t += Cycletime;  //Leter Zeitschritt des neuen Zyklus

    if (plottype == "time") {
      if (((1 / 1.1 < math.max(y)) ||
          (-1 / 1.1 > math.min(y))
      )
      ) {
        let Newboundingbox = board.getBoundingBox();
        let range = ((math.max(y) > math.min(y) * -1) ? math.max(y) : math.min(y) * -1)
        Newboundingbox[1] = range * 1.1;
        Newboundingbox[3] = range * -1.1;
        board.setBoundingBox(Newboundingbox);
      }
      while (last_t - board.getBoundingBox()[0] > max_x_width) {
        t.shift();
        y.shift();
        yp.shift();
        let Newboundingbox = board.getBoundingBox();
        axmin = t[0] - max_x_width * 0.2;
        Newboundingbox[0] = t[0] - max_x_width * 0.2
        Newboundingbox[2] = t[0] + max_x_width * 1.1;
        board.setBoundingBox(Newboundingbox);
      }
    }
    board.update();
    window.requestAnimationFrame(Calc_and_draw);
    //let Bounding_Box = []
    }
  //window.requestAnimationFrame(Calc_and_draw);
  window.requestAnimationFrame(Calc_and_draw);
  //setInterval(Calc_and_draw,25);
}



function drawmassspringdamper()
{
  let MSD = new mass_spring_damper(1, 0.1, 15);
  let t = MSD.gettimeseries(0, 100, 10/100);
  let y = MSD.solvemsd(100, [1, 0])

  //let Bounding_Box = []
  let board2 = JXG.JSXGraph.initBoard('app2',{ boundingbox: [0, 1, 100, -1], pan: {enabled:false},showNavigation:false, browserPan: {enabled:false},axis: true, grid: false});
  let g2 = board2.create('curve', [t.toArray(),y[0]], {strokeColor:SecColor, strokeWidth:'2px',shadow: true});
  board2.update();
}

//drawmassspringdamper();drawmassspringdamper();
livemassspringdamper("energy","app");
//document.querySelector('#app').innerHTML = drawnfunction;
