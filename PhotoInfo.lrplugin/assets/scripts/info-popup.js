// timeout for info popup fadeout
let infoPopupTimeout;

// permanent DOM references
const infoPopup = document.getElementById('info-popup');

// info popup placements
const horizontal = 'horizontal';
const vertical = 'vertical';

const flippedClass = 'flipped';
let lastPopupInfoAdditionalCssClass;

function calculateInfoPopupPosition(element, placement, additionalCssClass) {
  const minimumSpaceLimit = 100;
  const { bottom: bottom1, left: left1, top: top1, right: right1 } = element.getBoundingClientRect();
  const { bottom: bottom2, left: left2, top: top2, right: right2 } = photoWrapper.getBoundingClientRect();
  let x;
  let y;
  let shouldFlip = false;
  if (placement === vertical) {
    x = left1 + (right1 - left1) / 2;
    y = bottom1;
    if ((bottom2 - bottom1) < minimumSpaceLimit && (top1 - top2) > minimumSpaceLimit) {
      y = top1;
      shouldFlip = true;
    }
  } else {
    x = right1;
    y = top1 + (bottom1 - top1) / 2;
    if ((right2 - right1) < minimumSpaceLimit && (left1 - left2) > minimumSpaceLimit) {
      x = left1;
      shouldFlip = true;
    }
  }
  return { x, y, placement, additionalCssClass, shouldFlip };
}

function showInfoPopup({ content, x, y, placement, additionalCssClass, shouldFlip }) {
  clearTimeout(infoPopupTimeout);
  infoPopup.innerHTML = content;
  if (x !== undefined) {
    infoPopup.style.left = `${Math.round(x)}px`;
  }
  if (y !== undefined) {
    infoPopup.style.top = `${Math.round(y)}px`;
  }
  infoPopup.classList.toggle(activeClass, true);
  if (lastPopupInfoAdditionalCssClass) {
    infoPopup.classList.toggle(lastPopupInfoAdditionalCssClass, false);
    lastPopupInfoAdditionalCssClass = undefined;
  }
  if (additionalCssClass) {
    infoPopup.classList.toggle(additionalCssClass, true);
    lastPopupInfoAdditionalCssClass = additionalCssClass;
  }
  infoPopup.classList.toggle(horizontal, placement === horizontal);
  infoPopup.classList.toggle(vertical, placement === vertical);
  infoPopup.classList.toggle(flippedClass, shouldFlip);
  // TODO: maybe set the timeout from plugin settings?
  infoPopupTimeout = setTimeout(hideInfoPopup, 10000);
}

function hideInfoPopup() {
  clearTimeout(infoPopupTimeout);
  infoPopup.classList.toggle(activeClass, false);
}

function bindInfoPopupEvents(element, onActivate) {
  element.addEventListener('click', onActivate);
  element.addEventListener('focus', onActivate);
  element.addEventListener('mouseover', onActivate);
  element.addEventListener('mouseout', hideInfoPopup);
  element.addEventListener('blur', hideInfoPopup);    
}
