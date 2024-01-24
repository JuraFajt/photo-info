local LrFileUtils = import 'LrFileUtils'
local LrPathUtils = import 'LrPathUtils'
local json = require 'json'
require 'utils'

--[[
Similar to what LrPathUtils.child() does, but for multiple added subpath levels
separated by slash '/'.

originalPath - already platform-specific path

slashSeparatedPathBeingAdded - added path string with possible multiple directories in it
separated by slashes, not optimized for current platform yet

Returns platform-specific concatenated path.
]]--
function addPath(originalPath, slashSeparatedPathBeingAdded)
  local result = originalPath
  local parts = split(slashSeparatedPathBeingAdded, '/')
  for i = 1, #parts do
    result = LrPathUtils.child(result, parts[i])
  end
  return result
end

function deleteFile(filePath)
  if filePath == nil then return end
  local resultOK, errorMessage  = LrFileUtils.delete(filePath)
  if errorMessage ~= nil then
    errorMessage = 'Deleting of file "' .. filePath .. '" failed: ' .. errorMessage
    logError(errorMessage)
    LrErrors.throwUserError(errorMessage)
  end
end

function deleteFileIfExists(filePath, isOverwriteAllowed)
  if (LrFileUtils.exists(filePath) == 'file' and isOverwriteAllowed) then deleteFile(filePath) end
end

function copyFile(sourcePath, targetPath, isOverwriteAllowed)
  -- create the new folders first, otherwise the LrFileUtils.copy fails
  -- if the file is not omitted, a folder with that name would be created
  LrFileUtils.createAllDirectories(LrPathUtils.parent(targetPath))
  -- LrFileUtils.copy will not overwrite the target file
  deleteFileIfExists(targetPath, isOverwriteAllowed)
  LrFileUtils.copy(sourcePath, targetPath)
  logDebug('Copied file from', sourcePath, 'to', targetPath)
end

--[[
Saves textual data into specified file. Optionally overwrites existing file w/o asking the user for now.
]]--
function saveFileContent(targetPath, content, isOverwriteAllowed)
  -- create the new folders first, not sure the IO fails if part of the path doesn't exist yet though
  -- if the file is not omitted, a folder with that name would be created
  LrFileUtils.createAllDirectories(LrPathUtils.parent(targetPath))
  -- IO will not overwrite the target file
  deleteFileIfExists(targetPath, isOverwriteAllowed)
  -- the IO stuff causes doubled line ends on windows
  local c = string.gsub(content, '\r\n', '\n')
  local file = assert(io.open(targetPath, 'w'))
  file:write(c)
  file:close()
  logDebug('Saved file content to', targetPath)
end

--[[
Converts JSON file to JS script via wrapping the JSON content into a callback.
Something similar to JSONP, as the exported JSON data needs to be included
in generated HTML page markup as old-style script (no ES modules, no dynamic loading
because of local HTML CORS security limitations).

The callback() function defined in assets/scripts/data-loader.js script makes
the loaded data available in index.html page at runtime.
]]--
function transformJsonFileToJsFile(filePath, shouldRemoveOriginal, outputFilePath)
  local data = LrFileUtils.readFile(filePath)
  data = 'callback(' .. data .. ');'
  local targetFile = outputFilePath
  if (targetFile == nil) then targetFile = LrPathUtils.replaceExtension(filePath, 'js') end
  if (shouldRemoveOriginal) then deleteFile(filePath) end
  saveFileContent(targetFile, data)
  return targetFile
end

function readJsonFromFile(filename)
  if (LrFileUtils.exists(filename) ~= 'file') then return nil end
  local data = LrFileUtils.readFile(filename)
  local result = nil
  if (data ~= nil) then result = json.decode(data) end
  return result, data
end

function copyFolder(sourcePath, targetPath, transformations, isOverwriteAllowed)
  if (LrFileUtils.exists(sourcePath) ~= 'directory') then
    LrErrors.throwUserError('Source folder does not exist. ' .. sourcePath)
  end
  local copiedFiles = {}
  for filePath in LrFileUtils.recursiveFiles(sourcePath) do
    local extension = LrPathUtils.extension(filePath)
    local copyPath = filePath:gsub(escapeSpecialChars(sourcePath), targetPath)
    copyFile(filePath, copyPath, isOverwriteAllowed)
    -- transform the target file if needed
    if (extension == 'json' and transformations) then
      copyPath = transformJsonFileToJsFile(copyPath, true)
    end
    copiedFiles[#copiedFiles + 1] = copyPath
  end
  return copiedFiles
end

function getPhotoFileInfo(photo)
  if photo == nil then return end
  local path = photo:getRawMetadata('path')
  local result = {}
  result.path = path
  result.folder = LrPathUtils.parent(path)
  result.name = LrPathUtils.leafName(path)
  local nameInfo = split(result.name, '.')
  result.baseName = nameInfo[1]
  if (nameInfo[2] == nil) then nameInfo[2] = '' end
  result.extension = nameInfo[2]
  local id = photo.localIdentifier
  result.uniqueName = id .. '-' .. result.name
  result.uniqueBaseName = id .. '-' .. result.baseName
  return result
end
