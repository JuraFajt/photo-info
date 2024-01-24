local bind = import 'LrView'.bind
local openUrlInBrowser = import 'LrHttp'.openUrlInBrowser
local prefs = import 'LrPrefs'.prefsForPlugin()
local LrColor = import 'LrColor'
local LrDialogs = import "LrDialogs"
local LrFileUtils = import 'LrFileUtils'
local LrPathUtils = import 'LrPathUtils'
require 'utils'

local enabledLinkColor = LrColor(0, 0.5, 1)
local disabledLinkColor = LrColor(0.5, 0.5, 0.5)

-- long texts used in preferences' UI
local logExistsDescription =
[[Log file created by this plugin is available here:]]

local logDoesNotExistDescription =
[[Log file created by this plugin will be available here:]]

local exportPathDescription =
[[Metadata and previews of selected photos are exported into this folder.
They are accessible from there also for later viewing.]]

local indexExistsDescription =
[[Photos information successfully exported through this plugin is available here:]]

local indexDoesNotExistDescription =
[[Photos information successfully exported through this plugin will be available here:]]

local jpegPreviewFilesDescription =
[[This setting applies only to photo previews for JPEGs files.]]

local jpegPreviewFilesDetails =
[[The proper choice depends on the processing done so far on the original JPEGs.

Non-destructive approach should be preferred in Lightroom and development settings
should be written into catalogue or sidecar XMP files. In this case, using
the original JPEG files should be fine with this plugin.

When destructive updates were saved into the original JPEG file,
it is probably better to resort to the embedded small JPEG preview
usually being stored in original (big) JPEG file (if it wasn't destroyed, too).
It might be quite small though and of a different aspect width to height ratio.
]]

function getExportPath(shouldOpenDialogWhenNotNil)  
  if (prefs.exportPath == nil or shouldOpenDialogWhenNotNil == true) then
    local dialogResult = LrDialogs.runOpenPanel({
      title = 'Select export folder',
      prompt = 'Select',
      canChooseFiles = false,
      canChooseDirectories = true,
      canCreateDirectories = true,
      allowsMultipleSelection = false,
      initialDirectory = prefs.exportPath,
    })
    if (dialogResult ~= nil) then prefs.exportPath = dialogResult[1] end
  end
  return prefs.exportPath
end

function getJpegPreviewSetting()
  -- possible values: 'original file', 'embedded file'
  if (prefs.jpegPreviews == nil) then prefs.jpegPreviews = 'original file' end
  return prefs.jpegPreviews
end

function getIndexPath()
  if (prefs.exportPath == nil) then return nil end
  return LrPathUtils.child(prefs.exportPath, 'index.html')
end 

function doesIndexFileExist()
  local url = getIndexPath()
  return LrFileUtils.exists(url) == 'file'
end

function openIndexFile()
  if (doesIndexFileExist()) then openUrlInBrowser(getIndexPath()) end
end

function generateSectionsForBottomOfDialog(viewFactory, propertyTable)  
  local createLink = function(url)
    local link = viewFactory:static_text {
      title = url,
      text_color = enabledLinkColor,
      mouse_down = function()
        openUrlInBrowser(url)
      end,
    }
    return link
  end
  
  local getLogFilePath = function()
    return LrPathUtils.child(LrPathUtils.getStandardFilePath('documents'), 'PhotoInfoLogger.log')
  end
  
  local doesLogFileExist = function()
    local url = getLogFilePath()
    local result = LrFileUtils.exists(url) == 'file'
    if (prefs.doesLogFileExist ~= result) then prefs.doesLogFileExist = result end
    return result
  end
  
  return {
    {
      title = "Acknowledgements",
      viewFactory:row {
        fill_horizontal = 1,
        viewFactory:column {
          fill_horizontal = 1,
          spacing = viewFactory:control_spacing(),
          viewFactory:static_text {
            font = '<system/bold>',
            title = 'ExifTool',
          },
          viewFactory:static_text {
            title = 'This plugin uses ExifTool by Phil Harvey.',
          }
        },
        createLink('https://exiftool.org'),
      },
      viewFactory:separator {
        fill_horizontal = 1,
      },
      viewFactory:row {
        fill_horizontal = 1,
        viewFactory:column {
          fill_horizontal = 1,
          spacing = viewFactory:control_spacing(),
          viewFactory:static_text {
            font = "<system/bold>",
            title = 'ImageMagick Studio LLC',
          },
          viewFactory:static_text {
            title = 'This plugin uses ImageMagick.',
          }
        },
        createLink('https://imagemagick.org'),
      },
      viewFactory:separator {
        fill_horizontal = 1,
      },
      viewFactory:row {
        fill_horizontal = 1,
        viewFactory:column {
          fill_horizontal = 1,
          spacing = viewFactory:control_spacing(),
          viewFactory:static_text {
            font = "<system/bold>",
            title = 'Leaflet',
          },
          viewFactory:static_text {
            title = 'This plugin uses Leaflet by Volodymyr Agafonkin.',
          }
        },
        createLink('https://leafletjs.com'),
      },
      viewFactory:separator {
        fill_horizontal = 1,
      },
      viewFactory:row {
        fill_horizontal = 1,
        viewFactory:column {
          fill_horizontal = 1,
          spacing = viewFactory:control_spacing(),
          viewFactory:static_text {
            font = "<system/bold>",
            title = 'Leaflet.markercluster',
          },
          viewFactory:static_text {
            title = 'This plugin uses Leaflet.markercluster by Dave Leaver.',
          }
        },
        createLink('https://github.com/Leaflet/Leaflet.markercluster'),
      },
      viewFactory:separator {
        fill_horizontal = 1,
      },
      viewFactory:row {
        fill_horizontal = 1,
        viewFactory:column {
          fill_horizontal = 1,
          spacing = viewFactory:control_spacing(),
          viewFactory:static_text {
            font = "<system/bold>",
            title = 'OpenStreetMap',
          },
          viewFactory:static_text {
            title = 'This plugin uses map data provided by OpenStreetMap contributors.',
          }
        },
        createLink('https://www.openstreetmap.org/copyright'),
      },
      viewFactory:separator {
        fill_horizontal = 1,
      },
      viewFactory:row {
        fill_horizontal = 1,
        viewFactory:column {
          fill_horizontal = 1,
          spacing = viewFactory:control_spacing(),
          viewFactory:static_text {
            font = "<system/bold>",
            title = 'OpenTopoMap',
          },
          viewFactory:static_text {
            title = 'This plugin uses map data provided by OpenTopoMap.',
          }
        },
        createLink('https://opentopomap.org/credits'),
      },
    },
    {
      title = "Logging",
      viewFactory:row {
        bind_to_object = prefs,
        fill_horizontal = 1,
        spacing = viewFactory:control_spacing(),
        viewFactory:column {
          fill_horizontal = 1,
          spacing = viewFactory:control_spacing(),
          viewFactory:row {
            fill_horizontal = 1,
            viewFactory:static_text {
              title = 'Logging level',
            },
            viewFactory:popup_menu {
              value = bind 'loggingLevel',
              items = {
                { title = 'None', value = 0 },
                { title = 'Error', value = 1 },
                { title = 'Warn', value = 2 },
                { title = 'Info', value = 3 },
                { title = 'Debug', value = 4 },
              },
            },
          },
          viewFactory:static_text {
            bind_to_object = prefs,
            fill_horizontal = 1,
            title = bind {
              key = 'doesLogFileExist',
              transform = function(value, fromTable)
                if (doesLogFileExist()) then return logExistsDescription end
                return logDoesNotExistDescription
              end,
            },
          },
          viewFactory:static_text {
            bind_to_object = prefs,
            title = bind {
              key = 'doesLogFileExist',
              transform = function(value, fromTable)
                return getLogFilePath()
              end,
            },
            text_color = bind {
              key = 'doesLogFileExist',
              transform = function(value, fromTable)
                if (doesLogFileExist()) then return enabledLinkColor end
                return disabledLinkColor
              end,
            },
            mouse_down = function()
              if (doesLogFileExist()) then openFileInApp(getLogFilePath()) end
            end,
          },
          viewFactory:push_button {
            action = function()
              LrFileUtils.delete(getLogFilePath())
              prefs.doesLogFileExist = false
            end,
            title = 'Delete log file',
          },
        },
      },
    },
    {
      title = 'Settings',
      viewFactory:row {
        fill_horizontal = 1,
        bind_to_object = prefs,
        viewFactory:column {
          fill_horizontal = 1,
          spacing = viewFactory:control_spacing(),
          
          -- Export Path
          viewFactory:static_text { font = '<system/bold>', title = 'Export Path' },
          viewFactory:static_text { title = exportPathDescription },
          viewFactory:row {
            bind_to_object = prefs,
            viewFactory:edit_field { fill_horizontal = 0.7, value = bind 'exportPath' },
            viewFactory:push_button {
              action = function()
                getExportPath(true)
              end,
              title = 'Select folder',
            },
          },
          viewFactory:static_text {
            bind_to_object = prefs,
            title = bind {
              key = 'exportPath',
              transform = function(value, fromTable)
                if (doesIndexFileExist()) then return indexExistsDescription end
                return indexDoesNotExistDescription
              end,
            },
          },
          viewFactory:static_text {
            bind_to_object = prefs,
            title = bind {
              key = 'exportPath',
              transform = function(value, fromTable)
                return getIndexPath()
              end,
            },
            text_color = bind {
              key = 'exportPath',
              transform = function(value, fromTable)
                if (doesIndexFileExist()) then return enabledLinkColor end
                return disabledLinkColor
              end,
            },
            mouse_down = function()
              if (doesIndexFileExist()) then openUrlInBrowser(getIndexPath()) end
            end,
          },
          
          -- JPEG Preview Files
          viewFactory:separator { fill_horizontal = 1 },
          viewFactory:static_text { font = '<system/bold>', title = 'JPEG Preview Files' },
          viewFactory:static_text { title = jpegPreviewFilesDescription },
          viewFactory:radio_button {
            bind_to_object = prefs,
            value = bind 'jpegPreviews',
            checked_value = 'original file',
            title = 'Use original JPEG files',
          },
          viewFactory:radio_button {
            bind_to_object = prefs,
            value = bind 'jpegPreviews',
            checked_value = 'embedded file',
            title = 'Use embedded JPEG previews',
          },
          viewFactory:static_text { title = jpegPreviewFilesDetails },
        },
      },
    },
  }
end
