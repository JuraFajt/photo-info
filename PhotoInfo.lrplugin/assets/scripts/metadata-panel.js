// metadata filtering
const allMetadataFilter = 'All';
const activeFilterSetting = 'activeMetadataFilter';
let activeFilter = getSetting(activeFilterSetting) ?? allMetadataFilter;

// permanent DOM references
const infoIcon = document.getElementById('info-icon');
const metadataInfo = document.getElementById('metadata-info');
const selectedFilterName = metadataInfo.querySelector('.selected-filter-name');
const infoItems = document.getElementById('info-items');
const infoItemsFilterIcon = document.getElementById('info-items-filter-icon');
const infoItemsFilterPopup = document.getElementById('info-items-filter-popup');
const infoExportDataIcon = document.getElementById('info-items-export');

const isMetadataOpenSetting = 'isMetadataOpen';

function toggleMetadata(shouldTriggerEvent = true) {
  toggleElement(metadataInfo);
  const isOpen = isElementOn(metadataInfo);
  infoIcon.classList.toggle(selectedClass);
  storeSetting(isMetadataOpenSetting, isOpen);
  if (shouldTriggerEvent) {
    dispatchPanelToggledEvent({
      panelName: panelNameMetadata,
      isOpen,
    });
  }
}

async function exportData() {
  // construct filename
  const { UniqueName: uniqueName } = lastPhotoData;
  const fileName = `${uniqueName}-data-${activeFilter}.json`.toLowerCase();
  // confirm export
  if (!await showModalDialog({
    caption: 'Save Data',
    prompt: `Save selected data into ${fileName}?`,
  })) {
    return;
  }
  // if (!window.confirm(`Save selected data into ${fileName}?`)) {
  //   return;
  // }
  // prepare data
  const content = {};
  if (activeFilter === allMetadataFilter) {
    // sort the keys first for the all metadata filter
    const keys = Object.keys(lastPhotoData).sort();
    keys.forEach((key) => content[key] = getDataValue(lastPhotoData, key));
  } else {
    // for other filters, the order of keys is given by the filter definition
    filters.get(activeFilter).items.forEach((key) => {
      const value = getDataValue(lastPhotoData, key);
      if (value !== undefined) {
        content[key] = value;
      }
    });
  }
  download(fileName, JSON.stringify(content, undefined, 4));
}

function initMetadataIcons() {
  infoIcon.addEventListener('click', toggleMetadata);
  infoItemsFilterIcon.addEventListener('click', () => toggleElement(infoItemsFilterPopup));
  infoExportDataIcon.addEventListener('click', () => exportData());
}

function updateMetadataPanel() {
  const getRow = (key, value) =>
    `<tr><td class="${copyCssClass}">${key}</td><td class="${copyCssClass}">${value}</td></tr>`;

  let content = '';
  if (activeFilter === allMetadataFilter) {
    // sort the keys first for the all metadata filter
    const keys = Object.keys(lastPhotoData).sort();
    keys.forEach((key) => content += getRow(key, getDataValue(lastPhotoData, key)));
  } else {
    // for other filters, the order of keys is given by the filter definition
    filters.get(activeFilter).items.forEach((key) => {
      const value = getDataValue(lastPhotoData, key);
      if (value !== undefined) {
        content += getRow(key, value);
      }
    });
  }
  infoItems.innerHTML = `<table><tr><th>Name</th><th>Value</th></tr>${content}</table>`;
  applyCopyToClipboard(infoItems);
  selectedFilterName.innerHTML = activeFilter;
}

function setActiveFilter(filter) {
  activeFilter = filter;
  toggleElement(infoItemsFilterPopup, false);
  // select current item in popup
  infoItemsFilterPopup.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle(selectedClass, false));
  infoItemsFilterPopup.querySelector(`[data-filter="${activeFilter}"]`).classList.toggle(selectedClass, true);
  // filter data displayed in metadataInfo panel
  updateMetadataPanel();
  // store last active filter
  storeSetting(activeFilterSetting, activeFilter);
}

function createFilterItem(filter) {
  const anchor = document.createElement('a');
  anchor.innerText = filter;
  anchor.classList.add('button');
  if (activeFilter === filter) {
    anchor.classList.add(selectedClass);
  }
  anchor.setAttribute('data-filter', filter);
  infoItemsFilterPopup.append(anchor);
  anchor.addEventListener('click', () => setActiveFilter(filter));
}

function initFiltersPopup() {
  createFilterItem(allMetadataFilter);
  filters.forEach((_, filter) => createFilterItem(filter));
}

// update only own UI here
function onPanelToggledMetadataHandler({ detail: { panelName, isOpen, isFullSizeMap } }) {
  switch (panelName) {
    case panelNameMap:
      if (isOpen && isElementOn(metadataInfo)) {
        toggleMetadata(false);
      }
      toggleElement(infoIcon, !isOpen || !isFullSizeMap);
      break;
  }
}

function initMetadata() {
  initMetadataIcons();
  initFiltersPopup();
  // connect UI updates related to other panels
  window.addEventListener(panelToggledEvent, onPanelToggledMetadataHandler);
  // restore previous state from storage
  if (getSetting(isMetadataOpenSetting)) {
    setTimeout(() => toggleMetadata());
  }
}
