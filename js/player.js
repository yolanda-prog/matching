(function (global) {
  'use strict';

  const DEFAULT_ACTIVITY = {
    title: 'Match the number with the word',
    instructions: 'Drag an item, or select one item in each column, to make a pair.',
    feedbackMode: 'check',
    allowRetry: true,
    allowSolution: true,
    pairs: [
      { id: '1', left: { text: '1' }, right: { text: 'one' } },
      { id: '2', left: { text: '2' }, right: { text: 'two' } },
      { id: '3', left: { text: '3' }, right: { text: 'three' } },
      { id: '4', left: { text: '4' }, right: { text: 'four' } },
      { id: '5', left: { text: '5' }, right: { text: 'five' } },
      { id: '6', left: { text: '6' }, right: { text: 'six' } }
    ]
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function decodeActivityFromHash() {
    try {
      const params = new URLSearchParams(location.hash.slice(1));
      const encoded = params.get('activity');
      if (!encoded) return null;
      const binary = atob(encoded);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      console.warn('Could not read activity from URL.', error);
      return null;
    }
  }

  function itemMarkup(item) {
    const image = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt || item.text || 'Matching item image')}">`
      : '';
    const text = item.text ? `<span class="item-text">${escapeHtml(item.text)}</span>` : '';
    return image + text;
  }

  class MatchingPlayer {
    constructor(root, activity) {
      this.root = root;
      this.activity = MatchingCore.normaliseActivity(activity);
      this.engine = new MatchingCore.MatchingEngine(this.activity);
      this.selected = null;
      this.pointerDrag = null;
      this.render();
    }

    render() {
      this.root.innerHTML = `
        <header class="activity-header">
          <h2>${escapeHtml(this.activity.title)}</h2>
          <p class="activity-instructions">${escapeHtml(this.activity.instructions)}</p>
        </header>
        <div class="match-board">
          <div class="match-column left-column" aria-label="Left matching items"></div>
          <div class="match-column right-column" aria-label="Right matching items"></div>
        </div>
        <p class="status-message" role="status" aria-live="polite"></p>
        <div class="activity-actions">
          <button class="button check-button" type="button">Check</button>
          <button class="button button-secondary solution-button" type="button" ${this.activity.allowSolution ? '' : 'hidden'}>Show solution</button>
          <button class="button button-secondary retry-button" type="button" hidden>Retry</button>
        </div>`;
      this.drawItems();
      this.bindActions();
    }

    drawItems() {
      const left = this.root.querySelector('.left-column');
      const right = this.root.querySelector('.right-column');
      left.innerHTML = this.engine.left.map((entry) => this.itemButton('left', entry)).join('');
      right.innerHTML = this.engine.right.map((entry) => this.itemButton('right', entry)).join('');
      this.bindItems();
      this.updateUsed();
    }

    itemButton(side, entry) {
      return `<button class="match-item" type="button" draggable="true" data-side="${side}" data-pair-id="${escapeHtml(entry.pairId)}" aria-pressed="false">${itemMarkup(entry.item)}</button>`;
    }

    bindItems() {
      this.root.querySelectorAll('.match-item').forEach((element) => {
        element.addEventListener('click', () => this.select(element));
        element.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.select(element);
          }
        });
        element.addEventListener('dragstart', (event) => this.dragStart(event, element));
        element.addEventListener('dragend', () => this.clearDragState());
        element.addEventListener('dragover', (event) => this.dragOver(event, element));
        element.addEventListener('dragleave', () => element.classList.remove('drag-over'));
        element.addEventListener('drop', (event) => this.drop(event, element));
        element.addEventListener('pointerdown', (event) => this.pointerDown(event, element));
      });
    }

    dragStart(event, element) {
      if (element.classList.contains('used')) {
        event.preventDefault();
        return;
      }
      this.dragged = element;
      element.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `${element.dataset.side}:${element.dataset.pairId}`);
    }

    dragOver(event, element) {
      if (this.dragged && this.dragged.dataset.side !== element.dataset.side && !element.classList.contains('used')) {
        event.preventDefault();
        element.classList.add('drag-over');
      }
    }

    drop(event, element) {
      event.preventDefault();
      element.classList.remove('drag-over');
      if (this.dragged && this.dragged.dataset.side !== element.dataset.side) {
        this.makeMatch(this.dragged, element);
      }
      this.clearDragState();
    }

    clearDragState() {
      this.root.querySelectorAll('.dragging,.drag-over').forEach((element) => element.classList.remove('dragging', 'drag-over'));
      this.dragged = null;
    }

    pointerDown(event, element) {
      if (event.pointerType === 'mouse' || element.classList.contains('used')) return;
      const startX = event.clientX;
      const startY = event.clientY;
      let moved = false;

      const move = (moveEvent) => {
        if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 8) return;
        moved = true;
        moveEvent.preventDefault();
        element.classList.add('dragging');
        const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest('.match-item');
        this.root.querySelectorAll('.drag-over').forEach((item) => item.classList.remove('drag-over'));
        if (target && target !== element && target.dataset.side !== element.dataset.side && !target.classList.contains('used')) {
          target.classList.add('drag-over');
        }
      };

      const up = (upEvent) => {
        document.removeEventListener('pointermove', move, { passive: false });
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest('.match-item');
        this.root.querySelectorAll('.dragging,.drag-over').forEach((item) => item.classList.remove('dragging', 'drag-over'));
        if (moved && target && target !== element && target.dataset.side !== element.dataset.side && !target.classList.contains('used')) {
          this.makeMatch(element, target);
        }
      };

      document.addEventListener('pointermove', move, { passive: false });
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    }

    select(element) {
      if (element.classList.contains('used')) return;
      if (!this.selected) {
        this.selected = element;
        element.classList.add('selected');
        element.setAttribute('aria-pressed', 'true');
        return;
      }
      if (this.selected === element) {
        this.clearSelection();
        return;
      }
      if (this.selected.dataset.side === element.dataset.side) {
        this.clearSelection();
        this.selected = element;
        element.classList.add('selected');
        element.setAttribute('aria-pressed', 'true');
        return;
      }
      this.makeMatch(this.selected, element);
    }

    clearSelection() {
      if (this.selected) {
        this.selected.classList.remove('selected');
        this.selected.setAttribute('aria-pressed', 'false');
      }
      this.selected = null;
    }

    makeMatch(first, second) {
      const left = first.dataset.side === 'left' ? first : second;
      const right = first.dataset.side === 'right' ? first : second;
      const result = this.engine.match(left.dataset.pairId, right.dataset.pairId);
      this.clearSelection();
      if (!result) return;

      const status = this.root.querySelector('.status-message');
      if (this.activity.feedbackMode === 'instant' && !result.correct) {
        left.classList.add('flash-wrong');
        right.classList.add('flash-wrong');
        status.textContent = 'Not quite. Try again.';
        setTimeout(() => {
          left.classList.remove('flash-wrong');
          right.classList.remove('flash-wrong');
          status.textContent = '';
        }, 850);
        return;
      }

      if (this.activity.feedbackMode === 'instant') {
        left.classList.add('flash-correct');
        right.classList.add('flash-correct');
        status.textContent = 'Correct.';
      }
      this.updateUsed();

      if (this.engine.isComplete()) {
        if (this.activity.feedbackMode === 'instant') {
          setTimeout(() => this.showResults(this.engine.check()), 450);
        } else {
          status.textContent = 'All pairs are matched. Select Check.';
        }
      }
    }

    updateUsed() {
      const used = new Set();
      this.engine.matches.forEach((match) => {
        used.add(`left:${match.leftPairId}`);
        used.add(`right:${match.rightPairId}`);
      });
      this.root.querySelectorAll('.match-item').forEach((element) => {
        const isUsed = used.has(`${element.dataset.side}:${element.dataset.pairId}`);
        element.classList.toggle('used', isUsed);
        element.disabled = isUsed;
      });
    }

    bindActions() {
      this.root.querySelector('.check-button').addEventListener('click', () => {
        if (!this.engine.isComplete()) {
          this.root.querySelector('.status-message').textContent = 'Match all items before checking.';
          return;
        }
        this.showResults(this.engine.check());
      });
      this.root.querySelector('.solution-button').addEventListener('click', () => this.showResults(this.engine.solution(), true));
      this.root.querySelector('.retry-button').addEventListener('click', () => {
        this.engine.reset();
        this.selected = null;
        this.render();
      });
    }

    showResults(results, showingSolution = false) {
      const rows = results.map((match) => {
        const leftItem = this.engine.item('left', match.leftPairId) || this.activity.pairs.find((pair) => pair.id === match.leftPairId)?.left;
        const rightItem = this.engine.item('right', match.rightPairId) || this.activity.pairs.find((pair) => pair.id === match.rightPairId)?.right;
        return `<div class="result-row ${match.correct ? 'correct' : 'incorrect'}">
          <div class="result-content">${itemMarkup(leftItem)}</div>
          <div class="result-mark" aria-label="${match.correct ? 'Correct' : 'Incorrect'}">${match.correct ? '✓' : '×'}</div>
          <div class="result-content">${itemMarkup(rightItem)}</div>
        </div>`;
      }).join('');

      const score = showingSolution ? this.activity.pairs.length : this.engine.score();
      const maximum = this.activity.pairs.length;
      this.root.querySelector('.match-board').outerHTML = `<div class="results-list">${rows}</div>
        <div class="score-wrap" aria-label="Score ${score} out of ${maximum}">
          <div class="score-track"><div class="score-fill" style="width:${maximum ? (score / maximum) * 100 : 0}%"></div></div>
          <div class="score-text">${score}/${maximum}</div>
        </div>`;
      this.root.querySelector('.status-message').textContent = showingSolution ? 'Solution shown.' : `${score} out of ${maximum} correct.`;
      this.root.querySelector('.check-button').hidden = true;
      this.root.querySelector('.solution-button').hidden = true;
      this.root.querySelector('.retry-button').hidden = !this.activity.allowRetry;
    }
  }

  function initialisePage() {
    const root = document.getElementById('activityRoot');
    if (!root) return;
    const activity = decodeActivityFromHash() || DEFAULT_ACTIVITY;
    const title = document.getElementById('pageTitle');
    if (title) title.textContent = activity.title || 'Matching Activity';
    new MatchingPlayer(root, activity);
  }

  global.MatchingPlayer = MatchingPlayer;
  global.MATCHING_DEFAULT = DEFAULT_ACTIVITY;
  document.addEventListener('DOMContentLoaded', initialisePage);
}(window));
