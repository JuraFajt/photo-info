// permanent DOM references
const filmStripIcon = document.getElementById('film-strip-icon');
const filmStrip = document.getElementById('film-strip');
const filmStripItems = document.getElementById('film-strip-items');

const isFilmStripOpenSetting = 'isFilmStripOpen';
let selectedItem;

function scrollToSelectedItem(options) {
  if (!selectedItem) {
    console.info(`Couldn't scroll to selected item as it was not set yet. Retrying in 500 ms ...`);
    setTimeout(() => scrollToSelectedItem(options), 500);
    return;
  }
  selectedItem.scrollIntoView({ behavior: 'smooth', ...(options || {}) });
}

function selectFilmStripItem(fileName) {
  document.querySelectorAll('[data-photo]').forEach((item) => item.classList.toggle(selectedClass, false));
  selectedItem = document.querySelector(`[data-photo="${fileName}"]`);
  selectedItem.classList.toggle(selectedClass, true);
  scrollToSelectedItem({ block: 'nearest' });
}

function toggleFilmStrip(shouldTriggerEvent = true) {
  toggleElement(filmStrip);
  const isOpen = isElementOn(filmStrip);
  filmStripIcon.classList.toggle(selectedClass);
  scrollToSelectedItem({ block: 'center' });
  storeSetting(isFilmStripOpenSetting, isOpen);
  if (shouldTriggerEvent) {
    dispatchPanelToggledEvent({
      panelName: panelNameFilmStrip,
      isOpen,
    });
  }
}

function initFilmStripIcon() {
  filmStripIcon.addEventListener('click', toggleFilmStrip);
}

function showFilmStripItemInfo(element) {
  const { camera, fileName, id, lens, originalDate, path, photo, previewName } = element.dataset
  const content =
    `<div class="text-wrapper">` +
    `<p class="path" src="${path}">${path}</p>` +
    `<p class="id"><span class="value">${fileName}</span>&nbsp; Catalogue ID: <span class="value">${id}</span></p>` +
    `<p class="camera value">${camera}</p>` +
    `<p class="lens value">${lens}</p>` +
    `<p class="original-date">${originalDate}</p>` +
    `</div>`;
  const position = calculateInfoPopupPosition(element, horizontal, 'film-strip-item-info');
  showInfoPopup({ content, ...position });
}

function bindFilmStripItemEvents(element, onActivate) {
  bindInfoPopupEvents(element, () => showFilmStripItemInfo(element));
  bindElementAction(element, onActivate);
}

function filmStripObserverCallback(entries) {
  entries.forEach(({ isIntersecting, target: anchor }) => {
    toggleElement(anchor.querySelector('.thumbnail'), isIntersecting);
    toggleElement(anchor.querySelector('.thumbnail-plaeholder'), !isIntersecting);
  });
}

const filmStripObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(({ isIntersecting, target: anchor }) => {
      toggleElement(anchor.querySelector('.thumbnail'), isIntersecting);
      toggleElement(anchor.querySelector('.thumbnail-placeholder'), !isIntersecting);
    });
  },
  { root: filmStripItems },
);

// current format of the UniqueName: {localCatalogId}-{fileName}-{extension}
// UniqueName is also the key in photos map.
function createFilmStripItem(photo, itemIndex) {
  const {
    DateTimeOriginal: originalDate,
    FileName: fileName,
    FilePath: path,
    ImageHeight: height,
    ImageWidth: width,
    LensID: lens = '',
    Model: camera = '',
    OrientationAngle: orientationAngle = 0,
    PreviewFileName: previewName,
    UniqueName: uniqueName,
  } = photo;
  const index = uniqueName.indexOf('-');
  const id = uniqueName.substring(0, index);
  const anchor = document.createElement('a');
  // preset the thumbnail image sizes so that layout doesn't "jump" before loaded
  const { w, h } = getScaledSize(150, width, height, orientationAngle);
  // filmstrip item markup
  anchor.innerHTML =
    `<span class="file">${fileName}</span> <span class="id">${id}</span>` +
    `<img class="thumbnail" loading="lazy" src="./photos/${previewName}" style="width:${w}px;height:${h}px" hidden />` +
    `<div class="thumbnail-placeholder" style="width:${w}px;height:${h}px" />`;
  anchor.classList.add('button');
  anchor.dataset.photo = uniqueName;
  // additional data for displaying basic photo info on hover
  anchor.dataset.id = id;
  anchor.dataset.fileName = fileName;
  anchor.dataset.camera = camera;
  anchor.dataset.lens = lens;
  anchor.dataset.originalDate = originalDate;
  anchor.dataset.path = path;
  anchor.dataset.previewName = previewName;
  anchor.dataset.itemIndex = itemIndex + 1;
  anchor.setAttribute('tabindex', '0');
  filmStripItems.append(anchor);
  filmStripObserver.observe(anchor);
  bindFilmStripItemEvents(anchor, () => setCurrentPhoto(uniqueName));
}

function createFilmStripItems() {
  // sort the items in photos first
  // sorting by unique name doesn't help, as the local IDs are not sorted anyway
  const compare = ([_key1, value1], [_key2, value2]) => {
    const { DateTimeOriginal: originalDate1 } = value1;
    const { DateTimeOriginal: originalDate2 } = value2;
    return originalDate1 > originalDate2;
  };
  [...photos.entries()]
    .sort(compare)
    .forEach(([_, photo], index) => createFilmStripItem(photo, index));
  filmStrip.querySelector('h2').innerText = `${photos.size} Photos`;
}

function initFilmStrip() {
  initFilmStripIcon();
  createFilmStripItems();
  // restore previous state from storage
  if (getSetting(isFilmStripOpenSetting)) {
    setTimeout(() => toggleFilmStrip());
  }
}
