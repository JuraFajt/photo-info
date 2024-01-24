const isDomReady = new Promise((resolve) => {
  if (document.readyState === 'complete') {
    resolve();
  } else {
    window.addEventListener('DOMContentLoaded', () => resolve());
  }
});

function loadScript(fileName, isDefaultPathUsed = true) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const path = isDefaultPathUsed ? `./scripts/${fileName}`: fileName;
    script.onerror = () => {
      const message = `Error loading script '${path}'.`;
      console.error(message);
      reject(message);
    };
    script.onload = () => {
      console.log(`Loaded script '${path}'.`);
      resolve();
    };
    script.src = path;
    document.body.appendChild(script);
  });
}

// As the local scripts can't be loaded as ES modules because of CORS,
// all needed scripts with main logic have to be listed here and loaded + evaluated 1 by 1.
// Additional scripts exported by Lightroom plugin can then be loaded in parallel.
const mainScriptsList = [
  // main scripts
  'storage.js',
  'data.js',
  'data-loader.js',
  'ui.js',
  'dialog.js',
  'info-popup.js',
  'focus-areas.js',
  'metering-segments.js',
  'film-strip-menu.js',
  'metadata-panel.js',
  'leaflet.js',
  'leaflet.markercluster.js',
  'map-panel.js',
  'main-photo.js',
  // camera info
  'camera-info/pentax-contrast-af.js',
  'camera-info/pentax-focus-layout-safox-10.js',
  'camera-info/pentax-focus-layout-safox-11.js',
  'camera-info/pentax-focus-layout-safox-12.js',
  'camera-info/pentax-focus-layout-safox-8-with-3-areas.js',
  'camera-info/pentax-focus-layout-safox-8-with-5-areas.js',
  'camera-info/pentax-focus-layout-safox-9-or-lower.js',
  'camera-info/pentax-metering-layout-1350-segments.js',
  'camera-info/pentax-metering-layout-16-segments.js',
  'camera-info/pentax-metering-layout-77-segments.js',
  // metadata filters
  'metadata-filters/basic-info.js',
  'metadata-filters/exposure.js',
  'metadata-filters/focusing.js',
  'metadata-filters/keywords.js',
  'metadata-filters/location.js',
];

function loadScripts() {
  return new Promise(async (resolve) => {
    const i = 0;
    for (let i = 0, l = mainScriptsList.length; i < l; i++) {
      await loadScript(mainScriptsList[i]);
    }
    const lists = ['exported-scripts.js', 'exported-photos.js'];
    await Promise.all(lists.map((script) => loadScript(script)));
    await Promise.all(exportedScriptsList.map((script) => loadScript(script)));
    await Promise.all(exportedPhotos.map((photo) => loadScript(`./photos/${photo}-data.js`, false)));
    resolve();
  });
}

const isReady = Promise.all([isDomReady, loadScripts()]);
