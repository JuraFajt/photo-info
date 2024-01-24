function getScale() {
  const imageSize = get2DValue(lastPhotoData[`ImageSize`]);
  const scaleFactor = 2 / imageSize.x;
  const scale = { x: imageSize.x * scaleFactor, y: imageSize.y * scaleFactor };
  return scale;
}

/*
Example data 1:
IMGP7841.DNG 979211
Face1Position	365 252
Face1Size	55 55
Face2Position	429 251
Face2Size	48 48
FaceDetect	On (16 faces max); 2 faces detected
FaceDetectFrameSize	720 480
FacePosition	50 52 - TODO: What is this for?
FacesDetected	2

Example data 2:
IMGP4859.DNG 979165
FaceDetect	On (16 faces max); 0 faces detected; 1
FaceDetectFrameSize	720 480
FacePosition	0 0
FacesDetected	0
*/
function getPentaxFaceDetectionInfo(frameSize) {
  const result = {};
  const { FacesDetected: facesDetected = '0' } = lastPhotoData;
  const count = Number(facesDetected);
  if (!count) return result;
  const scale = getScale();
  for (let i = 1; i <= count; i++) {
    const position = get2DValue(lastPhotoData[`Face${i}Position`]);
    const size = get2DValue(lastPhotoData[`Face${i}Size`]);   
    const x = (position.x / frameSize.x - 0.5) * scale.x;
    const y = (position.y / frameSize.y - 0.5) * scale.y;
    const width = size.x / frameSize.x * scale.x;
    const height = size.y / frameSize.y * scale.y;
    if (width && height) {
      result[`Face ${i}`] = {
        position: { x, y },
        size: { x: width, y: height },
        displaySize: `${size.x}×${size.y}`,
        isFace: true,
      };
    }
  }
  return result;
}

/*
For these contrast AF modes only showing the whole selected AF area, as the detailed info about
focused areas is probably part of unknown Pentax matadata tags:
'Automatic Tracking AF', 'Fixed Center', 'AF Select'.
TODO: Explore changing data manually when focused & not focused (and also metering with white / black
areas in photo).
*/
function getPentaxContrastDetectionInfo(frameSize) {
  const result = {};
  // 'ContrastDetectAFArea': '160 132 400 216' (5x3 cells selected on Pentax K-1, cell size: 80x72)
  // 'ContrastDetectAFArea': '80 60 560 360' (7x5 cells selected on Pentax K-1, max possible area,
  // Y position starts at 60; 60 + 72 = 132 -> corresponds with 5x3 cells Y position)
  const [x1, y1, w, h] = (lastPhotoData['ContrastDetectAFArea'] || '').split(' ').map((item) => Number(item));
  if (isNaN(x1)) return result;
  const scale = getScale();
  const x = ((x1 + 0.5 * w) / frameSize.x - 0.5) * scale.x;
  const y = ((y1 + 0.5 * h) / frameSize.y - 0.5) * scale.y;
  const width = w / frameSize.x * scale.x;
  const height = h / frameSize.y * scale.y;
  if (width && height) {
    result[`Contrast Detect AF Area`] = {
      position: { x, y },
      size: { x: width, y: height },
      displaySize: `${w}×${h}`,
      isContrastArea: true,
    };
  }
  return result;
}

function getPentaxContrastAutoFocusInfo() {
  // list of resulting AF points, if any
  let result = {};
  // 'AFPointSelected': 'Face Detect AF; Single Point'
  const [ contrastAfMode ] = (lastPhotoData['AFPointSelected'] || '').split(';');
  // 'FaceDetectFrameSize': '720 480'
  /* TODO: Move to some docs.
  For Pentax K-5 and Pentax K-1, this seems to be 720x480. Seems to describe spread of contrast AF
  area units per whole sensor (720 corresponds to whole sensor width). K-1 can has more setup
  options and can select the contrast AF area based on 7x5 cells grid. Each cell is 80x72 CAF units.
  Whole area corresponds to 9x7 cells grid (mostly), but 1-cell border area cannot be selected, thus 7x5 cells.
  So max selectable area corresponds to (7*80)x(5*72) = 560x360. Whole sensor would be
  (9*80)x(7*72) = 720x504, but narrowed down to 720x480.
  
  There might be similar setting as FaceDetectFrameSize for those CAF modes where FaceDetectFrameSize is '0 0'.
  Pentax K-5 seems to have the '0 0' value for FaceDetectFrameSize in other modes than face detection,
  but recalculation of the data returned in ContrastDetectAFArea still works with same 720x480 frame size.
  
  Size of CAF areas seems also to scale with crop factor on Pentax K-1. 1.5x crop looks to have cells 52x cca 46.
  TODO: test more
  */
  let frameSize = get2DValue(lastPhotoData['FaceDetectFrameSize'] || '0 0');
  if (frameSize.x === 0) frameSize = get2DValue(lastCameraData?.contrastDetectionFrameSize || '0 0');
  if (contrastAfMode === 'Face Detect AF') {
    result = getPentaxFaceDetectionInfo(frameSize);
  } else {
    result = getPentaxContrastDetectionInfo(frameSize);
  }
  return result;
}
