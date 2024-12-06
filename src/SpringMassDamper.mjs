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
  let board = JXG.JSXGraph.initBoard('app',{pan: {enabled:false},showNavigation:false, browserPan: {enabled:false},axis: true, grid: false});
  let y= math.zeros(100).toArray();
  let t = math.range(0,10,0.3,true).toArray();
  let scrollold = document.getScroll();

  let MSD = new mass_spring_damper(1, 0.3, 1);
  let g3 = board.create('curve', [t, y], {strokeColor: 'red', strokeWidth: '2px'});
  let x_0 = [1,0];
  function Calc_and_draw() {
    let scrollnew = document.getScroll();
    x_0 = [scrollnew[1]/10-scrollold[1]/10+x_0[0],x_0[1]]
    scrollold=scrollnew;
    //let Result =math.solveODE(MSD.mathspringdamper_sim, [0, 0.1], x_0)

    // let t = MSD.gettimeseries(0, 100, 10 / 100);
    let out= MSD.solvemsd(math.matrix([0,0.2]),x_0);

    y.unshift(out[1][0]);
    x_0 = out[1];
    board.update();
    //let Bounding_Box = []
    }
  setInterval(Calc_and_draw,100);
}
function drawmassspringdamper()
{
  let MSD = new mass_spring_damper(1, 0.1, 5);
  let t = MSD.gettimeseries(0, 100, 10/100);
  let y = MSD.solvemsd(t, [1, 0]);
  //let Bounding_Box = []
  let board = JXG.JSXGraph.initBoard('app',{pan: {enabled:false},showNavigation:false, browserPan: {enabled:false},axis: true, grid: false});
  let g3 = board.create('curve', [t.toArray(),y], {strokeColor:'red', strokeWidth:'2px'});
}

//drawmassspringdamper();
livemassspringdamper();
//document.querySelector('#app').innerHTML = drawnfunction;
