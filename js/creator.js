(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);

  const list = $('#pairList');
  const template = $('#pairTemplate');

  const previewButton = $('#previewButton');
  const previewModal = $('#previewModal');
  const previewBackdrop = $('#previewBackdrop');
  const closePreview = $('#closePreview');
  const closePreviewButton = $('#closePreviewButton');
  const previewRoot = $('#previewRoot');

  let pairs = [];
  let lastFocusedElement = null;

  function newPair(left = '', right = '') {
    return {
      id: MatchingCore.uid(),
      left: {
        text: left,
        image: '',
        alt: ''
      },
      right: {
        text: right,
        image: '',
        alt: ''
      }
    };
  }

  function initialise() {
    if (!window.MatchingCore) {
      console.error('MatchingCore is not loaded.');
      alert('The matching activity engine could not be loaded.');
      return;
    }

    if (!list) {
      console.error('The element #pairList was not found.');
      return;
    }

    if (!template || !template.content.firstElementChild) {
      console.error('The template #pairTemplate was not found or is empty.');
      return;
    }

    bind();

    pairs = [
      newPair('Smeagol', 'Gollum'),
      newPair('Frodo', 'Mr. Underhill'),
      newPair('Gandalf', 'Mithrandir')
    ];

    renderPairs();
  }

  function bind() {
    const addPairButton = $('#addPair');

    if (addPairButton) {
      addPairButton.addEventListener('click', addPair);
    }

    if (previewButton) {
      previewButton.addEventListener('click', openPreview);
    }

    if (previewBackdrop) {
      previewBackdrop.addEventListener('click', closePreviewModal);
    }

    if (closePreview) {
      closePreview.addEventListener('click', closePreviewModal);
    }

    if (closePreviewButton) {
      closePreviewButton.addEventListener('click', closePreviewModal);
    }

    const saveDraftButton = $('#saveDraft');

    if (saveDraftButton) {
      saveDraftButton.addEventListener('click', saveDraft);
    }

    const loadDraftButton = $('#loadDraft');

    if (loadDraftButton) {
      loadDraftButton.addEventListener('click', loadDraft);
    }

    const downloadJsonButton = $('#downloadJson');

    if (downloadJsonButton) {
      downloadJsonButton.addEventListener('click', () => {
        MatchingExport.downloadJson(collect());
      });
    }

    const downloadHtmlButton = $('#downloadHtml');

    if (downloadHtmlButton) {
      downloadHtmlButton.addEventListener('click', downloadHtml);
    }

    const importJsonInput = $('#importJson');

    if (importJsonInput) {
      importJsonInput.addEventListener('change', importJson);
    }

    const makeLinkButton = $('#makeLink');

    if (makeLinkButton) {
      makeLinkButton.addEventListener('click', makeLink);
    }

    document.addEventListener('keydown', handleModalKeydown);
  }

  function addPair() {
    pairs.push(newPair());
    renderPairs();

    const newestPair = list.lastElementChild;

    if (!newestPair) {
      return;
    }

    newestPair.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    const firstInput = newestPair.querySelector('.left-text');

    if (firstInput) {
      window.setTimeout(() => {
        firstInput.focus();
      }, 300);
    }
  }

  function renderPairs() {
    list.innerHTML = '';

    pairs.forEach((pair, index) => {
      const node = template.content.firstElementChild.cloneNode(true);

      node.dataset.index = index;

      const pairNumber = node.querySelector('.pair-number');

      if (pairNumber) {
        pairNumber.textContent = `Pair ${index + 1}`;
      }

      setSide(node, 'left', pair.left);
      setSide(node, 'right', pair.right);

      bindSideEvents(node, pair, 'left');
      bindSideEvents(node, pair, 'right');

      const deleteButton = node.querySelector('.delete-pair');

      if (deleteButton) {
        deleteButton.addEventListener('click', () => {
          deletePair(index);
        });
      }

      const moveUpButton = node.querySelector('.move-up');

      if (moveUpButton) {
        moveUpButton.disabled = index === 0;

        moveUpButton.addEventListener('click', () => {
          move(index, index - 1);
        });
      }

      const moveDownButton = node.querySelector('.move-down');

      if (moveDownButton) {
        moveDownButton.disabled = index === pairs.length - 1;

        moveDownButton.addEventListener('click', () => {
          move(index, index + 1);
        });
      }



      list.appendChild(node);
    });
  }

  function bindSideEvents(node, pair, side) {
    const textInput = node.querySelector(`.${side}-text`);
    const altInput = node.querySelector(`.${side}-alt`);
    const imageInput = node.querySelector(`.${side}-image`);
    const removeImageButton = node.querySelector(
      `.remove-${side}-image`
    );

    if (textInput) {
      textInput.addEventListener('input', (event) => {
        pair[side].text = event.target.value;
      });
    }

    if (altInput) {
      altInput.addEventListener('input', (event) => {
        pair[side].alt = event.target.value;
      });
    }

    if (imageInput) {
      imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];

        readImage(file, (data) => {
          pair[side].image = data;
          renderPairs();
        });
      });
    }

    if (removeImageButton) {
      removeImageButton.addEventListener('click', () => {
        pair[side].image = '';
        renderPairs();
      });
    }
  }

  function setSide(node, side, data) {
    const textInput = node.querySelector(`.${side}-text`);
    const altInput = node.querySelector(`.${side}-alt`);
    const image = node.querySelector(`.${side}-preview`);
    const removeButton = node.querySelector(
      `.remove-${side}-image`
    );

    if (textInput) {
      textInput.value = data.text || '';
    }

    if (altInput) {
      altInput.value = data.alt || '';
    }

    if (!image || !removeButton) {
      return;
    }

    if (data.image) {
      image.src = data.image;
      image.alt =
        data.alt ||
        data.text ||
        `${side} item preview`;

      image.hidden = false;
      removeButton.hidden = false;
    } else {
      image.removeAttribute('src');
      image.alt = '';
      image.hidden = true;
      removeButton.hidden = true;
    }
  }

  function deletePair(index) {
    if (pairs.length <= 2) {
      alert('An activity needs at least two pairs.');
      return;
    }

    pairs.splice(index, 1);
    renderPairs();
  }

  function move(from, to) {
    if (
      from < 0 ||
      from >= pairs.length ||
      to < 0 ||
      to >= pairs.length
    ) {
      return;
    }

    const [pair] = pairs.splice(from, 1);

    pairs.splice(to, 0, pair);
    renderPairs();
  }

  function readImage(file, done) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }

    const maximumSize = 3 * 1024 * 1024;

    if (
      file.size > maximumSize &&
      !window.confirm(
        'This image is larger than 3 MB. It may make the exported file very large. Continue?'
      )
    ) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      done(reader.result);
    };

    reader.onerror = () => {
      alert('The image could not be read.');
    };

    reader.readAsDataURL(file);
  }

  function collect() {
    const feedbackInput = document.querySelector(
      'input[name="feedbackMode"]:checked'
    );

    return MatchingCore.normaliseActivity({
      title: $('#activityTitle')
        ? $('#activityTitle').value
        : '',

      instructions: $('#instructions')
        ? $('#instructions').value
        : '',

      feedbackMode: feedbackInput
        ? feedbackInput.value
        : 'end',

      allowRetry: $('#allowRetry')
        ? $('#allowRetry').checked
        : true,

      allowSolution: $('#allowSolution')
        ? $('#allowSolution').checked
        : true,

      pairs
    });
  }

  function validateActivity(activity) {
    if (activity.pairs.length < 2) {
      alert(
        'Add at least two complete matching pairs before continuing.'
      );

      return false;
    }

    return true;
  }

  function apply(activity) {
    const normalised =
      MatchingCore.normaliseActivity(activity);

    if (normalised.pairs.length < 2) {
      alert(
        'The activity must contain at least two complete pairs.'
      );

      return;
    }

    const titleInput = $('#activityTitle');
    const instructionsInput = $('#instructions');
    const allowRetryInput = $('#allowRetry');
    const allowSolutionInput = $('#allowSolution');

    if (titleInput) {
      titleInput.value = normalised.title;
    }

    if (instructionsInput) {
      instructionsInput.value =
        normalised.instructions;
    }

    const feedbackInput = document.querySelector(
      `input[name="feedbackMode"][value="${normalised.feedbackMode}"]`
    );

    if (feedbackInput) {
      feedbackInput.checked = true;
    }

    if (allowRetryInput) {
      allowRetryInput.checked =
        normalised.allowRetry;
    }

    if (allowSolutionInput) {
      allowSolutionInput.checked =
        normalised.allowSolution;
    }

    pairs = normalised.pairs;
    renderPairs();
  }

  function saveDraft() {
    const activity = collect();

    MatchingStorage.save(activity);

    alert('Draft saved in this browser.');
  }

  function loadDraft() {
    const activity = MatchingStorage.load();

    if (!activity) {
      alert('No saved draft was found.');
      return;
    }

    apply(activity);
  }

  function importJson(event) {
    const file = event.target.files[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const activity = JSON.parse(reader.result);
        apply(activity);
      } catch (error) {
        console.error(error);

        alert(
          'This is not a valid matching activity JSON file.'
        );
      }
    };

    reader.onerror = () => {
      alert('The file could not be read.');
    };

    reader.readAsText(file);
  }

  function openPreview() {
    const activity = collect();

    if (!validateActivity(activity)) {
      return;
    }

    if (!previewModal || !previewRoot) {
      console.error(
        'The preview modal elements were not found.'
      );

      return;
    }

    lastFocusedElement = document.activeElement;

    previewRoot.innerHTML = '';

    new MatchingPlayer(previewRoot, activity);

    previewModal.hidden = false;

    window.requestAnimationFrame(() => {
      previewModal.classList.add('is-open');
      document.body.classList.add('modal-open');

      if (closePreview) {
        closePreview.focus();
      }
    });
  }

  function closePreviewModal() {
    if (
      !previewModal ||
      previewModal.hidden
    ) {
      return;
    }

    previewModal.classList.remove('is-open');
    document.body.classList.remove('modal-open');

    window.setTimeout(() => {
      previewModal.hidden = true;
      previewRoot.innerHTML = '';

      if (
        lastFocusedElement &&
        typeof lastFocusedElement.focus === 'function'
      ) {
        lastFocusedElement.focus();
      }
    }, 180);
  }

  function handleModalKeydown(event) {
    if (
      !previewModal ||
      previewModal.hidden ||
      !previewModal.classList.contains('is-open')
    ) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closePreviewModal();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements =
      previewModal.querySelectorAll(
        [
          'button:not([disabled])',
          'a[href]',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])'
        ].join(',')
      );

    if (!focusableElements.length) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement =
      focusableElements[focusableElements.length - 1];

    if (
      event.shiftKey &&
      document.activeElement === firstElement
    ) {
      event.preventDefault();
      lastElement.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === lastElement
    ) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  async function downloadHtml() {
    const activity = collect();

    if (!validateActivity(activity)) {
      return;
    }

    try {
      await MatchingExport.downloadHtml(activity);
    } catch (error) {
      console.error(error);

      alert(
        'The standalone file could not be created. Open the creator through GitHub Pages or a local web server, then try again.'
      );
    }
  }

  function makeLink() {
    const activity = collect();

    if (!validateActivity(activity)) {
      return;
    }

    const url = MatchingExport.shareUrl(activity);

    const shareLink = $('#shareLink');
    const embedCode = $('#embedCode');
    const qr = $('#qrImage');
    const notice = $('#shareNotice');

    if (shareLink) {
      shareLink.value = url;
    }

    if (embedCode) {
      const safeTitle = activity.title.replace(
        /"/g,
        '&quot;'
      );

      embedCode.value =
        `<iframe src="${url}" ` +
        `title="${safeTitle}" ` +
        `width="100%" ` +
        `height="720" ` +
        `style="border:0" ` +
        `loading="lazy"></iframe>`;
    }

    if (!qr || !notice) {
      return;
    }

    if (url.length > 7000) {
      qr.hidden = true;
      qr.removeAttribute('src');

      notice.textContent =
        'This activity is too large for a reliable share link. Download the standalone HTML file, upload it, and make a QR code from the hosted address.';
    } else {
      qr.src =
        'https://api.qrserver.com/v1/create-qr-code/' +
        `?size=420x420&data=${encodeURIComponent(url)}`;

      qr.hidden = false;

      notice.textContent =
        'The QR preview uses an online QR service. Text-only activities create the most reliable share links.';
    }
  }

  document.addEventListener(
    'DOMContentLoaded',
    initialise
  );
}());
