"use strict";

const STORAGE_KEY = "orakCutProjectV2";
const MAX_STORED_PHOTO_CHARS = 350000;

const state = {
  data: null,
  pieces: [],
  sheets: [],
  alerts: [],
  packingAlerts: [],
  lastSvgMarkup: "",
  photoDataUrl: null,
  edgeBandingMeters: 0,
  generatedAt: null
};

const imageAnalysisState = {
  imageLoaded: false,
  image: null,
  imageDataUrl: null,
  referencePoints: [],
  referenceRealMm: null,
  pixelsPerMm: null,
  measurements: [],
  detectedBounds: null,
  suggestedFurnitureType: null,
  confidence: "baixa",
  mode: "reference",
  pendingMeasurementPoint: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  drawInfo: null,
  drag: null,
  appliedToForm: false,
  lastEdgeData: null
};

const projectState = {
  measurementSource: "manual"
};

const arMeasurementState = {
  isSupported: false,
  supportChecked: false,
  isSessionActive: false,
  session: null,
  referenceSpace: null,
  viewerSpace: null,
  hitTestSource: null,
  currentHitPose: null,
  points: [],
  measurements: [],
  lastError: null,
  gl: null,
  canvas: null,
  xrLayer: null,
  reticleProgram: null,
  reticleBuffer: null,
  currentFrameTime: null,
  appliedToForm: false,
  supportsHitTest: false
};

const furnitureLabels = {
  niche: "Nicho simples",
  cabinet: "Armário 2 portas",
  panel: "Painel simples",
  desk: "Mesa simples"
};

const grainLabels = {
  indiferente: "indiferente",
  vertical: "vertical",
  horizontal: "horizontal"
};

const pieceColors = [
  "#d9a15b",
  "#7fa28d",
  "#c98a4a",
  "#8fa4b3",
  "#d5bd7d",
  "#a8a093",
  "#bd7c62",
  "#80a9a0",
  "#c7a26a",
  "#9b806d"
];

const edgeLabels = {
  superior: "Sup.",
  inferior: "Inf.",
  esquerda: "Esq.",
  direita: "Dir."
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  updateDynamicFields();
  renderPhotoPreview();
  renderImageAnalysisPanel();
  drawImageCanvasOverlay();
  renderARStatus();
  renderARPoints();
  renderARMeasurements();
  renderMeasurementSourceNotice();
});

function cacheElements() {
  [
    "cut-form",
    "project-name",
    "client-name",
    "room-name",
    "general-notes",
    "furniture-type",
    "width",
    "height",
    "depth",
    "mdf-thickness",
    "sheet-width",
    "sheet-height",
    "kerf",
    "shelf-count",
    "front-panel-height",
    "use-back",
    "back-thickness",
    "use-doors",
    "door-gap",
    "outer-door-gap",
    "grain-direction",
    "auto-split-panel",
    "photo-input",
    "remove-photo-button",
    "json-input",
    "message-box",
    "alerts-panel",
    "alerts-list",
    "summary-grid",
    "project-summary",
    "result-project-name",
    "piece-count-label",
    "sheet-count-label",
    "sheet-summary",
    "piece-table-body",
    "cut-plan",
    "add-piece-button",
    "update-plan-button",
    "copy-button",
    "csv-button",
    "download-svg-button",
    "download-dxf-button",
    "print-button",
    "reset-button",
    "save-project-button",
    "load-project-button",
    "clear-project-button",
    "export-json-button",
    "import-json-button",
    "photo-preview",
    "image-analysis-input",
    "image-remove-button",
    "image-zoom",
    "image-analyze-button",
    "image-reset-button",
    "image-canvas",
    "canvas-empty",
    "reference-real-mm",
    "reference-status",
    "scale-status",
    "measurement-label",
    "measurement-status",
    "measurement-list",
    "image-suggestion",
    "image-apply-preview",
    "image-confirmation",
    "apply-image-measures-button",
    "measurement-source-notice",
    "ar-check-button",
    "ar-start-button",
    "ar-end-button",
    "ar-fallback-button",
    "ar-support-status",
    "ar-session-status",
    "ar-canvas",
    "ar-placeholder",
    "ar-hit-status",
    "ar-delete-last-button",
    "ar-clear-points-button",
    "ar-point-list",
    "ar-custom-measure-name",
    "ar-point-a-select",
    "ar-point-b-select",
    "ar-create-measure-button",
    "ar-measurement-list",
    "ar-summary-svg",
    "ar-apply-preview",
    "ar-apply-confirmation",
    "ar-apply-button",
    "ar-xr-overlay",
    "ar-overlay-hit-status",
    "ar-overlay-point-count",
    "ar-overlay-delete-last-button",
    "ar-overlay-end-button"
  ].forEach((id) => {
    elements[toCamelCase(id)] = document.getElementById(id);
  });
}

function bindEvents() {
  elements.cutForm.addEventListener("submit", handleSubmit);
  elements.cutForm.addEventListener("reset", handleReset);
  elements.furnitureType.addEventListener("change", handleFurnitureTypeChange);
  elements.useBack.addEventListener("change", updateDynamicFields);
  elements.useDoors.addEventListener("change", updateDynamicFields);
  elements.photoInput.addEventListener("change", handlePhotoPreview);
  elements.removePhotoButton.addEventListener("click", removePhoto);
  elements.saveProjectButton.addEventListener("click", saveProject);
  elements.loadProjectButton.addEventListener("click", loadProject);
  elements.clearProjectButton.addEventListener("click", clearSavedProject);
  elements.exportJsonButton.addEventListener("click", exportProjectJSON);
  elements.importJsonButton.addEventListener("click", () => elements.jsonInput.click());
  elements.jsonInput.addEventListener("change", importProjectJSON);
  elements.addPieceButton.addEventListener("click", addManualPiece);
  elements.updatePlanButton.addEventListener("click", updateCutPlanFromEditedPieces);
  elements.csvButton.addEventListener("click", () => exportCSV(state.pieces));
  elements.copyButton.addEventListener("click", copyCutList);
  elements.downloadSvgButton.addEventListener("click", downloadSVG);
  elements.downloadDxfButton.addEventListener("click", downloadDXF);
  elements.printButton.addEventListener("click", () => window.print());
  elements.pieceTableBody.addEventListener("input", handlePieceTableInput);
  elements.pieceTableBody.addEventListener("change", handlePieceTableInput);
  elements.pieceTableBody.addEventListener("click", handlePieceTableClick);
  elements.imageAnalysisInput.addEventListener("change", loadImageToCanvas);
  elements.imageRemoveButton.addEventListener("click", resetImageAnalysis);
  elements.imageResetButton.addEventListener("click", resetImageAnalysis);
  elements.imageAnalyzeButton.addEventListener("click", analyzeImageBasic);
  elements.imageZoom.addEventListener("input", () => {
    imageAnalysisState.zoom = toNumber(elements.imageZoom.value) || 1;
    drawImageCanvasOverlay();
  });
  elements.referenceRealMm.addEventListener("input", calculateImageScale);
  elements.imageConfirmation.addEventListener("change", renderImageAnalysisPanel);
  elements.applyImageMeasuresButton.addEventListener("click", applyImageMeasurementsToForm);
  elements.measurementList.addEventListener("change", (event) => {
    if (event.target.dataset.measurementId) {
      renameImageMeasurement(event.target.dataset.measurementId, event.target.value);
    }
  });
  elements.measurementList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-measurement]");

    if (button) {
      deleteImageMeasurement(button.dataset.deleteMeasurement);
    }
  });
  document.querySelectorAll("[data-image-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      imageAnalysisState.mode = button.dataset.imageMode;
      imageAnalysisState.pendingMeasurementPoint = null;
      renderImageAnalysisPanel();
      drawImageCanvasOverlay();
    });
  });
  elements.imageCanvas.addEventListener("pointerdown", handleCanvasPointerDown);
  elements.imageCanvas.addEventListener("pointermove", handleCanvasPointerMove);
  elements.imageCanvas.addEventListener("pointerup", handleCanvasPointerUp);
  elements.imageCanvas.addEventListener("pointerleave", handleCanvasPointerUp);
  elements.arCheckButton.addEventListener("click", checkARSupport);
  elements.arStartButton.addEventListener("click", startARSession);
  elements.arEndButton.addEventListener("click", endARSession);
  elements.arOverlayEndButton?.addEventListener("click", endARSession);
  elements.arFallbackButton.addEventListener("click", fallbackToImageMode);
  elements.arDeleteLastButton.addEventListener("click", deleteLastARPoint);
  elements.arOverlayDeleteLastButton?.addEventListener("click", deleteLastARPoint);
  elements.arClearPointsButton.addEventListener("click", clearARPoints);
  elements.arCreateMeasureButton.addEventListener("click", () => {
    createARMeasurement(elements.arCustomMeasureName.value, elements.arPointASelect.value, elements.arPointBSelect.value);
  });
  elements.arApplyButton.addEventListener("click", applyARMeasurementsToForm);
  elements.arApplyConfirmation.addEventListener("change", renderARMeasurements);
  document.querySelectorAll("[data-ar-point-type]").forEach((button) => {
    button.addEventListener("click", () => markCurrentARPoint(button.dataset.arPointType));
  });
  elements.arPointList.addEventListener("change", (event) => {
    if (event.target.dataset.arPointId) {
      renameARPoint(event.target.dataset.arPointId, event.target.value);
    }
  });
}

function handleSubmit(event) {
  event.preventDefault();

  if (!requireImageMeasurementConfirmation()) {
    return;
  }

  if (!requireARConfirmation()) {
    return;
  }

  const data = getFormData();
  const errors = validateData(data);

  if (errors.length) {
    renderAlerts(errors.map((message) => ({ type: "error", message })));
    showMessages(["Confira os alertas antes de gerar o plano."]);
    return;
  }

  const pieces = generatePieces(data);
  const pieceErrors = validateGeneratedPieces(pieces, data);

  if (pieceErrors.length) {
    renderAlerts(pieceErrors.map((message) => ({ type: "error", message })));
    showMessages(["Algumas peças ficaram com medidas inválidas."]);
    return;
  }

  state.data = data;
  state.pieces = pieces;
  state.generatedAt = new Date().toISOString();
  recalculateAndRender("Plano de corte gerado com sucesso.");
}

function handleReset() {
  window.setTimeout(() => {
    state.photoDataUrl = null;
    resetImageAnalysis();
    clearARPoints();
    projectState.measurementSource = "manual";
    renderMeasurementSourceNotice();
    updateDynamicFields();
    resetResults();
    clearMessages();
    renderPhotoPreview();
  }, 0);
}

function handleFurnitureTypeChange() {
  const type = elements.furnitureType.value;

  elements.useDoors.checked = type === "cabinet";

  if (type === "panel" || type === "desk") {
    elements.shelfCount.value = "0";
  }

  if (type === "desk") {
    elements.useBack.checked = false;
    elements.useDoors.checked = false;
    elements.frontPanelHeight.value = elements.frontPanelHeight.value || "400";
  }

  elements.autoSplitPanel.checked = type === "panel";
  updateDynamicFields();
}

function updateDynamicFields() {
  const isPanel = elements.furnitureType.value === "panel";
  const isDesk = elements.furnitureType.value === "desk";

  if (!isPanel) {
    elements.autoSplitPanel.checked = false;
  }

  if (isDesk) {
    elements.shelfCount.value = "0";
    elements.useBack.checked = false;
    elements.useDoors.checked = false;
  }

  const hasBack = elements.useBack.checked;
  const hasDoors = elements.useDoors.checked;

  elements.shelfCount.disabled = isPanel || isDesk;
  elements.frontPanelHeight.disabled = !isDesk;
  elements.useBack.disabled = isDesk;
  elements.useDoors.disabled = isDesk;
  elements.backThickness.disabled = !hasBack;
  elements.doorGap.disabled = !hasDoors;
  elements.outerDoorGap.disabled = !hasDoors;
  elements.autoSplitPanel.disabled = !isPanel;
  elements.shelfCount.closest(".field").classList.toggle("is-disabled", isPanel || isDesk);
  elements.frontPanelHeight.closest(".field").classList.toggle("is-disabled", !isDesk);
  elements.useBack.closest(".switch").classList.toggle("is-disabled", isDesk);
  elements.useDoors.closest(".switch").classList.toggle("is-disabled", isDesk);
  elements.autoSplitPanel.closest(".switch").classList.toggle("is-disabled", !isPanel);
}

function getFormData() {
  return {
    projectName: elements.projectName.value.trim() || "Projeto MDF",
    clientName: elements.clientName.value.trim(),
    roomName: elements.roomName.value.trim(),
    generalNotes: elements.generalNotes.value.trim(),
    furnitureType: elements.furnitureType.value,
    width: toNumber(elements.width.value),
    height: toNumber(elements.height.value),
    depth: toNumber(elements.depth.value),
    mdfThickness: toNumber(elements.mdfThickness.value),
    sheetWidth: toNumber(elements.sheetWidth.value),
    sheetHeight: toNumber(elements.sheetHeight.value),
    kerf: toNumber(elements.kerf.value),
    shelfCount: Number.parseInt(elements.shelfCount.value, 10) || 0,
    frontPanelHeight: toNumber(elements.frontPanelHeight.value),
    useBack: elements.useBack.checked,
    backThickness: toNumber(elements.backThickness.value),
    useDoors: elements.useDoors.checked,
    doorGap: toNumber(elements.doorGap.value),
    outerDoorGap: toNumber(elements.outerDoorGap.value),
    grainDirection: elements.grainDirection.value,
    autoSplitPanel: elements.autoSplitPanel.checked
  };
}

function setFormData(data) {
  const defaults = getDefaultFormData();
  const merged = { ...defaults, ...(data || {}) };

  elements.projectName.value = merged.projectName || "Projeto MDF";
  elements.clientName.value = merged.clientName || "";
  elements.roomName.value = merged.roomName || "";
  elements.generalNotes.value = merged.generalNotes || "";
  elements.furnitureType.value = merged.furnitureType || "niche";
  elements.width.value = fallbackNumber(merged.width, defaults.width);
  elements.height.value = fallbackNumber(merged.height, defaults.height);
  elements.depth.value = fallbackNumber(merged.depth, defaults.depth);
  elements.mdfThickness.value = fallbackNumber(merged.mdfThickness, defaults.mdfThickness);
  elements.sheetWidth.value = fallbackNumber(merged.sheetWidth, defaults.sheetWidth);
  elements.sheetHeight.value = fallbackNumber(merged.sheetHeight, defaults.sheetHeight);
  elements.kerf.value = fallbackNumber(merged.kerf, defaults.kerf);
  elements.shelfCount.value = fallbackNumber(merged.shelfCount, defaults.shelfCount);
  elements.frontPanelHeight.value = fallbackNumber(merged.frontPanelHeight, defaults.frontPanelHeight);
  elements.useBack.checked = Boolean(merged.useBack);
  elements.backThickness.value = fallbackNumber(merged.backThickness, defaults.backThickness);
  elements.useDoors.checked = Boolean(merged.useDoors);
  elements.doorGap.value = fallbackNumber(merged.doorGap, defaults.doorGap);
  elements.outerDoorGap.value = fallbackNumber(merged.outerDoorGap, defaults.outerDoorGap);
  elements.grainDirection.value = merged.grainDirection || "indiferente";
  elements.autoSplitPanel.checked = Boolean(merged.autoSplitPanel);
  updateDynamicFields();
}

function getDefaultFormData() {
  return {
    projectName: "Projeto MDF",
    clientName: "",
    roomName: "",
    generalNotes: "",
    furnitureType: "niche",
    width: 800,
    height: 600,
    depth: 350,
    mdfThickness: 18,
    sheetWidth: 2750,
    sheetHeight: 1850,
    kerf: 3,
    shelfCount: 1,
    frontPanelHeight: 400,
    useBack: true,
    backThickness: 6,
    useDoors: false,
    doorGap: 3,
    outerDoorGap: 2,
    grainDirection: "indiferente",
    autoSplitPanel: false
  };
}

function validateData(data) {
  const errors = [];
  const requiredMeasures = [
    ["width", "Largura total"],
    ["height", "Altura total"],
    ["depth", "Profundidade"],
    ["mdfThickness", "Espessura do MDF"],
    ["sheetWidth", "Largura da chapa"],
    ["sheetHeight", "Altura da chapa"],
    ["kerf", "Espessura do corte/serra"]
  ];

  requiredMeasures.forEach(([key, label]) => {
    if (!Number.isFinite(data[key]) || data[key] <= 0) {
      errors.push(`${label} precisa ser um número maior que zero.`);
    }
  });

  if (!Number.isInteger(data.shelfCount) || data.shelfCount < 0) {
    errors.push("Quantidade de prateleiras precisa ser zero ou um número inteiro positivo.");
  }

  if (data.useBack && (!Number.isFinite(data.backThickness) || data.backThickness <= 0)) {
    errors.push("Espessura do fundo precisa ser um número maior que zero.");
  }

  if (data.useDoors) {
    if (!Number.isFinite(data.doorGap) || data.doorGap <= 0) {
      errors.push("Folga entre portas precisa ser um número maior que zero.");
    }

    if (!Number.isFinite(data.outerDoorGap) || data.outerDoorGap <= 0) {
      errors.push("Folga externa das portas precisa ser um número maior que zero.");
    }
  }

  if (errors.length) {
    return errors;
  }

  if (data.mdfThickness >= data.width || data.mdfThickness >= data.depth) {
    errors.push("A espessura do MDF precisa ser menor que a largura e a profundidade do móvel.");
  }

  if (data.depth < data.mdfThickness) {
    errors.push("A profundidade não pode ser menor que a espessura do MDF.");
  }

  if (["niche", "cabinet"].includes(data.furnitureType)) {
    const internalWidth = data.width - 2 * data.mdfThickness;

    if (internalWidth <= 0) {
      errors.push("A largura interna ficou menor ou igual a zero. Aumente a largura ou reduza a espessura do MDF.");
    }
  }

  if (data.furnitureType === "niche" && data.shelfCount > 0 && data.depth <= 10) {
    errors.push("A profundidade precisa ser maior que 10 mm para prateleiras do nicho.");
  }

  if (data.furnitureType === "cabinet" && data.shelfCount > 0 && data.depth <= 20) {
    errors.push("A profundidade precisa ser maior que 20 mm para prateleiras do armário.");
  }

  if (data.furnitureType === "cabinet" && data.useDoors) {
    const doorWidth = (data.width - data.doorGap - 2 * data.outerDoorGap) / 2;
    const doorHeight = data.height - 2 * data.outerDoorGap;

    if (doorWidth <= 0 || doorHeight <= 0) {
      errors.push("Alguma porta ficou com largura ou altura inválida. Revise as folgas das portas.");
    }
  }

  if (data.furnitureType === "desk") {
    const internalWidth = data.width - 2 * data.mdfThickness;
    const sideHeight = data.height - data.mdfThickness;

    if (!Number.isFinite(data.frontPanelHeight) || data.frontPanelHeight <= 0) {
      errors.push("Altura do painel frontal precisa ser um número maior que zero.");
    }

    if (internalWidth <= 0) {
      errors.push("A largura entre as laterais da mesa ficou menor ou igual a zero.");
    }

    if (sideHeight <= 0) {
      errors.push("A altura das laterais ficou menor ou igual a zero. A altura total precisa ser maior que a espessura do MDF.");
    }

    if (data.frontPanelHeight >= sideHeight) {
      errors.push("A altura do painel frontal precisa ser menor que a altura livre abaixo do tampo.");
    }
  }

  if (data.furnitureType === "panel" && !data.autoSplitPanel) {
    const fits = data.width <= data.sheetWidth && data.height <= data.sheetHeight;
    const fitsRotated = data.grainDirection === "indiferente" && data.height <= data.sheetWidth && data.width <= data.sheetHeight;

    if (!fits && !fitsRotated) {
      errors.push("O painel é maior que a chapa. Ative a divisão do painel ou aumente o tamanho da chapa.");
    }
  }

  return errors;
}

function collectTechnicalAlerts(data) {
  const alerts = [];

  if (!data) {
    return alerts;
  }

  if (data.width < 120 || data.height < 120 || data.depth < 80) {
    alerts.push({
      type: "warning",
      message: "O móvel está com medida muito pequena. Confira se todas as medidas foram digitadas em milímetros."
    });
  }

  if (data.depth < data.mdfThickness) {
    alerts.push({
      type: "error",
      message: "A profundidade é menor que a espessura do MDF."
    });
  }

  if (data.furnitureType === "cabinet" && data.useDoors) {
    const doorWidth = (data.width - data.doorGap - 2 * data.outerDoorGap) / 2;

    if (doorWidth <= 0) {
      alerts.push({
        type: "error",
        message: "A largura calculada das portas ficou negativa ou inválida."
      });
    }
  }

  return alerts;
}

function generatePieces(data) {
  if (data.furnitureType === "niche") {
    return generateNichePieces(data);
  }

  if (data.furnitureType === "cabinet") {
    return generateCabinetPieces(data);
  }

  if (data.furnitureType === "desk") {
    return generateDeskPieces(data);
  }

  return generatePanelPieces(data);
}

function generateNichePieces(data) {
  const addPiece = createPieceFactory(data);
  const internalWidth = data.width - 2 * data.mdfThickness;
  const pieces = [
    addPiece("Lateral", data.height, data.depth, 2, data.mdfThickness, "Laterais externas", edgePreset("front")),
    addPiece("Topo", internalWidth, data.depth, 1, data.mdfThickness, "Largura interna aplicada", edgePreset("front")),
    addPiece("Base", internalWidth, data.depth, 1, data.mdfThickness, "Largura interna aplicada", edgePreset("front"))
  ];

  if (data.shelfCount > 0) {
    pieces.push(
      addPiece(
        "Prateleira",
        internalWidth,
        data.depth - 10,
        data.shelfCount,
        data.mdfThickness,
        "Profundidade reduzida em 10 mm",
        edgePreset("front")
      )
    );
  }

  if (data.useBack) {
    pieces.push(addPiece("Fundo", data.width, data.height, 1, data.backThickness, "Fundo opcional", edgePreset("none")));
  }

  return pieces;
}

function generateCabinetPieces(data) {
  const addPiece = createPieceFactory(data);
  const internalWidth = data.width - 2 * data.mdfThickness;
  const pieces = [
    addPiece("Lateral", data.height, data.depth, 2, data.mdfThickness, "Laterais externas", edgePreset("front")),
    addPiece("Topo", internalWidth, data.depth, 1, data.mdfThickness, "Largura interna aplicada", edgePreset("front")),
    addPiece("Base", internalWidth, data.depth, 1, data.mdfThickness, "Largura interna aplicada", edgePreset("front"))
  ];

  if (data.shelfCount > 0) {
    pieces.push(
      addPiece(
        "Prateleira",
        internalWidth,
        data.depth - 20,
        data.shelfCount,
        data.mdfThickness,
        "Profundidade reduzida em 20 mm",
        edgePreset("front")
      )
    );
  }

  if (data.useDoors) {
    const doorWidth = (data.width - data.doorGap - 2 * data.outerDoorGap) / 2;
    const doorHeight = data.height - 2 * data.outerDoorGap;
    pieces.push(addPiece("Porta", doorWidth, doorHeight, 2, data.mdfThickness, "Folgas de porta aplicadas", edgePreset("all")));
  }

  if (data.useBack) {
    pieces.push(addPiece("Fundo", data.width, data.height, 1, data.backThickness, "Fundo opcional", edgePreset("none")));
  }

  return pieces;
}

function generatePanelPieces(data) {
  const addPiece = createPieceFactory(data);
  const pieces = [];
  const fitsSheet = data.width <= data.sheetWidth && data.height <= data.sheetHeight;
  const fitsRotated = data.grainDirection === "indiferente" && data.height <= data.sheetWidth && data.width <= data.sheetHeight;

  if (fitsSheet || fitsRotated || !data.autoSplitPanel) {
    pieces.push(addPiece("Painel principal", data.width, data.height, 1, data.mdfThickness, "Peça única", edgePreset("all")));
    return pieces;
  }

  const columns = Math.max(1, Math.ceil(data.width / data.sheetWidth));
  const rows = Math.max(1, Math.ceil(data.height / data.sheetHeight));
  const basePartWidth = roundMeasure(data.width / columns);
  const basePartHeight = roundMeasure(data.height / rows);

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      const partWidth = column === columns ? roundMeasure(data.width - basePartWidth * (columns - 1)) : basePartWidth;
      const partHeight = row === rows ? roundMeasure(data.height - basePartHeight * (rows - 1)) : basePartHeight;
      const suffix = rows === 1 ? `vertical ${column}/${columns}` : `${row}.${column}/${rows}.${columns}`;
      const edges = {
        superior: row === 1,
        inferior: row === rows,
        esquerda: column === 1,
        direita: column === columns
      };

      pieces.push(
        addPiece(
          rows === 1 ? `Painel parte vertical ${column}` : `Painel parte ${row}.${column}`,
          partWidth,
          partHeight,
          1,
          data.mdfThickness,
          `Divisão automática ${suffix}`,
          edges
        )
      );
    }
  }

  return pieces;
}

function generateDeskPieces(data) {
  const addPiece = createPieceFactory(data);
  const internalWidth = data.width - 2 * data.mdfThickness;
  const sideHeight = data.height - data.mdfThickness;

  return [
    addPiece("Tampo", data.width, data.depth, 1, data.mdfThickness, "Tampo superior da mesa", edgePreset("all")),
    addPiece("Lateral", data.depth, sideHeight, 2, data.mdfThickness, "Laterais até o piso, descontando o tampo", edgePreset("front")),
    addPiece(
      "Painel frontal",
      internalWidth,
      data.frontPanelHeight,
      1,
      data.mdfThickness,
      "Painel frontal entre as laterais",
      edgePreset("all")
    )
  ];
}

function expandPieces(pieces) {
  return pieces.flatMap((piece) => {
    const quantity = Math.max(0, Number.parseInt(piece.quantity, 10) || 0);

    return Array.from({ length: quantity }, (_, index) => ({
      ...piece,
      quantity: 1,
      instance: index + 1,
      expandedId: quantity > 1 ? `${piece.id}-${index + 1}` : piece.id
    }));
  });
}

function packPiecesIntoSheets(pieces, sheetWidth, sheetHeight, kerf) {
  state.packingAlerts = [];

  const sortedPieces = [...pieces].sort((a, b) => {
    const heightDiff = b.height - a.height;
    if (heightDiff !== 0) {
      return heightDiff;
    }

    return b.width * b.height - a.width * a.height;
  });
  const sheets = [];

  sortedPieces.forEach((piece) => {
    if (!canFitPieceInEmptySheet(piece, sheetWidth, sheetHeight)) {
      state.packingAlerts.push({
        type: "error",
        message: `${piece.expandedId} - ${piece.name} é maior que a chapa e não coube em nenhuma chapa.`
      });
      return;
    }

    let placed = false;

    for (const sheet of sheets) {
      if (placePieceOnSheet(sheet, piece, sheetWidth, sheetHeight, kerf)) {
        placed = true;
        break;
      }
    }

    if (!placed) {
      const newSheet = createSheet(sheets.length + 1, sheetWidth, sheetHeight);
      sheets.push(newSheet);
      placed = placePieceOnSheet(newSheet, piece, sheetWidth, sheetHeight, kerf);
    }

    if (!placed) {
      state.packingAlerts.push({
        type: "error",
        message: `${piece.expandedId} - ${piece.name} não coube em nenhuma chapa com o algoritmo atual.`
      });
    }
  });

  return sheets.filter((sheet) => sheet.placements.length > 0).map((sheet) => ({
    number: sheet.number,
    width: sheet.width,
    height: sheet.height,
    rows: sheet.rows,
    placements: sheet.placements
  }));
}

function renderCutPlan(sheets) {
  const container = elements.cutPlan;

  if (!sheets.length) {
    container.innerHTML = "";
    state.lastSvgMarkup = "";
    return;
  }

  const padding = 44;
  const titleHeight = 46;
  const legendLineHeight = 18;
  const sheetGap = 48;
  const maxDisplayWidth = 1040;
  const maxDisplayHeight = 580;
  const sheetLayouts = sheets.map((sheet) => {
    const scale = Math.min(maxDisplayWidth / sheet.width, maxDisplayHeight / sheet.height);
    const legendHeight = Math.max(42, 28 + sheet.placements.length * legendLineHeight);

    return {
      sheet,
      scale,
      displayWidth: sheet.width * scale,
      displayHeight: sheet.height * scale,
      legendHeight
    };
  });
  const svgWidth = Math.max(790, Math.ceil(Math.max(...sheetLayouts.map((layout) => layout.displayWidth)) + padding * 2));
  const svgHeight = Math.ceil(
    sheetLayouts.reduce((total, layout) => total + titleHeight + layout.displayHeight + layout.legendHeight + padding, padding) +
      sheetGap * Math.max(0, sheets.length - 1)
  );

  let cursorY = padding;
  const groups = sheetLayouts
    .map((layout, sheetIndex) => {
      const sheet = layout.sheet;
      const x = (svgWidth - layout.displayWidth) / 2;
      const y = cursorY + titleHeight;
      const group = renderSheetGroup(sheet, layout, x, y, cursorY, sheetIndex);
      cursorY += titleHeight + layout.displayHeight + layout.legendHeight + padding + sheetGap;
      return group;
    })
    .join("");

  state.lastSvgMarkup = `
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="Plano de corte Orák Cut">
  <defs>
    <pattern id="mdf-grain" width="54" height="54" patternUnits="userSpaceOnUse">
      <rect width="54" height="54" fill="#ead7bd"></rect>
      <path d="M0 11 C14 5 28 18 54 10 M0 31 C18 22 32 42 54 30 M0 47 C16 39 36 55 54 45" fill="none" stroke="#cda06b" stroke-width="1.2" opacity="0.58"></path>
    </pattern>
    <filter id="piece-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" flood-color="#2b241d" flood-opacity="0.22"></feDropShadow>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="#f7f8f8"></rect>
  ${groups}
</svg>`.trim();

  container.innerHTML = state.lastSvgMarkup;
}

function renderPieceTable(pieces) {
  if (!pieces.length) {
    elements.pieceTableBody.innerHTML = '<tr><td colspan="9" class="empty-state">Gere um plano para visualizar e editar a lista.</td></tr>';
    elements.pieceCountLabel.textContent = "0 itens";
    return;
  }

  const rows = pieces
    .map((piece) => {
      const edgeInputs = Object.keys(edgeLabels)
        .map((edge) => {
          const checked = piece.edges?.[edge] ? "checked" : "";
          const activeClass = piece.edges?.[edge] ? "active" : "inactive";

          return `
            <label class="edge-check ${activeClass}">
              <input type="checkbox" data-piece-id="${escapeAttribute(piece.id)}" data-edge="${edge}" ${checked}>
              ${edgeLabels[edge]}
            </label>
          `;
        })
        .join("");

      return `
        <tr>
          <td class="code-cell">${escapeHTML(piece.id)}</td>
          <td><input class="table-input" data-piece-id="${escapeAttribute(piece.id)}" data-field="name" value="${escapeAttribute(piece.name)}"></td>
          <td><input class="table-input measure" type="number" min="1" step="1" data-piece-id="${escapeAttribute(piece.id)}" data-field="quantity" value="${piece.quantity}"></td>
          <td><input class="table-input measure" type="number" min="1" step="0.1" data-piece-id="${escapeAttribute(piece.id)}" data-field="width" value="${roundMeasure(piece.width)}"></td>
          <td><input class="table-input measure" type="number" min="1" step="0.1" data-piece-id="${escapeAttribute(piece.id)}" data-field="height" value="${roundMeasure(piece.height)}"></td>
          <td><input class="table-input measure" type="number" min="1" step="0.1" data-piece-id="${escapeAttribute(piece.id)}" data-field="thickness" value="${roundMeasure(piece.thickness)}"></td>
          <td><div class="edge-controls">${edgeInputs}</div></td>
          <td><input class="table-input" data-piece-id="${escapeAttribute(piece.id)}" data-field="observation" value="${escapeAttribute(piece.observation || "")}"></td>
          <td class="action-cell"><button class="icon-action" type="button" data-delete-piece="${escapeAttribute(piece.id)}">Excluir</button></td>
        </tr>
      `;
    })
    .join("");

  elements.pieceTableBody.innerHTML = rows;

  const totalUnits = pieces.reduce((total, piece) => total + (Number.parseInt(piece.quantity, 10) || 0), 0);
  elements.pieceCountLabel.textContent = `${totalUnits} ${totalUnits === 1 ? "peça" : "peças"}`;
}

function calculateUsage(sheets) {
  const totalSheetArea = sheets.reduce((total, sheet) => total + sheet.width * sheet.height, 0);
  const usedArea = sheets.reduce((total, sheet) => {
    return total + sheet.placements.reduce((sheetTotal, placement) => sheetTotal + placement.piece.width * placement.piece.height, 0);
  }, 0);
  const leftoverArea = Math.max(0, totalSheetArea - usedArea);
  const usagePercent = totalSheetArea > 0 ? (usedArea / totalSheetArea) * 100 : 0;

  return {
    totalSheetArea,
    usedArea,
    leftoverArea,
    usagePercent,
    sheetCount: sheets.length
  };
}

function exportCSV(pieces) {
  if (!pieces.length) {
    return;
  }

  const headers = ["Código", "Nome da peça", "Quantidade", "Largura mm", "Altura mm", "Espessura mm", "Bordas com fita", "Observações"];
  const lines = [
    headers.map(formatCSVValue).join(";"),
    ...pieces.map((piece) => {
      return [
        piece.id,
        piece.name,
        piece.quantity,
        formatMeasure(piece.width),
        formatMeasure(piece.height),
        formatMeasure(piece.thickness),
        formatEdges(piece.edges),
        piece.observation
      ]
        .map(formatCSVValue)
        .join(";");
    })
  ];

  downloadFile(`orak-cut-${safeFilename(state.data?.projectName || "projeto")}.csv`, `\uFEFF${lines.join("\n")}`, "text/csv;charset=utf-8");
}

function downloadSVG() {
  if (!state.lastSvgMarkup) {
    return;
  }

  downloadFile(`orak-cut-${safeFilename(state.data?.projectName || "plano")}.svg`, state.lastSvgMarkup, "image/svg+xml;charset=utf-8");
}

function downloadDXF() {
  if (!state.sheets.length) {
    return;
  }

  const dxf = buildDXF(state.sheets, state.data);
  downloadFile(`orak-cut-${safeFilename(state.data?.projectName || "plano")}.dxf`, dxf, "application/dxf;charset=utf-8");
}

function buildDXF(sheets, data) {
  const entities = [];
  const sheetGap = 500;
  let offsetX = 0;

  entities.push(
    dxfText("TEXTOS", 0, -260, 70, `Orak Cut - ${data?.projectName || "Projeto MDF"}`),
    dxfText("TEXTOS", 0, -370, 45, "Plano de corte em milimetros. Confira medidas antes da producao.")
  );

  sheets.forEach((sheet) => {
    const offsetY = 0;
    const usedArea = sheet.placements.reduce((total, placement) => total + placement.piece.width * placement.piece.height, 0);
    const usagePercent = sheet.width * sheet.height > 0 ? (usedArea / (sheet.width * sheet.height)) * 100 : 0;
    const title = `Chapa ${sheet.number} - ${formatMeasure(sheet.width)} x ${formatMeasure(sheet.height)} mm - ${formatPercent(usagePercent)}`;

    entities.push(dxfText("TEXTOS", offsetX, offsetY + sheet.height + 120, 55, title));
    entities.push(...dxfRectangle("CHAPA", offsetX, offsetY, sheet.width, sheet.height));

    sheet.placements.forEach((placement) => {
      const x = offsetX + placement.x;
      const y = offsetY + sheet.height - placement.y - placement.height;
      const piece = placement.piece;
      const rotation = placement.rotated ? " ROT" : "";
      const label = `${piece.expandedId} ${piece.name}`;
      const measure = `${formatMeasure(piece.width)} x ${formatMeasure(piece.height)} mm${rotation}`;
      const textHeight = Math.max(22, Math.min(55, Math.min(placement.width, placement.height) / 8));

      entities.push(...dxfRectangle("PECAS", x, y, placement.width, placement.height));
      entities.push(dxfText("TEXTOS", x + 18, y + placement.height - textHeight - 18, textHeight, label));

      if (placement.height > textHeight * 3.1 && placement.width > 120) {
        entities.push(dxfText("TEXTOS", x + 18, y + placement.height - textHeight * 2.5 - 18, textHeight * 0.75, measure));
      }
    });

    offsetX += sheet.width + sheetGap;
  });

  return [
    ...dxfSection("HEADER", [
      "9",
      "$INSUNITS",
      "70",
      "4"
    ]),
    ...dxfTables(),
    "0",
    "SECTION",
    "2",
    "ENTITIES",
    ...entities.flat(),
    "0",
    "ENDSEC",
    "0",
    "EOF"
  ].join("\r\n");
}

function dxfTables() {
  return dxfSection("TABLES", [
    "0",
    "TABLE",
    "2",
    "LAYER",
    "70",
    "3",
    ...dxfLayer("CHAPA", 8),
    ...dxfLayer("PECAS", 5),
    ...dxfLayer("TEXTOS", 1),
    "0",
    "ENDTAB"
  ]);
}

function dxfLayer(name, color) {
  return [
    "0",
    "LAYER",
    "2",
    name,
    "70",
    "0",
    "62",
    String(color),
    "6",
    "CONTINUOUS"
  ];
}

function dxfSection(name, content) {
  return ["0", "SECTION", "2", name, ...content, "0", "ENDSEC"];
}

function dxfRectangle(layer, x, y, width, height) {
  return [
    dxfLine(layer, x, y, x + width, y),
    dxfLine(layer, x + width, y, x + width, y + height),
    dxfLine(layer, x + width, y + height, x, y + height),
    dxfLine(layer, x, y + height, x, y)
  ];
}

function dxfLine(layer, x1, y1, x2, y2) {
  return [
    "0",
    "LINE",
    "8",
    layer,
    "10",
    dxfNumber(x1),
    "20",
    dxfNumber(y1),
    "30",
    "0",
    "11",
    dxfNumber(x2),
    "21",
    dxfNumber(y2),
    "31",
    "0"
  ];
}

function dxfText(layer, x, y, height, text) {
  return [
    "0",
    "TEXT",
    "8",
    layer,
    "10",
    dxfNumber(x),
    "20",
    dxfNumber(y),
    "30",
    "0",
    "40",
    dxfNumber(height),
    "1",
    sanitizeDXFText(text)
  ];
}

function dxfNumber(value) {
  return roundMeasure(Number(value) || 0).toString().replace(",", ".");
}

function sanitizeDXFText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

async function copyCutList() {
  if (!state.pieces.length) {
    return;
  }

  const lines = [
    `Orák Cut - ${state.data.projectName}`,
    `${furnitureLabels[state.data.furnitureType]} | ${formatMeasure(state.data.width)} x ${formatMeasure(state.data.height)} x ${formatMeasure(state.data.depth)} mm`,
    `Cliente: ${state.data.clientName || "-"} | Ambiente: ${state.data.roomName || "-"}`,
    `Fita de borda: ${formatMeters(state.edgeBandingMeters)}`,
    "",
    "Código | Peça | Qtd | Largura | Altura | Esp. | Fita | Observações",
    ...state.pieces.map((piece) => {
      return `${piece.id} | ${piece.name} | ${piece.quantity} | ${formatMeasure(piece.width)} mm | ${formatMeasure(piece.height)} mm | ${formatMeasure(piece.thickness)} mm | ${formatEdges(piece.edges)} | ${piece.observation || ""}`;
    })
  ];
  const text = lines.join("\n");

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopyText(text);
    }

    showMessages(["Lista de peças copiada."], "success");
  } catch (error) {
    fallbackCopyText(text);
    showMessages(["Lista de peças copiada."], "success");
  }
}

function saveProject() {
  const payload = createProjectPayload();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    showMessages(["Projeto salvo neste navegador."], "success");
  } catch (error) {
    showMessages(["Não foi possível salvar o projeto. Se houver foto grande, remova a imagem e tente novamente."]);
  }
}

function loadProject() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    showMessages(["Nenhum projeto salvo neste navegador."]);
    return;
  }

  try {
    restoreProjectPayload(JSON.parse(saved));
    showMessages(["Projeto carregado do navegador."], "success");
  } catch (error) {
    showMessages(["O projeto salvo não pôde ser carregado."]);
  }
}

function clearSavedProject() {
  localStorage.removeItem(STORAGE_KEY);
  showMessages(["Projeto salvo removido do navegador."], "success");
}

function exportProjectJSON() {
  const payload = createProjectPayload();
  const json = JSON.stringify(payload, null, 2);
  downloadFile(`orak-cut-${safeFilename(payload.formData.projectName || "projeto")}.json`, json, "application/json;charset=utf-8");
}

function importProjectJSON(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      restoreProjectPayload(payload);
      showMessages(["Projeto importado. Gere ou atualize o plano para revisar as peças."], "success");
    } catch (error) {
      showMessages(["O arquivo JSON não pôde ser importado."]);
    } finally {
      elements.jsonInput.value = "";
    }
  };
  reader.readAsText(file);
}

function addManualPiece() {
  const data = state.data || getFormData();
  const errors = validateData(data);

  if (errors.length) {
    renderAlerts(errors.map((message) => ({ type: "error", message })));
    showMessages(["Corrija os dados do projeto antes de adicionar peças."]);
    return;
  }

  state.data = data;
  state.generatedAt = state.generatedAt || new Date().toISOString();
  state.pieces.push(
    normalizePiece({
      id: getNextPieceId(),
      name: "Peça manual",
      width: 600,
      height: 300,
      quantity: 1,
      thickness: data.mdfThickness,
      observation: "Adicionada manualmente",
      edges: edgePreset("none"),
      canRotate: data.grainDirection === "indiferente"
    })
  );

  renderPieceTable(state.pieces);
  updateCutPlanFromEditedPieces();
}

function updatePiece(pieceId, field, value) {
  const piece = state.pieces.find((item) => item.id === pieceId);

  if (!piece) {
    return;
  }

  if (["width", "height", "thickness"].includes(field)) {
    piece[field] = Math.max(0, toNumber(value));
  } else if (field === "quantity") {
    piece.quantity = Math.max(0, Number.parseInt(value, 10) || 0);
  } else {
    piece[field] = String(value ?? "").trim();
  }
}

function deletePiece(pieceId) {
  state.pieces = state.pieces.filter((piece) => piece.id !== pieceId);
  updateCutPlanFromEditedPieces();
}

function calculateEdgeBanding(pieces) {
  const totalMm = pieces.reduce((total, piece) => {
    const quantity = Number.parseInt(piece.quantity, 10) || 0;
    const edges = piece.edges || edgePreset("none");
    let pieceTotal = 0;

    if (edges.superior) {
      pieceTotal += piece.width;
    }

    if (edges.inferior) {
      pieceTotal += piece.width;
    }

    if (edges.esquerda) {
      pieceTotal += piece.height;
    }

    if (edges.direita) {
      pieceTotal += piece.height;
    }

    return total + pieceTotal * quantity;
  }, 0);

  return totalMm / 1000;
}

function updateCutPlanFromEditedPieces() {
  const data = getFormData();
  const errors = validateData(data);

  if (errors.length) {
    renderAlerts(errors.map((message) => ({ type: "error", message })));
    showMessages(["Corrija os dados do projeto antes de atualizar o plano."]);
    return;
  }

  state.data = data;
  state.pieces = state.pieces.map((piece) => normalizePiece(piece, data));
  state.generatedAt = state.generatedAt || new Date().toISOString();
  recalculateAndRender("Plano atualizado com as peças editadas.");
}

function renderAlerts(alerts) {
  const normalizedAlerts = alerts
    .filter(Boolean)
    .map((alert) => (typeof alert === "string" ? { type: "warning", message: alert } : alert))
    .filter((alert) => alert.message);

  state.alerts = normalizedAlerts;
  elements.alertsPanel.hidden = normalizedAlerts.length === 0;

  if (!normalizedAlerts.length) {
    elements.alertsList.innerHTML = "";
    return;
  }

  elements.alertsList.innerHTML = normalizedAlerts
    .map((alert) => `<li class="alert-item ${escapeAttribute(alert.type || "warning")}">${escapeHTML(alert.message)}</li>`)
    .join("");
}

function renderProjectSummary(data) {
  if (!data) {
    elements.projectSummary.innerHTML = "<span>Gere um plano para visualizar os dados do projeto.</span>";
    elements.resultProjectName.textContent = "Nenhum plano gerado";
    return;
  }

  elements.resultProjectName.textContent = `${data.projectName} • ${furnitureLabels[data.furnitureType]}`;
  elements.projectSummary.innerHTML = `
    <article><strong>Projeto</strong>${escapeHTML(data.projectName || "-")}</article>
    <article><strong>Cliente</strong>${escapeHTML(data.clientName || "-")}</article>
    <article><strong>Ambiente</strong>${escapeHTML(data.roomName || "-")}</article>
    <article><strong>Data</strong>${escapeHTML(formatDateTime(state.generatedAt || new Date().toISOString()))}</article>
    <article><strong>Móvel</strong>${escapeHTML(furnitureLabels[data.furnitureType] || "-")}</article>
    <article><strong>Medidas</strong>${formatMeasure(data.width)} x ${formatMeasure(data.height)} x ${formatMeasure(data.depth)} mm</article>
    <article><strong>Chapa</strong>${formatMeasure(data.sheetWidth)} x ${formatMeasure(data.sheetHeight)} mm</article>
    <article><strong>Observações</strong>${escapeHTML(data.generalNotes || "-")}</article>
  `;
}

function renderSheetSummary(sheets) {
  elements.sheetCountLabel.textContent = sheets.length === 1 ? "1 chapa" : `${sheets.length} chapas`;

  if (!sheets.length) {
    elements.sheetSummary.innerHTML = "<span>Nenhuma chapa calculada.</span>";
    return;
  }

  elements.sheetSummary.innerHTML = sheets
    .map((sheet) => {
      const sheetArea = sheet.width * sheet.height;
      const used = sheet.placements.reduce((total, placement) => total + placement.piece.width * placement.piece.height, 0);
      const percent = sheetArea > 0 ? (used / sheetArea) * 100 : 0;

      return `
        <article>
          <strong>Chapa ${sheet.number}</strong>
          ${sheet.placements.length} peças<br>
          Usado: ${formatArea(used)}<br>
          Aproveitamento: ${formatPercent(percent)}
        </article>
      `;
    })
    .join("");
}

function recalculateAndRender(successMessage) {
  state.packingAlerts = [];
  const expandedPieces = expandPieces(state.pieces);
  const sheets = packPiecesIntoSheets(expandedPieces, state.data.sheetWidth, state.data.sheetHeight, state.data.kerf);
  const usage = calculateUsage(sheets);

  state.sheets = sheets;
  state.edgeBandingMeters = calculateEdgeBanding(state.pieces);

  renderPieceTable(state.pieces);
  renderCutPlan(sheets);
  renderSummary(usage, state.data);
  renderProjectSummary(state.data);
  renderSheetSummary(sheets);
  renderAlerts([...collectTechnicalAlerts(state.data), ...state.packingAlerts]);
  setExportButtons(state.pieces.length > 0);
  showMessages([successMessage], "success");
}

function renderSummary(usage, data) {
  elements.summaryGrid.innerHTML = `
    <article>
      <span>Área total</span>
      <strong>${formatArea(usage.totalSheetArea)}</strong>
    </article>
    <article>
      <span>Área usada</span>
      <strong>${formatArea(usage.usedArea)}</strong>
    </article>
    <article>
      <span>Sobra</span>
      <strong>${formatArea(usage.leftoverArea)}</strong>
    </article>
    <article>
      <span>Aproveitamento</span>
      <strong>${formatPercent(usage.usagePercent)}</strong>
    </article>
    <article>
      <span>Chapas</span>
      <strong>${usage.sheetCount}</strong>
    </article>
    <article>
      <span>Fita de borda</span>
      <strong>${formatMeters(state.edgeBandingMeters)}</strong>
    </article>
  `;

  if (data) {
    elements.resultProjectName.textContent = `${data.projectName} • ${furnitureLabels[data.furnitureType]}`;
  }
}

function renderSheetGroup(sheet, layout, x, y, titleY, sheetIndex) {
  const sheetArea = sheet.width * sheet.height;
  const usedArea = sheet.placements.reduce((total, placement) => total + placement.piece.width * placement.piece.height, 0);
  const usagePercent = sheetArea > 0 ? (usedArea / sheetArea) * 100 : 0;
  const title = `Chapa ${sheet.number}`;
  const pieces = sheet.placements
    .map((placement, index) => {
      const color = pieceColors[(index + sheetIndex) % pieceColors.length];
      const px = x + placement.x * layout.scale;
      const py = y + placement.y * layout.scale;
      const width = placement.width * layout.scale;
      const height = placement.height * layout.scale;
      const clipId = `clip-${sheet.number}-${index}`;
      const measure = `${formatMeasure(placement.piece.width)} x ${formatMeasure(placement.piece.height)} mm`;
      const rotationNote = placement.rotated ? " rot." : "";
      const fontSize = Math.max(8, Math.min(13, Math.min(width / 6.8, height / 4.6)));
      const lineGap = fontSize + 2;
      const labelX = px + Math.min(10, Math.max(5, width * 0.05));
      const labelY = py + Math.min(20, Math.max(13, height * 0.18));
      const showName = height > 36 && width > 56;
      const showMeasure = height > 56 && width > 82;
      const name = width < 120 ? abbreviateName(placement.piece.name) : placement.piece.name;

      return `
        <g>
          <clipPath id="${clipId}">
            <rect x="${px}" y="${py}" width="${width}" height="${height}" rx="4"></rect>
          </clipPath>
          <rect x="${px}" y="${py}" width="${width}" height="${height}" rx="4" fill="${color}" stroke="#3b2d21" stroke-width="1" filter="url(#piece-shadow)"></rect>
          <g clip-path="url(#${clipId})">
            <text x="${labelX}" y="${labelY}" fill="#1f1b17" font-size="${fontSize}" font-weight="900">${escapeHTML(placement.piece.expandedId)}</text>
            ${showName ? `<text x="${labelX}" y="${labelY + lineGap}" fill="#1f1b17" font-size="${fontSize * 0.86}" font-weight="700">${escapeHTML(name)}</text>` : ""}
            ${showMeasure ? `<text x="${labelX}" y="${labelY + lineGap * 2}" fill="#1f1b17" font-size="${fontSize * 0.8}">${escapeHTML(measure + rotationNote)}</text>` : ""}
          </g>
        </g>
      `;
    })
    .join("");
  const legendY = y + layout.displayHeight + 28;
  const legend = sheet.placements
    .map((placement, index) => {
      const color = pieceColors[(index + sheetIndex) % pieceColors.length];
      const lineY = legendY + index * 18;
      const text = `${placement.piece.expandedId} - ${placement.piece.name} - ${formatMeasure(placement.piece.width)} x ${formatMeasure(placement.piece.height)} mm${placement.rotated ? " - rotacionada" : ""}`;

      return `
        <rect x="${x}" y="${lineY - 10}" width="10" height="10" fill="${color}" stroke="#3b2d21" stroke-width="0.6"></rect>
        <text x="${x + 16}" y="${lineY}" fill="#3c3731" font-size="12">${escapeHTML(text)}</text>
      `;
    })
    .join("");

  return `
    <g class="cut-sheet">
      <text x="${x}" y="${titleY + 22}" fill="#25211d" font-size="22" font-weight="900">${title}</text>
      <text x="${x}" y="${titleY + 43}" fill="#6d6861" font-size="12">${formatMeasure(sheet.width)} x ${formatMeasure(sheet.height)} mm • Aproveitamento ${formatPercent(usagePercent)}</text>
      <rect x="${x}" y="${y}" width="${layout.displayWidth}" height="${layout.displayHeight}" fill="url(#mdf-grain)" stroke="#25211d" stroke-width="2"></rect>
      <text x="${x + layout.displayWidth - 54}" y="${y + layout.displayHeight - 14}" fill="#6d4d28" font-size="12" font-weight="800">Sobra</text>
      ${pieces}
      <text x="${x}" y="${legendY - 18}" fill="#25211d" font-size="13" font-weight="900">Legenda</text>
      ${legend}
    </g>
  `;
}

function handlePieceTableInput(event) {
  const target = event.target;
  const pieceId = target.dataset.pieceId;

  if (!pieceId) {
    return;
  }

  if (target.dataset.edge) {
    const piece = state.pieces.find((item) => item.id === pieceId);

    if (piece) {
      piece.edges = normalizeEdges(piece.edges);
      piece.edges[target.dataset.edge] = target.checked;
      target.closest(".edge-check").classList.toggle("active", target.checked);
      target.closest(".edge-check").classList.toggle("inactive", !target.checked);
    }

    return;
  }

  updatePiece(pieceId, target.dataset.field, target.value);
}

function handlePieceTableClick(event) {
  const button = event.target.closest("[data-delete-piece]");

  if (!button) {
    return;
  }

  deletePiece(button.dataset.deletePiece);
}

function createProjectPayload() {
  const formData = getFormData();
  const canStorePhoto = state.photoDataUrl && state.photoDataUrl.length <= MAX_STORED_PHOTO_CHARS;

  return {
    version: 2,
    app: "Orák Cut",
    exportedAt: new Date().toISOString(),
    generatedAt: state.generatedAt,
    formData,
    projectData: {
      projectName: formData.projectName,
      clientName: formData.clientName,
      roomName: formData.roomName,
      generalNotes: formData.generalNotes
    },
    sheetSettings: {
      sheetWidth: formData.sheetWidth,
      sheetHeight: formData.sheetHeight,
      kerf: formData.kerf,
      grainDirection: formData.grainDirection
    },
    pieces: state.pieces,
    sheets: state.sheets,
    edgeBandingMeters: state.edgeBandingMeters,
    photoDataUrl: canStorePhoto ? state.photoDataUrl : null,
    photoStored: Boolean(canStorePhoto),
    imageAnalysis: serializeImageAnalysisState(),
    arMeasurement: serializeARMeasurementState(),
    projectState: {
      measurementSource: projectState.measurementSource
    }
  };
}

function restoreProjectPayload(payload) {
  const formData = payload.formData || payload.data || payload.projectData || getDefaultFormData();

  setFormData(formData);
  state.data = getFormData();
  state.generatedAt = payload.generatedAt || new Date().toISOString();
  projectState.measurementSource = payload.projectState?.measurementSource || "manual";
  state.photoDataUrl = typeof payload.photoDataUrl === "string" && payload.photoDataUrl.length <= MAX_STORED_PHOTO_CHARS ? payload.photoDataUrl : null;
  renderPhotoPreview();
  restoreImageAnalysisState(payload.imageAnalysis);
  restoreARMeasurementState(payload.arMeasurement);
  renderMeasurementSourceNotice();

  state.pieces = Array.isArray(payload.pieces) ? payload.pieces.map((piece) => normalizePiece(piece, state.data)) : [];

  if (state.pieces.length) {
    recalculateAndRender("Projeto restaurado com peças editáveis.");
  } else {
    resetResults(false);
    renderProjectSummary(state.data);
  }
}

function serializeImageAnalysisState() {
  const canStoreImage = imageAnalysisState.imageDataUrl && imageAnalysisState.imageDataUrl.length <= MAX_STORED_PHOTO_CHARS;

  return {
    imageLoaded: Boolean(canStoreImage),
    imageDataUrl: canStoreImage ? imageAnalysisState.imageDataUrl : null,
    referencePoints: imageAnalysisState.referencePoints,
    referenceRealMm: imageAnalysisState.referenceRealMm,
    pixelsPerMm: imageAnalysisState.pixelsPerMm,
    measurements: imageAnalysisState.measurements,
    detectedBounds: imageAnalysisState.detectedBounds,
    suggestedFurnitureType: imageAnalysisState.suggestedFurnitureType,
    confidence: imageAnalysisState.confidence,
    appliedToForm: imageAnalysisState.appliedToForm,
    imageStored: Boolean(canStoreImage)
  };
}

function restoreImageAnalysisState(serialized) {
  resetImageAnalysis();

  if (!serialized || typeof serialized !== "object") {
    return;
  }

  imageAnalysisState.referencePoints = Array.isArray(serialized.referencePoints) ? serialized.referencePoints : [];
  imageAnalysisState.referenceRealMm = serialized.referenceRealMm || null;
  imageAnalysisState.pixelsPerMm = serialized.pixelsPerMm || null;
  imageAnalysisState.measurements = Array.isArray(serialized.measurements) ? serialized.measurements : [];
  imageAnalysisState.detectedBounds = serialized.detectedBounds || null;
  imageAnalysisState.suggestedFurnitureType = serialized.suggestedFurnitureType || null;
  imageAnalysisState.confidence = serialized.confidence || "baixa";
  imageAnalysisState.appliedToForm = Boolean(serialized.appliedToForm);
  elements.referenceRealMm.value = imageAnalysisState.referenceRealMm || "";
  elements.imageConfirmation.checked = false;

  if (serialized.imageDataUrl) {
    const image = new Image();
    image.onload = () => {
      imageAnalysisState.imageLoaded = true;
      imageAnalysisState.image = image;
      imageAnalysisState.imageDataUrl = serialized.imageDataUrl;
      elements.imageAnalyzeButton.disabled = false;
      renderImageAnalysisPanel();
      drawImageCanvasOverlay();
    };
    image.src = serialized.imageDataUrl;
  }

  renderImageAnalysisPanel();
  drawImageCanvasOverlay();
}

function serializeARMeasurementState() {
  return {
    points: arMeasurementState.points,
    measurements: arMeasurementState.measurements,
    appliedToForm: arMeasurementState.appliedToForm,
    lastError: arMeasurementState.lastError
  };
}

function restoreARMeasurementState(serialized) {
  arMeasurementState.points = Array.isArray(serialized?.points) ? serialized.points : [];
  arMeasurementState.measurements = Array.isArray(serialized?.measurements) ? serialized.measurements : [];
  arMeasurementState.appliedToForm = Boolean(serialized?.appliedToForm);
  arMeasurementState.lastError = serialized?.lastError || null;
  elements.arApplyConfirmation.checked = false;
  renderARStatus();
  renderARPoints();
  renderARMeasurements();
}

function handlePhotoPreview(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    state.photoDataUrl = reader.result;
    renderPhotoPreview();

    // Fotos grandes estouram facilmente a cota do localStorage. Mantemos a prévia,
    // mas só salvamos no projeto quando o data URL fica abaixo do limite definido.
    if (state.photoDataUrl.length > MAX_STORED_PHOTO_CHARS) {
      showMessages(["Foto carregada como prévia temporária. Por ser grande, ela não será salva no navegador nem no JSON."], "success");
    }
  };
  reader.readAsDataURL(file);
}

function renderPhotoPreview() {
  if (!state.photoDataUrl) {
    elements.photoPreview.innerHTML = "<span>Prévia da foto</span>";
    return;
  }

  elements.photoPreview.innerHTML = `<img src="${escapeAttribute(state.photoDataUrl)}" alt="Foto de referência do móvel">`;
}

function removePhoto() {
  state.photoDataUrl = null;
  elements.photoInput.value = "";
  renderPhotoPreview();
  showMessages(["Foto removida da prévia."], "success");
}

function loadImageToCanvas(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      imageAnalysisState.imageLoaded = true;
      imageAnalysisState.image = image;
      imageAnalysisState.imageDataUrl = reader.result;
      imageAnalysisState.referencePoints = [];
      imageAnalysisState.referenceRealMm = null;
      imageAnalysisState.pixelsPerMm = null;
      imageAnalysisState.measurements = [];
      imageAnalysisState.detectedBounds = null;
      imageAnalysisState.suggestedFurnitureType = null;
      imageAnalysisState.confidence = "baixa";
      imageAnalysisState.pendingMeasurementPoint = null;
      imageAnalysisState.zoom = 1;
      imageAnalysisState.panX = 0;
      imageAnalysisState.panY = 0;
      imageAnalysisState.appliedToForm = false;
      imageAnalysisState.lastEdgeData = null;
      elements.imageZoom.value = "1";
      elements.referenceRealMm.value = "";
      elements.imageConfirmation.checked = false;
      elements.imageAnalyzeButton.disabled = false;
      renderImageAnalysisPanel();
      drawImageCanvasOverlay();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function resetImageAnalysis() {
  imageAnalysisState.imageLoaded = false;
  imageAnalysisState.image = null;
  imageAnalysisState.imageDataUrl = null;
  imageAnalysisState.referencePoints = [];
  imageAnalysisState.referenceRealMm = null;
  imageAnalysisState.pixelsPerMm = null;
  imageAnalysisState.measurements = [];
  imageAnalysisState.detectedBounds = null;
  imageAnalysisState.suggestedFurnitureType = null;
  imageAnalysisState.confidence = "baixa";
  imageAnalysisState.mode = "reference";
  imageAnalysisState.pendingMeasurementPoint = null;
  imageAnalysisState.zoom = 1;
  imageAnalysisState.panX = 0;
  imageAnalysisState.panY = 0;
  imageAnalysisState.drawInfo = null;
  imageAnalysisState.drag = null;
  imageAnalysisState.appliedToForm = false;
  imageAnalysisState.lastEdgeData = null;
  elements.imageAnalysisInput.value = "";
  elements.imageZoom.value = "1";
  elements.referenceRealMm.value = "";
  elements.imageConfirmation.checked = false;
  elements.imageAnalyzeButton.disabled = true;
  renderImageAnalysisPanel();
  drawImageCanvasOverlay();
}

function handleCanvasPointerDown(event) {
  if (!imageAnalysisState.imageLoaded) {
    return;
  }

  const point = getCanvasPointFromPointer(event);
  imageAnalysisState.drag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    canvasPoint: point,
    moved: false
  };
  elements.imageCanvas.setPointerCapture?.(event.pointerId);
}

function handleCanvasPointerMove(event) {
  const drag = imageAnalysisState.drag;

  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }

  const dx = event.clientX - drag.lastX;
  const dy = event.clientY - drag.lastY;

  if (Math.abs(event.clientX - drag.startX) > 4 || Math.abs(event.clientY - drag.startY) > 4) {
    drag.moved = true;
  }

  if (drag.moved) {
    imageAnalysisState.panX += dx * (elements.imageCanvas.width / elements.imageCanvas.getBoundingClientRect().width);
    imageAnalysisState.panY += dy * (elements.imageCanvas.height / elements.imageCanvas.getBoundingClientRect().height);
    drawImageCanvasOverlay();
  }

  drag.lastX = event.clientX;
  drag.lastY = event.clientY;
}

function handleCanvasPointerUp(event) {
  const drag = imageAnalysisState.drag;

  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }

  if (!drag.moved) {
    handleCanvasClick(drag.canvasPoint);
  }

  imageAnalysisState.drag = null;
}

function handleCanvasClick(canvasPoint) {
  if (!imageAnalysisState.imageLoaded || !imageAnalysisState.drawInfo) {
    return;
  }

  const imagePoint = canvasToImagePoint(canvasPoint);

  if (!imagePoint) {
    return;
  }

  if (imageAnalysisState.mode === "reference") {
    setReferencePoint(imagePoint);
    return;
  }

  if (!imageAnalysisState.pixelsPerMm) {
    showMessages(["Defina a escala por dois pontos antes de medir outras partes da imagem."]);
    return;
  }

  if (!imageAnalysisState.pendingMeasurementPoint) {
    imageAnalysisState.pendingMeasurementPoint = imagePoint;
    renderImageAnalysisPanel();
    drawImageCanvasOverlay();
    return;
  }

  addImageMeasurement(imageAnalysisState.pendingMeasurementPoint, imagePoint);
  imageAnalysisState.pendingMeasurementPoint = null;
  renderImageAnalysisPanel();
  drawImageCanvasOverlay();
}

function setReferencePoint(point) {
  if (imageAnalysisState.referencePoints.length >= 2) {
    imageAnalysisState.referencePoints = [];
    imageAnalysisState.pixelsPerMm = null;
  }

  imageAnalysisState.referencePoints.push(point);
  calculateImageScale();
  renderImageAnalysisPanel();
  drawImageCanvasOverlay();
}

function calculateImageScale() {
  const referenceRealMm = toNumber(elements.referenceRealMm.value);

  imageAnalysisState.referenceRealMm = Number.isFinite(referenceRealMm) && referenceRealMm > 0 ? referenceRealMm : null;

  if (imageAnalysisState.referencePoints.length === 2 && imageAnalysisState.referenceRealMm) {
    const pixelDistance = getPointDistance(imageAnalysisState.referencePoints[0], imageAnalysisState.referencePoints[1]);
    imageAnalysisState.pixelsPerMm = pixelDistance / imageAnalysisState.referenceRealMm;
    suggestFurnitureTypeFromImage();
  } else {
    imageAnalysisState.pixelsPerMm = null;
  }

  renderImageAnalysisPanel();
  drawImageCanvasOverlay();
}

function addImageMeasurement(pointA, pointB) {
  const pixelDistance = getPointDistance(pointA, pointB);
  const estimatedMm = imageAnalysisState.pixelsPerMm ? pixelDistance / imageAnalysisState.pixelsPerMm : null;
  const label = elements.measurementLabel.value.trim() || `Medição ${imageAnalysisState.measurements.length + 1}`;

  imageAnalysisState.measurements.push({
    id: `M${Date.now()}${imageAnalysisState.measurements.length}`,
    label,
    points: [pointA, pointB],
    pixelDistance,
    estimatedMm
  });

  elements.measurementLabel.value = getNextMeasurementLabel(label);
  suggestFurnitureTypeFromImage();
}

function renameImageMeasurement(measurementId, label) {
  const measurement = imageAnalysisState.measurements.find((item) => item.id === measurementId);

  if (!measurement) {
    return;
  }

  measurement.label = String(label || "").trim();
  suggestFurnitureTypeFromImage();
  renderImageAnalysisPanel();
}

function deleteImageMeasurement(measurementId) {
  imageAnalysisState.measurements = imageAnalysisState.measurements.filter((measurement) => measurement.id !== measurementId);
  suggestFurnitureTypeFromImage();
  renderImageAnalysisPanel();
  drawImageCanvasOverlay();
}

function analyzeImageBasic() {
  if (!imageAnalysisState.imageLoaded) {
    showMessages(["Envie uma foto antes de analisar a imagem."]);
    return;
  }

  // Preparado para evoluir para OpenCV.js no futuro; esta etapa usa apenas Canvas API.
  const image = imageAnalysisState.image;
  const maxDimension = 900;
  const analysisScale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * analysisScale));
  const height = Math.max(1, Math.round(image.naturalHeight * analysisScale));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const gray = new Uint8ClampedArray(width * height);

  for (let index = 0; index < imageData.data.length; index += 4) {
    const pixelIndex = index / 4;
    gray[pixelIndex] = Math.round(imageData.data[index] * 0.299 + imageData.data[index + 1] * 0.587 + imageData.data[index + 2] * 0.114);
  }

  const edgeMap = detectEdgesBasic(gray, width, height);
  const box = findMainBoundingBox(edgeMap, width, height);

  imageAnalysisState.lastEdgeData = {
    edgeMap,
    width,
    height,
    analysisScale,
    centralDivisionScore: box ? calculateCentralDivisionScore(edgeMap, width, box) : 0
  };

  if (!box) {
    imageAnalysisState.detectedBounds = null;
    suggestFurnitureTypeFromImage();
    renderImageAnalysisPanel();
    drawImageCanvasOverlay();
    showMessages(["Não foi possível encontrar um retângulo principal claro na imagem. Tente uma foto mais frontal."]);
    return;
  }

  imageAnalysisState.detectedBounds = {
    x: box.x / analysisScale,
    y: box.y / analysisScale,
    width: box.width / analysisScale,
    height: box.height / analysisScale
  };
  suggestFurnitureTypeFromImage();
  renderImageAnalysisPanel();
  drawImageCanvasOverlay();
  showMessages(["Análise simples concluída. Confira visualmente o contorno detectado."], "success");
}

function detectEdgesBasic(gray, width, height) {
  const edgeMap = new Uint8ClampedArray(width * height);
  const threshold = 38;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const diffX = Math.abs(gray[index] - gray[index + 1]);
      const diffY = Math.abs(gray[index] - gray[index + width]);
      const diffDiag = Math.abs(gray[index - width - 1] - gray[index + width + 1]);
      const value = Math.max(diffX, diffY, diffDiag);

      if (value > threshold) {
        edgeMap[index] = value;
      }
    }
  }

  return edgeMap;
}

function findMainBoundingBox(edgeMap, width, height) {
  const marginX = Math.round(width * 0.03);
  const marginY = Math.round(height * 0.03);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let count = 0;

  for (let y = marginY; y < height - marginY; y += 1) {
    for (let x = marginX; x < width - marginX; x += 1) {
      const value = edgeMap[y * width + x];

      if (value > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        count += 1;
      }
    }
  }

  if (count < width * height * 0.002 || minX >= maxX || minY >= maxY) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    edgeCount: count
  };
}

function drawDetectedBounds(ctx) {
  if (!imageAnalysisState.detectedBounds) {
    return;
  }

  const topLeft = imageToCanvasPoint({
    x: imageAnalysisState.detectedBounds.x,
    y: imageAnalysisState.detectedBounds.y
  });
  const bottomRight = imageToCanvasPoint({
    x: imageAnalysisState.detectedBounds.x + imageAnalysisState.detectedBounds.width,
    y: imageAnalysisState.detectedBounds.y + imageAnalysisState.detectedBounds.height
  });

  ctx.save();
  ctx.strokeStyle = "#28a56f";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 7]);
  ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  ctx.fillStyle = "rgba(40, 165, 111, 0.12)";
  ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  ctx.restore();
}

function suggestFurnitureTypeFromImage() {
  const dimensions = getImageDetectedDimensions();
  const bounds = imageAnalysisState.detectedBounds;
  const widthValue = dimensions.widthMm || bounds?.width || null;
  const heightValue = dimensions.heightMm || bounds?.height || null;
  let suggestedFurnitureType = null;
  let confidence = "baixa";

  if (widthValue && heightValue) {
    const ratio = widthValue / heightValue;
    const hasCentralDivision = hasImageCentralDivisionHint();

    if (Math.abs(1 - ratio) <= 0.18) {
      suggestedFurnitureType = "niche";
      confidence = imageAnalysisState.pixelsPerMm ? "média" : "baixa";
    } else if (ratio > 1.18) {
      suggestedFurnitureType = "panel";
      confidence = imageAnalysisState.pixelsPerMm ? "média" : "baixa";
    } else if (ratio < 0.82 && hasCentralDivision) {
      suggestedFurnitureType = "cabinet";
      confidence = imageAnalysisState.pixelsPerMm ? "alta" : "média";
    } else if (ratio < 0.82) {
      suggestedFurnitureType = "cabinet";
      confidence = "baixa";
    }
  }

  imageAnalysisState.suggestedFurnitureType = suggestedFurnitureType;
  imageAnalysisState.confidence = confidence;
  return {
    suggestedFurnitureType,
    confidence
  };
}

function applyImageMeasurementsToForm() {
  const dimensions = getImageDetectedDimensions();

  if (!dimensions.widthMm && !dimensions.heightMm) {
    showMessages(["Marque medições ou analise a imagem antes de aplicar medidas ao formulário."]);
    return;
  }

  if (dimensions.widthMm) {
    elements.width.value = Math.round(dimensions.widthMm);
  }

  if (dimensions.heightMm) {
    elements.height.value = Math.round(dimensions.heightMm);
  }

  if (dimensions.depthMm) {
    elements.depth.value = Math.round(dimensions.depthMm);
  }

  if (imageAnalysisState.suggestedFurnitureType) {
    elements.furnitureType.value = imageAnalysisState.suggestedFurnitureType;
  }

  imageAnalysisState.appliedToForm = true;
  elements.imageConfirmation.checked = false;
  handleFurnitureTypeChange();
  renderImageAnalysisPanel();
  showMessages(["Medidas estimadas aplicadas ao formulário. Confira e marque a confirmação antes de gerar cortes."], "success");
}

function renderImageAnalysisPanel() {
  document.querySelectorAll("[data-image-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.imageMode === imageAnalysisState.mode);
  });

  elements.canvasEmpty.style.display = imageAnalysisState.imageLoaded ? "none" : "grid";
  elements.imageAnalyzeButton.disabled = !imageAnalysisState.imageLoaded;

  if (imageAnalysisState.referencePoints.length === 0) {
    elements.referenceStatus.textContent = "Nenhum ponto marcado.";
  } else if (imageAnalysisState.referencePoints.length === 1) {
    elements.referenceStatus.textContent = "1 ponto marcado. Clique no segundo ponto da referência.";
  } else {
    const pixelDistance = getPointDistance(imageAnalysisState.referencePoints[0], imageAnalysisState.referencePoints[1]);
    elements.referenceStatus.textContent = `Distância marcada: ${formatPixelDistance(pixelDistance)}.`;
  }

  if (imageAnalysisState.pixelsPerMm && imageAnalysisState.referenceRealMm) {
    elements.scaleStatus.textContent = `Medida real: ${formatMeasure(imageAnalysisState.referenceRealMm)} mm. Escala: ${imageAnalysisState.pixelsPerMm.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} px/mm.`;
  } else {
    elements.scaleStatus.textContent = "Escala ainda não definida.";
  }

  if (imageAnalysisState.pendingMeasurementPoint) {
    elements.measurementStatus.textContent = "1 ponto da medição marcado. Clique no segundo ponto.";
  } else if (imageAnalysisState.pixelsPerMm) {
    elements.measurementStatus.textContent = "Clique em dois pontos para medir uma parte do móvel.";
  } else {
    elements.measurementStatus.textContent = "Defina a escala e clique em dois pontos.";
  }

  elements.measurementList.innerHTML = imageAnalysisState.measurements.length
    ? imageAnalysisState.measurements
        .map((measurement) => {
          return `
            <article class="measurement-item">
              <div>
                <input value="${escapeAttribute(measurement.label)}" data-measurement-id="${escapeAttribute(measurement.id)}">
                <span>${formatPixelDistance(measurement.pixelDistance)} • ${formatMeasure(measurement.estimatedMm || 0)} mm estimados</span>
              </div>
              <button class="measurement-delete" type="button" data-delete-measurement="${escapeAttribute(measurement.id)}">Excluir</button>
            </article>
          `;
        })
        .join("")
    : '<div class="analysis-metric">Nenhuma medição adicionada.</div>';

  const suggestionText = imageAnalysisState.suggestedFurnitureType
    ? `Tipo sugerido: ${furnitureLabels[imageAnalysisState.suggestedFurnitureType]} — confiança ${imageAnalysisState.confidence}.`
    : "Tipo sugerido: aguardando análise.";
  elements.imageSuggestion.textContent = `${suggestionText} Sugestão assistiva, não definitiva.`;
  elements.imageSuggestion.classList.toggle("ready", Boolean(imageAnalysisState.suggestedFurnitureType));

  const dimensions = getImageDetectedDimensions();
  const previewParts = [];

  if (dimensions.widthMm) {
    previewParts.push(`largura ${formatMeasure(dimensions.widthMm)} mm`);
  }

  if (dimensions.heightMm) {
    previewParts.push(`altura ${formatMeasure(dimensions.heightMm)} mm`);
  }

  if (dimensions.depthMm) {
    previewParts.push(`profundidade ${formatMeasure(dimensions.depthMm)} mm`);
  }

  if (imageAnalysisState.suggestedFurnitureType) {
    previewParts.push(`tipo ${furnitureLabels[imageAnalysisState.suggestedFurnitureType]}`);
  }

  elements.imageApplyPreview.textContent = previewParts.length
    ? `Pronto para aplicar: ${previewParts.join(", ")}.`
    : "Nenhuma medida pronta para aplicar.";
  elements.imageApplyPreview.classList.toggle("ready", previewParts.length > 0);
  elements.applyImageMeasuresButton.disabled = previewParts.length === 0;
}

function drawImageCanvasOverlay() {
  const canvas = elements.imageCanvas;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f5f6f6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!imageAnalysisState.imageLoaded || !imageAnalysisState.image) {
    return;
  }

  const image = imageAnalysisState.image;
  const baseScale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const scale = baseScale * imageAnalysisState.zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const offsetX = (canvas.width - drawWidth) / 2 + imageAnalysisState.panX;
  const offsetY = (canvas.height - drawHeight) / 2 + imageAnalysisState.panY;

  imageAnalysisState.drawInfo = {
    scale,
    offsetX,
    offsetY,
    drawWidth,
    drawHeight
  };

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  drawDetectedBounds(ctx);
  drawReferenceOverlay(ctx);
  drawMeasurementOverlay(ctx);
}

function requireImageMeasurementConfirmation() {
  if (!imageAnalysisState.appliedToForm) {
    return true;
  }

  if (elements.imageConfirmation.checked) {
    return true;
  }

  const message = "As medidas detectadas pela imagem são estimativas. Confirme manualmente antes de gerar plano de corte.";
  renderAlerts([{ type: "warning", message }]);
  showMessages([`${message} Marque “Conferi e confirmo as medidas.” na seção Leitura por Imagem.`]);
  return false;
}

async function checkARSupport() {
  arMeasurementState.supportChecked = true;
  arMeasurementState.lastError = null;

  if (!navigator.xr) {
    arMeasurementState.isSupported = false;
    arMeasurementState.supportsHitTest = false;
    arMeasurementState.lastError = "AR não disponível neste navegador. Use o modo Leitura por Imagem.";
    renderARStatus();
    fallbackToImageMode(false);
    return false;
  }

  try {
    const supported = await navigator.xr.isSessionSupported("immersive-ar");
    arMeasurementState.isSupported = Boolean(supported);
    arMeasurementState.supportsHitTest = Boolean(supported);

    if (!supported) {
      arMeasurementState.lastError = "AR não disponível neste navegador. Use o modo Leitura por Imagem.";
      fallbackToImageMode(false);
    }

    renderARStatus();
    return supported;
  } catch (error) {
    arMeasurementState.isSupported = false;
    arMeasurementState.supportsHitTest = false;
    arMeasurementState.lastError = "Não foi possível verificar AR neste dispositivo.";
    renderARStatus();
    return false;
  }
}

async function startARSession() {
  const supported = arMeasurementState.supportChecked ? arMeasurementState.isSupported : await checkARSupport();

  if (!supported) {
    fallbackToImageMode();
    return;
  }

  try {
    showAROverlay();

    const sessionOptions = {
      requiredFeatures: ["hit-test"]
    };

    if (elements.arXrOverlay) {
      sessionOptions.optionalFeatures = ["dom-overlay"];
      sessionOptions.domOverlay = { root: elements.arXrOverlay };
    }
    let session;

    try {
      session = await navigator.xr.requestSession("immersive-ar", sessionOptions);
    } catch (error) {
      session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"]
      });
    }

    arMeasurementState.session = session;
    arMeasurementState.isSessionActive = true;
    session.addEventListener("end", () => endARSession(false));
    session.addEventListener("select", () => markCurrentARPoint("livre"));
    await setupXRWebGL(session);
    arMeasurementState.referenceSpace = await session.requestReferenceSpace("local");
    await requestHitTestSource(session);
    session.requestAnimationFrame(onXRFrame);
    renderARStatus();
    showMessages(["Sessão AR iniciada. Mova o celular devagar para encontrar uma superfície."], "success");
  } catch (error) {
    arMeasurementState.lastError = "Não foi possível iniciar AR neste dispositivo.";
    arMeasurementState.isSessionActive = false;
    hideAROverlay();
    renderARStatus();
    showMessages([arMeasurementState.lastError]);
  }
}

async function endARSession(callEnd = true) {
  const session = arMeasurementState.session;

  if (callEnd && session) {
    try {
      await session.end();
    } catch (error) {
      // A sessão pode já ter sido encerrada pelo navegador.
    }
  }

  if (arMeasurementState.hitTestSource) {
    try {
      arMeasurementState.hitTestSource.cancel();
    } catch (error) {
      // Alguns navegadores não implementam cancel em fontes já encerradas.
    }
  }

  arMeasurementState.isSessionActive = false;
  arMeasurementState.session = null;
  arMeasurementState.referenceSpace = null;
  arMeasurementState.viewerSpace = null;
  arMeasurementState.hitTestSource = null;
  arMeasurementState.currentHitPose = null;
  arMeasurementState.currentFrameTime = null;
  hideAROverlay();
  renderARStatus();
}

function showAROverlay() {
  if (elements.arXrOverlay) {
    elements.arXrOverlay.hidden = false;
  }

  document.body.classList.add("ar-session-live");
}

function hideAROverlay() {
  document.body.classList.remove("ar-session-live");

  if (elements.arXrOverlay) {
    elements.arXrOverlay.hidden = true;
  }
}

async function setupXRWebGL(session) {
  const canvas = elements.arCanvas;
  const gl = canvas.getContext("webgl", {
    xrCompatible: true,
    alpha: true,
    antialias: true
  });

  if (!gl) {
    throw new Error("WebGL indisponível.");
  }

  await gl.makeXRCompatible?.();
  const xrLayer = new XRWebGLLayer(session, gl);
  session.updateRenderState({ baseLayer: xrLayer });
  arMeasurementState.canvas = canvas;
  arMeasurementState.gl = gl;
  arMeasurementState.xrLayer = xrLayer;
  setupARReticleProgram(gl);
}

async function requestHitTestSource(session = arMeasurementState.session) {
  arMeasurementState.viewerSpace = await session.requestReferenceSpace("viewer");
  arMeasurementState.hitTestSource = await session.requestHitTestSource({
    space: arMeasurementState.viewerSpace
  });
}

function onXRFrame(time, frame) {
  const session = frame.session;

  if (!arMeasurementState.isSessionActive) {
    return;
  }

  session.requestAnimationFrame(onXRFrame);
  arMeasurementState.currentFrameTime = time;

  const referenceSpace = arMeasurementState.referenceSpace;
  const pose = frame.getViewerPose(referenceSpace);
  const gl = arMeasurementState.gl;
  const layer = session.renderState.baseLayer;

  if (!pose || !gl || !layer) {
    return;
  }

  const hitResults = arMeasurementState.hitTestSource ? frame.getHitTestResults(arMeasurementState.hitTestSource) : [];

  if (hitResults.length) {
    const hitPose = hitResults[0].getPose(referenceSpace);
    arMeasurementState.currentHitPose = {
      matrix: Array.from(hitPose.transform.matrix),
      x: hitPose.transform.position.x,
      y: hitPose.transform.position.y,
      z: hitPose.transform.position.z,
      timestamp: new Date().toISOString()
    };
  } else {
    arMeasurementState.currentHitPose = null;
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  for (const view of pose.views) {
    const viewport = layer.getViewport(view);
    gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
    updateARReticle(gl, view);
  }

  renderARStatus();
}

function updateARReticle(gl, view) {
  if (!arMeasurementState.currentHitPose || !arMeasurementState.reticleProgram) {
    return;
  }

  const program = arMeasurementState.reticleProgram;
  const model = arMeasurementState.currentHitPose.matrix;
  const viewMatrix = Array.from(view.transform.inverse.matrix);
  const projectionMatrix = Array.from(view.projectionMatrix);
  const viewModel = multiplyMatrix4(viewMatrix, model);
  const mvp = multiplyMatrix4(projectionMatrix, viewModel);

  gl.useProgram(program.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, arMeasurementState.reticleBuffer);
  gl.enableVertexAttribArray(program.positionLocation);
  gl.vertexAttribPointer(program.positionLocation, 3, gl.FLOAT, false, 0, 0);
  gl.uniformMatrix4fv(program.mvpLocation, false, new Float32Array(mvp));
  gl.uniform4f(program.colorLocation, 0.9, 0.46, 0.1, 1);
  gl.lineWidth(2);
  gl.drawArrays(gl.LINES, 0, 8);
}

function markCurrentARPoint(type = "livre") {
  if (!arMeasurementState.currentHitPose) {
    showMessages(["Nenhuma superfície detectada no momento. Aponte a câmera para uma superfície plana."]);
    return;
  }

  addARPoint(type, {
    x: arMeasurementState.currentHitPose.x,
    y: arMeasurementState.currentHitPose.y,
    z: arMeasurementState.currentHitPose.z
  });
}

function addARPoint(type, position) {
  const point = {
    id: `A${Date.now()}${arMeasurementState.points.length}`,
    name: getARPointDefaultName(type),
    type,
    x: Number(position.x),
    y: Number(position.y),
    z: Number(position.z),
    createdAt: new Date().toISOString()
  };

  arMeasurementState.points.push(point);
  calculateMainARMeasurements();
  renderARPoints();
  renderARMeasurements();
  return point;
}

function deleteLastARPoint() {
  arMeasurementState.points.pop();
  calculateMainARMeasurements();
  renderARPoints();
  renderARMeasurements();
}

function clearARPoints() {
  arMeasurementState.points = [];
  arMeasurementState.measurements = [];
  arMeasurementState.appliedToForm = false;
  projectState.measurementSource = "manual";
  renderMeasurementSourceNotice();
  renderARPoints();
  renderARMeasurements();
}

function renameARPoint(pointId, name) {
  const point = arMeasurementState.points.find((item) => item.id === pointId);

  if (!point) {
    return;
  }

  point.name = String(name || "").trim() || getARPointDefaultName(point.type);
  renderARPoints();
  renderARMeasurements();
}

function calculateDistance3D(pointA, pointB) {
  const meters = Math.sqrt(
    (pointB.x - pointA.x) ** 2 +
      (pointB.y - pointA.y) ** 2 +
      (pointB.z - pointA.z) ** 2
  );

  return {
    meters,
    millimeters: meters * 1000
  };
}

function createARMeasurement(name, pointAId, pointBId, observation = "Medição AR") {
  const pointA = arMeasurementState.points.find((point) => point.id === pointAId);
  const pointB = arMeasurementState.points.find((point) => point.id === pointBId);

  if (!pointA || !pointB || pointA.id === pointB.id) {
    showMessages(["Escolha dois pontos AR diferentes para criar a medição."]);
    return null;
  }

  const distance = calculateDistance3D(pointA, pointB);
  const existingIndex = arMeasurementState.measurements.findIndex((measurement) => measurement.name === name);
  const measurement = {
    id: `AM${Date.now()}${arMeasurementState.measurements.length}`,
    name: String(name || "medição AR").trim(),
    pointAId,
    pointBId,
    meters: distance.meters,
    millimeters: distance.millimeters,
    observation
  };

  if (existingIndex >= 0 && ["largura total", "altura total", "profundidade"].includes(measurement.name)) {
    arMeasurementState.measurements[existingIndex] = measurement;
  } else {
    arMeasurementState.measurements.push(measurement);
  }

  renderARMeasurements();
  return measurement;
}

function calculateMainARMeasurements() {
  const left = findARPointByType("canto-esquerdo");
  const right = findARPointByType("canto-direito");
  const top = findARPointByType("ponto-superior");
  const bottom = findARPointByType("ponto-inferior");
  const front = findARPointByType("profundidade-frente");
  const back = findARPointByType("profundidade-fundo");

  if (left && right) {
    createARMeasurement("largura total", left.id, right.id, "Canto esquerdo até canto direito");
  }

  if (bottom && top) {
    createARMeasurement("altura total", bottom.id, top.id, "Ponto inferior até ponto superior");
  }

  if (front && back) {
    createARMeasurement("profundidade", front.id, back.id, "Profundidade frente até profundidade fundo");
  }
}

function renderARStatus() {
  if (!elements.arSupportStatus) {
    return;
  }

  if (!arMeasurementState.supportChecked) {
    elements.arSupportStatus.textContent = "Ainda não verificado.";
  } else if (arMeasurementState.isSupported) {
    elements.arSupportStatus.textContent = "AR disponível neste dispositivo.";
  } else {
    elements.arSupportStatus.textContent = arMeasurementState.lastError || "AR não disponível neste navegador. Use o modo Leitura por Imagem.";
  }

  elements.arSessionStatus.textContent = arMeasurementState.isSessionActive ? "Sessão ativa." : "Inativa.";
  elements.arHitStatus.textContent = arMeasurementState.currentHitPose
    ? "Mira encontrada. Você pode marcar um ponto."
    : "Mira AR aguardando superfície.";
  elements.arStartButton.disabled = !arMeasurementState.isSupported || arMeasurementState.isSessionActive;
  elements.arStartButton.hidden = arMeasurementState.supportChecked && !arMeasurementState.isSupported;
  elements.arEndButton.disabled = !arMeasurementState.isSessionActive;
  elements.arPlaceholder.style.display = arMeasurementState.isSessionActive ? "none" : "grid";
  renderAROverlayStatus();
}

function renderAROverlayStatus() {
  const hitStatus = arMeasurementState.currentHitPose
    ? "Mira encontrada. Voce pode marcar um ponto."
    : "Mira AR aguardando superficie.";

  if (elements.arOverlayHitStatus) {
    elements.arOverlayHitStatus.textContent = hitStatus;
  }

  if (elements.arOverlayPointCount) {
    const count = arMeasurementState.points.length;
    elements.arOverlayPointCount.textContent = `${count} ${count === 1 ? "ponto" : "pontos"}`;
  }

  document.querySelectorAll(".ar-xr-overlay [data-ar-point-type]").forEach((button) => {
    button.disabled = !arMeasurementState.isSessionActive || !arMeasurementState.currentHitPose;
  });
}

function renderARPoints() {
  if (!arMeasurementState.points.length) {
    elements.arPointList.innerHTML = "<span>Nenhum ponto marcado.</span>";
  } else {
    elements.arPointList.innerHTML = arMeasurementState.points
      .map((point, index) => {
        return `
          <article class="ar-point-item">
            <input value="${escapeAttribute(point.name)}" data-ar-point-id="${escapeAttribute(point.id)}">
            <div class="ar-point-meta">
              ${index + 1}. ${escapeHTML(point.type)} • x ${point.x.toFixed(3)} m • y ${point.y.toFixed(3)} m • z ${point.z.toFixed(3)} m
            </div>
          </article>
        `;
      })
      .join("");
  }

  const options = arMeasurementState.points
    .map((point) => `<option value="${escapeAttribute(point.id)}">${escapeHTML(point.name)}</option>`)
    .join("");
  elements.arPointASelect.innerHTML = options;
  elements.arPointBSelect.innerHTML = options;
}

function renderARMeasurements() {
  if (!arMeasurementState.measurements.length) {
    elements.arMeasurementList.innerHTML = "<span>Nenhuma medição criada.</span>";
  } else {
    elements.arMeasurementList.innerHTML = arMeasurementState.measurements
      .map((measurement) => {
        const pointA = arMeasurementState.points.find((point) => point.id === measurement.pointAId);
        const pointB = arMeasurementState.points.find((point) => point.id === measurement.pointBId);

        return `
          <article class="ar-measurement-item">
            <strong>${escapeHTML(measurement.name)}</strong>
            <span>${measurement.meters.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} m • ${formatMeasure(measurement.millimeters)} mm</span>
            <div class="ar-measurement-meta">${escapeHTML(pointA?.name || "-")} até ${escapeHTML(pointB?.name || "-")} • ${escapeHTML(measurement.observation || "")}</div>
          </article>
        `;
      })
      .join("");
  }

  renderARApplyPreview();
  renderARMeasurementSVG();
}

function applyARMeasurementsToForm() {
  const main = getMainARMeasurementValues();

  if (!main.widthMm && !main.heightMm && !main.depthMm) {
    showMessages(["Nenhuma medida principal AR pronta para aplicar. Marque os pares de pontos necessários."]);
    return;
  }

  if (!elements.arApplyConfirmation.checked) {
    showMessages(["As medidas por AR podem ter variação. Confira com trena antes de gerar o plano de corte. Marque a confirmação para aplicar."]);
    return;
  }

  if (main.widthMm) {
    elements.width.value = Math.round(main.widthMm);
  }

  if (main.heightMm) {
    elements.height.value = Math.round(main.heightMm);
  }

  if (main.depthMm) {
    elements.depth.value = Math.round(main.depthMm);
  }

  projectState.measurementSource = "AR";
  arMeasurementState.appliedToForm = true;
  renderMeasurementSourceNotice();
  renderARMeasurements();
  showMessages(["Medidas AR aplicadas ao formulário. Confira manualmente antes de gerar cortes."], "success");
}

function requireARConfirmation() {
  if (projectState.measurementSource !== "AR" || !arMeasurementState.appliedToForm) {
    return true;
  }

  if (elements.arApplyConfirmation.checked) {
    return true;
  }

  const message = "Este projeto usa medidas obtidas por AR. Confira as medidas antes de enviar para produção.";
  renderAlerts([{ type: "warning", message }]);
  showMessages([`${message} Marque “Conferi as medidas e quero aplicar ao projeto.” na seção Medição AR antes de gerar cortes.`]);
  return false;
}

function fallbackToImageMode(showMessage = true) {
  elements.arStartButton.disabled = true;
  document.getElementById("image-analysis-section")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  if (showMessage) {
    showMessages(["AR não disponível neste navegador. Use o modo Leitura por Imagem."], "success");
  }
}

function setupARReticleProgram(gl) {
  if (arMeasurementState.reticleProgram) {
    return;
  }

  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    `
      attribute vec3 a_position;
      uniform mat4 u_mvp;
      void main() {
        gl_Position = u_mvp * vec4(a_position, 1.0);
      }
    `
  );
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      uniform vec4 u_color;
      void main() {
        gl_FragColor = u_color;
      }
    `
  );
  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }

  const vertices = new Float32Array([
    -0.06, 0, 0,
    -0.018, 0, 0,
    0.018, 0, 0,
    0.06, 0, 0,
    0, 0, -0.06,
    0, 0, -0.018,
    0, 0, 0.018,
    0, 0, 0.06
  ]);
  const buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  arMeasurementState.reticleBuffer = buffer;
  arMeasurementState.reticleProgram = {
    program,
    positionLocation: gl.getAttribLocation(program, "a_position"),
    mvpLocation: gl.getUniformLocation(program, "u_mvp"),
    colorLocation: gl.getUniformLocation(program, "u_color")
  };
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }

  return shader;
}

function multiplyMatrix4(a, b) {
  const result = new Array(16).fill(0);

  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      for (let index = 0; index < 4; index += 1) {
        result[column * 4 + row] += a[index * 4 + row] * b[column * 4 + index];
      }
    }
  }

  return result;
}

function getARPointDefaultName(type) {
  const labels = {
    livre: "Ponto livre",
    "canto-esquerdo": "Canto esquerdo",
    "canto-direito": "Canto direito",
    "ponto-superior": "Ponto superior",
    "ponto-inferior": "Ponto inferior",
    "profundidade-frente": "Profundidade frente",
    "profundidade-fundo": "Profundidade fundo"
  };

  return labels[type] || "Ponto AR";
}

function findARPointByType(type) {
  return arMeasurementState.points.find((point) => point.type === type);
}

function getMainARMeasurementValues() {
  const findMeasure = (name) => arMeasurementState.measurements.find((measurement) => measurement.name === name);

  return {
    widthMm: findMeasure("largura total")?.millimeters || null,
    heightMm: findMeasure("altura total")?.millimeters || null,
    depthMm: findMeasure("profundidade")?.millimeters || null
  };
}

function renderARApplyPreview() {
  const main = getMainARMeasurementValues();
  const parts = [];

  if (main.widthMm) {
    parts.push(`largura ${formatMeasure(main.widthMm)} mm`);
  }

  if (main.heightMm) {
    parts.push(`altura ${formatMeasure(main.heightMm)} mm`);
  }

  if (main.depthMm) {
    parts.push(`profundidade ${formatMeasure(main.depthMm)} mm`);
  }

  elements.arApplyPreview.textContent = parts.length
    ? `Medidas detectadas por AR: ${parts.join(", ")}. As medidas por AR podem ter variação. Confira com trena antes de gerar o plano de corte.`
    : "Nenhuma medida AR pronta para aplicar.";
  elements.arApplyPreview.classList.toggle("ready", parts.length > 0);
  elements.arApplyButton.disabled = parts.length === 0;
}

function renderARMeasurementSVG() {
  const main = getMainARMeasurementValues();
  const width = 320;
  const height = 160;
  const widthLabel = main.widthMm ? `${formatMeasure(main.widthMm)} mm` : "-";
  const heightLabel = main.heightMm ? `${formatMeasure(main.heightMm)} mm` : "-";
  const depthLabel = main.depthMm ? `${formatMeasure(main.depthMm)} mm` : "-";

  elements.arSummarySvg.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Resumo 2D das medidas AR">
      <rect x="44" y="28" width="180" height="92" fill="#ead7bd" stroke="#2b241d" stroke-width="2" rx="4"></rect>
      <path d="M224 28 L270 48 L270 140 L224 120 Z" fill="#d8bd8b" stroke="#2b241d" stroke-width="2"></path>
      <line x1="44" y1="136" x2="224" y2="136" stroke="#c8751d" stroke-width="3"></line>
      <line x1="30" y1="28" x2="30" y2="120" stroke="#3f6b58" stroke-width="3"></line>
      <line x1="226" y1="126" x2="272" y2="146" stroke="#566f83" stroke-width="3"></line>
      <text x="96" y="153" fill="#3c3731" font-size="12" font-weight="800">Largura: ${escapeHTML(widthLabel)}</text>
      <text x="6" y="24" fill="#3c3731" font-size="12" font-weight="800">Altura: ${escapeHTML(heightLabel)}</text>
      <text x="198" y="154" fill="#3c3731" font-size="12" font-weight="800">Prof.: ${escapeHTML(depthLabel)}</text>
    </svg>
  `;
}

function renderMeasurementSourceNotice() {
  if (projectState.measurementSource === "AR") {
    elements.measurementSourceNotice.hidden = false;
    elements.measurementSourceNotice.textContent = "Este projeto usa medidas obtidas por AR. Confira as medidas antes de enviar para produção.";
  } else {
    elements.measurementSourceNotice.hidden = true;
    elements.measurementSourceNotice.textContent = "";
  }
}

function getCanvasPointFromPointer(event) {
  const rect = elements.imageCanvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) * (elements.imageCanvas.width / rect.width),
    y: (event.clientY - rect.top) * (elements.imageCanvas.height / rect.height)
  };
}

function canvasToImagePoint(point) {
  const info = imageAnalysisState.drawInfo;
  const image = imageAnalysisState.image;

  if (!info || !image) {
    return null;
  }

  const x = (point.x - info.offsetX) / info.scale;
  const y = (point.y - info.offsetY) / info.scale;

  if (x < 0 || y < 0 || x > image.naturalWidth || y > image.naturalHeight) {
    return null;
  }

  return {
    x,
    y
  };
}

function imageToCanvasPoint(point) {
  const info = imageAnalysisState.drawInfo || {
    scale: 1,
    offsetX: 0,
    offsetY: 0
  };

  return {
    x: info.offsetX + point.x * info.scale,
    y: info.offsetY + point.y * info.scale
  };
}

function drawReferenceOverlay(ctx) {
  const points = imageAnalysisState.referencePoints.map(imageToCanvasPoint);

  if (points.length === 2) {
    drawCanvasLine(ctx, points[0], points[1], "#c8751d", "Referência");
  }

  points.forEach((point, index) => {
    drawCanvasPoint(ctx, point, "#c8751d", `R${index + 1}`);
  });
}

function drawMeasurementOverlay(ctx) {
  imageAnalysisState.measurements.forEach((measurement, index) => {
    const points = measurement.points.map(imageToCanvasPoint);
    drawCanvasLine(ctx, points[0], points[1], "#2d79a8", measurement.label || `M${index + 1}`);
    points.forEach((point) => drawCanvasPoint(ctx, point, "#2d79a8", ""));
  });

  if (imageAnalysisState.pendingMeasurementPoint) {
    drawCanvasPoint(ctx, imageToCanvasPoint(imageAnalysisState.pendingMeasurementPoint), "#2d79a8", "M1");
  }
}

function drawCanvasPoint(ctx, point, color, label) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (label) {
    ctx.fillStyle = "#111";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(label, point.x + 10, point.y - 10);
  }

  ctx.restore();
}

function drawCanvasLine(ctx, pointA, pointB, color, label) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pointA.x, pointA.y);
  ctx.lineTo(pointB.x, pointB.y);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(label, (pointA.x + pointB.x) / 2 + 8, (pointA.y + pointB.y) / 2 - 8);
  ctx.restore();
}

function getPointDistance(pointA, pointB) {
  return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
}

function getNextMeasurementLabel(currentLabel) {
  const normalized = String(currentLabel || "").toLowerCase();
  const sequence = [
    ["largura", "altura total"],
    ["altura", "profundidade aparente"],
    ["profundidade", "porta esquerda"],
    ["porta esquerda", "porta direita"],
    ["porta direita", "prateleira"],
    ["prateleira", "divisão interna"]
  ];
  const match = sequence.find(([from]) => normalized.includes(from));

  if (match) {
    return match[1];
  }

  return `medição ${imageAnalysisState.measurements.length + 1}`;
}

function calculateCentralDivisionScore(edgeMap, width, box) {
  const centerX = Math.round(box.x + box.width / 2);
  const range = Math.max(2, Math.round(width * 0.012));
  let edgeCount = 0;
  let total = 0;

  for (let y = box.y; y < box.y + box.height; y += 1) {
    for (let x = centerX - range; x <= centerX + range; x += 1) {
      if (x >= 0 && x < width) {
        total += 1;
        if (edgeMap[y * width + x] > 0) {
          edgeCount += 1;
        }
      }
    }
  }

  return total ? edgeCount / total : 0;
}

function hasImageCentralDivisionHint() {
  const labeledDivision = imageAnalysisState.measurements.some((measurement) => {
    const label = measurement.label.toLowerCase();
    return label.includes("porta") || label.includes("divisão") || label.includes("divisao");
  });

  if (labeledDivision) {
    return true;
  }

  return (imageAnalysisState.lastEdgeData?.centralDivisionScore || 0) > 0.08;
}

function getImageDetectedDimensions() {
  const dimensions = {
    widthMm: null,
    heightMm: null,
    depthMm: null
  };

  imageAnalysisState.measurements.forEach((measurement) => {
    const label = measurement.label.toLowerCase();
    const estimatedMm = measurement.estimatedMm;

    if (!estimatedMm) {
      return;
    }

    if ((label.includes("largura") || label.includes("width")) && !dimensions.widthMm) {
      dimensions.widthMm = estimatedMm;
    } else if ((label.includes("altura") || label.includes("height")) && !dimensions.heightMm) {
      dimensions.heightMm = estimatedMm;
    } else if ((label.includes("profundidade") || label.includes("depth")) && !dimensions.depthMm) {
      dimensions.depthMm = estimatedMm;
    }
  });

  if (imageAnalysisState.detectedBounds && imageAnalysisState.pixelsPerMm) {
    if (!dimensions.widthMm) {
      dimensions.widthMm = imageAnalysisState.detectedBounds.width / imageAnalysisState.pixelsPerMm;
    }

    if (!dimensions.heightMm) {
      dimensions.heightMm = imageAnalysisState.detectedBounds.height / imageAnalysisState.pixelsPerMm;
    }
  }

  return dimensions;
}

function formatPixelDistance(value) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} px`;
}

function validateGeneratedPieces(pieces) {
  const errors = [];

  pieces.forEach((piece) => {
    if (piece.width <= 0 || piece.height <= 0 || piece.thickness <= 0 || piece.quantity <= 0) {
      errors.push(`${piece.id} - ${piece.name} ficou com medida inválida. Confira as dimensões informadas.`);
    }
  });

  return errors;
}

function createPieceFactory(data) {
  let sequence = 1;

  return (name, width, height, quantity, thickness, observation, edges) => {
    const id = `P${String(sequence).padStart(3, "0")}`;
    sequence += 1;

    return normalizePiece(
      {
        id,
        name,
        width,
        height,
        quantity,
        thickness,
        observation: `${observation}. Veio: ${grainLabels[data.grainDirection]}.`,
        edges,
        canRotate: data.grainDirection === "indiferente"
      },
      data
    );
  };
}

function normalizePiece(piece, data = state.data) {
  return {
    id: piece.id || getNextPieceId(),
    name: String(piece.name || "Peça").trim(),
    width: roundMeasure(toNumber(piece.width)),
    height: roundMeasure(toNumber(piece.height)),
    quantity: Math.max(1, Number.parseInt(piece.quantity, 10) || 1),
    thickness: roundMeasure(toNumber(piece.thickness || data?.mdfThickness || 18)),
    observation: String(piece.observation || "").trim(),
    edges: normalizeEdges(piece.edges),
    canRotate: typeof piece.canRotate === "boolean" ? piece.canRotate : data?.grainDirection === "indiferente"
  };
}

function normalizeEdges(edges) {
  return {
    superior: Boolean(edges?.superior),
    inferior: Boolean(edges?.inferior),
    esquerda: Boolean(edges?.esquerda),
    direita: Boolean(edges?.direita)
  };
}

function edgePreset(type) {
  if (type === "all") {
    return {
      superior: true,
      inferior: true,
      esquerda: true,
      direita: true
    };
  }

  if (type === "front") {
    return {
      superior: false,
      inferior: false,
      esquerda: false,
      direita: true
    };
  }

  return {
    superior: false,
    inferior: false,
    esquerda: false,
    direita: false
  };
}

function createSheet(number, width, height) {
  return {
    number,
    width,
    height,
    rows: [],
    placements: []
  };
}

function placePieceOnSheet(sheet, piece, sheetWidth, sheetHeight, kerf) {
  const candidates = getSizeCandidates(piece, sheetWidth, sheetHeight);

  for (const size of candidates) {
    for (const row of sheet.rows) {
      if (row.cursorX + size.width <= sheetWidth && size.height <= row.height && row.y + size.height <= sheetHeight) {
        addPlacement(sheet, piece, size, row.cursorX, row.y, kerf);
        row.cursorX += size.width + kerf;
        return true;
      }
    }

    const y = sheet.rows.length ? Math.max(...sheet.rows.map((row) => row.y + row.height + kerf)) : 0;

    if (y + size.height <= sheetHeight) {
      const row = {
        y,
        height: size.height,
        cursorX: 0
      };
      sheet.rows.push(row);
      addPlacement(sheet, piece, size, 0, y, kerf);
      row.cursorX = size.width + kerf;
      return true;
    }
  }

  return false;
}

function addPlacement(sheet, piece, size, x, y) {
  sheet.placements.push({
    piece,
    x,
    y,
    width: size.width,
    height: size.height,
    rotated: size.rotated,
    sheetNumber: sheet.number
  });
}

function getPackingSize(piece, sheetWidth, sheetHeight) {
  return getSizeCandidates(piece, sheetWidth, sheetHeight)[0] || {
    width: piece.width,
    height: piece.height,
    rotated: false
  };
}

function getSizeCandidates(piece, sheetWidth, sheetHeight) {
  const candidates = [
    {
      width: piece.width,
      height: piece.height,
      rotated: false
    }
  ];

  if (piece.canRotate && piece.width !== piece.height) {
    candidates.push({
      width: piece.height,
      height: piece.width,
      rotated: true
    });
  }

  return candidates.filter((candidate) => candidate.width <= sheetWidth && candidate.height <= sheetHeight);
}

function canFitPieceInEmptySheet(piece, sheetWidth, sheetHeight) {
  return getSizeCandidates(piece, sheetWidth, sheetHeight).length > 0;
}

function formatObservation(piece) {
  return `${piece.observation || ""} Fita: ${formatEdges(piece.edges)}.`.trim();
}

function formatEdges(edges) {
  const activeEdges = Object.entries(normalizeEdges(edges))
    .filter(([, active]) => active)
    .map(([edge]) => edge);

  return activeEdges.length ? activeEdges.join(", ") : "sem fita";
}

function setExportButtons(enabled) {
  elements.addPieceButton.disabled = !enabled;
  elements.updatePlanButton.disabled = !enabled;
  elements.copyButton.disabled = !enabled;
  elements.csvButton.disabled = !enabled;
  elements.downloadSvgButton.disabled = !enabled;
  elements.downloadDxfButton.disabled = !enabled;
  elements.printButton.disabled = !enabled;
}

function resetResults(resetFormState = true) {
  if (resetFormState) {
    state.data = null;
    state.generatedAt = null;
    projectState.measurementSource = "manual";
    renderMeasurementSourceNotice();
  }

  state.pieces = [];
  state.sheets = [];
  state.alerts = [];
  state.packingAlerts = [];
  state.lastSvgMarkup = "";
  state.edgeBandingMeters = 0;

  renderProjectSummary(state.data);
  renderAlerts([]);
  elements.pieceCountLabel.textContent = "0 itens";
  elements.sheetCountLabel.textContent = "0 chapas";
  elements.sheetSummary.innerHTML = "<span>Nenhuma chapa calculada.</span>";
  elements.pieceTableBody.innerHTML = '<tr><td colspan="9" class="empty-state">Gere um plano para visualizar e editar a lista.</td></tr>';
  elements.cutPlan.innerHTML = "";
  elements.summaryGrid.innerHTML = `
    <article><span>Área total</span><strong>0,00 m²</strong></article>
    <article><span>Área usada</span><strong>0,00 m²</strong></article>
    <article><span>Sobra</span><strong>0,00 m²</strong></article>
    <article><span>Aproveitamento</span><strong>0%</strong></article>
    <article><span>Chapas</span><strong>0</strong></article>
    <article><span>Fita de borda</span><strong>0,00 m</strong></article>
  `;
  setExportButtons(false);
}

function showMessages(messages, type = "error") {
  elements.messageBox.className = `message-box show ${type === "success" ? "success" : ""}`.trim();

  if (messages.length === 1) {
    elements.messageBox.textContent = messages[0];
    return;
  }

  elements.messageBox.innerHTML = `<ul>${messages.map((message) => `<li>${escapeHTML(message)}</li>`).join("")}</ul>`;
}

function clearMessages() {
  elements.messageBox.className = "message-box";
  elements.messageBox.textContent = "";
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 0);
}

function getNextPieceId() {
  const maxNumber = state.pieces.reduce((max, piece) => {
    const match = String(piece.id || "").match(/P(\d+)/i);
    return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
  }, 0);

  return `P${String(maxNumber + 1).padStart(3, "0")}`;
}

function abbreviateName(name) {
  const cleanName = String(name || "Peça").trim();

  if (cleanName.length <= 14) {
    return cleanName;
  }

  return `${cleanName.slice(0, 13)}.`;
}

function fallbackNumber(value, fallback) {
  const numeric = toNumber(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toNumber(value) {
  const normalized = String(value ?? "").replace(",", ".");
  return Number.parseFloat(normalized);
}

function roundMeasure(value) {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
  return Math.round(numeric * 100) / 100;
}

function formatMeasure(value) {
  return roundMeasure(value).toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(roundMeasure(value)) ? 0 : 1,
    maximumFractionDigits: 2
  });
}

function formatArea(value) {
  return `${(value / 1000000).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} m²`;
}

function formatMeters(value) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} m`;
}

function formatPercent(value) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })}%`;
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function formatCSVValue(value) {
  const text = String(value ?? "");
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function safeFilename(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "projeto";
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char];
  });
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
