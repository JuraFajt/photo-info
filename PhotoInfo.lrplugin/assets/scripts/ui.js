// helper graphics toggle modes
const on = 'on';
const highlighted = 'highlighted';
const off = 'off';

// common CSS classes
const activeClass = 'active';
const focusedClass = 'focused';
const highlightedClass = 'highlighted';
const loadingClass = 'loading';
const selectedClass = 'selected';

// factor for helper graphics scaling
// currently half of the longer size of the main image
let photoScaleFactor;

// cached styles
let styles;

function getCssVariable(cssVariableName) {
  if (!styles) {
    styles = getComputedStyle(document.documentElement);
  }
  return styles.getPropertyValue(cssVariableName);
}

function isElementOn(element) {
  return element && !element.hasAttribute('hidden');
}

function toggleElement(element, shouldBeVisible) {
  const shouldShow = shouldBeVisible !== undefined ? Boolean(shouldBeVisible) : element.hasAttribute('hidden');
  element.toggleAttribute('hidden', !shouldShow);
}

function bindElementAction(element, action) {
  element.addEventListener('keydown', (event) => {
    const { keyCode } = event;
    // Enter & Space keys trigger the action
    if ([13, 32].includes(keyCode)) action();
  });
  element.addEventListener('click', action);
}

function getElementGeometry({ position: { x: left, y: top }, size: { x: width, y: height } }) {
  return {
    left: Math.round(left * photoScaleFactor),
    top: Math.round(top * photoScaleFactor),
    width: Math.round(width * photoScaleFactor),
    height:  Math.round(height * photoScaleFactor),
  };
}

function updateElementGeometry(element, { left, top, width, height }) {
  element.style.height = `${height}px`;
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.width = `${width}px`;
}

function updateElementPosition(element, info) {
  const geometry = getElementGeometry(info);
  updateElementGeometry(element, geometry);
}

// update helper graphics rotation according to photo orientation
function rotateHelperGraphics(element) {
  const angle = getOrientationAngle(lastPhotoData);
  element.style.transform = `rotate(${angle}deg)`;
}

// events for updating the main parts of UI in a more decoupled way
const panelToggledEvent = 'panel-toggled';

const panelNameFilmStrip = 'filmStrip';
const panelNameMetadata = 'metadata';
const panelNameMap = 'map';

function dispatchPanelToggledEvent(detail) {
  window.dispatchEvent(new CustomEvent(panelToggledEvent, { detail }));
}

// main UI initialization after all scripts were successfully loaded
function init() {
  initFilmStrip();
  initFocusAreas();
  initMeteringSegments();
  initMetadata();
  initMap();
  initMainPhoto();
}

// TODO: debouncing / throttling
window.addEventListener('resize', () => {
  photoScaleFactor = getPhotoScaleFactor();
  updateFocusAreaPositions();
  updateMeteringSegmentsPositions();
});

isReady.then(init);
