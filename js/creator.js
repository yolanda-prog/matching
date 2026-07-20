(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const list = $('#pairList');
  const template = $('#pairTemplate');
  let pairs = [];
  let dragIndex = null;

  function newPair(left = '', right = '') {
    return {
      id: MatchingCore.uid(),
      left: { text: left, image: '', alt: '' },
      right: { text: right, image: '', alt: '' }
    };
  }

  function initialise() {
    pairs = [newPair('Smeagol', 'Gollum'), newPair('Frodo', 'Mr. Underhill'), newPair('Gandalf', 'Mithrandir')];
    renderPairs();
    bind();
    preview();
  }

  function bind() {
    ['#activityTitle', '#instructions', '#allowRetry', '#allowSolution'].forEach((selector) => $(selector).addEventListener('input', preview));
    document.querySelectorAll('input[name="feedbackMode"]').forEach((input) => input.addEventListener('change', preview));
    $('#addPair').addEventListener('click', () => { pairs.push(newPair()); renderPairs(); preview(); });
    $('#previewButton').addEventListener('click', preview);
    $('#saveDraft').addEventListener('click', () => { MatchingStorage.save(collect()); alert('Draft saved in this browser.'); });
    $('#loadDraft').addEventListener('click', () => {
      const activity = MatchingStorage.load();
      if (!activity) { alert('No saved draft was found.'); return; }
      apply(activity);
    });
    $('#downloadJson').addEventListener('click', () => MatchingExport.downloadJson(collect()));
    $('#downloadHtml').addEventListener('click', async () => {
      try {
        await MatchingExport.downloadHtml(collect());
      } catch (error) {
        alert('The standalone file could not be created. Open the creator through GitHub Pages or a local web server, then try again.');
        console.error(error);
      }
    });
    $('#importJson').addEventListener('change', importJson);
    $('#makeLink').addEventListener('click', makeLink);
  }

  function renderPairs() {
    list.innerHTML = '';
    pairs.forEach((pair, index) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.index = index;
      node.querySelector('.pair-number').textContent = `Pair ${index + 1}`;
      setSide(node, 'left', pair.left);
      setSide(node, 'right', pair.right);

      ['left', 'right'].forEach((side) => {
        node.querySelector(`.${side}-text`).addEventListener('input', (event) => { pair[side].text = event.target.value; preview(); });
        node.querySelector(`.${side}-alt`).addEventListener('input', (event) => { pair[side].alt = event.target.value; preview(); });
        node.querySelector(`.${side}-image`).addEventListener('change', (event) => readImage(event.target.files[0], (data) => {
          pair[side].image = data;
          renderPairs();
          preview();
        }));
        node.querySelector(`.remove-${side}-image`).addEventListener('click', () => {
          pair[side].image = '';
          renderPairs();
          preview();
        });
      });

      node.querySelector('.delete-pair').addEventListener('click', () => {
        if (pairs.length <= 2) { alert('An activity needs at least two pairs.'); return; }
        pairs.splice(index, 1);
        renderPairs();
        preview();
      });
      node.querySelector('.move-up').addEventListener('click', () => move(index, index - 1));
      node.querySelector('.move-down').addEventListener('click', () => move(index, index + 1));
      node.addEventListener('dragstart', () => { dragIndex = index; node.classList.add('dragging'); });
      node.addEventListener('dragend', () => { node.classList.remove('dragging'); dragIndex = null; });
      node.addEventListener('dragover', (event) => event.preventDefault());
      node.addEventListener('drop', (event) => {
        event.preventDefault();
        if (dragIndex !== null && dragIndex !== index) move(dragIndex, index);
        dragIndex = null;
      });
      list.appendChild(node);
    });
  }

  function setSide(node, side, data) {
    node.querySelector(`.${side}-text`).value = data.text || '';
    node.querySelector(`.${side}-alt`).value = data.alt || '';
    const image = node.querySelector(`.${side}-preview`);
    const remove = node.querySelector(`.remove-${side}-image`);
    if (data.image) {
      image.src = data.image;
      image.alt = data.alt || data.text || `${side} item preview`;
      image.hidden = false;
      remove.hidden = false;
    }
  }

  function move(from, to) {
    if (to < 0 || to >= pairs.length) return;
    const [pair] = pairs.splice(from, 1);
    pairs.splice(to, 0, pair);
    renderPairs();
    preview();
  }

  function readImage(file, done) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    if (file.size > 3 * 1024 * 1024 && !confirm('This image is larger than 3 MB. It may make the exported file very large. Continue?')) return;
    const reader = new FileReader();
    reader.onload = () => done(reader.result);
    reader.onerror = () => alert('The image could not be read.');
    reader.readAsDataURL(file);
  }

  function collect() {
    return MatchingCore.normaliseActivity({
      title: $('#activityTitle').value,
      instructions: $('#instructions').value,
      feedbackMode: document.querySelector('input[name="feedbackMode"]:checked').value,
      allowRetry: $('#allowRetry').checked,
      allowSolution: $('#allowSolution').checked,
      pairs
    });
  }

  function apply(activity) {
    const normalised = MatchingCore.normaliseActivity(activity);
    if (normalised.pairs.length < 2) { alert('The activity must contain at least two complete pairs.'); return; }
    $('#activityTitle').value = normalised.title;
    $('#instructions').value = normalised.instructions;
    document.querySelector(`input[name="feedbackMode"][value="${normalised.feedbackMode}"]`).checked = true;
    $('#allowRetry').checked = normalised.allowRetry;
    $('#allowSolution').checked = normalised.allowSolution;
    pairs = normalised.pairs;
    renderPairs();
    preview();
  }

  function importJson(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { apply(JSON.parse(reader.result)); }
      catch (error) { alert('This is not a valid matching activity JSON file.'); }
    };
    reader.readAsText(file);
  }

  function preview() {
    const activity = collect();
    const root = $('#previewRoot');
    if (activity.pairs.length < 2) {
      root.innerHTML = '<p>Add at least two complete pairs to preview the activity.</p>';
      return;
    }
    new MatchingPlayer(root, activity);
  }

  function makeLink() {
    const activity = collect();
    if (activity.pairs.length < 2) { alert('Add at least two complete pairs.'); return; }
    const url = MatchingExport.shareUrl(activity);
    $('#shareLink').value = url;
    $('#embedCode').value = `<iframe src="${url}" title="${activity.title.replace(/"/g, '&quot;')}" width="100%" height="720" style="border:0" loading="lazy"></iframe>`;
    const qr = $('#qrImage');
    const notice = $('#shareNotice');
    if (url.length > 7000) {
      qr.hidden = true;
      notice.textContent = 'This activity is too large for a reliable share link. Download the standalone HTML file, upload it, and make a QR code from the hosted address.';
    } else {
      qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(url)}`;
      qr.hidden = false;
      notice.textContent = 'The QR preview uses an online QR service. Text-only activities create the most reliable share links.';
    }
  }

  document.addEventListener('DOMContentLoaded', initialise);
}());
