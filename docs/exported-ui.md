[Back](../README.md)

# Displaying exported data

![Exported page screenshot](images/exported-02.jpg)

## 1. Filmstrip Panel

- Can be toggled with <img src="images/exported-toggle-filmstrip.png" width="25" style="position: relative; top:8px" /> button in the top left page corner.

- Displays the list of exported photos.

- Hovering a particular image in the strip displays tooltip with some basic information about the photo.

- Clicking the photo thumbnail will select it for displaying in the main area.

## 2. Main Photo Area

- Displays the currently selected photo in scaled or actual 1:1 size mode. 

- Switching the mode is done with <img src="images/exported-toggle-full-size.png" width="25" style="position: relative; top:8px" /> button.

- In the actual size mode, image overlays are disabled and the image panning is possible.

- In the scaled size mode, image overlays for `focus areas` and `metering segments` can be displayed. Hovering the particular UI element will display a tooltip with more information.

- `Focus areas` are displayed with <img src="images/exported-toggle-focus-areas.png" width="25" style="position: relative; top:8px" /> button.

- `Metering segments` are displayed with <img src="images/exported-toggle-metering-segments.png" width="25" style="position: relative; top:8px" /> button.

- Both focus areas & metering segments overlays can be toggled between normal, hightlighted and no display states.

## 3. Metadata Panel

- Can be toggled with <img src="images/exported-toggle-metadata.png" width="25" style="position: relative; top:8px" /> button in the top right corner.

- Displays exported metadata for the selected photo, optionally filtered by currently selected filter.

- Metadata can be exported to a file.

- Particular cell content in the metadata table can be copied to clipboard by clicking the cell with the mouse.

## 4. Map Panel

- Can be toggled with <img src="images/exported-toggle-map.png" width="25" style="position: relative; top:8px" /> button in the bottom right corner.

- Displays selected photo location with location-related data in a map.

- The <img src="images/exported-toggle-map-variant.png" width="25" style="position: relative; top:8px" /> button toggles between OpenStreetMap and OpenTopoMap tile variants.

- The <img src="images/exported-toggle-full-size.png" width="25" style="position: relative; top:8px" /> button toggles between small and expanded map view.

- Photos are represented by small camera icons. Those can be directional & properly oriented in the map if needed data is available. 

- If there are multiple photos close to one location, the corresponding icons might be grouped into clusters. Clicking the cluster will expand it into a "spider" and the particular photo icons can then be selected.

- Selecting the photo icon in map will display a tooltip with additional location and orientation data.

    ![Toggle map tooltip](images/exported-map-tooltip.jpg)

- Clicking the thumbnail in the tooltip will select the particular photo for displaying detailed info in the main area.

- Clicking a particular data cell in the tooltip table will copy its content into clipboard.

- Clicking one of the links at the bottom of the tooltip will open the location in the corresponding map provider.


---
[Back](../README.md)
