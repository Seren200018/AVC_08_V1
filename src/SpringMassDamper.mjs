import { create, all } from 'mathjs';
import * as JXG from 'jsxgraph';
import Plotly from 'plotly.js-dist-min';

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

// Funktion: Ruft die aktuelle Scroll-Position ab
document.getScroll = function () {
  if (window.pageYOffset !== undefined) {
    return [pageXOffset, pageYOffset];
  } else {
    const d = document,
        r = d.documentElement,
        b = d.body;

    const sx = r.scrollLeft || b.scrollLeft || 0;
    const sy = r.scrollTop || b.scrollTop || 0;

    console.log(sy);
    return [sy];
  }
};

function livemassspringdamper(plottype = "time", divid, scrollexitation = false) {
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
  let scrollold = document.getScroll(), last_t = 0;

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
  function Calc_and_draw() {
    let scrollnew = document.getScroll();
    if (scrollexitation) {
      x_0[0] += (scrollnew[1] - scrollold[1]) / 100;
    }
    scrollold = scrollnew;

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

    window.requestAnimationFrame(Calc_and_draw);
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

let pos_MSD = 0;

function drawmsdsvg()
{

  // Get the inline SVG element
  const svgElement = document.getElementById("svg");

  if (!svgElement) {
    console.error("SVG element not found!");
    return;
  }

  // Manipulate the 'Mass' element (rectangle)
  const mass = svgElement.querySelector('rect[inkscape\\:label="Mass"]');
  if (mass) {
    // Translate the mass horizontally (e.g., simulate displacement)
    const currentX = parseFloat(mass.getAttribute("x")) || 0;
    mass.setAttribute("x", currentX + 10); // Move 10 units to the right
  }

  // Manipulate the 'Spring' element
  const spring = svgElement.querySelector('path.SPMDSVG');
  if (spring) {
    // Apply transformation to simulate extension/compression
    spring.setAttribute("transform", "scale(1.2, 1)"); // Scale spring horizontally
  }

  // Manipulate the 'Damper'
  const damper = svgElement.querySelector('text[tspan="c"]');
  if (damper) {
    const line = damper.closest("path");
    if (line) {
      // Simulate damper length adjustment by modifying end points
      line.setAttribute("x2", parseFloat(line.getAttribute("x2")) + 10 || 50); // Modify endpoint
    }
  }

  // Optional: Update arrows for "x" and "u"
  const xArrow = svgElement.querySelector('path[inkscape\\:label="x_arrow"]');
  if (xArrow) {
    xArrow.setAttribute("transform", "translate(10, 0)"); // Move arrow slightly
  }

  const uArrow = svgElement.querySelector('path[inkscape\\:label="u_arrow"]');
  if (uArrow) {
    uArrow.setAttribute("transform", "translate(-5, 0)"); // Move arrow slightly
  }
  console.log("SVG manipulation complete!");

  window.requestAnimationFrame(drawmsdsvg);
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
livemassspringdamper("time","app");
livemassspringdamper("energy","app2");
livemassspringdamper("3denergy","app3");
drawmsdsvg();
//document.querySelector('#app').innerHTML = drawnfunction;
