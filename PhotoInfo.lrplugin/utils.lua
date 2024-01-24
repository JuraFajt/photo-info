local LrErrors = import 'LrErrors'
local LrProgressScope = import 'LrProgressScope'
local LrShell = import "LrShell"
local LrTasks = import 'LrTasks'
require 'logger'

--[[
Splits a string into substrings separated by separator.
Returns nil or resulting table of substrings.
--]]
function split(original, separator)
  if original == nil then return nil end
  local result = {}
  for found in string.gmatch(original, '([^' .. separator .. ']+)') do
    table.insert(result, found)
  end
  return result
end

--[[
Opens a file with system-associated application for given file extension.
--]]
function openFileInApp(filename)
  if WIN_ENV then
    LrShell.openFilesInApp({''}, filename)
  else
    LrShell.openFilesInApp({filename}, 'open')
  end
end

function executeCommand(command)
  logDebug('Executing command:\n', command) 
  local exitCode = LrTasks.execute('"' .. command .. '"')
  if exitCode ~= 0 then
    local errorMessage = 'Error calling command: ' .. command .. ', exitCode: ' .. exitCode
    logError(errorMessage) 
    LrErrors.throwUserError(errorMessage)
  end
end

function escapeSpecialChars(text)
  local magic = '^$()%.[]*+-?)'
  local result = text
  for i = 1, #magic do
    local c = magic:sub(i, i)
    result = result:gsub('%' .. c, '%%' .. c)
  end
  return result
end

function replace(text, findText, replacement)
  return text:gsub(escapeSpecialChars(findText), replacement)
end

function formatTemplate(template, values)
  if (template == nil) then return '' end
  if (values == nil) then return template end
  local result = template
  for key, value in pairs(values) do
    if (value ~= nil) then result = replace(result, '{' .. key .. '}', value) end
  end
  return result
end

function sortAndDeduplicateTable(original)
  table.sort(original)
  local result = {}
  local temp = {}
  for _, value in ipairs(original) do
    if (value ~= nil and not temp[value]) then
      table.insert(result, value)
      temp[value] = true
    end
  end
  return result
end

function updateProgress(progressScope, progressValues)
  progressScope:setCaption(formatTemplate(progressValues.template, progressValues))
  progressScope:setPortionComplete(progressValues.complete / progressValues.totalSteps)
end

function completeProgressStep(progressScope, progressValues)
  progressValues.complete = progressValues.current
  updateProgress(progressScope, progressValues)
end

function setupProgress(progressValues)
  local progressScope = LrProgressScope({ title  = progressValues.title })
  updateProgress(progressScope, progressValues)
  return progressScope
end

function removeTableItemByKey(sourceTable, key)
  local element = sourceTable[key]
  sourceTable[key] = nil
  return element
end

function removeTableItemByValue(sourceTable, value)
  for i, v in ipairs (sourceTable) do 
      if (v == value) then
        table.remove(sourceTable, i)
        return
      end
  end
end
