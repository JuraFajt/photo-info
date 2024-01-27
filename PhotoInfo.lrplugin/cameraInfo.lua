local LrErrors = import 'LrErrors'
local LrFileUtils = import 'LrFileUtils'
-- local LrMobdebug = import "LrMobdebug"
local LrPathUtils = import 'LrPathUtils'
local json = require 'json'
require 'fileUtils'
require 'utils'

-- LrMobdebug.start()

local duplicates

local function getFileName(filename)
  local file = LrPathUtils.child(_PLUGIN.path, 'camera-info')
  file = LrPathUtils.child(file, filename)
  -- replace special character. '*' is an invalid char on windows file systems
  return string.gsub(file, '*', '')
end

--[[
To correctly work with crop modes, the sensor size info is needed.
--]]
local function getSensorSizes(cameraModel)
  local fileName = getFileName(cameraModel .. '.json')
  local info = readJsonFromFile(fileName)
  if (info == nil) then
    LrErrors.throwUserError('Couldn\'t get sensor size info from: \n' .. fileName)
  else
    return info.sensor
  end
end

local function getCameraDuplicates()
  if (duplicates ~= nil) then return duplicates end 
  local fileName = getFileName('duplicated camera settings.json')
  local info = readJsonFromFile(fileName)
  if (info == nil) then
    LrErrors.throwUserError('Couldn\'t read duplicated cameras info from: \n' .. fileName)
  else
    duplicates = info.duplicatedCameraSettings
    return duplicates
  end
end

local function getCameraModel(photo)
  local cameraModel = photo:getFormattedMetadata('cameraModel')
  if (cameraModel == nil) then
    LrErrors.throwUserError('Camera model metadata was not found.')
  end
  cameraModel = string.lower(cameraModel)
  -- some cameras have the same configuration as other camera
  local cameraDuplicates = getCameraDuplicates()
  local duplicateModel = cameraDuplicates[cameraModel]
  if (duplicateModel ~= nil) then
    cameraModel = duplicateModel
  end
  return cameraModel
end

function getCameraInfo(photo)
  local cameraModel = getCameraModel(photo)
  local sensorSizes = getSensorSizes(cameraModel)
  return cameraModel, sensorSizes
end
