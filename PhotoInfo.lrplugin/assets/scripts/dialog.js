const dialog = document.getElementById('dialog');
const dialogHeader = dialog.querySelector('header');
const dialogContent = dialog.querySelector('p');
const firstDialogButton = document.getElementById('first-button');
const secondDialogButton = document.getElementById('second-button');

const defaultCaption = 'Modal Dialog';

let firstDialogButtonAction;
let secondDialogButtonAction;

function closeDialog() {
  dialog.close();
  dialogHeader.innerText = defaultCaption;
  dialogContent.innerText = '';
  firstDialogButton.removeEventListener('click', firstDialogButtonAction);
  secondDialogButton.removeEventListener('click', secondDialogButtonAction);
}

async function showModalDialog({
  caption = defaultCaption,
  firstButtonTitle = 'OK',
  firstButtonActionResult = true,
  prompt = '',
  secondButtonTitle = 'Cancel',
  secondButtonActionResult = false,
}) {
  return new Promise((resolve) => {
    firstDialogButtonAction = () => {
      closeDialog();
      resolve(firstButtonActionResult);
    };
    secondDialogButtonAction = () => {
      closeDialog();
      resolve(secondButtonActionResult);
    };
    dialogHeader.innerText = caption;
    dialogContent.innerText = prompt;
    firstDialogButton.innerText = firstButtonTitle;
    firstDialogButton.addEventListener('click', firstDialogButtonAction);
    secondDialogButton.innerText = secondButtonTitle;
    secondDialogButton.addEventListener('click', secondDialogButtonAction);
    dialog.showModal();
  });
}
