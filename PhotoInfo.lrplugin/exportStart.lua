local LrApplication = import 'LrApplication'
-- local LrMobdebug = import "LrMobdebug"
local LrPathUtils = import 'LrPathUtils'
local LrTasks = import 'LrTasks'
require 'exportUtils'

-- LrMobdebug.start()

--[[
Only files / data export happens here. The rest of displaying logic is done
in exported HTML page & included javascript files. This is also why part
of the configuration is stored rather in JSON files than lua.
]]--
local function exportStart()

  -- LrMobdebug.on()

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
    template = '({current} / {totalSteps})   Exporting generic files ...',
    title = 'Export & show selected photo(s) info',
    -- 1 step to copy generic files, 1 step for each photo export, 1 step for updating export results
    totalSteps = #photos + 2,
  }
  local progressScope = setupProgress(progressValues)
  
  local exportedPhotosFile, exportedScriptsFile, exportedPhotos = getExportedPhotosListInfo(exportPath)
  
  -- generic files export
  local jsFiles = exportGenericFiles(exportPath)
  completeProgressStep(progressScope, progressValues)
  
  -- selected photos export
  local currentPhotoName, uniqueName
  progressValues.template = '({current} / {totalSteps})   Saving photo {photoName} ...'  
  for i, photo in ipairs(photos) do
    progressValues.current = i + 1
    progressValues.photoName = getPhotoFileInfo(photo).name
    updateProgress(progressScope, progressValues)
    if (photo:checkPhotoAvailability()) then
      local photoName, uniqueName = exportPhoto(photo)
      if (photo.localIdentifier == selectedPhoto.localIdentifier) then currentPhotoName = uniqueName end
      table.insert(exportedPhotos, uniqueName)
    else
      logError('Photo is not available. Make sure hard drives are attached and try again.')
    end
    completeProgressStep(progressScope, progressValues)
  end
  
  -- if everything went OK, update the exported photos list
  progressValues.template = '({current} / {totalSteps})   Updating export results ...'
  progressValues.current = progressValues.totalSteps
  saveExportResults(exportedScriptsFile, jsFiles, exportedPhotosFile, exportedPhotos, currentPhotoName)

  -- create or get the top-level collection "View Photo Info Plugin Collection"
  -- and add selected photos to plugin collection
  catalog:withWriteAccessDo('Add photos to plugin collection', function ()
    local collection = catalog:createCollection(pluginCollectionName, nil, true)
    collection:addPhotos(photos)
  end)
  
  completeProgressStep(progressScope, progressValues)
  progressScope:setCaption('Done.')
  progressScope:done();

  -- view results
  openIndexFile()

end

LrTasks.startAsyncTask(exportStart)
