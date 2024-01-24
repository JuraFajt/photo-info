// elements generated for displaying metering segments
const meteringSegmentsMap = new Map();

// metering segments switch modes
const meteringSegmentsModeSetting = 'meteringSegmentsMode';
const meteringSegmentsModes = [ on, highlighted, off ];
let meteringSegmentsMode = on;

// permanent DOM references
const meteringSegments = document.getElementById('metering-segments');
const meteringSegmentsIcon = document.getElementById('metering-segments-icon');

function setSvgMeteringElementScale(parent) {
  const svgElement = meteringSegments.querySelector('svg');
  const layoutScale = lastCameraData.meteringSegmentsLayout?.scale || 1;
  svgElement.style.width = `${Math.round(photoScaleFactor * layoutScale * 2)}px`;   
}

function updateMeteringSegmentsPositions() {
  const { meteringSegmentsLayout = {} } = lastCameraData;
  const { meteringSegmentsConfiguration, svg } = meteringSegmentsLayout;
  if (Boolean(svg)) {
    setSvgMeteringElementScale(meteringSegments);
  }
  if (Boolean(meteringSegmentsConfiguration)) {
    Object.entries(meteringSegmentsConfiguration).forEach(([key, value]) => {
      const element = meteringSegmentsMap.get(key);
      updateElementPosition(element, value);
    });
  }
}

function onMeteringSegmentActivation(element) {
  let content = element.dataset.title;
  const { flashLv, lv, slaveFlashLv } = element.dataset
  if (lv !== undefined) {
    const lvArray = lv.split(',');
    const value = lvArray.length === 3 ?
      `<span class="value red">${lvArray[0]}</span>, ` +
      `<span class="value green">${lvArray[1]}</span>, ` +
      `<span class="value blue">${lvArray[2]}</span>` :
      `<span class="value">${lvArray[0]}</span>`;
    content = content + `<br><span class="lv">light value: ${value}</span>`;
  }
  if (flashLv) {
    content = content + `<br><span class="lv">flash LV: <span class="value">${flashLv}</span></span>`;
  }
  if (slaveFlashLv) {
    content = content + `<br><span class="lv">slave flash LV: <span class="value">${slaveFlashLv}</span></span>`;
  }
  const position = calculateInfoPopupPosition(element, vertical);
  showInfoPopup({ content, ...position });
}

function setupMeteringSegment(element) {
  const index = element.id.replace('segment-', '');
  element.dataset.title = `<span class="title">metering segment: <span class="value">${index}</span></span>`;
  element.tabIndex = 0;
  const onActivate = () => onMeteringSegmentActivation(element);
  bindInfoPopupEvents(element, onActivate);
  meteringSegmentsMap.set(index, element);
  return element;
}

function createMeteringSegment(key) {
  const element = document.createElement('div');
  element.classList.add('metering-segment');
  element.id = `segment-${key}`;
  setupMeteringSegment(element);
  meteringSegments.appendChild(element);
  return element;
}  

function updateMeteringSegmentValues() {
  const { meteringSegmentsLayout } = lastCameraData;
  if (!meteringSegmentsLayout) {
    return;
  }
  const { isRgbSensor = false } = meteringSegmentsLayout;
  // update the measured info values on particular segments based on photo data
  // metadata: AEMeteringSegments, FlashMeteringSegments, SlaveFlashMeteringSegments; separated by ' '
  // TODO: flash metering segments might use a different metering layout, so maybe creating several
  // layers & switching between them would be better?
  const {
    AEMeteringSegments: segmentValues = '',
    FlashMeteringSegments: flashSegmentValues = '',
    SlaveFlashMeteringSegments: slaveFlashSegmentValues = '',
  } = lastPhotoData;
  let values, count, i;
  if (segmentValues !== '') {
    values = String(segmentValues).split(' ');
    count = values.length;
    if (isRgbSensor) count = count / 3;
    for (i = 0; i < count; i++) {
      const element = meteringSegmentsMap.get(`${i + 1}`);
      if (!element) continue;
      element.dataset.lv = isRgbSensor ?
        `${values[i]},${values[i + count]},${values[i + 2 * count]}` :
        values[i];
    } 
  }
  if (flashSegmentValues !== '') {
    values = String(flashSegmentValues).split(' ');
    count = values.length;
    for (i = 0; i < count; i++) {
      const element = meteringSegmentsMap.get(`${i + 1}`);
      if (!element) continue;
      element.dataset.flashLv = values[i];
    }
  }
  if (slaveFlashSegmentValues !== '') {
    values = String(slaveFlashSegmentValues).split(' ');
    count = values.length;
    for (i = 0; i < count; i++) {
      const element = meteringSegmentsMap.get(`${i + 1}`);
      if (!element) continue;
      element.dataset.slaveFlashLv = values[i];
    }
  }
}

function updateMeteringSegments() {
  rotateHelperGraphics(meteringSegments);
  const { meteringSegmentsLayout = {} } = lastCameraData;
  const { meteringSegmentsConfiguration, svg } = meteringSegmentsLayout;
  const isSvgLayout = Boolean(svg);
  // clear old metering segments
  if (isDifferentCamera) {
    meteringSegments.innerHTML = '';
    meteringSegmentsMap.clear();
  }
  // exit if no metering layout info
  if (!meteringSegmentsConfiguration && !svg) {
    return;
  }
  // create new or update existing metering segments according to info in lastCameraData
  meteringSegments.classList.toggle('svg-wrapper', isSvgLayout);
  if (isSvgLayout) {
    if (isDifferentCamera) {
      meteringSegments.innerHTML = lastCameraData.meteringSegmentsLayout?.svg;
      meteringSegments.querySelectorAll('.metering-segment').forEach((element) => setupMeteringSegment(element));
    }
    setSvgMeteringElementScale(meteringSegments);
  } else {
    Object.entries(meteringSegmentsConfiguration).forEach(([key, value]) => {
      const element = isDifferentCamera ? createMeteringSegment(key, value) : meteringSegmentsMap.get(key);
      updateElementPosition(element, value);
    });
  }
  // update the measured info values on particular segments based on photo data
  updateMeteringSegmentValues();
}

function setMeteringSegmentsMode(value) {
  if (!meteringSegmentsModes.includes(value)) {
    return;
  }
  const setState = (layerOn, highlightOn) => {
    toggleElement(meteringSegments, layerOn);
    meteringSegments.classList.toggle(highlightedClass, highlightOn);
  };
  meteringSegmentsMode = value;
  switch (meteringSegmentsMode) {
    case on: setState(true, false); break;
    case highlighted: setState(true, true); break;
    case off: setState(false, false); break;
  }
  meteringSegmentsIcon.classList.toggle(selectedClass, meteringSegmentsMode !== off);
  storeSetting(meteringSegmentsModeSetting, meteringSegmentsMode);
}

function toggleMeteringSegmentsMode() {
  let index = meteringSegmentsModes.findIndex((item) => meteringSegmentsMode === item) + 1;
  if (index === meteringSegmentsModes.length) {
    index = 0;
  }
  setMeteringSegmentsMode(meteringSegmentsModes[index]);
}

// update only own UI here
function onPanelToggledMeteringSegmentsHandler({ detail: { panelName, isOpen, isFullSizeMap } }) {
  switch (panelName) {
    case panelNameMetadata:
      toggleElement(meteringSegmentsIcon, !isOpen);
      break;
    case panelNameMap:
      toggleElement(meteringSegmentsIcon, !isOpen || !isFullSizeMap);
      break;
  }
}

function initMeteringSegments() {
  meteringSegmentsIcon.addEventListener('click', toggleMeteringSegmentsMode);
  // connect UI updates related to other panels
  window.addEventListener(panelToggledEvent, onPanelToggledMeteringSegmentsHandler);
  // restore previous state from storage
  setMeteringSegmentsMode(getSetting(meteringSegmentsModeSetting));
}
