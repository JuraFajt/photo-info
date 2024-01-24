// map instance
let map;
// last selected map tiles layer variant
let lastMapTilesLayerVariant;
// markers cluster group layer reference
let markers;
// markers map used for searching selected marker for a given photo
const markersMap = new Map();
// storing last marker reference
let lastSelectedMarker;

// permanent DOM references
const mapIcon = document.getElementById('map-icon');
const mapPanel = document.getElementById('map');
const mapZoomInIcon = document.getElementById('map-zoom-in');
const mapZoomOutIcon = document.getElementById('map-zoom-out');
const mapSizeIcon = document.getElementById('map-size-icon');
const mapVariantIcon = document.getElementById('map-variant-icon');

const isMapOpenSetting = 'isMapOpen';
const isFullSizeMapSetting = 'isFullSizeMap';
const lastMapZoomSetting = 'lastMapZoom';
const fullSizeMapClass = 'map-full-size';
const lastMapVariantSetting = 'map-variant';
const baseMarkerCircleColor = getCssVariable('--white');
const selectedMarkerCircleColor = getCssVariable('--active-color-2');
const clusterMarkerTextColor = getCssVariable('--action-text-color');
const spiderLegColor = getCssVariable('--base-surface-color');

const cameraFrontIconMarkup =
  `<path class="map-icon-shape"
    d="m -1.5,-4.5 -1,1.5 h -2 v -0.5 h -2 v 0.5 h -0.5 l -0.5,0.5 v 5.5 h 11.5 v -5.5 l -0.5,-0.5 h -1 l -1,-1.5
    m -4,4.5 a 2.5 2.5 0 0 1 2.5,-2.5 a 2.5 2.5 0 0 1 2.5,2.5 a 2.5 2.5 0 0 1 -2.5,2.5 a 2.5 2.5 0 0 1 -2.5,-2.5 z"
  />
  <circle class="map-icon-shape" cx="0" cy="0" r="2" />`;

const cameraTopIconMarkup =
  `<path class="map-icon-shape""
    d="m -2.25,1.5 v 1 c 0,0.5 0,0.5 0.5,0.5 h 6 c 0.5,0 0.5,0 0.5,-0.5 V 0 c 0,-0.323562 -0.192954,-0.5 -0.5,-0.5 h -1
    c -0.282274,0 -0.5,0.250757 -0.5,0.5 v 1 h -4.5 c -0.5,0 -0.5,0 -0.5,0.5 z m 5.980469,-1.667969 c 0.0072,-2.05e-4
    0.01432,-2.05e-4 0.02148,0 0.207107,0 0.375,0.167893 0.375,0.375 0,0.207107 -0.167893,0.375 -0.375,0.375 -0.207107,0
    -0.375,-0.167893 -0.375,-0.375 -3.27e-4,-0.198999 0.154843,-0.363599 0.353516,-0.375 z" />
  <path class="map-icon-shape" d="m -1.75,-1.75 v 2 l 0.5,0.5 h 2.5 l 0.5,-0.5 v -2 z" />
  <path class="map-icon-shape" d="m -1.75,-2 -0.5,-0.5 V -4 l 0.5,1 1,-1.5 h 1.5 l 1,1.5 0.5,-1 v 1.5 L 1.75,-2 Z" />
  <path class="map-icon-axis" d="m 0,-5.5 v -14" />`;

const cameraMarkerIconSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 40 40">
    <g transform="rotate({rotation})">
      <g>
        <title>{title}</title>
        <circle class="highlight-circle" cx="0" cy="0" r="7" fill="{circleColor}" />
      </g>
      {iconMarkup}
    </g>
  </svg>`;

const cameraFrontViewIconSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -15 30 30">
    <g transform="rotate({rotation})">
      <path class="map-icon-axis" d="m 13.5,0 h -30" />
      ${cameraFrontIconMarkup}
    </g>
  </svg>`;

const cameraSideViewIconSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -15 30 30">
    <g transform="rotate({rotation}) scale(1.2)">
      <path class="map-icon-shape" d="m 0,2.125 h 2 c 0.5,0 0.5,0 0.5,-0.5 V -3 L 2,-3.5 H 0.5 L -1,-3 v 1 l 0.5,0.5 v 3.125 c 0,0.5 0,0.5 0.5,0.5 z" />
      <path class="map-icon-shape" d="m -3.25,1.75 h 2 l 0.5,-0.5 v -2.5 l -0.5,-0.5 h -2 z" />
      <path class="map-icon-shape" d="M -3.5,1.75 -4,2.25 -6,2.25 -4.5,1.5 c -1,-1 -1,-2 0,-3 L -6,-2.25 -4,-2.25 l 0.5,0.5 z" />
      <path class="map-icon-axis" d="M -7,0 H -21" />
    </g>
  </svg>`;

const clusterMapIconSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 40 40">
    <circle class="map-icon-shape" cx="0" cy="0" r="19" />
    <text x="0" y="0" dominant-baseline="middle" text-anchor="middle" fill="{clusterMarkerTextColor}" font-size="14">{count}</text>
  </svg>`;

function getMapCoordinates(photo) {
  if (!photo) {
    return false;
  }
  const { GPS: catalogGpsPosition, GPSPosition: exifGpsPosition } = photo;
  console.log('catalogGpsPosition', catalogGpsPosition, 'exifGpsPosition', exifGpsPosition);
  // try exif data first, coordinates format: '49.654080 N, 17.242808 E'  
  if (exifGpsPosition) {
    const [lat, lng] = exifGpsPosition.split(', ');
    const latitude = (lat.indexOf('N') > 0 ? 1 : -1) * parseFloat(lat, 10);
    const longitude = (lng.indexOf('E') > 0 ? 1 : -1) * parseFloat(lng, 10);

    return { latitude, longitude };
  }
  // catalog metadata might be added manually
  return catalogGpsPosition ?? false;
}

function getLastPhotoMapCoordinates() {
  return getMapCoordinates(lastPhotoData);
}

function getClusterIcon(cluster) {
  const iconSettings = {
    clusterMarkerTextColor,
    count: cluster.getChildCount(),
    mapIconUrl: clusterMapIconSvg,
  };

  return L.divIcon({
    className: "leaflet-cluster-marker",
    html: L.Util.template(clusterMapIconSvg, iconSettings),
    iconSize: [40, 40],
  });
}

function getMapMarkerIcon(title, rotation, isSelected = false) {
  const circleColor = isSelected ? selectedMarkerCircleColor : baseMarkerCircleColor;
  const iconMarkup = rotation === undefined ?
    `<g transform="scale(0.9) translate(2 0)">${cameraFrontIconMarkup}</g>` : cameraTopIconMarkup;
  const markup = cameraMarkerIconSvg.replace('{iconMarkup}', iconMarkup);
  const iconSettings = {
    circleColor,
    mapIconUrl: markup,
    rotation: rotation ?? 0,
    title,
  };

  return L.divIcon({
    className: "leaflet-data-marker",
    html: L.Util.template(markup, iconSettings),
    iconSize: [80, 80],
    popupAnchor: [0, -15],
  });
}

function getPitchAngleIcon(rotation) {
  const iconSettings = {
    mapIconUrl: cameraSideViewIconSvg,
    rotation,
  };

  return L.Util.template(cameraSideViewIconSvg, iconSettings);
}

function getOrientationAngleIcon(rotation) {
  const iconSettings = {
    mapIconUrl: cameraFrontViewIconSvg,
    rotation,
  };

  return L.Util.template(cameraFrontViewIconSvg, iconSettings);
}

function getMarkerPopup(data) {
  const element = document.createElement('div');
  const {
    directionText,
    latitude,
    longitude,
    City: city,
    CountryCode: countryCode,
    FileName: fileName,
    GPSAltitude: altitude,
    Location: location,
    PitchAngle: pitchAngle,
    PreviewFileName: previewName,
    RollAngle: rollAngle,
    State: state,
    UniqueName: uniqueName,
  } = data;
  const orientationAngle = getOrientationAngle(data);
  const orientation = orientationAngle - Number(rollAngle ?? 0);
  const index = uniqueName.indexOf('-');
  const id = uniqueName.substring(0, index - 1);
  const coordinatesText = `${ddToDms(latitude)} ${ddToDms(longitude, false)}`;
  const locationText = [location, city, state, countryCode].filter((item) => Boolean(item)).join(', ');

  // popup HTML template
  const photoLinkCssClass = 'photo-link';

  const getRow = (caption, value) =>
    `<tr><th class="${copyCssClass}">${caption}</th><td class="${copyCssClass}">${value}</td></tr>`;
  
  const getMapLink = (caption, url) =>
    `<a class="button map-link" href="${url}" target="_blank" title="Show location in ${caption}">${caption}</a>`;

  const getPitchAngleMarkup = () => {
    if (pitchAngle === undefined) return '';
    return `<div class="pitch-angle" title="Pitch angle">${getPitchAngleIcon(Number(pitchAngle))} ${pitchAngle}°</div>`;
  }

  const getOrientationAngleMarkup = () =>
    `<div class="orientation-angle" title="Orientation angle">${getOrientationAngleIcon(orientation)} ${orientation}°</div>`;
  
  element.innerHTML =
    `<table class="map-popup-table">
      <tr>
        <th>
          <a class="${photoLinkCssClass}" title="Select this photo in filmstrip">
            <span class="file">${fileName}</span>
            <span class="id">${id}</span>
          </a>
          ${getOrientationAngleMarkup()}
          ${getPitchAngleMarkup()}
        </th>
        <td colspan="2">
          <a class="${photoLinkCssClass}" title="Select this photo in filmstrip">
            <img class="thumbnail" src="./photos/${previewName}" />
          </a>
        </td>
      </tr>
      ${altitude === undefined ? '' : getRow('Altitude', altitude)}
      ${getRow('Coordinates', coordinatesText)}
      ${directionText === undefined ? '' : getRow('Direction', directionText)}
      ${locationText ? getRow('Location', locationText) : ''}
      ${getRow('Orientation angle', toDegrees(orientation))}
      ${pitchAngle === undefined ? '' : getRow('Pitch angle', toDegrees(pitchAngle))}
      <tr>
        <td colspan="3">
          <b>Open location</b>
          ${getMapLink('OpenStreetMap', `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`)}
          ${getMapLink('OpenTopoMap', `https://opentopomap.org/?#marker=17/${latitude}/${longitude}`)}
          ${getMapLink('Google Maps', `https://www.google.com/maps/place/${latitude},${longitude}`)}
          ${getMapLink('Google Earth', `https://earth.google.com/web/search/${latitude},${longitude}`)}
          ${getMapLink('Bing Maps', `https://www.bing.com/maps/?cp=${latitude}~${longitude}&sty=c&sp=point.${latitude}_${longitude}&lvl=17`)}
          ${getMapLink('Mapy.cz', `https://mapy.cz/turisticka?source=coor&id=${longitude}%2C${latitude}`)}
        </td>
    </table>`;

  // bind events on parts of created popup DOM fragment
  element.querySelectorAll(`.${photoLinkCssClass}`)
    .forEach((anchor) => bindElementAction(anchor, () => setCurrentPhoto(uniqueName)));

  applyCopyToClipboard(element);

  return element;
}

function addMarker(data) {
  const {
    latitude,
    longitude,
    GPSImgDirection: exifDirection,
    Direction: catalogDirection,
    FileName: fileName,
    UniqueName: uniqueName,
  } = data;
  const rotation = catalogDirection ?? exifDirection;
  const directionText = getDirectionText(isNaN(catalogDirection) ? exifDirection : catalogDirection);
  const icon = getMapMarkerIcon(fileName, rotation);
  const popup = getMarkerPopup({ ...data, directionText });
  const marker = L.marker([latitude, longitude], { fileName, rotation })
    .setIcon(icon)
    .bindPopup(popup, { maxWidth: 340 })
    .addTo(markers);
  markersMap.set(uniqueName, marker);
  console.info(`Created map marker at coordinates ${latitude}, ${longitude}.`);

  return marker;
}

function addPhotoMarkers() {
  photos.forEach((photo) => {
    const coordinates = getMapCoordinates(photo);
    if (coordinates) {
      addMarker({ ...photo, ...coordinates });
    }
  });
}

function addNewMarkersLayer() {
  markers = L.markerClusterGroup(clusterGroupOptions).addTo(map);
}

/**
 * Markercluster plugin will not update correctly when map's maxZoom changes.
 * So rather re-arranging a new clusterer layer & filling it with already
 * created markers.
 */
function refreshPhotoMarkers() {
  // remove old layer
  markersMap.forEach((item) => item.removeFrom(markers));
  markers.removeFrom(map);
  // add new layer
  addNewMarkersLayer();
  markersMap.forEach((item) => item.addTo(markers));
  markers.addTo(map);
  markers.refreshClusters();
}

function toggleMap(shouldTriggerEvent = true) {
  toggleElement(mapPanel);
  toggleElement(mapZoomInIcon);
  toggleElement(mapZoomOutIcon);
  toggleElement(mapSizeIcon);
  toggleElement(mapVariantIcon);
  mapIcon.classList.toggle(selectedClass);
  const isOpen = isElementOn(mapPanel);
  const isFullSizeMap = mapPanel.classList.contains(fullSizeMapClass);
  map?.invalidateSize();
  storeSetting(isMapOpenSetting, isOpen);
  if (shouldTriggerEvent) {
    dispatchPanelToggledEvent({
      panelName: panelNameMap,
      isOpen,
      isFullSizeMap,
    });
  }
}

function toggleMapSize(shouldTriggerEvent = true) {
  mapPanel.classList.toggle(fullSizeMapClass);
  mapSizeIcon.classList.toggle(selectedClass);
  const isOpen = isElementOn(mapPanel);
  const isFullSizeMap = mapPanel.classList.contains(fullSizeMapClass);
  map?.invalidateSize();
  storeSetting(isFullSizeMapSetting, isFullSizeMap);
  if (shouldTriggerEvent) {
    dispatchPanelToggledEvent({
      panelName: panelNameMap,
      isOpen,
      isFullSizeMap,
    });
  }
}

const mapTilesOpenStreetMap = 'OpenStreetMap';
const mapTilesOpenTopoMap = 'OpenTopoMap';

const mapLayers = {
  [mapTilesOpenStreetMap]: {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    instance: undefined,
    maxZoom: 19,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  [mapTilesOpenTopoMap]: {
    attribution:
      `&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors,
      &copy; <a href="https://opentopomap.org">OpenTopoMap</a>
      (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)`,
    instance: undefined,
    maxZoom: 17,
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  },
};

function getMapLayer(id) {
  if (!mapLayers[id]) {
    console.error(`Couldn't find configuration for map layer with ID '${id}.`);
    return undefined;
  }
  if (!mapLayers[id].instance) {
    const { instance, url, ...options } = mapLayers[id];
    mapLayers[id].instance = L.tileLayer(url, options);
  }

  return mapLayers[id].instance;
}

function updateMapVariantIcon() {
  mapVariantIcon.classList.toggle('toggled', lastMapTilesLayerVariant === mapTilesOpenTopoMap);
}

function getCurrentMaxZoom() {
  return mapLayers[lastMapTilesLayerVariant]?.maxZoom ?? 17;
}

const clusterGroupOptions = {
  iconCreateFunction: (cluster) => getClusterIcon(cluster),
  showCoverageOnHover: false,
  spiderfyDistanceMultiplier: 1.3,
  spiderfyOnMaxZoom: true,
  spiderLegPolylineOptions: { weight: 0.5, color: spiderLegColor, opacity: 0.75 },
};

function toggleMapVariant() {
  // remove old tiles
  const oldTiles = getMapLayer(lastMapTilesLayerVariant);
  oldTiles?.removeFrom(map);
  lastMapTilesLayerVariant = lastMapTilesLayerVariant === mapTilesOpenStreetMap
    ? mapTilesOpenTopoMap : mapTilesOpenStreetMap;
  // add new tiles
  map.setMaxZoom(getCurrentMaxZoom());
  const newTiles = getMapLayer(lastMapTilesLayerVariant);
  newTiles?.addTo(map);
  // refresh markers clustering layer
  refreshPhotoMarkers();
  updateMapVariantIcon();
  storeSetting(lastMapVariantSetting, lastMapTilesLayerVariant);
}

function storeLastMapZoom() {
  storeSetting(lastMapZoomSetting, map?.getZoom());
  console.info(`Last map zoom stored.`, map?.getZoom());
}

function initMapIcons() {
  mapIcon.addEventListener('click', toggleMap);
  mapSizeIcon.addEventListener('click', toggleMapSize);
  mapVariantIcon.addEventListener('click', () => toggleMapVariant());
  mapZoomInIcon.addEventListener('click', () => map?.zoomIn());
  mapZoomOutIcon.addEventListener('click', () => map?.zoomOut());
}

function initMapInstance() {
  // map instance
  const zoom = getSetting(lastMapZoomSetting) ?? 16;
  const mapOptions = {
    zoom,
    zoomControl: false,
  }
  map = L.map('map', mapOptions);
  // init default map tiles layer
  lastMapTilesLayerVariant = getSetting(lastMapVariantSetting) ?? mapTilesOpenStreetMap;
  const layer = getMapLayer(lastMapTilesLayerVariant);
  layer?.addTo(map);
  updateMapVariantIcon();
  // init markers clustering layer
  addNewMarkersLayer();
  // show map scale
  L.control.scale().addTo(map);
  // map zooming with custom buttons
  map.on('zoomend', storeLastMapZoom);
  map.on('load', updateMapPosition);
}

// update only own UI here
function onPanelToggledMapHandler({ detail: { panelName, isOpen } }) {
  switch (panelName) {
    case panelNameMetadata:
      if (isOpen && isElementOn(mapPanel)) {
        toggleMap(false);
      }
      toggleElement(mapIcon, !isOpen);
      break;
  }
}

function initMap() {
  // buttons' event handlers
  initMapIcons();
  // create a map instance using Leaflet library
  initMapInstance();
  // add markers for all exported photos with coordinates metadata
  addPhotoMarkers();
  // connect UI updates related to other panels
  window.addEventListener(panelToggledEvent, onPanelToggledMapHandler);
  // restore previous state from storage
  if (getSetting(isFullSizeMapSetting)) {
    setTimeout(() => toggleMapSize(false));
  }
  const lastMapZoom = getSetting(lastMapZoomSetting);
  if (typeof lastMapZoom === 'number') {
    map?.setZoom(lastMapZoom);
  }
  if (getSetting(isMapOpenSetting)) {
    setTimeout(() => toggleMap());
  }
}

function updateMapPosition() {
  // updates for previously selected photo
  if (lastSelectedMarker) {
    const { fileName: previousFileName, rotation: previousRotation } = lastSelectedMarker.options;
    const previousIcon = getMapMarkerIcon(previousFileName, previousRotation);
    lastSelectedMarker.setIcon(previousIcon);
    lastSelectedMarker = undefined;
  }
  // updates for current selected photo
  const coordinates = getLastPhotoMapCoordinates();
  if (!coordinates) {
    console.warn(`Couldn't update map position because of missing last photo coordinates.`);
    return;
  }
  if (!map) {
    console.warn(`Couldn't update map position because map was not initialized yet.`);
    return;
  }
  const { latitude, longitude } = coordinates;
  map.closePopup();
  map.setView([latitude, longitude]);
  console.info(`Map was centered to last photo coordinates ${latitude}, ${longitude}.`);
  // select last photo marker
  const {
    GPSImgDirection: exifDirection,
    Direction: catalogDirection,
    FileName: fileName,
    UniqueName: uniqueName,
  } = lastPhotoData;
  const marker = markersMap.get(uniqueName);
  if (!marker) {
    console.warn(`Couldn't update marker icon for last photo because the marker was not found.`);
    return;
  }
  const rotation = catalogDirection ?? exifDirection;
  const icon = getMapMarkerIcon(fileName, rotation, true);
  marker.setIcon(icon);
  // remember the last selected marker for later
  lastSelectedMarker = marker;
  // make sure the marker is visible, optionally "spiderfying" the containing cluster
  markers.zoomToShowLayer(marker, /* () => marker.openPopup() */);
}
