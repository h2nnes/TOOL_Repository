  // --- Dynamische Canvasgrenzen ---
  const MIN_WIDTH = 200;
  const MIN_HEIGHT = 200;
  const ARTBOARD_PADDING = 50;

  // Max-Tiles definieren
  const MAX_TILES = 200;

  const DEFAULT_GRID_LINE_COLOR = "#D3D3D3"; // entspricht 'lightgray'

  const widthInput = document.getElementById("widthInput");
  const widthSlider = document.getElementById("widthSlider");
  const heightInput = document.getElementById("heightInput");
  const heightSlider = document.getElementById("heightSlider");

  // website vairables
  var numButtTilesX = document.getElementById("numButt-tilesX");
  var numButtTilesY = document.getElementById("numButt-tilesY");
  var clearCanvasButton = document.getElementById("cleanCanvasBttn");
  var saveCanvasButton = document.getElementById("saveCanvasBttn");
  var resetButton = document.getElementById("resetGridBttn");
  var checkboxShowGrid = document.getElementById("checkboxShowGrid");
  const toTopButtons = document.querySelectorAll(".scrollToTop");

  const gridColorButton = document.getElementById("gridColorButton");
  const gridColorPicker = document.getElementById("gridColorPicker");

  const artboard = document.getElementById("artboard");
  const wrapper = document.getElementById("canvasWrapper");

  // Initiale Synchronisierung sicherstellen
  widthSlider.value = widthInput.value;
  heightSlider.value = heightInput.value;

  let tilesX, tilesY, tileW, tileH;
  let gridState = []; // speichert, ob Zelle aktiv (true) oder inaktiv (false)
  let blocks = []; // Globale Liste aller gefundenen Rechtecke
  let gridLineColor = DEFAULT_GRID_LINE_COLOR; // Startfarbe der Gitterlinien


  let isDragging = false; // Flag, ob gerade ein Ziehvorgang läuft

  //Startkoordinaten des Drag-Vorgangs
  let dragStartCol = null;
  let dragRow = null;

  // Der Zustand (true oder false), den alle gezogenen Zellen annehmen sollen
  let initialState = false;

  // ---- NEU: Für Blockverschiebung ----
  let isMovingBlock = false; // Ob ein Block verschoben wird
  let selectedBlock = null; // Der aktuell bewegte Block
  let offsetX = 0; // Mausposition relativ zum Blockanfang

  let marqueeStartX = null;
  let marqueeStartY = null;
  let marqueeEndX = null;
  let marqueeEndY = null;
  let isMarqueeSelecting = false;

  // === PANNING (Canvas-Verschiebung) ===
  let isPanning = false;
  let panOffsetX = 0;
  let panOffsetY = 0;
  let lastMouseX = 0;
  let lastMouseY = 0;

  // ZOOM
  let zoom = 1.0;
  let zoomMin = 0.5;
  let zoomMax = 5.0;
  let baseCanvasWidth = 600;  // aktuelle Breite lt. Slider
  let baseCanvasHeight = 600; // aktuelle Höhe lt. Slider





  function setup() {

    // --- PERFORMANCE: stoppt das automatische 60FPS-Rendering
    // draw() wird jetzt nur noch ausgeführt, wenn wir redraw() manuell aufrufen.
    noLoop();

    const { maxWidth, maxHeight } = getAvailableCanvasSize();

    // Max-Werte setzen
    widthInput.max = widthSlider.max = maxWidth;
    heightInput.max = heightSlider.max = maxHeight;

    
    // Initiale Synchronisierung sicherstellen
    widthSlider.value = widthInput.value;
    heightSlider.value = heightInput.value;

    var canvas = createCanvas(parseInt(widthSlider.value), parseInt(heightSlider.value)); // Zeichenfläche erstellen
    canvas.parent("canvasWrapper");
    canvas.elt.addEventListener("wheel", handleZoom, { passive: false });


    // --- Canvas mittig auf dem Artboard platzieren ---
    wrapper.style.position = "absolute";
    centerCanvasOnArtboard();


    translate(1, 1); // alles um 1px nach innen verschieben


    tilesX = parseInt(numButtTilesX.value);
    tilesY = parseInt(numButtTilesY.value);

    detectTileSize();

    // 2D-Array initialisieren
    initializeEmptyGrid();

    widthSlider.addEventListener("input", resizeCanvasFromSliders);
    heightSlider.addEventListener("input", resizeCanvasFromSliders);
    numButtTilesX.addEventListener("input", adjustGridFromSliders);
    numButtTilesY.addEventListener("input", adjustGridFromSliders);
    clearCanvasButton.addEventListener("click", clearGrid);
    saveCanvasButton.addEventListener("click", saveCurrentCanvas);
    resetButton.addEventListener("click", resetGridToDefaults);


  [numButtTilesX, numButtTilesY].forEach(input => {
    input.addEventListener("input", clampTileInput);
    input.addEventListener("keydown", clampTileInput);
  });

    toTopButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        document.getElementById("scrollContainer").scrollTo({
          top: 0,
          behavior: "smooth"
        });
      });
    });

    widthInput.addEventListener("input", () => {
      widthSlider.value = widthInput.value;
      resizeCanvasFromSliders();
    });

    widthInput.addEventListener("input", clampWidthInputUnified);
    widthInput.addEventListener("keydown", clampWidthInputUnified);


    widthSlider.addEventListener("input", () => {
      widthInput.value = widthSlider.value;
      resizeCanvasFromSliders();
    });

    heightInput.addEventListener("input", () => {
      heightSlider.value = heightInput.value;
      resizeCanvasFromSliders();
    });

    heightInput.addEventListener("keydown", clampHeightInput);
    heightInput.addEventListener("input", clampHeightInput);

    heightSlider.addEventListener("input", () => {
      heightInput.value = heightSlider.value;
      resizeCanvasFromSliders();
    });

    // Verhindern das Leertaste scrollen auslöst
    window.addEventListener("keydown", function (e) {
      if (e.code === "Space") {
        e.preventDefault();
      }
    });

    gridColorButton.addEventListener("click", () => {
      gridColorPicker.click(); // Öffnet den Color-Picker
    });

    gridColorPicker.addEventListener("input", (e) => {
      gridLineColor = e.target.value; // Neue Farbe setzen
      redraw(); // Canvas neu zeichnen (nur nötig bei noLoop)
    });

    // Damit sich das Ein-/Ausblenden des Grid sofort aktualisiert:
    checkboxShowGrid.addEventListener('change', () => {
      redraw();
    });

    // Damit Änderung des Corner-Styles sofort sichtbar wird:
    document.querySelectorAll('input[name="cornerStyle"]').forEach(radio => {
    radio.addEventListener('change', () => {
      redraw();
      });
    });

  }

  function draw() {
    background(255); // hellgrauer Hintergrund

    push();
    translate(1,1);

    if (checkboxShowGrid.checked) { // zeichnet Grid inkl. schwarz-weißer Zellen
      drawGrid(); // Nur zeichnen, wenn Checkbox aktiviert ist
    } 
    drawBlocks();
    drawMarquee();

    pop();
  }

  function drawGrid() {
    stroke(gridLineColor);
    noFill();

    beginShape(LINES);

    // vertikale Linien
    for (let x = 0; x <= tilesX; x++) {
      const px = x * tileW;
      vertex(px, 0);
      vertex(px, height);
    }

    // horizontale Linien
    for (let y = 0; y <= tilesY; y++) {
      const py = y * tileH;
      vertex(0, py);
      vertex(width, py);
    }

    endShape();
  }




  function drawBlocks() {
    stroke(0);

    // --- Ecke-Stil ermitteln ---
    const selected = document.querySelector('input[name="cornerStyle"]:checked');
    const cornerStyle = selected ? selected.value : "sharp";

    const ROUNDED_RATIO = 0.5;

    const cornerRadius = (cornerStyle === "rounded") ? Math.min(tileW, tileH) * ROUNDED_RATIO: 0;

    fill(0);


    for (let block of blocks) {
      rect(
        block.blockStartCol * tileW,
        block.blockRow * tileH,
        block.blockWidth * tileW,
        tileH,
        cornerRadius
      )
    }
  }


  function drawMarquee() {
    if (isMarqueeSelecting) {
      const x1 = marqueeStartX;
      const y1 = marqueeStartY;
      const x2 = marqueeEndX; 
      const y2 = marqueeEndY;

      noStroke();
      fill(200, 200, 200, 120);
      rectMode(CORNERS);
      rect(x1, y1, x2, y2);
      rectMode(CORNER);
    }
  }


  function mousePressed() {
    if (document.querySelector(".ui-panel:hover")) return;

    if (mouseButton !== LEFT) return; // nur links klicken erlaubt

    if (keyIsDown(32)) { // Space gedrückt?
      isPanning = true;
      lastMouseX = mouseX;
      lastMouseY = mouseY;
      document.body.style.cursor = "grabbing";
      return; // verhindert gleichzeitiges Zeichnen
    }


    // Rechteckauswahl starten bei Option/ALT ---
    if (keyIsDown(ALT)) {      
      isMarqueeSelecting = true;
      marqueeStartX = mouseX;
      marqueeStartY = mouseY;
      marqueeEndX = mouseX;
      marqueeEndY = mouseY;
      return; // verhindert Drag oder Blockbewegung!
      }
    


    // Geklickte Zelle berechnen
    let clickedColumn = floor(mouseX / tileW);
    let clickedRow = floor(mouseY / tileH);

    // Sicherheitsfrage: Cursor innerhalb des Grids?
    if (
      clickedColumn >= 0 &&
      clickedColumn < tilesX &&
      clickedRow >= 0 &&
      clickedRow < tilesY
    ) {
      // --- BLOCKVERSCHIEBUNG bei gedrücktem SHIFT ---
      if (keyIsDown(SHIFT)) {
        for (let block of blocks) {
          let px = block.blockStartCol * tileW;
          let py = block.blockRow * tileH;
          let pw = block.blockWidth * tileW;

          // Prüfe, ob Klick innerhalb des Blockrechtecks war
          if (
            mouseX >= px &&
            mouseX <= px + pw &&
            mouseY >= py &&
            mouseY <= py + tileH
          ) {
            selectedBlock = block;
            offsetX = mouseX - px;
            isMovingBlock = true;
            return; // keine Zellen zeichnen!
          }
        }
      }

      // Drag-Modus aktivieren
      isDragging = true;
      dragStartCol = clickedColumn;
      dragRow = clickedRow;
      initialState = !gridState[clickedColumn][clickedRow]; // Toggle-Ziel merken

      // Zustand umschalten
      gridState[clickedColumn][clickedRow] = initialState;

      detectBlocks(); // Blöcke neu erkennen
      redraw();
    }
  }

  function mouseReleased() {
    if (isPanning) {
      isPanning = false;
      document.body.style.cursor = "default";
    }

    // --- NEU: Rechteckauswahl abschließen ---
    if (isMarqueeSelecting) {
      const x1 = min(marqueeStartX, marqueeEndX);
      const x2 = max(marqueeStartX, marqueeEndX);
      const y1 = min(marqueeStartY, marqueeEndY);
      const y2 = max(marqueeStartY, marqueeEndY);

      for (let x = 0; x < tilesX; x++) {
        for (let y = 0; y < tilesY; y++) {
          const cellX = x * tileW;
          const cellY = y * tileH;

          // Rechteck-Kollision: Zelle wird aktiviert, wenn sie überlappt wird
          const overlap =
            x2 > cellX &&
            x1 < cellX + tileW &&
            y2 > cellY &&
            y1 < cellY + tileH;

          if (overlap) {
            gridState[x][y] = true;
          }
        }
      }

      isMarqueeSelecting = false;
      detectBlocks();
      redraw();
    }
    
    isDragging = false;
    isMovingBlock = false;
    selectedBlock = null;

    detectBlocks(); // zur Erkennung wenn Rechtecke ineinander geschoben wurden 
  }

  function mouseDragged() {
    if (isPanning) {
      panOffsetX += movedX;
      panOffsetY += movedY;
      updateCanvasPosition();
      return; // verhindert gleichzeitiges Zeichnen
    }


    // --- NEU: Rechteckauswahl aktiv? Dann Endpunkt aktualisieren ---
    if (isMarqueeSelecting) {
      marqueeEndX = mouseX;
      marqueeEndY = mouseY;

      redraw(); // sorgt dafür, dass das Rechteck direkt sichtbar wird
      return;   // verhindere normalen Dragcode
    } 

    // --- BLOCK VERSCHIEBEN ---
    if (isMovingBlock && selectedBlock) {
      let newStartCol = floor((mouseX - offsetX) / tileW);
      newStartCol = constrain(newStartCol, 0, tilesX - selectedBlock.blockWidth);
      selectedBlock.blockStartCol = newStartCol;

      updateGridFromBlocks(); // Grid aktualisieren
      redraw();
      return;
    }

    // --- ZELLEN ZEICHNEN ---
    // Wenn im Drag-Modus: aktuelle Spalte berechnen.
    if (isDragging && dragRow !== null) {
      const currentCol = floor(mouseX / tileW);

      // Wenn aktuelle Spalte innerhalb des Grids
      if (currentCol >= 0 && currentCol < tilesX) {
        // Blockgrenzen festlegen (immer von links nach rechts)
        const colStart = min(dragStartCol, currentCol);
        const colEnd = max(dragStartCol, currentCol);

        for (let col = colStart; col <= colEnd; col++) {
          gridState[col][dragRow] = initialState;
        }

        detectBlocks();
        redraw();
      }
    }
  }

  // --- Hilfsfunktion: Blockdaten -> Grid ---
  function updateGridFromBlocks() {
    // Grid komplett zurücksetzen
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        gridState[x][y] = false;
      }
    }

    // Alle Blöcke in das Grid schreiben
    for (let block of blocks) {
      for (let i = 0; i < block.blockWidth; i++) {
        gridState[block.blockStartCol + i][block.blockRow] = true;
      }
    }
  }


  function updateCanvasPosition() {
    wrapper.style.left = "50%";
    wrapper.style.top = "50%";
    wrapper.style.transform = `translate(calc(-50% + ${panOffsetX}px), calc(-50% + ${panOffsetY}px))`;
  }


  function clearGrid() {
    // Alle Zellen auf "aus" setzen
    initializeEmptyGrid();

    // Blöcke ebenfalls leeren
    blocks = [];

    redraw(); // falls du noLoop verwendest
  }

  function centerCanvasOnArtboard() {
    wrapper.style.position = "absolute";
    wrapper.style.left = "50%";
    wrapper.style.top = "50%";
    wrapper.style.transform = "translate(-50%, -50%)";

    panOffsetX = 0;
    panOffsetY = 0;
  }

  function resetGridToDefaults() {
    // Reset Grid Line Color
    gridLineColor = DEFAULT_GRID_LINE_COLOR;

    // Standardwerte
    const defaultWidth = 600;
    const defaultHeight = 600;
    const defaultTilesX = 8;
    const defaultTilesY = 8;

    // --- HIER NEU: Zoom- und Basegrößen-Reset ---
    zoom = 1.0;
    baseCanvasWidth = defaultWidth;
    baseCanvasHeight = defaultHeight;

    // Werte zurücksetzen
    document.getElementById("widthInput").value = defaultWidth;
    document.getElementById("widthSlider").value = defaultWidth;

    document.getElementById("heightInput").value = defaultHeight;
    document.getElementById("heightSlider").value = defaultHeight;

    document.getElementById("numButt-tilesX").value = defaultTilesX;
    document.getElementById("numButt-tilesY").value = defaultTilesY;

    // Canvas aktualisieren
    resizeCanvas(defaultWidth, defaultHeight);
    tilesX = defaultTilesX;
    tilesY = defaultTilesY;

    // Neu berechnen & neu zeichnen
    detectTileSize();

    // === Canvas wieder mittig auf dem Artboard platzieren ===
    centerCanvasOnArtboard();

    detectBlocks();
    redraw();
  }


  function adjustGridFromSliders() {
    tilesX = parseInt(numButtTilesX.value);
    tilesY = parseInt(numButtTilesY.value);

    detectTileSize();

    // Grid-State neu initialisieren
    initializeEmptyGrid();

    // Blöcke leeren (falls nicht mehr gültig)
    blocks = [];

    redraw(); // draw() sofort ausführen (nur nötig bei noLoop)
  }


  function resizeCanvasFromSliders() {
    let newWidth = parseInt(widthSlider.value);
    let newHeight = parseInt(heightSlider.value);
    
    // wenn User manuell resized → neue Basegröße setzen
    baseCanvasWidth = newWidth;
    baseCanvasHeight = newHeight;

    resizeCanvas(newWidth, newHeight);
    detectTileSize();
    redraw();
  }

  function detectBlocks() {
    blocks = []; // Vorherige Blöcke löschen

    for (let row = 0; row < tilesY; row++) {
      // durchlaufen jeder Zeile im Grid

      let start = null; // speichert wo aktive Gruppe beginnt (Spaltenindex)
      let length = 0; // zählt, wie lang die Gruppe ist

      for (let col = 0; col <= tilesX; col++) {
        let isCellActive = col < tilesX ? gridState[col][row] : false;

        if (isCellActive) {
          // Fall 1: Zelle aktiv (schwarz)
          // Fall 1A: Beginn eines neuen Blocks
          if (start === null) {
            start = col;
            length = 1;
          } else {
            length++;
          } // Fall 1B: Fortsetzung eines laufenden Blocks
        } else if (start !== null) {
          // Fall 2: Zelle inaktiv (weiß) – und es gab vorher eine aktive Gruppe
          blocks.push({
            blockStartCol: start,
            blockRow: row,
            blockWidth: length,
          });
          start = null;
          length = 0;
        }
      }
    }
  }


  function saveCurrentCanvas() {
    let now = new Date();
    let yy = String(now.getFullYear()).slice(2);
    let mm = String(now.getMonth() + 1).padStart(2, '0');
    let dd = String(now.getDate()).padStart(2, '0');
    let hh = String(now.getHours()).padStart(2, '0');
    let min = String(now.getMinutes()).padStart(2, '0');
    let ss = String(now.getSeconds()).padStart(2, '0');

    let filename = `${yy}${mm}${dd}_${hh}${min}${ss}_myCanvas`;
    saveCanvas(filename, 'png');
  }


  function initializeEmptyGrid() {
    gridState = [];
    for (let x = 0; x < tilesX; x++) {
      gridState[x] = [];
      for (let y = 0; y < tilesY; y++) {
        gridState[x][y] = false;
      }
    }
  }


  function handleZoom(event) {
    event.preventDefault(); // verhindert Browser-Scrollen

    // Basisgeschwindigkeit
    let zoomSpeed = 0.0015;

    // Touchpad-Erkennung: sehr kleine deltaY-Werte ⇒ Touchpad
    if (Math.abs(event.deltaY) < 50) {
      zoomSpeed = 0.01; // schneller für Touchpad
    }

    // 🔍 Zoom anpassen
    zoom -= event.deltaY * zoomSpeed;
    zoom = constrain(zoom, zoomMin, zoomMax);

    // Canvas proportional skalieren
    const newWidth = baseCanvasWidth * zoom;
    const newHeight = baseCanvasHeight * zoom;

    resizeCanvas(newWidth, newHeight);
    detectTileSize();
    redraw();
  }

  function detectTileSize() {
    // -2 ist für innenabstand zum Canvas von je 1 px von jeder Seite
    tileW = (width - 2) / tilesX;
    tileH = (height - 2) / tilesY;
  }

  // UI-Panel-Breite berücksichtigen
  function getAvailableCanvasSize() {
    const panel = document.querySelector(".ui-panel");
    const panelWidth = panel ? panel.offsetWidth : 0;

    const maxWidth = window.innerWidth - panelWidth - 2 * ARTBOARD_PADDING;
    const maxHeight = window.innerHeight - 2 * ARTBOARD_PADDING;

    return {
      maxWidth: Math.max(MIN_WIDTH, maxWidth),
      maxHeight: Math.max(MIN_HEIGHT, maxHeight)
    };
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }


  // Funktion zur Begrenzung des Tile Number Inputs
  function clampTileInput(event) {
    const input = event.target;
    const raw = input.value.trim();

    // Wenn Enter gedrückt wird → prüfen
    if (event.type === "keydown" && event.key === "Enter") {
      let val = parseInt(raw);

      // Leerer String oder ungültiger Wert → auf 1 setzen
      if (raw === "" || isNaN(val) || val < 1) {
        input.value = 1;
      } else if (val > MAX_TILES) {
        input.value = MAX_TILES;
      } else {
        input.value = val; // gültiger Wert
      }

      adjustGridFromSliders();

      input.blur(); // entfernt den Fokus, Cursor verschwindet

      return;
    }

    // Während des Tippens (input) → Clamp, aber nur wenn nicht leer
    if (event.type === "input") {
      if (raw === "") return;

      let val = parseInt(raw);
      if (isNaN(val)) return;

      if (val < 1) val = 1;
      if (val > MAX_TILES) val = MAX_TILES;

      input.value = val;
      adjustGridFromSliders();
    }
  }

  function clampWidthInputUnified(event) {
    const input = event.target;
    const raw = input.value.trim();

    const min = MIN_WIDTH;               // z.B. 200
    const max = parseInt(widthInput.max); // z.B. 1280

    if ((event.type === "keydown" && event.key === "Enter") || event.type === "blur") {
      let val = parseInt(raw);

      if (raw === "" || isNaN(val) || val < min) {
        input.value = min;
      } else if (val > max) {
        input.value = max;
      } else {
        input.value = val;
      }

      widthSlider.value = input.value;
      resizeCanvasFromSliders?.();

      input.blur(); // entfernt den Fokus, Cursor verschwindet

      return;
    }

    if (event.type === "input") {
      let val = parseInt(raw);

      if (raw === "" || isNaN(val)) return;

      // Sofort clampen: Negative Zahlen und 0 auf min setzen
      if (val <= 0) {
        input.value = min;
      }
      // Sofort clampen: Werte über max auf max setzen
      else if (val > max) {
        input.value = max;
      }
      // Werte zwischen 1 und min-1 werden NICHT gecampt, also nichts tun
      // Damit der User diese Werte noch eintippen kann
    }
  }

  function clampHeightInput(event) {
    const input = event.target;
    const raw = input.value.trim();

    const min = MIN_HEIGHT;               // z.B. 200
    const max = parseInt(heightInput.max); // z.B. 1280

    if ((event.type === "keydown" && event.key === "Enter") || event.type === "blur") {
      let val = parseInt(raw);

      if (raw === "" || isNaN(val) || val < min) {
        input.value = min;
      } else if (val > max) {
        input.value = max;
      } else {
        input.value = val;
      }

      heightSlider.value = input.value;
      resizeCanvasFromSliders?.();

      if (event.type === "keydown" && event.key === "Enter") {
        input.blur(); // Cursor weg bei Enter
      }

      return;
    }

    if (event.type === "input") {
      let val = parseInt(raw);

      if (raw === "" || isNaN(val)) return;

      if (val <= 0) {
        input.value = min;
      } else if (val > max) {
        input.value = max;
      }
      // Werte zwischen 1 und min-1 werden nicht gecampt
    }
  }

function scrollToSection(id) {
  const section = document.getElementById(id);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}






  // ----------- Wiederholtes Klicken bei Halten der Maus für X und Y -----------

  let repeatIntervalId = null;

  function changeValue(inputId, delta) {
    const input = document.getElementById(inputId);
    const newValue = clamp(parseInt(input.value) + delta, 1, MAX_TILES); // Max ggf. anpassen
    input.value = newValue;
    adjustGridFromSliders(); // Aktualisiert das Grid
  }

  function startAutoRepeat(inputId, delta) {
    changeValue(inputId, delta); // Sofort ändern
    repeatIntervalId = setInterval(() => changeValue(inputId, delta), 20); // Dann wiederholen
  }

  function stopAutoRepeat() {
    clearInterval(repeatIntervalId);
    repeatIntervalId = null;
  }

  // --- Event-Handler für X-Achse ---
  document.getElementById("increaseX").addEventListener("mousedown", () => startAutoRepeat("numButt-tilesX", 1));
  document.getElementById("decreaseX").addEventListener("mousedown", () => startAutoRepeat("numButt-tilesX", -1));

  // --- Event-Handler für Y-Achse ---
  document.getElementById("increaseY").addEventListener("mousedown", () => startAutoRepeat("numButt-tilesY", 1));
  document.getElementById("decreaseY").addEventListener("mousedown", () => startAutoRepeat("numButt-tilesY", -1));

  // Stoppen bei Maus loslassen oder Mausverlieren
  document.addEventListener("mouseup", stopAutoRepeat);
  document.addEventListener("mouseleave", stopAutoRepeat);




document.addEventListener("DOMContentLoaded", () => {
  const popup = document.getElementById("videoPopup");
  const popupVideo = popup.querySelector("video");
  let activeInstruction = null; // aktuell geöffneter instruction-element

  // Helper: öffne Popup an Position x,y mit Video-Quelle
  function openPopup(x, y, src) {
    popup.style.left = `${x}px`;
    popup.style.top  = `${y}px`;
    popupVideo.src = src;
    popupVideo.currentTime = 0;
    popupVideo.play().catch(() => {/* Autoplay blockiert? OK */});
    popup.classList.add("show");
    popup.setAttribute("aria-hidden", "false");
  }

  // Helper: schliesse Popup
  function closePopup() {
    popup.classList.remove("show");
    // nach transition display:none setzen
    setTimeout(() => {
      popup.style.display = "none";
      popupVideo.pause();
      popupVideo.src = "";
      popup.setAttribute("aria-hidden", "true");
      activeInstruction = null;
    }, 180);
  }

  // alle instruction-Elemente
  document.querySelectorAll(".instruction").forEach((el) => {
    // Klick öffnet Popup (oder schliesst, wenn das gleiche Element schon offen ist)
    el.addEventListener("click", (e) => {
      e.stopPropagation(); // nicht an document weitergeben

      const videoSrc = el.dataset.video;
      if (!videoSrc) return;

      // Wenn das gleiche Element schon geöffnet ist -> toggle close
      if (activeInstruction === el) {
        closePopup();
        return;
      }

      // andernfalls öffnen
      activeInstruction = el;

      // Position rechts vom Cursor; Y leicht zentriert
      const x = e.pageX + 15;
      const y = e.pageY - 100;

      // ensure visible immediately (display block) bevor class show
      popup.style.display = "block";
      // small timeout damit display wirkt bevor transition startet
      requestAnimationFrame(() => openPopup(x, y, videoSrc));
    });

    // Wenn Maus das Instruction-Element verlässt -> Popup schliessen
    el.addEventListener("mouseleave", (e) => {
      // Wenn das Popup für dieses Element offen ist -> schliessen
      if (activeInstruction === el) {
        closePopup();
      }
    });

    // Optional: während Maus über dem Element bewegt, das Popup mitbewegen
    el.addEventListener("mousemove", (e) => {
      if (activeInstruction === el) {
        const x = e.pageX + 15;
        const y = e.pageY - 100;
        popup.style.left = `${x}px`;
        popup.style.top  = `${y}px`;
      }
    });
  });

  // Klick irgendwo anders schliesst Popup (optional, sinnvoll als Fallback)
  document.addEventListener("click", (e) => {
    if (activeInstruction) {
      closePopup();
    }
  });

  // Touch-Fallback: tippen auf ein Element öffnet, tippen ausserhalb schliesst
  document.addEventListener("touchstart", (e) => {
    // falls touch auf .instruction handled ist, leave it; sonst close
    if (!e.target.closest(".instruction") && activeInstruction) {
      closePopup();
    }
  }, {passive: true});
});






  // === Screensaver ===
  let idleTimeout = null;
  let isScreensaverEnabled = false;
  const screensaverDelay = 60000; // 1 Minute
  const screensaver = document.getElementById("screensaver");
  const video = document.getElementById("screensaverVideo");

  // Setze das Video (Pfad ggf. anpassen)
  video.src = "Videos/Screensaver_v2_TEST.mp4";

  // Screensaver anzeigen
  function showScreensaver() {
    if (!isScreensaverEnabled) return;
    screensaver.style.display = "block";
    video.play();
  }

  // Screensaver ausblenden
  function hideScreensaver() {
    screensaver.style.display = "none";
    video.pause();
    video.currentTime = 0;
  }

  // Timer zurücksetzen
  function resetIdleTimer() {
    clearTimeout(idleTimeout);
    hideScreensaver();
    idleTimeout = setTimeout(showScreensaver, screensaverDelay);
  }

  // Alle Interaktionen, die den Timer zurücksetzen
  ["mousemove", "mousedown", "keydown", "touchstart"].forEach(event => {
    document.addEventListener(event, resetIdleTimer);
  });

  // Timer beim Laden der Seite starten
  resetIdleTimer();


