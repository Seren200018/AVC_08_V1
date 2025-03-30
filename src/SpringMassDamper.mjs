import { create, all } from 'mathjs';
import * as JXG from 'jsxgraph';
import Plotly from 'plotly.js-dist-min';
import anime from 'animejs/lib/anime.es.js';
import rough from 'roughjs';

// Aktiviert MathJax für JSXGraph
JXG.Options.text.useMathJax = true;

// Farbeinstellungen und MathJax-Konfiguration
const SecColor = '#FE8100';
$SmjDisplayMath = [['\\[', '\\]']];
$SmjExtraInlineMath = [['\\(', '\\)']];

// Math.js-Konfiguration
const config = {
  relTol: 1e-12,
  absTol: 1e-15,
  matrix: 'Matrix',
  number: 'number',
  precision: 64,
  predictable: false,
  randomSeed: null,
};
const math = create(all, config);

// Funktion: Erzeugt eine gleichmäßige Verteilung zwischen zwei Werten
function linspace(start, stop, num, endpoint = true) {
  const div = endpoint ? num - 1 : num;
  const step = (stop - start) / div;
  return Array.from({ length: num }, (_, i) => start + step * i);
}

// Klasse: Modelliert ein Masse-Feder-Dämpfer-System
export class mass_spring_damper {
  m = 1; // Standardmasse
  c = 0.1; // Standarddämpfungskoeffizient
  k = 1; // Standardfederkonstante
  x = [0.1, 0]; // Anfangsposition und Anfangsgeschwindigkeit
  w0 = 1; // Eigenfrequenz

  constructor(mass, damping, stiffness, initialConditions) {
    this.m = mass;
    this.c = damping;
    this.k = stiffness;
    this.x = initialConditions;
    this.w0 = math.sqrt(this.m / this.k); // Eigenfrequenz berechnen
  }

  // Erzeugt eine Zeitreihe
  gettimeseries(tstart, tstop, points) {
    return math.range(tstart, tstop, points, true);
  }

  // Simulationsfunktion: Berechnet neue Geschwindigkeit und Beschleunigung
  mathspringdamper_sim(t, x_in) {
    const xpp = -x_in[1] * this.k / this.m - x_in[0] * this.c / this.m; // Beschleunigung
    const xp = x_in[1]; // Geschwindigkeit
    return [xp, xpp];
  }

  // Führt eine Zeitschrittberechnung aus (aktuell nicht implementiert)
  dotimestep(dt) {
    this.solvemsd([0, dt], this.x);
  }

  // Löser für das Masse-Feder-Dämpfer-System
  solvemsd(t_end, x_0, max_timestep = 1) {
    const m = this.m;
    const k = this.k;
    const c = this.c;

    // Funktion zur Berechnung der Dynamik des Systems
    function mathspringdamper_sim(t, x_in) {
      const xpp = -x_in[0] * k / m - x_in[1] * c / m; // Beschleunigung
      const xp = x_in[1]; // Geschwindigkeit
      return [xp, xpp];
    }

    // Initialisierungen für die Simulation
    const returnArray = [x_0[0]]; // Anfangsposition speichern
    this.x = x_0;

    // Differentialgleichung lösen
    const OdeResultFull = math.solveODE(mathspringdamper_sim, [0, t_end], this.x, {maxStep: max_timestep});

    // Aktualisiert den Zustand auf die letzte berechnete Position
    this.x = OdeResultFull.y.at(-1);
    return OdeResultFull;
  }
}

function Draw_MSD_Plot_to_div(plottype = "time", divid,canvasid, scrollexitation = false) {
  // Initialisiere das Masse-Feder-Dämpfer-System
  const MSD = new mass_spring_damper(1, 0.3, 10);

  // Parameter und Anfangswerte
  const max_x_width = 30; // Maximal sichtbare Breite
  let x_0 = [1, 0]; // Startbedingungen: Position und Geschwindigkeit
  const axmax = max_x_width + 5; // Maximale Achsenbreite
  let t = [0], y = [x_0[0]], yp = [x_0[1]];

  // Anfangsenergie berechnen (normiert auf maximale Energie)
  let EKP = [
    (0.5 * MSD.k * x_0[0] ** 2 + 0.5 * MSD.m * x_0[1] ** 2) / (0.5 * MSD.k)
  ];

  // Grenzwerte für die Achsen
  let axmin = plottype === "energy" ? 0 : -0.1;

  // Scrollzustand initialisieren
  //let scrollold = document.getScroll(), last_t = 0;

  let board, fig, p;

  // Board-Initialisierung basierend auf dem Typ der Darstellung
  if (plottype === "time" || plottype === "energy") {
    boardSetup();
  } else if (plottype === "3denergy") {
    init3DEnergyView();
  } else if (plottype === "plotly") {
    initPlotlyView();
  }

  // Zeitzyklus starten
  let lastCycle = Date.now();
  window.requestAnimationFrame(Calc_and_draw);

  /**
   * Initialisiert das 2D-Board (für Zeit- oder Energiedarstellung).
   */
  function boardSetup() {
    board = JXG.JSXGraph.initBoard(divid, {
      boundingbox: [0, 2, 40, -2],
      pan: { enabled: false },
      showNavigation: false,
      browserPan: { enabled: false },
      axis: false,
      grid: false,
    });

    // Erstelle die Kurve für Zeit- oder Energiedarstellung
    if (plottype === "time") {
      board.create('curve', [t, y], {
        strokeColor: SecColor,
        strokeWidth: '2px',
        shadow: true,
      });
    } else if (plottype === "energy") {
      board.create('curve', [y, yp], {
        strokeColor: SecColor,
        strokeWidth: '2px',
        shadow: true,
      });
    }

    // Achsen erstellen
    const xAxis = board.create('axis', [[axmin, 0], [axmax, 0]], {
      ticks: { visible: true, label: { anchorX: 'middle', offset: [0, -20] } },
    });
    const yAxis = board.create('axis', [[axmin, -2], [axmin, 2]], {
      ticks: { visible: true, label: { anchorY: 'middle', offset: [-30, 0] } },
    });
    board.create('ticks', [xAxis, 30], { ticksDistance: 5, minorTicks: 4 });

    // Passe den sichtbaren Bereich an
    adjustBoundingBox(plottype === "energy" ? [-1.1, 1.1, 1.1, -1.1] : [0 - max_x_width * 0.2, 2, max_x_width + max_x_width * 0.2, -2]);
  }

  /**
   * Initialisiert die 3D-Energiedarstellung.
   */
  function init3DEnergyView() {
    board = JXG.JSXGraph.initBoard(divid, {
      boundingbox: [-1.5, 1.5, 1.5, -1.5],
      pan: { enabled: false },
      showNavigation: false,
    });

    const view = board.create('view3d', [
      [-1, -1],
      [2, 2],
      [[-1, 1], [-1, 1], [0, 1]],
    ], {
      projection: 'parallel',
      xPlaneRear: { visible: true },
      yPlaneRear: { visible: true },
      xAxis: { strokeColor: 'red', name: "\\[ \\dot{y} \\]", withLabel: true },
      yAxis: { name: "\\[ y \\]", withLabel: true },
      zAxis: { name: "\\[ E_{GES} \\]", withLabel: true },
    });

    view.setView(0, 0, 1);

    // Energiekurve in 3D
    const g3 = view.create('curve3d', [y, yp, EKP], {
      strokeWidth: 2,
      strokeColor: SecColor,
    });
    p = view.create('point3d', [0, 0, 0]);
  }

  /**
   * Initialisiert die 3D-Darstellung mit Plotly.
   */
  function initPlotlyView() {
    fig = Plotly.newPlot(divid, [{
      type: 'scatter3d',
      mode: 'lines',
      x: y,
      y: yp,
      z: EKP,
      opacity: 1,
      line: { width: 2, colorscale: 'Viridis' },
    }]);
  }

  /**
   * Hauptberechnungs- und Darstellungsfunktion.
   */
  let last_t = 0;
  function Calc_and_draw() {

    if (scrollexitation) {
      x_0[0] += (scrollnew[1] - scrollold[1]) / 100;
    }


    const cycleTime = (Date.now() - lastCycle) / 1000;
    lastCycle = Date.now();

    const out = MSD.solvemsd(cycleTime, x_0, 0.5/MSD.w0);

    // Aktualisiere Zeit, Werte und Energie
    for (let i = 1; i < out.t.length; i++) {
      let time = out.t[i] + last_t;
      t.push(time);
      y.push(out.y[i][0]);
      yp.push(out.y[i][1] * MSD.w0);
      EKP.push((0.5 * MSD.k * out.y[i][0] ** 2 + 0.5 * MSD.m * out.y[i][1] ** 2) / (0.5 * MSD.k));

      if (p) p.setPosition([y[y.length - 1], yp[yp.length - 1], EKP[EKP.length - 1]]);
      x_0 = out.y.slice(-1)[0];

      // SMD zeichnen! Wenn Canvasid angegeben ist
      if (canvasid != null)
        drawmsdbyhand(x_0[0],canvasid)
    }

    last_t += cycleTime;

    // Passe den Bereich für Zeitplots dynamisch an
    if (plottype === "time") adjustBoundingBoxForTime();

    // Aktualisiere die Darstellung
    if (plottype !== "plotly") {
      board.update();
    } else {
      Plotly.redraw(divid);
    }

    if (EKP.slice(-1) > 0.001)
      window.requestAnimationFrame(Calc_and_draw);
    else
      console.log("Animation done!") //TO reduce load!
  }

  /**
   * Anpassung des Plots für Zeitdarstellungen bei Überschreitung der Grenzen.
   */
  function adjustBoundingBoxForTime() {
    const maxY = Math.max(...y), minY = Math.min(...y);
    if ((1 / 1.1 < maxY) || (-1 / 1.1 > minY)) {
      const range = Math.max(Math.abs(maxY), Math.abs(minY));
      adjustBoundingBox([0 - max_x_width * 0.2, range * 1.1, max_x_width + max_x_width * 0.2, range * -1.1]);
    }

    while (last_t - board.getBoundingBox()[0] > max_x_width) {
      t.shift();
      y.shift();
      yp.shift();
      adjustBoundingBox([t[0] - max_x_width * 0.2, board.getBoundingBox()[1], t[0] + max_x_width * 1.1, board.getBoundingBox()[3]]);
    }
  }

  /**
   * Aktuelle Bounding Box setzen.
   */
  function adjustBoundingBox(newBox) {
    board.setBoundingBox(newBox);
  }
}

function draw_mass_spring_damper_sketch(x, startX, startY, ctx, rc, shadow = true, shadowOffset = 10, Fulldrawpercentage = 1, drawbase=true, mass = 1, spring = 1, damper = 1,drawcenter=false) {
  const massCenterY = startY-150 + x * 25;
  const massPosY = massCenterY - 50;  // top-left corner
  const massPosX = startX - 50;       // center horizontally at base
  const springEndY = startY-20;// base is at mass center + half mass height
  const springXPos = damper > 0? massPosX -25:massPosX
  const numSpringSegments = 8;
  const blur = `blur(${1 + shadowOffset / 10}px)`;

  const linedraw = Fulldrawpercentage > 0.33 ? 1 : Fulldrawpercentage * 3;

  const masssize = Math.cbrt(mass);  // not used yet, could scale the box later

  if (drawcenter) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,0,0,1"
    ctx.moveTo(startX - 20, startY);
    ctx.lineTo(startX + 20, startY);
    ctx.moveTo(startX, startY - 20);
    ctx.lineTo(startX, startY + 20);
    ctx.stroke();
  }
  if (shadow) {
    // Draw shadow behind the mass and spring
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.filter = blur;
    ctx.strokeStyle = "rgba(0,0,0,1"
    // Shadow rectangle for mass
    ctx.fillRect(massPosX + shadowOffset, massPosY + shadowOffset, 100, 100);

    // Shadow Spring line top
    ctx.beginPath();
    ctx.moveTo(springXPos + 50 + shadowOffset, massPosY + 101 + shadowOffset);
    ctx.lineTo(springXPos + 50 + shadowOffset, massPosY + 121 + shadowOffset);
    ctx.stroke();

    // Shadow Spring line bot
    ctx.beginPath();
    ctx.moveTo(springXPos + 50 + shadowOffset, springEndY + shadowOffset);
    ctx.lineTo(springXPos + 50 + shadowOffset, springEndY + 20 + shadowOffset);
    ctx.stroke();

    if (damper > 0)
    {
      ctx.strokeStyle = "rgba(0,0,0,1"
      // Shadow Damper line top
      ctx.beginPath();
      ctx.moveTo(springXPos + 100 + shadowOffset, massPosY + 101 + shadowOffset);
      ctx.lineTo(springXPos + 100 + shadowOffset, massPosY + 141 + shadowOffset);
      ctx.stroke();
      //Horizontal damper top line
      ctx.beginPath();
      ctx.moveTo(springXPos + 80 + shadowOffset, massPosY + 141 + shadowOffset);
      ctx.lineTo(springXPos + 120 + shadowOffset, massPosY + 141 + shadowOffset);
      ctx.stroke();
      //Horizontal damper bottom line
      ctx.beginPath();
      ctx.moveTo(springXPos + 78 + shadowOffset, springEndY-60 + shadowOffset);
      ctx.lineTo(springXPos + 78 + shadowOffset, springEndY + shadowOffset);
      ctx.lineTo(springXPos + 122 + shadowOffset, springEndY + shadowOffset);
      ctx.lineTo(springXPos + 122 + shadowOffset, springEndY-60 + shadowOffset);
      ctx.stroke();
      // Shadow Damper line bot
      ctx.beginPath();
      ctx.moveTo(springXPos + 100 + shadowOffset, springEndY + shadowOffset);
      ctx.lineTo(springXPos + 100 + shadowOffset, springEndY + 20 + shadowOffset);
      ctx.stroke();

      ctx.fillRect(springXPos + 78+shadowOffset,massPosY + 140 + shadowOffset, 44,springEndY-massPosY-140)
    }


    // Shadow base
    if (drawbase) {
      ctx.beginPath();
      ctx.moveTo(startX + shadowOffset - 60, springEndY + 20 + shadowOffset);
      ctx.lineTo(startX + shadowOffset + 60, springEndY + 20 + shadowOffset);
      for (let i = 0; i < 30; i++) {
        ctx.moveTo(startX - 60 + i * 4 + shadowOffset, springEndY + 20 + shadowOffset);
        ctx.lineTo(startX - 60 + i * 4 + 7 + shadowOffset, springEndY + 27 + shadowOffset);
      }
      ctx.stroke();
    }

  } else {
    // Main graphics
    ctx.globalAlpha = 1;
    ctx.filter = "blur(0px)";
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.fillRect(massPosX, massPosY, 100, 100);

    rc.rectangle(massPosX, massPosY, 100, 100, { fill: 'grey', seed: 1 });

    //drawline from Spring to base
    rc.line(springXPos + 50, massPosY + 101, springXPos + 50, massPosY + 121, { seed: 4 });
    rc.line(springXPos + 50, springEndY, springXPos + 50, springEndY + 20, { seed: 1 });

    if (damper > 0)
    {
      // Shadow Damper line top

      rc.line(springXPos + 100, massPosY + 101,
        springXPos + 100, massPosY + 141, { seed: 12 });

      rc.line(springXPos + 80, massPosY + 141,
          springXPos + 120 , massPosY + 141, { seed: 13 });

      rc.line(springXPos + 78, springEndY-60,
          springXPos + 78, springEndY, { seed: 143 });

      rc.line(springXPos + 78, springEndY,
          springXPos + 122, springEndY, { seed: 147 });

      rc.line(springXPos + 122, springEndY,
          springXPos + 122, springEndY-60, { seed: 141 });

      rc.line(springXPos + 100, springEndY,
          springXPos + 100, springEndY+20, { seed: 145 });

      rc.rectangle(springXPos + 78, massPosY+ 141,44, springEndY-massPosY-140, { fill: 'white', seed: 2 ,fillStyle: 'solid'})
      rc.rectangle(springXPos + 78, massPosY+ 141,44, springEndY-massPosY-140, { fill: 'grey', seed: 2 })
    }


    //DrawBaseLine
    if (drawbase){
      rc.line(startX - 60, springEndY + 20, startX + 60, springEndY + 20, { seed: 2 });
      for (let i = 0; i < 30; i++) {
        rc.line(startX - 60 + i * 4, springEndY + 20, startX - 60 + i * 4 + 7, springEndY + 27, { seed: i + 1 });
      }
    }

  }

  // === Draw the zigzag spring ===
  const springSegmentLength = (springEndY - (massPosY + 121)) / (numSpringSegments - 1);
  let startPoint = [springXPos + 50, massPosY + 121];

  for (let i = 0; i < numSpringSegments; i++) {
    let endPoint;

    if (i === numSpringSegments - 1) {
      endPoint = [springXPos + 50, springEndY];
    } else {
      endPoint = [
        springXPos + 25 + 50 * (i % 2),
        (i + 0.5) * springSegmentLength + (massPosY + 121),
      ];
    }
    //Draw spring shadow
    if (shadow) {
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.filter = blur;
      ctx.beginPath();
      ctx.moveTo(startPoint[0] + shadowOffset, startPoint[1] + shadowOffset);
      ctx.lineTo(endPoint[0] + shadowOffset, endPoint[1] + shadowOffset);
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.filter = "blur(0px)";
      for (let j = -1; j < 1; j++) {
        for (let k = -1; k < 1; k++) {
          rc.line(
              startPoint[0] + j,
              startPoint[1] + k,
              endPoint[0] + k,
              endPoint[1] + j,
              { seed: 10 + j + k, strokeWidth: 0.5 }
          );
        }
      }
    }

    startPoint = endPoint;
  }
  //DrawMSDData
  if (Fulldrawpercentage > 0)
  {
    const circlefill = Fulldrawpercentage<0.1?Fulldrawpercentage*10:1
    rc.arc(massPosX+50,massPosY+50,8,8,Math.PI, Math.PI * 4*circlefill, true,{
      fill: SecColor,
      stroke: SecColor,
      fillStyle: 'solid',
      roughness:0.2,
      seed: 1
    })

    rc.arc(springXPos+50,springEndY+massPosY/2-75,8,8,Math.PI, Math.PI * 4*circlefill, true,{
      fill: SecColor,
      stroke: SecColor,
      fillStyle: 'solid',
      roughness:0.2,
      seed: 1
    })

    rc.arc(springXPos+100,springEndY+massPosY/2-65,8,8,Math.PI, Math.PI * 4*circlefill, true,{
      fill: SecColor,
      stroke: SecColor,
      fillStyle: 'solid',
      roughness:0.2,
      seed: 1
    })

    rc.line(massPosX+50,massPosY+50,170,110, {stroke:SecColor, seed:1})
    rc.line(170,110,210,110, {stroke:SecColor, seed:1})
    ctx.fillStyle = "rgba(0,0,0,1)"
    ctx.fillText(`m = ${mass}`, 175,107)

    rc.line(springXPos+50,springEndY+massPosY/2-75,40,210, {stroke:SecColor, seed:1})
    rc.line(40,210,20,210, {stroke:SecColor, seed:1})
    ctx.fillStyle = "rgba(0,0,0,1)"
    ctx.fillText(`k = ${spring}`, 21,208)

    rc.line(springXPos+100,springEndY+massPosY/2-65,170,240, {stroke:SecColor, seed:1})
    rc.line(170,240,210,240, {stroke:SecColor, seed:1})
    ctx.fillStyle = "rgba(0,0,0,1)"
    ctx.fillText(`d = ${damper}`, 172,238)
  }
}
  //Boden

let k=1
let sdir = 1;
function drawmsdbyhand(x, canvasID)
{
  //var canvas = document.getElementById('svg2');
  //var width = canvas.width;
  //var height = canvas.height;

  // Get SVG
  const canvas = document.getElementById(canvasID);
  const ctx = canvas.getContext('2d');

  const rc = rough.canvas(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Generate Rough Rectangle

  // === Estimate the bounding box of the drawing ===
  const sketchWidth = 120;   // width includes ground ticks
  const sketchHeight = 247 + x * 100; // max height from top of spring to ground base

  // === Center the drawing ===

  const startX = (canvas.width - sketchWidth) / 2;
  const startY = (canvas.height - sketchHeight) / 2;

  k+=0.1*sdir; 
  if (k>30) sdir=-1;
  if (k<0) sdir=1;

  //Draw Sketch Mass Spring Damper
  draw_mass_spring_damper_sketch(x,100+ -1*(k*0.4), 300+ -1*(k*0.4),ctx, rc,true,k )
  draw_mass_spring_damper_sketch(x,100+ -1*(k*0.4), 300+ -1*(k*0.4),ctx, rc,false,k )

  //Unterer Teil Masse
 // rc.line(masspositionx+25,130+masspositiony,masspositionx+74,150+masspositiony, {seed:1})
  //rc.line(masspositionx+74,150+masspositiony,masspositionx+25,180+masspositiony, {seed:1})

}


let pos_MSD = 0;
let position = 10;
function drawmsdsvg()
{

  // Get the inline SVG element
  const svgElement = document.getElementById("svg");
  const svgElementdoc = svgElement.contentDocument;
  let mass = svgElementdoc.getElementById("rect5919");
  if (!svgElementdoc) {
    console.error("SVG element not found!");
    return;
  }
  let position = 1
  // Manipulate the 'Mass' element (rectangle)


  function animate() {

    position += 1;
    mass.setAttribute("translate", "cy", position)
    //mass.setAttributeNS("transform","translate("+ position+")");
    requestAnimationFrame(animate);
    console.log("SVG manipulation complete!");
  }

  console.log("SVG manipulation complete!");

  window.requestAnimationFrame(animate);
}


//drawmsdbyhand();
Draw_MSD_Plot_to_div("time","app", null);
Draw_MSD_Plot_to_div("energy","app2", "canvas");
Draw_MSD_Plot_to_div("3denergy","app3", null);
Draw_MSD_Plot_to_div("3denergy","app3", "canvas_app4");
//document.querySelector('#app').innerHTML = drawnfunction;