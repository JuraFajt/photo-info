// remember previous AF type to optimize rendering
let lastAfType = '';

// elements generated for displaying focus areas
const focusAreasMap = new Map();

// focus areas switch modes
const focusAreasModeSetting = 'focusAreasMode';
const focusAreasModes = [ on, highlighted, off ];
let focusAreasMode = on;

// permanent DOM references
const focusAreas = document.getElementById('focus-areas');
const focusAreasIcon = document.getElementById('focus-areas-icon');

/*
TODO: manual focus in phase vs. contrast AF - how to detect?
'FocusMode':
- 'Contrast-detect (Release-priority)'
- 'Manual'
- 'AF-S (Focus-priority)'
- 'AF-C (Focus-priority)'
- 'AF-A'
*/
function getAfType() {
  const { FocusMode: focusMode = '' } = lastPhotoData || {};
  const [ result ] = focusMode.split(' ');
  return result;
}

function getFocusAreasConfiguration(isContrastAf) {
  if (isContrastAf) {
    return getPentaxContrastAutoFocusInfo();
  }
  const { focusAreasConfiguration } = lastCameraData.phaseDetectionFocusLayout || {};
  return focusAreasConfiguration;  
}

function setFocusAreaBorderSize() {
  const mainPhotoSize = Math.max(mainPhoto.width, mainPhoto.height);
  // TODO: maybe a factor for this could be in plugin preferences
  let size = Math.round(mainPhotoSize / 350);
  if (size < 1) size = 1;
  document.documentElement.style.setProperty('--focus-area-border', `${size}px`);
}

function onFocusAreaActivation(element) {
  let content = element.dataset.title;
  if (element.classList.contains(selectedClass)) {
    content = content + `<span class="selected value">selected</span>`;
  }
  const isFace = element.classList.contains('face');
  const isContrastArea = element.classList.contains('contrast-area');
  if (element.classList.contains(focusedClass)) {
    content = content + `<span class="focused ${isFace ? 'face' : ''} ${isContrastArea ? 'contrast-area' : ''} value">focused</span>`;
  }
  const position = calculateInfoPopupPosition(element, vertical);
  showInfoPopup({ content, ...position });
}

function createFocusArea(key, focusAreaInfo) {
  const { displaySize, isContrastArea, isFace, sensor } = focusAreaInfo;
  const element = document.createElement('div');
  element.classList.add('focus-area');
  element.classList.toggle('face', Boolean(isFace));
  element.classList.toggle('contrast-area', Boolean(isContrastArea));
  element.id = `focus-area-${key}`;
  // element.dataset.isFace = isFace || '';
  element.dataset.title =
    `<span class="title">focus area: <span class="value">${key}</span></span>` +
    (displaySize ? `<span class="size">size: <span class="value">${displaySize}</span></span>` : '') +
    (sensor ? `<span class="sensor">sensor: <span class="value">${sensor}</span></span>` : '') +
    (isFace ? `<span class="face value">Face detection area</span>` : '');
  element.tabIndex = 0;
  const onActivate = () => onFocusAreaActivation(element);
  bindInfoPopupEvents(element, onActivate);
  return element;
}

function resetFocusAreaStates(element) {
  element.classList.toggle(selectedClass, false);
  element.classList.toggle(focusedClass, false);
}

function updateFocusAreaPositions() {
  setFocusAreaBorderSize();
  const isContrastAf = lastAfType === 'Contrast-detect';
  const focusAreasConfiguration = getFocusAreasConfiguration(isContrastAf);
  if (!focusAreasConfiguration) return;
  Object.entries(focusAreasConfiguration).forEach(([key, value]) => {
    const element = focusAreasMap.get(key);
    updateElementPosition(element, value);
  });
}

function updateFocusAreaStates(isContrastAf = false) {
  if (isContrastAf) {
    focusAreasMap.forEach((element, key) => {
      // so far all considered as selected
      element.classList.toggle(selectedClass, true);
      // so far all detected CAF areas considered as focused
      element.classList.toggle(focusedClass, true);
    });
    return;
  }
  
  // TODO: transform maker / camera specific values in some generic & configurable way, but use original values for displaying
  const provisoryTransform = function(key) {
    switch (key) {
      case 'Center (horizontal)':
      case 'Center (vertical)':
      case 'Center; Single Point':
      case 'Fixed Center':
        return 'Center';
        break;
      default:
        return key;
    }
  }
  const { AFPointsInFocus: focusedAreas = '', AFPointsSelected: selectedAreas = '' } = lastPhotoData;
  const selected = String(selectedAreas).split(',');
  selected.forEach((item) => {
    const element = focusAreasMap.get(provisoryTransform(item));
    if (element) {
      element.classList.toggle(selectedClass, true);
    }
  });
  const focused = String(focusedAreas).split(',');
  focused.forEach((item) => {
    const element = focusAreasMap.get(provisoryTransform(item));
    if (element) {
      element.classList.toggle(focusedClass, true);
    }
  });
}

function updateFocusAreas() {
  rotateHelperGraphics(focusAreas);
  setFocusAreaBorderSize();
  // detect AF type used for current photo
  const afType = getAfType();
  const isContrastAf = afType === 'Contrast-detect';
  // for contrast AF, the areas positions & count are not fixed, so re-creating the elements is always needed
  const isDifferentAfType = isDifferentCamera || afType !== lastAfType || isContrastAf;
  // clear old focus areas
  if (isDifferentAfType) {
    focusAreas.innerHTML = '';
    focusAreasMap.clear();
  }
  if (!afType) {
    lastAfType = afType;
    return;
  }
  // get current focus areas layout
  const focusAreasConfiguration = getFocusAreasConfiguration(isContrastAf);
  if (!focusAreasConfiguration) {
    lastAfType = afType;
    return;
  }
  // create new or update existing focus areas
  Object.entries(focusAreasConfiguration).forEach(([key, value]) => {
    const element = isDifferentAfType ? createFocusArea(key, value) : focusAreasMap.get(key);
    resetFocusAreaStates(element);
    updateElementPosition(element, value);
    // add to DOM & focus areas map
    if (isDifferentAfType) {
      focusAreas.appendChild(element);
      focusAreasMap.set(key, element);
    }
  });
  // update particular focus areas states based on photo data
  updateFocusAreaStates(isContrastAf);
  lastAfType = afType;
}

function setFocusAreasMode(value) {
  if (!focusAreasModes.includes(value)) {
    return;
  }
  const setState = (layerOn, highlightOn) => {
    toggleElement(focusAreas, layerOn);
    focusAreas.classList.toggle(highlightedClass, highlightOn);
  };
  focusAreasMode = value;
  switch (focusAreasMode) {
    case on: setState(true, false); break;
    case highlighted: setState(true, true); break;
    case off: setState(false, false); break;
  }
  focusAreasIcon.classList.toggle(selectedClass, focusAreasMode !== off);
  storeSetting(focusAreasModeSetting, focusAreasMode);
}

function toggleFocusAreasMode() {
  let index = focusAreasModes.findIndex((item) => focusAreasMode === item) + 1;
  if (index === focusAreasModes.length) {
    index = 0;
  }
  setFocusAreasMode(focusAreasModes[index]);
}

// update only own UI here
function onPanelToggledFocusAreasHandler({ detail: { panelName, isOpen, isFullSizeMap } }) {
  switch (panelName) {
    case panelNameFilmStrip:
      break;
    case panelNameMetadata:
      toggleElement(focusAreasIcon, !isOpen);
      break;
    case panelNameMap:
      toggleElement(focusAreasIcon, !isOpen || !isFullSizeMap);
      break;
  }
}

function initFocusAreas() {
  focusAreasIcon.addEventListener('click', toggleFocusAreasMode);
  // connect UI updates related to other panels
  window.addEventListener(panelToggledEvent, onPanelToggledFocusAreasHandler);
  // restore previous state from storage
  setFocusAreasMode(getSetting(focusAreasModeSetting));
}
