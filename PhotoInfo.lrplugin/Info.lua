return {
  LrSdkVersion = 5.0,
  LrSdkMinimumVersion = 5.0,
  LrToolkitIdentifier = 'com.jurafajt.viewphotoinfo',
  LrPluginName = 'View Photo Info',
  LrPluginInfoProvider = 'pluginProvider.lua',
  LrExportMenuItems = {
    {
      title = 'Open last export results',
      file = 'openIndexFile.lua',
    },
    {
      title = 'Export and show selected photo(s) info',
      file = 'exportStart.lua',
      enabledWhen = 'photosSelected',
    },
    {
      title = 'Remove selected photo(s) exported data and preview files',
      file = 'exportDataRemoval.lua',
      enabledWhen = 'photosSelected',
    },
  },
  VERSION = { major=0, minor=0, revision=1, build=1, },
}
