local LrApplication = import 'LrApplication'
local LrDialogs = import 'LrDialogs'
local LrFileUtils = import 'LrFileUtils'
local LrMobdebug = import "LrMobdebug"
local LrPathUtils = import 'LrPathUtils'
local LrTasks = import 'LrTasks'
require 'exportUtils'

LrMobdebug.start()

local function exportDataRemoval()

  LrMobdebug.on()

  -- confirm the action by the user first
  local dialogResult = LrDialogs.confirm(
    'Do you want to remove exported data and preview files for selected photos?',
    'The photos will remain in catalogue and the source images will stay intact.\n\n' ..
    'Removed will be only data previously exported by this plugin.',
    'Yes', 'No'
  )
  if (dialogResult == 'cancel') then return end
  
  local catalog = LrApplication.activeCatalog()
  -- all selected photos
  local photos = catalog:getTargetPhotos()
  -- This "most selected" photo will be displayed in the exported HTML page when opened.
  local selectedPhoto = catalog:getTargetPhoto()
  -- Get export path from plugin preferences. If it wasn't set yet, let the user to select it now.
  local exportPath = getExportPath()
  -- exit when the user cancelled folder selection
  if (exportPath == nil) then return end
  
  -- Setup task progress.
  local progressValues = {
    complete = 0,
    current = 1,
    photoName = '',
    template = '({current} / {totalSteps})   Reading last exported photos list ...',
    title = 'Remove selected photo(s) exported info',
    -- 1 step to copy gneric files, 1 step for each photo export, 1 step for updating export results
    totalSteps = #photos + 2,
  }
  local progressScope = setupProgress(progressValues)
  
  -- get last photos export info
  local exportedPhotosFile, exportedScriptsFile, exportedPhotos = getExportedPhotosListInfo(exportPath)
  completeProgressStep(progressScope, progressValues)
  
  -- selected photos export
  progressValues.template = '({current} / {totalSteps})   Remove exported files for photo {photoName} ...'  
  for i, photo in ipairs(photos) do
    -- get photo names used for previous export
    local uniqueName, metadataFilePath, previewFilePath, fileName = getPhotoExportFilePaths(photo, exportPath)
    progressValues.current = i + 1
    progressValues.photoName = fileName
    updateProgress(progressScope, progressValues)
    -- remove exported photo files
    if (LrFileUtils.exists(metadataFilePath) == 'file') then deleteFile(metadataFilePath) end
    if (LrFileUtils.exists(previewFilePath) == 'file') then deleteFile(previewFilePath) end
    -- remove from current exported photos table (to be saved later after all photos data is removed)
    removeTableItemByValue(exportedPhotos, uniqueName)
    completeProgressStep(progressScope, progressValues)
  end
  
  -- if everything went OK, update the exported photos list
  progressValues.template = '({current} / {totalSteps})   Updating export results ...'
  progressValues.current = progressValues.totalSteps
  saveExportedPhotosFile(exportedPhotos, exportedPhotosFile)

  -- get the top-level collection "View Photo Info Plugin Collection"
  -- and remove selected photos from plugin collection
  catalog:withWriteAccessDo('Remove photos from plugin collection', function ()
    local collection = catalog:createCollection(pluginCollectionName, nil, true)
    collection:removePhotos(photos)
  end)
  
  completeProgressStep(progressScope, progressValues)
  progressScope:setCaption('Done.')
  progressScope:done();

end

LrTasks.startAsyncTask(exportDataRemoval)
