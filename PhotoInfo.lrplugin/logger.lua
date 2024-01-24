local prefs = import 'LrPrefs'.prefsForPlugin()
local LrLogger = import 'LrLogger'
local logger = LrLogger('PhotoInfoLogger')

-- With the 'logfile' value, the output of this logger will be written into PhotoInfoLogger.log file.
-- On Windows, the path to the file is something like c:\Users\{user name}\Documents\PhotoInfoLogger.log.
-- On Mac, the file is written into similar ~/Documents folder.
logger:enable('logfile')

local level = {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

function logDebug(...)
  doLog(level.DEBUG, unpack(arg))
end

function logInfo(...)
  doLog(level.INFO, unpack(arg))
end

function logWarn(...)
  doLog(level.WARN, unpack(arg))
end

function logError(...)
  doLog(level.ERROR, unpack(arg))
end

function doLog(messageLevel, ...)
  local prefsLevel = prefs.loggingLevel
  if prefsLevel == nil then prefsLevel = level.NONE end
  if (prefsLevel == level.NONE or messageLevel > prefsLevel) then return end
  if messageLevel == level.ERROR then
    logger:error(unpack(arg))
  elseif messageLevel == level.WARN then
    logger:warn(unpack(arg))
  elseif messageLevel == level.INFO then
    logger:info(unpack(arg))
  else
    logger:debug(unpack(arg))
  end
end
