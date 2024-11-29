import * as mathjs from 'mathjs'

class mass_spring_damper {
  var m = 1;
  var c = 0.1;
  var k = 1;
  var x = [0.1,0]; //x,xp

  constructor(mass,damping,stiffness){
    this.m = mass;
    this.c = damping;
    this.k = stiffness;
  }

  mathspringdamper_sim(t, x_in){
    var xpp = -x_in[1]*c/m - x_in[0]*c/m;
    var xp = x_in[1];
    return [xp, xpp];
  }

  solvemsd(t_series, x_0){
    return mathjs.solveode(mathspringdamper_sim, t_series, x_0)
  }

}
export class mass_spring_damper
