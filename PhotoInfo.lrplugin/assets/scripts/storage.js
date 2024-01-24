const isStorageAvailable = typeof window.localStorage === 'object';

if (!isStorageAvailable) {
  console.warn('Storage is not available.');
}

function getSetting(key) {
  if (!isStorageAvailable || !key) {
    return undefined;
  }
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch(error) {
    console.error(`Couldn't parse stored setting with key '${key}'.`);
  }
  return undefined;
}

function storeSetting(key, value) {
  if (!isStorageAvailable || !key) {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch(error) {
    console.error(`Problem while storing setting with key '${key}':`, error);
  }
}
