// permanent DOM references
const mainPhoto = document.getElementById('photo');
const photoWrapper = document.getElementById('photo-wrapper');
const zoomIcon = document.getElementById('zoom-icon');

// the photo is scaled down to fit into the wrapper by default
const isActualPhotoSizeSetting = 'isActualPhotoSize';
const actualSizeClass = 'actual-photo-size';
const panningClass = 'panning';
let lastPanningPositionOffset;

// timeout for smooth image transitions
let mainImageTimeout;

function getPhotoScaleFactor() {
  const photoSize = Math.max(mainPhoto.width, mainPhoto.height);
  return photoSize / 2;
}

function pointerMoveHandler(event) {
  const { clientX, clientY } = event;
  const { x, y } = lastPanningPositionOffset;
  mainPhoto.style.left = `${Math.round(clientX - x)}px`;
  mainPhoto.style.top = `${Math.round(clientY - y)}px`;
}

function pointerDownHandler(event) {
  const { offsetLeft, offsetTop } = mainPhoto;
  mainPhoto.style.left = `${Math.round(offsetLeft)}px`;
  mainPhoto.style.top = `${Math.round(offsetTop)}px`;
  const { clientX, clientY } = event;
  const x = clientX - offsetLeft;
  const y = clientY - offsetTop;
  lastPanningPositionOffset = { x, y };
  mainPhoto.classList.toggle(panningClass, true);
  mainPhoto.setPointerCapture(event.pointerId);
  mainPhoto.onpointermove = pointerMoveHandler;
  mainPhoto.onpointerup = function(event) {
    mainPhoto.onpointermove = undefined;
    mainPhoto.onpointerup = undefined;
    mainPhoto.classList.toggle(panningClass, false);
  };
};

function toggleActualPhotoSize() {
  photoWrapper.classList.toggle(actualSizeClass);
  const isActualSize = photoWrapper.classList.contains(actualSizeClass);
  zoomIcon.classList.toggle(selectedClass, isActualSize);
  mainPhoto.onpointerdown = isActualSize ? pointerDownHandler : undefined;
  photoScaleFactor = getPhotoScaleFactor();
  updateFocusAreas();
  updateMeteringSegments();
  storeSetting(isActualPhotoSizeSetting, isActualSize);
}

function initZoomIcon() {
  zoomIcon.addEventListener('click', toggleActualPhotoSize);
}

function imageLoadedHandler() {
  // check current camera settings
  const { resolvedCameraModel } = lastCameraData;
  isDifferentCamera = resolvedCameraModel !== cameras.lastResolvedCameraSettings;
  // update graphics
  photoWrapper.classList.toggle(loadingClass, false);
  photoScaleFactor = getPhotoScaleFactor();
  updateFocusAreas();
  updateMeteringSegments();
  // remember last used focus areas configuration to optimize re-rendering
  cameras.lastResolvedCameraSettings = lastCameraData.resolvedCameraModel;
}

function initMainPhotoImage() {
  mainPhoto.addEventListener('load', imageLoadedHandler);
}

function checkMainPhotoImageComplete() {
  if (mainPhoto.complete) {
    imageLoadedHandler();
  }
}

function setMainPhotoImageSource(fileName) {
  clearTimeout(mainImageTimeout);
  mainPhoto.style.left = '';
  mainPhoto.style.top = '';
  const data = photos.get(fileName);
  const { PreviewFileName: previewName } = data;
  // adding the loading class starts fading out
  photoWrapper.classList.toggle(loadingClass, true);
  // let it fade out first
  mainImageTimeout = setTimeout(() => {
    mainPhoto.src = `./photos/${previewName}`;
    checkMainPhotoImageComplete();
  }, 300);
}

const lastSelectedPhotoSetting = 'lastSelectedPhoto';
const lastSelectedPhotoDateTimeSettting = 'lastSelectedPhotoDateTime';

function setCurrentPhoto(fileName) {
  lastPhotoData = photos.get(fileName);
  lastCameraData = resolveCameraSettings();
  selectFilmStripItem(fileName);
  updateMetadataPanel();
  updateMapPosition();
  setMainPhotoImageSource(fileName);
  storeSetting(lastSelectedPhotoSetting, fileName);
  storeSetting(lastSelectedPhotoDateTimeSettting, Date.now());
}

function initLastPhoto() {
  const exportedLastPhotoData = photos.get(lastSelectedPhoto);
  // get the optional localStorage settings for last selected photo
  const storageLastPhoto = getSetting(lastSelectedPhotoSetting);
  const storageLastPhotoData = photos.get(storageLastPhoto);
  const storageDateTime = getSetting(lastSelectedPhotoDateTimeSettting) ?? 0;
  // select the correct last photo
  if (exportedLastPhotoData) {
    if (!storageLastPhotoData) {
      setCurrentPhoto(lastSelectedPhoto);
      return;
    }
    // compare settings dates if both exist
    // select the last photo based on later saved photo ID
    setCurrentPhoto(storageDateTime > lastExportDateTime ? storageLastPhoto : lastSelectedPhoto);
    return;
  }
  // fallback
  setCurrentPhoto(storageLastPhotoData ? storageLastPhoto : exportedPhotos[0]);
}

// update only own UI here
function onPanelToggledMainPhotoHandler({ detail: { panelName, isOpen, isFullSizeMap } }) {
  switch (panelName) {
    case panelNameMetadata:
      toggleElement(zoomIcon, !isOpen);
      break;
    case panelNameMap:
      toggleElement(zoomIcon, !isOpen || !isFullSizeMap);
      break;
  }
}

function initMainPhoto() {
  initMainPhotoImage();
  initZoomIcon();
  // connect UI updates related to other panels
  window.addEventListener(panelToggledEvent, onPanelToggledMainPhotoHandler);
  initLastPhoto();
  // restore previous state from storage
  if (getSetting(isActualPhotoSizeSetting)) {
    setTimeout(() => toggleActualPhotoSize());
  }
}
