[Back](../README.md)

# How does it work

Instead of error-prone generation of visual photo information using directly Lightroom UI and LUA dialogs,
this plugin exports a set of scripts, styling, extracted image data and metadata to selected folder
to compose a content of locally accessible HTML page. The exported HTML page will be automatically
shown in default system web browser after each export batch is finished.

The exported data is permanent, so viewable later even when Lightroom is closed. The export is incremental,
original exported files are not being deleted and only if same files are selected on next export,
the exported data for them will be rewritten.

This is a tool for mostly analytical purposes. Thus it works with original preview image data (if available)
and metadata. The corrections / image modifications done in Lightroom are not being considered. That means
that LR crop, rotation, upright corrections etc. will be ignored and the plugin displays the image mostly
in the state when it was taken. This makes it much easier to display focus areas and metering segments
in correct places.

For cameras with more than 1 crop factor option, the cropped area is also being shown as a dark frame.
Examples: For a "full frame" camera photo taken with 1.5x APSC crop, the dark frame will be displayed.
For a "full frame" camera photo taken with 1x factor (no crop), no dark frame is displayed.
For an APSC camera with the possibility of only 1.5x crop factor, no dark frame is displayed.
