function isDuplicatedCameraSettingsData(data) {
  if (!data) return false;
  return typeof data === 'object' && typeof data.duplicatedCameraSettings === 'object';
}

function addDuplicatedCameraSettings(data) {
  cameras.duplicatedSettings = new Map(Object.entries(data.duplicatedCameraSettings));
}

function isCameraInfoData(data) {
  if (!data) return false;
  return typeof data === 'object' && typeof data.camera === 'string';
}

function addCameraInfo(data) {
  const { camera } = data;
  cameras.settings.set(camera, data);
  return camera;
}

function isFocusLayoutData(data) {
  if (!data) return false;
  return typeof data === 'object' && typeof data.focusLayout === 'string';
}

function addFocusLayout(data) {
  const { focusLayout } = data;
  cameras.focusLayouts.set(focusLayout, data);
  return focusLayout;
}

function isMeteringLayoutData(data) {
  if (!data) return false;
  return typeof data === 'object' && typeof data.meteringLayout === 'string';
}

function addMeteringLayout(data) {
  const { meteringLayout } = data;
  cameras.meteringLayouts.set(meteringLayout, data);
  return meteringLayout;
}

function isMetadataFilterInfo(data) {
  if (!data) return false;
  return typeof data === 'object' && typeof data.filter === 'string';
}

function addMetadataFilter(data) {
  const { filter } = data;
  filters.set(filter, data);
  return filter;
}

function isPhotoData(data) {
  if (!data) return false;
  const d = Array.isArray(data) ? data[0] : data;
  return typeof d === 'object' && typeof d.FileName === 'string';
}

function addPhoto(loadedData) {
  const data = Array.isArray(loadedData) ? loadedData[0] : loadedData;
  const { UniqueName: fileName } = data;
  photos.set(fileName, data);
  return fileName;
}

function callback(data) {
  console.info('JSON callback data:', data);
  if (isDuplicatedCameraSettingsData(data)) {
    addDuplicatedCameraSettings(data);
    console.info('Added duplicated camera settings data');
  }
  if (isCameraInfoData(data)) {
    const camera = addCameraInfo(data);
    console.info('Added camera info data for', camera);
  }
  if (isFocusLayoutData(data)) {
    const focusLayout = addFocusLayout(data);
    console.info('Added focus layout data', focusLayout);
  }
  if (isMeteringLayoutData(data)) {
    const meteringLayout = addMeteringLayout(data);
    console.info('Added metering layout data', meteringLayout);
  }
  if (isMetadataFilterInfo(data)) {
    const filter = addMetadataFilter(data);
    console.info('Added custom metadata filter', filter);
  }
  if (isPhotoData(data)) {
    const fileName = addPhoto(data);
    console.info('Added photo data for', fileName);
  }
}
