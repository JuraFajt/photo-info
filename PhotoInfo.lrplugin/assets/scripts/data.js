// photos metadata
const photos = new Map();

// camera settings
const cameras = {
  duplicatedSettings: new Map(),
  // shared focus layouts extracted to shorten particular camera setting files
  focusLayouts: new Map(),
  // shared metering layouts
  meteringLayouts: new Map(),
  // Stores info about last camera for which the previous UI info was generated.
  // If new photo's camera is the same as previous, the UI doesn't have to be re-created again.
  lastResolvedCameraSettings: undefined,
  settings: new Map(),
};

// metadata filters
const filters = new Map();

// last resolved camera and photo settings stored in these
let lastCameraData = {};
let lastPhotoData = {};
let isDifferentCamera = true;

function extractCoordinates(value) {
  const { latitude, longitude } = value ?? {};

  return typeof value === 'object' ? `${latitude}, ${longitude}` : undefined;
}

function getDirectionText(direction) {
  if (isNaN(direction)) {
    return undefined;
  }
  const directions = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West', 'North'];
  const angle = Number(direction);
  const index = Math.floor((angle + 22.5) / 45);
  
  return `${angle}° (${directions[index]})`;
}

function toDegrees(value) {
  if (value === undefined) {
    return undefined;
  }
  const result = typeof value === 'string' && value.indexOf('deg') > 0 ? value.split(' ')[0] : value;

  return `${result}°`;
}

/**
 * @param {object} value Raw keywords info
 * @returns Serialized HTML with nested exported keywords.
 */
function serializeExportedKeywords(value) {
  if (!value) {
    return undefined;
  }
  const originalItems = Object.entries(value);
  const rows = [];

  const filterByParent = (parentKey) => originalItems.filter(([_, { parent }]) => parent === parentKey);

  const createRows = (parentKey = undefined, level = 0) => {
    filterByParent(parentKey).forEach(([key, { includeOnExport, values }]) => {
      if (includeOnExport) {
        rows.push(`<p style="padding-left: ${level * 20}px">${values.join(', ')}</p>`);
      }
      createRows(key, level + (includeOnExport ? 1 : 0));
    });
  };

  createRows();

  return rows.join('\n');
}

/**
 * @param {object} value Raw keywords info
 * @returns Serialized HTML with added keywords' names without the whole hierarchy.
 */
function serializeKeywords(value) {
  if (!value) {
    return undefined;
  }
  return Object.entries(value).map(([_, { values: [ keyword ]}]) => keyword).join(', ');
}

function serializeHierarchicalSubject(value) {
  if (typeof value !== 'string' && !Array.isArray(value)) {
    return undefined;
  }
  const rows = Array.isArray(value) ? value : value.split(',');
  return rows.map((row) => `<p>${row.replaceAll('|', ' · ')}</p>`).join('\n');
}

// special photo data serialization methods for displying in metadata panel etc.
const dataValueTransformationMap = new Map([
  ['Direction', getDirectionText],
  ['ExportedKeywords', serializeExportedKeywords],
  ['FOV', toDegrees],
  ['GPS', extractCoordinates],
  ['GPSImgDirection', getDirectionText],
  ['GPSTrack', toDegrees],
  ['HierarchicalSubject', serializeHierarchicalSubject],
  ['Keywords', serializeKeywords],
  ['OrientationAngle', toDegrees],
  ['PitchAngle', toDegrees],
  ['RollAngle', toDegrees],
]);

/**
 * Function to get a particular data value from exported photo data,
 * optionally transformed with logic for given key in dataValueTransformationMap.
 * @param {object} photoData Exported photo data
 * @param {string} key Data property name (key)
 * @returns Optionally transformed data value or undefined.
 */
function getDataValue(photoData, key) {
  const value = photoData[key];
  const transformation = dataValueTransformationMap.get(key);

  return typeof transformation === 'function' ? transformation(value) : value; 
}

/**
 * These are the possible values as documented at https://exiftool.org/TagNames/EXIF.html:
 *
 * 1 = Horizontal (normal)
 * 2 = Mirror horizontal
 * 3 = Rotate 180
 * 4 = Mirror vertical
 * 5 = Mirror horizontal and rotate 270 CW
 * 6 = Rotate 90 CW
 * 7 = Mirror horizontal and rotate 90 CW
 * 8 = Rotate 270 CW
 *
 * For now for simplicity, this plugin considers just the standard orientations 0 / 90 / 180 / 270 w/o mirroring.
 * In other cases, it returns angle 0. Correction done already in LUA script & written into metadata export.
 */
function getOrientationAngle(photoData) {
  const { OrientationAngle: orientationAngle } = photoData;
  return orientationAngle ?? 0;
}

function resolveFocusAreasLayout(layoutId) {
  const layout = cameras.focusLayouts.get(layoutId);
  if (typeof layout !== 'object') {
    console.error(`Couldn't resolve focus layout '${layoutId}'.`);
    return undefined;
  }
  if (layout.isResolved) {
    console.info(`AF layout '${layoutId}' was already resolved before.`);
    return layout;
  }
  // update focus layout settings & store transformad info when 1st used
  const { focusAreaPositions, focusAreaDefaults, specialSettings } = layout;
  const size = get2DValue(focusAreaDefaults.size);
  const defaults = { ...focusAreaDefaults, size };
  // basic setup taken from positions
  const focusAreasReducer = (accumulator, current) => {
    const [key, value] = current;
    const specials = specialSettings[key];
    if (specials && specials.size !== undefined) {
      specials.size = get2DValue(specials.size);
    }
    const result = {
      ...defaults,
      position: get2DValue(value),
      ...specials,
    };
    accumulator[key] = result;
    return accumulator;
  };
  const focusAreasConfiguration = Object.entries(focusAreaPositions).reduce(focusAreasReducer, {});
  // save updated settings also for later use
  layout.focusAreasConfiguration = focusAreasConfiguration;
  layout.isResolved = true;
  cameras.focusLayouts.set(layoutId, layout);
  console.info(`AF layout '${layoutId}' was successfully resolved. Data:`, layout);
  return layout;
}

function resolveMeteringSegmentsLayout(layoutId) {
  const layout = cameras.meteringLayouts.get(layoutId);
  if (typeof layout !== 'object') {
    console.error(`Couldn't resolve metering layout '${layoutId}'.`);
    return undefined;
  }
  if (layout.isResolved) {
    console.info(`Metering segments layout '${layoutId}' was already resolved before.`);
    return layout;
  }
  const { grid, meteringSegmentPositions, segmentDimensions, svg } = layout;
  const isSvgLayout = Boolean(svg);
  const isGrid = Boolean(grid);
  let hasMeteringSegmentPositions = typeof meteringSegmentPositions === 'object';
  if (isSvgLayout) {
    // no updates for SVG layouts so far
  }
  if (isGrid || hasMeteringSegmentPositions) {
    layout.segmentDimensions = get2DValue(segmentDimensions);
  }
  if (isGrid) {
    // one option is to have a grid setup
    // create final set of segments from it here
    const { itemsDistance, size } = grid;
    const { x: xCount, y: yCount } = get2DValue(size);
    const { x: columnDistance, y: rowDistance } = get2DValue(itemsDistance);
    const { x: sizeX, y: sizeY } = layout.segmentDimensions;
    // segments are 1-based, 1st direction is in row from left to right (changing columns),
    // then next row; center coordinates of segments being created
    const translateX = ( xCount * columnDistance  - ( columnDistance - sizeX ) ) / 2;
    const translateY = ( yCount * rowDistance - ( rowDistance - sizeY ) ) / 2;
    const meteringSegmentPositions = {};
    let index = 1;
    for (let y = 1; y <= yCount; y++) {
      for (let x = 1; x <= xCount; x++) {
        meteringSegmentPositions[index] = {
          x: (x - 1) * columnDistance - translateX,
          y: (y - 1) * rowDistance - translateY,
        };
        index++;
      }
    }
    layout.meteringSegmentPositions = meteringSegmentPositions;
    hasMeteringSegmentPositions = true;
  }
  if (hasMeteringSegmentPositions) {
    // another option is to have final set of fixed metering segments already defined
    // in both cases (this & the grid setup), there should be by now same updated info
    const meteringSegmentsConfiguration = {};
    Object.entries(layout.meteringSegmentPositions).forEach(([key, value]) => {
      meteringSegmentsConfiguration[key] = {
        position: get2DValue(value),
        size: layout.segmentDimensions,
      };
    });
    layout.meteringSegmentsConfiguration = meteringSegmentsConfiguration;
  }
  // save updated settings also for later use
  layout.isResolved = true;
  cameras.meteringLayouts.set(layoutId, layout);
  console.info(`Metering segments layout '${layoutId}' was successfully resolved. Data:`, layout);
  return layout;
}
  
function resolveCameraSettings() {
  const pentax = 'PENTAX Corporation';
  const ricoh = 'RICOH IMAGING COMPANY, LTD.';
  const pentaxMake = 'pentax';
  const { Make: cameraMake, Model: cameraModel } = lastPhotoData;
  let resolvedCameraMake = cameraMake.toLowerCase();
  if (resolvedCameraMake === pentax.toLowerCase() || resolvedCameraMake === ricoh.toLowerCase()) {
    resolvedCameraMake = pentaxMake;
  }
  let resolvedCameraModel = cameraModel.toLowerCase();
  // TODO: should this be conditional?
  if (resolvedCameraMake === pentaxMake) {
    const duplicate = cameras.duplicatedSettings.get(resolvedCameraModel);
    if (duplicate) {
      resolvedCameraModel = duplicate;
    }
  }
  // update shared camera settings the 1st time the resolved camera settings are being used
  const settings = cameras.settings.get(resolvedCameraModel);
  if (typeof settings === 'object') {
    const { isResolved = false, meteringSegmentsLayout, phaseDetectionFocusLayout } = settings;
    if (!isResolved) {
      if (typeof meteringSegmentsLayout === 'string') {
        const meteringLayout = resolveMeteringSegmentsLayout(meteringSegmentsLayout);
        settings.meteringSegmentsLayout = meteringLayout;
      }
      if (typeof phaseDetectionFocusLayout === 'string') {
        const focusLayout = resolveFocusAreasLayout(phaseDetectionFocusLayout);
        settings.phaseDetectionFocusLayout = focusLayout;
      }
      // store updated resolved data for this camera model
      settings.isResolved = true;
      cameras.settings.set(resolvedCameraModel, settings);
      console.info(`Camera settings for '${resolvedCameraModel}' was successfully resolved.`);
    }
  } else {
    console.warn(`Couldn't resolve camera settings for '${resolvedCameraModel}'.`);
  }
  
  return {
    cameraMake,
    cameraModel,
    resolvedCameraMake,
    resolvedCameraModel,
    ...settings,
  };
}

function get2DValue(input) {
  if (Array.isArray(input)) {
    return { x: Number(input[0]), y: Number(input[1]) };
  }
  if (typeof input === 'number') {
    return { x: input, y: input };
  }
  if (typeof input === 'string') {
    const separators = [' ', 'x', ', '];
    for (let i = 0, l = separators.length; i < l; i++) {
      const separator = separators[i];
      const index = input.indexOf(separator);
      if (index > -1) {
        const a = input.split(separator);
        return { x: Number(a[0]), y: Number(a[1]) };
      }
    }
    return { x: Number(input), y: Number(input) };
  }
  const { x = 0, y = 0 } = input || {};
  return { x, y };
}

/**
 * @returns {string} Degrees-minutes-seconds (dms) coordinates. 
 * @param {number} value Decimal degrees (dd) latitude or longitude value to convert.
 * @param {number} precision Number of decimal places in converted dms seconds.
 */
function ddToDms(value, isLatitude = true, precision = 5) {
  const truncate = (n) => n > 0 ? Math.floor(n) : Math.ceil(n);
  const direction = isLatitude ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  const absolute = Math.abs(value);
  const degrees = truncate(absolute);
  const minutes = truncate((absolute - degrees) * 60);
  const seconds = (absolute - degrees - minutes / 60) * Math.pow(60, 2);

  return `${degrees}°${minutes}'${seconds.toFixed(precision)}"${direction}`;
}

/**
 * @param {string} value Exported datetime value in Exiftool format '2024:01:13 04:06:37+01:00'.
 */
function getDateTime(value) {
  if (!value) {
    return NaN;
  }
  const [datePart, timePart] = value.split(' ');
  return Date.parse(`${datePart.split(':').join('-')}T${timePart.substring(0, 8)}`);
}

// copying data to clipboard
const copyCssClass = 'copy';

// This works only in HTTPS context, unfortunately.
// function copyTextToClipboard(textToCopy) {
//   if (navigator?.clipboard?.writeText) {
//     return navigator.clipboard.writeText(textToCopy);
//   }
//   return Promise.reject('The Clipboard API is not available.');
// }

// Using the legacy implementation instead (support may be cut off at any time).
// The fallback is just to display the copied text in prompt popup. The text
// should be selected already, so the user should just press CTRL + C in that case.
// Will not work for too long texts though.
function copyTextToClipboard(textToCopy) {
  const copyViaPrompt = () => window.prompt("Copy to clipboard: Ctrl+C, Enter", textToCopy);
  if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
    var textarea = document.createElement('textarea');
    textarea.textContent = textToCopy;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (error) {
      console.warn("Copy to clipboard failed.", error);
      copyViaPrompt();
    } finally {
      document.body.removeChild(textarea);
    }
  } else {
    copyViaPrompt();
  }
}

function applyCopyToClipboard(wrapperElement) {
  wrapperElement.querySelectorAll(`.${copyCssClass}`)
    .forEach((item) => {
      item.setAttribute('title', 'Click to copy content');
      item.setAttribute('tabindex', '0');
      item.addEventListener('click', () => {
        copyTextToClipboard(item.innerText);
        item.classList.toggle('copied', true);
        setTimeout(() => item.classList.toggle('copied', false), 2000);
      });
    });
}

const contentTypeJson = 'application/json';
const contentTypeText = 'text/plain';

// export selected data via local "download"
function download(filename, content, contentType = contentTypeJson) {
  const element = document.createElement('a');
  element.setAttribute('href', `data:${contentType};charset=utf-8,${encodeURIComponent(content)}`);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

function getScaledSize(maxSize, width, height, orientationAngle = 0) {
  const isHorizontal = [0, 180].includes(orientationAngle);
  const min = Math.min(width, height);
  const max = Math.max(width, height);
  const ratio = min / max;
  const w = Math.round(maxSize * (isHorizontal ? 1 : ratio));
  const h = Math.round(maxSize * (isHorizontal ? ratio : 1));
  return { w, h }
}
