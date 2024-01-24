local LrFileUtils = import 'LrFileUtils'
local LrPathUtils = import 'LrPathUtils'
local LrMobdebug = import 'LrMobdebug'
local json = require 'json'
require 'cameraInfo'
require 'fileUtils'
require 'logger'
require 'preferences'
require 'utils'

LrMobdebug.start()

exiftool = LrPathUtils.child(_PLUGIN.path, 'bin')
exiftool = LrPathUtils.child(exiftool, 'exiftool')
exiftool = LrPathUtils.child(exiftool, 'exiftool')

exiftoolWindows = LrPathUtils.child(_PLUGIN.path, 'bin')
exiftoolWindows = LrPathUtils.child(exiftoolWindows, 'exiftool.exe')

pluginCollectionName = 'View Photo Info Plugin Collection'

-- copied directories setup
local foldersToCopy = {
  { 'assets' },
  { 'camera-info', 'scripts/camera-info', true },
}

local function getSavePreviewCommand(photoFile, previewFile)
  local singleQuoteWrap = '\'"\'"\''
  local command
  if (WIN_ENV) then
    local values = { exiftoolWindows = exiftoolWindows, sourceFile = photoFile, targetFile = previewFile, }
    command = formatTemplate('"{exiftoolWindows}" -bigimage -b -W "{targetFile}" "{sourceFile}"', values)
    -- command = '"' .. exiftoolWindows .. '" -bigimage -b -W "' .. previewFile .. '" "' .. photoFileInfo.path .. '"';
  else
    exiftool = string.gsub(exiftool, "'", singleQuoteWrap)
    path = string.gsub(photoFileInfo.path, "'", singleQuoteWrap)
    command = "'".. exiftool .. "' -bigimage -b -W '" .. previewFile .. "' '" .. photoFileInfo.path .. "'";
  end
  return command
end

local function getUpdatePreviewCommand(previewFile, heightPercentage, widthPercentage, orientationAngle)
  local values = { heightPercentage = heightPercentage, sourceFile = previewFile, targetFile = previewFile, widthPercentage = widthPercentage, orientationAngle = orientationAngle }
  local template, rotateInstruction = 'convert "{sourceFile}" -bordercolor black -border {widthPercentage}%x{heightPercentage}% {rotateInstruction} "{targetFile}"'
  if (orientationAngle ~= 0) then rotateInstruction = '-rotate {orientationAngle}' else rotateInstruction = '' end
  template = string.gsub(template, '{rotateInstruction}', '-rotate {orientationAngle}')
  command = formatTemplate(template, values)
  return command
end

local function getSaveMetadataFileCommand(photoFile, metadataFile)
  local singleQuoteWrap = '\'"\'"\''
  local command
  if (WIN_ENV) then
    local values = { exiftoolWindows = exiftoolWindows, sourceFile = photoFile, targetFile = metadataFile, }
    command = formatTemplate('"{exiftoolWindows}" -a -json "{sourceFile}" > "{targetFile}"', values)
    -- command = '"' .. exiftoolWindows .. '" -bigimage -b -W "' .. previewFile .. '" "' .. photoFileInfo.path .. '"';
  else
    exiftool = string.gsub(exiftool, "'", singleQuoteWrap)
    path = string.gsub(photoFileInfo.path, "'", singleQuoteWrap)
    command = "'".. exiftool .. "' -a -json '" .. photoFileInfo.path .. "' > '" .. metadataFile .. "'";
  end
  return command
end

--[[
These are the possible values as documented at https://exiftool.org/TagNames/EXIF.html:

1 = Horizontal (normal)
2 = Mirror horizontal
3 = Rotate 180
4 = Mirror vertical
5 = Mirror horizontal and rotate 270 CW
6 = Rotate 90 CW
7 = Mirror horizontal and rotate 90 CW
8 = Rotate 270 CW

For now for simplicity, this plugin considers just the standard orientations 0 / 90 / 180 / 270 w/o mirroring.
In other cases, it returns angle 0.

If there is no orientation info in metadata, the lightroom development settings are considered.
]]--
local function getOrientationAngle(photo, metaData, w, h)
  local orientation = metaData.Orientation
  local wasMissing = false
  if (orientation == nil) then
    orientation = 'horizontal (normal)'
    wasMissing = true
  end
  orientation = string.lower(orientation)
  local isHorizontal = orientation == 'horizontal (normal)'
  if (isHorizontal and w < h) then
    local developSettings = photo:getDevelopSettings()
    -- returns 'DA' for 270 deg, 'BC' for 90 deg
    orientation = string.lower(developSettings.orientation)
  end
  local orientations = {
    -- This is Lightroom 6.14 value for 270 deg for camera w/o orientation sensor (Pentax *ist DS), rotated manually in Lightroom.
    -- The correct rotation needs to be written also into JSON file with exported metadata.
    ['bc'] = 90,
    ['da'] = 270,
    ['horizontal (normal)'] = 0,
    ['rotate 90 cw'] = 90,
    ['rotate 180'] = 180,
    ['rotate 270 cw'] = 270,
  }
  local result = orientations[orientation]
  if (result == nil) then result = 0 end
  local isCorrection = (isHorizontal and w < h and result ~= 0) or wasMissing
  local corrections = {
    [0] = 'Horizontal (normal)',
    [90] = 'Rotate 90 cw',
    [180] = 'Rotate 180',
    [270] = 'Rotate 270 cw',
  }
  return result, isCorrection, corrections[result]
end

local function getSensorSize(sensorSizes, photoCropFactor)
  -- 1st item is the sensor size itself, corresponding with the largest photo format available
  local sensor = sensorSizes[1]
  local crop
  -- other items may specify basic crop sizes for different crop factors; search for the photoCropFactor
  for i = 1, #sensorSizes do
    if (sensorSizes[i].cropFactor == photoCropFactor) then crop = sensorSizes[i] end
  end
  -- fallback if exact crop size wasn't found
  if (crop == nil) then crop = sensorSize end
  return sensor, crop
end

local function getOriginalPhotoDimensions(photo)
  local dimensions = photo:getRawMetadata('dimensions')
  return dimensions.width, dimensions.height
end

--[[
Even if the camera didn't save GPS info, it is still possible to add some data manually in Lightroom.
Get the data from Adobe catalog if possible and merge it into the results from Exiftool.
]]--
local function getPhotoGpsPosition(photo)
  local coordinates = photo:getRawMetadata('gps')
  return coordinates
end

local function getPhotoDirection(photo)
  local direction = photo:getRawMetadata('gpsImgDirection')
  return direction
end

local function getKeywordInfo(keyword)
  --[[
  keyword attributes:
  keywordName: (string) The name of the keyword.
  synonyms: (table) The names of synonyms.
  includeOnExport: (Boolean) True to include the keyword when the photo is exported.
  -- ]]
  local attributes = keyword:getAttributes()
  local values = {}
  table.insert(values, attributes.keywordName)
  for _, value in ipairs(attributes.synonyms) do
    table.insert(values, value)
  end
  local parent = keyword:getParent()
  -- string because of simple JSON serialization later
  local key = tostring(keyword.localIdentifier)
  return key, attributes, values, parent
end

local function addKeyword(result, keyword, isHierarchyReqiued)
  local key, attributes, values, parent = getKeywordInfo(keyword)
  -- local name = keyword:getName()
  if (result[key] == nil) then
    result[key] = { includeOnExport = attributes.includeOnExport, values = values }
  end
  if (parent ~= nil and isHierarchyReqiued) then
    local parentKey = addKeyword(result, parent, isHierarchyReqiued)
    result[key]['parent'] = parentKey
  end
  return key
end

local function getPhotoKeywords(photo, isHierarchyReqiued)
  local keywords = photo:getRawMetadata('keywords')
  if (keywords == nil) then
    return nil
  end
  local result = {}
  for i = 1, #keywords do
    local keyword = keywords[i]
    addKeyword(result, keyword, isHierarchyReqiued)
  end
  return result
end

--[[
Extracts largest preview file into dedicated folder.
]]--
function savePreviewFile(photo, metaData, sensorSizes, photoFile, previewFile)
  -- exiftool will not overwrite the target file when extracting preview
  deleteFileIfExists(previewFile, true)
  -- extract preview JPG and save it in selected destination
  if (photo:getRawMetadata('fileFormat') == 'JPG' and getJpegPreviewSetting() == 'original file') then
    -- copy original file instead of extracting a preview when file type is JPEG
    copyFile(photoFile, previewFile, true)
  else
    -- extract preview from original file
    local command = getSavePreviewCommand(photoFile, previewFile)
    executeCommand(command)
  end
  
  -- get used photo crop factor from metadata
  -- this might be problematic due to focal lenghts rounding, use rather the factor specified in metadata
  -- local photoCropFactor = focalLength35mm / focalLength
  local photoCropFactor = metaData.ScaleFactor35efl
  local w, h = getOriginalPhotoDimensions(photo)
  -- exception: Pentax K-1 1:1 crop - reports screwed focal lengths in focalLength35mm
  local isPentaxCrop1to1 = w == h and metaData.Model == "PENTAX K-1 Mark II" or metaData.Model == "PENTAX K-1"
  if (isPentaxCrop1to1) then photoCropFactor = 1 end
  -- get needed sensor info from sensorSizes
  local sensor, crop = getSensorSize(sensorSizes, photoCropFactor)
  local orientationAngle = getOrientationAngle(photo, metaData, w, h)
  
  -- if same as sensor size, exit
  if (w ~= h and sensor.cropFactor == crop.cropFactor and orientationAngle == 0) then return previewFile end
  
  -- TODO: another problem - preview aspect ratio doesn't have to correspond to original image
  -- example: Pentax K-5 has preview stored in JPEGs of size 640 x 480 (1.33 ratio), but ExifImageWidth x ExifImageHeight is 3072 x 2048 (1.5 ratio)
  
  -- adjust preview image canvas size / added black borders to correspond with sensor size and given crop factor
  -- calculating borders in percents to be easily applicable to any so-far-exported preview image size
  -- don't have to account for rotation yet, as both sensorSize & cropSize are returned in horizontal orientation
  -- real crop factor may differ in W vs. H axis, and is not equal to the canonical value in exif usually:
  -- Pentax K-1 example: crop factor W = 7360 / 4800 = 1.53333, H = 4912 / 3200 = 1.535
  -- thus computing real pixel sizes ratios here from the returned info about sensor size & crop size
  local sensorWidth = sensor.pixelSize[1]
  local sensorHeight = sensor.pixelSize[2]
  local cropWidth = crop.pixelSize[1]
  local cropHeight = crop.pixelSize[2]
  -- correction for Pentax K-1 again
  if (isPentaxCrop1to1) then cropWidth = cropHeight end
  -- calculate border width percentages
  local widthPercentage = 100 * (sensorWidth / cropWidth - 1) / 2
  local heightPercentage = 100 * (sensorHeight / cropHeight - 1) / 2
  -- for atypical formats, like panos etc., the above can return negative percentages on which the image magick would fail
  if (heightPercentage < 0 or widthPercentage < 0) then
    if (orientationAngle == 0) then return previewFile end
    heightPercentage = 0
    widthPercentage = 0
  end
  -- swap sizes for vertical rotation
  if (w < h and sensorWidth > sensorHeight) then
    widthPercentage, heightPercentage = heightPercentage, widthPercentage
  end
  
  -- ad the border or rotate image preview
  command = getUpdatePreviewCommand(previewFile, heightPercentage, widthPercentage, orientationAngle)
  executeCommand(command)
  
  return previewFile
end

--[[
Saves metadata file for selected photo. Uses exiftool to extract data from photo first,
then updates the data with additional info and optional corrections from Adobe catalog,
and re-saves the data in JS format for easier loading into local HTML page.
--]]
function saveMetadataFile(photo, photoFile, metadataFile, uniqueName, previewFileName)
  -- extract photo metadata in JSON format into selected destination
  local command = getSaveMetadataFileCommand(photoFile, metadataFile)
  -- exiftool will not overwrite the target file when extracting preview
  if (LrFileUtils.exists(metadataFile) == 'file') then deleteFile(metadataFile) end
  executeCommand(command)
  -- also return the matadata as table
  local result = readJsonFromFile(metadataFile)
  if (result == nil) then
    -- TODO: Proper error handling
    return false
  end
  -- ExifTool exports file data as an array with one item for each file.
  -- TODO: It could be used to export all photos' data at once & probably would be quicker.
  result = result[1]
  -- add specific export data
  result['UniqueName'] = uniqueName
  result['PreviewFileName'] = previewFileName
  -- specific metadata corrections here, like orientation correction for cameras w/o orientation sensor
  local w, h = getOriginalPhotoDimensions(photo)
  local orientationAngle, isCorrection, correctValue = getOrientationAngle(photo, result, w, h)
  result['OrientationAngle'] = orientationAngle
  if (isCorrection) then result['Orientation'] = correctValue end
  -- GPS data from Lightroom catalog
  local gps = getPhotoGpsPosition(photo)
  result['GPS'] = gps
  local direction = getPhotoDirection(photo)
  result['Direction'] = direction
  -- keywords with nested hierarchy
  result['ExportedKeywords'] = getPhotoKeywords(photo, true)
  -- only added keywords w/o parents' hierarchy
  result['Keywords'] = getPhotoKeywords(photo, false)
  -- persistent photo identifier
  result['Uuid'] = photo:getRawMetadata('uuid')
  -- re-save the JSON
  -- TODO: better?
  local content = json.encode(result)
  saveFileContent(metadataFile, content, true)
  -- convert json file to script
  transformJsonFileToJsFile(metadataFile, true)
  return result
end

function exportGenericFiles(exportPath)
  
  LrMobdebug.on()
  
  local copy = function(pathInPlugin, exportFolder, transformations)
    local sourcePath = LrPathUtils.child(_PLUGIN.path, pathInPlugin)
    local folder = exportFolder
    local targetPath = exportPath
    if (folder ~= nill) then targetPath = addPath(exportPath, folder) end
    return copyFolder(sourcePath, targetPath, transformations, true)
  end
  
  local jsFiles = {}
  
  for _, value in ipairs(foldersToCopy) do
    local copiedFiles = copy(value[1], value[2], value[3])
    if (value[3] ~= nil) then
      for _, jsFile in ipairs(copiedFiles) do
        jsFiles[#jsFiles + 1] = jsFile
      end
    end
  end

  return jsFiles
end

function getLastExportedPhotosList(exportedPhotosFile)
  local result = {}
  if (LrFileUtils.exists(exportedPhotosFile) == 'file') then
    result = readJsonFromFile(exportedPhotosFile)
  end
  return result
end

function getExportedPhotosListInfo(exportPath)
  local scriptsFolder = LrPathUtils.child(exportPath, 'scripts')
  local exportedPhotosFile = LrPathUtils.child(scriptsFolder, 'exported-photos.json')
  local exportedScriptsFile = LrPathUtils.child(scriptsFolder, 'exported-scripts.js')
  local exportedPhotos = getLastExportedPhotosList(exportedPhotosFile)
  return exportedPhotosFile, exportedScriptsFile, exportedPhotos
end

function saveExportedScriptsFile(jsFiles, exportedScriptsFile)
  local exportPath = getExportPath()
  local content = ''
  local scripts = {}
  for _, value in ipairs(jsFiles) do
    content = replace(value, LrPathUtils.child(exportPath, 'scripts'), '')
    content = replace(content, '\\', '/')
    if (content:sub(1, 1) == '/') then content = content:sub(2) end
    table.insert(scripts, content)
  end
  content = json.encode(scripts)
  -- convert json data to script
  content = 'const exportedScriptsList = ' .. content .. ';\n'
  saveFileContent(exportedScriptsFile, content, true)
end

function saveExportedPhotosFile(exportedPhotos, exportedPhotosFile, currentPhotoName)
  exportedPhotos = sortAndDeduplicateTable(exportedPhotos)
  -- save JSON file first (can be easily parsed in next export run)
  local content = json.encode(exportedPhotos)
  saveFileContent(exportedPhotosFile, content, true)
  -- convert to JS format & add last selected photo
  local exportedPhotosJsFile = replace(exportedPhotosFile, '.json', '.js')
  content = 'const exportedPhotos = ' .. content .. ';\n'
  if (currentPhotoName ~= nil) then
    currentPhotoName = '"' .. currentPhotoName ..'"'
  else
    currentPhotoName = 'undefined'
  end
  content = content .. 'const lastSelectedPhoto = ' .. currentPhotoName .. ';\n'
  -- add current datetime for the export
  content = content .. "const lastExportDateTime = Date.parse('" .. os.date('%Y-%m-%d %H:%M:%S') .. "');\n"
  saveFileContent(exportedPhotosJsFile, content, true)
end

function saveExportResults(exportedScriptsFile, jsFiles, exportedPhotosFile, exportedPhotos, currentPhotoName)
  saveExportedScriptsFile(jsFiles, exportedScriptsFile)
  saveExportedPhotosFile(exportedPhotos, exportedPhotosFile, currentPhotoName)
  logInfo('Successfully saved export results for ' .. #exportedPhotos .. ' photos.')
end

-- created data & preview filenames look like: {uniqueBaseName}-{extension}-data.js
function getPhotoExportFilePaths(photo, exportPath)
  local photoExportPath = LrPathUtils.child(exportPath, 'photos')
  local photoFileInfo = getPhotoFileInfo(photo)
  local photoFile = photoFileInfo.path
  local fileName = photoFileInfo.name
  local uniqueName = photoFileInfo.uniqueBaseName .. '-' .. photoFileInfo.extension
  local metadataFilePath = LrPathUtils.child(photoExportPath, uniqueName .. '-data.js')
  local previewFileName = uniqueName .. '-preview.jpg'
  local previewFilePath = LrPathUtils.child(photoExportPath, previewFileName)
  return uniqueName, metadataFilePath, previewFilePath, fileName, previewFileName, photoExportPath, photoFile
end

function exportPhoto(photo)
  -- Get export path from plugin preferences. If it wasn't set yet, let the user to select it now.
  local exportPath = getExportPath()
  -- exit when the user cancelled folder selection
  if (exportPath == nil) then return end
  
  local uniqueName, metadataFilePath, previewFilePath, fileName, previewFileName, photoExportPath, photoFile
    = getPhotoExportFilePaths(photo, exportPath)

  -- exit when the photo file is not available on disk
  if (photoExportPath == nil or LrFileUtils.exists(photoFile) ~= 'file') then
    logWarn('Photo file not found:', photoFile)
    return
  end
  
  -- photo-specific files export
  logDebug('Exporting photo', photoFile)
  if (LrFileUtils.exists(photoExportPath) ~= 'directory') then
    LrFileUtils.createDirectory(photoExportPath)
  end
  
  -- when saving metadata file, get the data also as a table
  local metaData = saveMetadataFile(photo, photoFile, metadataFilePath, uniqueName, previewFileName)
  local cameraModel, sensorSizes = getCameraInfo(photo)
  savePreviewFile(photo, metaData, sensorSizes, photoFile, previewFilePath)
  
  logInfo('Successfully exported photo \'' .. photoFile .. '\'.')
  
  return fileName, uniqueName
end
