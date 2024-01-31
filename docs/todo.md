[Back](../README.md)

# TODOs, Improvement Suggestions

## Application features

- CUZK orthophoto map - usage conditions?
    - tile URL looks like this, max zoom seems to be 18, seems to be loaded via ESRI JS viewer, 
        https://ags.cuzk.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer/WMTS/tile/1.0.0/ORTOFOTO_WM/default/default028mm/17/44666/71826
        https://ags.cuzk.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer/WMTS/tile/1.0.0/ORTOFOTO_WM/default/default028mm/{z}/{x}/{y}
    - probably can be loaded via https://www.npmjs.com/package/esri-leaflet this way
        <script src="https://unpkg.com/esri-leaflet@3.0.10/dist/esri-leaflet.js"></script>
        L.esri.tiledMapLayer({
            url: 'https://ags.cuzk.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer'
        }).addTo(map);
- Contrast AF detection for Pentax K-1.
    - sensor 36.4 MP Sony IMX094 Exmor
- Switching between phase & contrast detection AF visualization automatically
- Metering info for live view now showing 0 LV values.
- Metering iso-zones visualization with adjustable colors scale.
- Phase, contrast AF, metering segments for other brands (ongoing for later).

- Command line tool exporting the same functionality directly from photo files w/o Lightroom?
- Win App doing the same visually? Or a PWA?

## Application UI
- Have FOV info presented somewhere visually.
- Maybe let the SVGs for heading angle, orientation angle, pitch angle overlap in the whitespace part, thus placing them on 1 row doesn't take up so much space? Labels for the values can be below them. FOV part of same icons, maybe even adjustable visually to correct angle?

## Documentation
- More remarks about the Pentax metering segments variants, that they actually scaled/reused mostly same shapes
configuration for several models.
- Mention resources/authors found on web and also the other plugins which inspired this.
