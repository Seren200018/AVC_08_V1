import {create, all, string} from 'mathjs';
import * as JXG from "jsxgraph";

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

  constructor(mass,damping,stiffness){
    this.m = mass;
    this.c = damping;
    this.k = stiffness;
  }

  gettimeseries(tstart,tstop,points){
    return math.range(tstart,tstop,points,true);
  }
  mathspringdamper_sim(t, x_in){
    var xpp = -x_in[1]*this.k/this.m - x_in[0]*this.c/this.m;
    var xp = x_in[1];
    return [xp, xpp];
  }

  solvemsd(t_series, x_0){
    let m = this.m;
    let k = this.k;
    let c=this.c;
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
    for (let i=1;i<t_series.size();i++)
    {
      let OdeResultFull=(math.solveODE(mathspringdamper_sim, [0, t_series.get([i])-t_last], this.x));
      OdeResult = OdeResultFull.y.at(-1); //last result
      this.x = OdeResult;
      returnarray.push(this.x[0]);
      t_last = t_series.get([i]);
    }
    return [returnarray, OdeResult];
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


function livemassspringdamper()
{

  let t_max = 100;
  let Pointnumber = 200;
  let max_x_width = 30;

  let t = [0];
  let y = [0];
  let axmin = -0.1;
  let axmax = max_x_width+5;

  let last_t = 0
  let board = JXG.JSXGraph.initBoard('app',{shadow: true, boundingbox: [0, 2, 40, -2],pan: {enabled:false},showNavigation:false, browserPan: {enabled:false},axis: false, grid: false});

  let Newboundingbox = board.getBoundingBox();
  Newboundingbox[0] = t[0]-max_x_width*0.2
  Newboundingbox[2] = t[0]+max_x_width*1.1;
  board.setBoundingBox(Newboundingbox);

  //let y= math.zeros(Pointnumber).toArray();
 // let t = math.range(0,10,0.3,true).toArray();
  let scrollold = document.getScroll();

  let MSD = new mass_spring_damper(1, 0.01, 1);
  let g3 = board.create('curve', [t, y], {strokeColor: 'red', strokeWidth: '2px', shadow: true});
  let ax = board.create('axis', [[axmin,0],[axmax,0]],{shadow:false,ticks: { visible: true,label:{anchorX: 'middle',offset: [0, -20]}} });
  let ax2 = board.create('axis', [[axmin,-2],[axmin,2]],{shadow:false,ticks: { visible: true,label:{anchory: 'middle',offset: [-30, 0]}} });

  board.create('ticks',[ax, 30],{ticksDistance:5,shadow:false,minorTicks:4, majorHeight:20, minorHeight:4});
  let x_0 = [1,0];
  let Lastcycle = Date.now();
  function Calc_and_draw() {
    let scrollnew = document.getScroll();
    x_0 = [scrollnew[1]/100-scrollold[1]/100+x_0[0],x_0[1]]
    scrollold=scrollnew;
    //let Result =math.solveODE(MSD.mathspringdamper_sim, [0, 0.1], x_0)

    let Cycletime = (Date.now()-Lastcycle)/1000
    Lastcycle = Date.now();

    //Maximal 0.2s schritte bei Lag
    let t_calc = [0]; //Berchnungsarray initiaisieren
    //Solange 0.2s addieren bis es größer als Delay wäre
    while (t_calc.slice(-1)[0]+0.1 < Cycletime) {
      t_calc.push(t_calc.slice(-1)[0]+0.1)
    }
    t_calc.push(Cycletime); //Letzter schritt ist animationsdelay

    let out;
    for (let i=1;i<t_calc.length;i++) {
      out= MSD.solvemsd(math.matrix([0,t_calc[i]-t_calc[i-1]]),x_0);
      t.push(t_calc[i]+last_t);
      y.push(out[1][0]);
    }
    x_0 = out[1];
    last_t += Cycletime;  //Leter Zeitschritt des neuen Zyklus

    while (last_t-board.getBoundingBox()[0] > max_x_width) {
      t.shift();
      y.shift();
      let Newboundingbox = board.getBoundingBox();
      Newboundingbox[0] = t[0]-max_x_width*0.2
      Newboundingbox[2] = t[0]+max_x_width*1.1;
      board.setBoundingBox(Newboundingbox);
    }




    board.update();
    //let Bounding_Box = []
    }
  setInterval(Calc_and_draw,50);
}

function drawmassspringdamper()
{
  let MSD = new mass_spring_damper(1, 0.1, 5);
  let t = MSD.gettimeseries(0, 100, 10/100);
  let y = MSD.solvemsd(t, [1, 0])

  //let Bounding_Box = []
  let board2 = JXG.JSXGraph.initBoard('app2',{ boundingbox: [0, 1, 100, -1], pan: {enabled:false},showNavigation:false, browserPan: {enabled:false},axis: true, grid: false});
  let g2 = board2.create('curve', [t.toArray(),y[0]], {strokeColor:'red', strokeWidth:'2px',shadow: true});
  board2.update();
}

drawmassspringdamper();
livemassspringdamper();
//document.querySelector('#app').innerHTML = drawnfunction;
