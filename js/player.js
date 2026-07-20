(function (global) {
  'use strict';

  const DEFAULT_ACTIVITY = {
    title: 'Match the number with the word',
    instructions:
      'Drag an item, or select one item in each column, to make a pair.',
    feedbackMode: 'check',
    allowRetry: true,
    allowSolution: true,
    pairs: [
      { id: '1', left: { text: '1' }, right: { text: 'one' } },
      { id: '2', left: { text: '2' }, right: { text: 'two' } },
      { id: '3', left: { text: '3' }, right: { text: 'three' } },
      { id: '4', left: { text: '4' }, right: { text: 'four' } }
    ]
  };

  const escapeHtml = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[character]
    );

  function decodeActivityFromHash() {
    try {
      const parameters = new URLSearchParams(
        location.hash.slice(1)
      );

      const encoded = parameters.get('activity');

      if (!encoded) {
        return null;
      }

      const binary = atob(encoded);

      const bytes = Uint8Array.from(
        binary,
        (character) => character.charCodeAt(0)
      );

      return JSON.parse(
        new TextDecoder().decode(bytes)
      );
    } catch (error) {
      console.warn(
        'Could not read activity from URL.',
        error
      );

      return null;
    }
  }

  function itemMarkup(item) {
    if (!item) {
      return '';
    }

    const image = item.image
      ? `
        <img
          src="${escapeHtml(item.image)}"
          alt="${escapeHtml(
            item.alt ||
            item.text ||
            'Matching item image'
          )}"
        >
      `
      : '';

    const text = item.text
      ? `
        <span class="item-text">
          ${escapeHtml(item.text)}
        </span>
      `
      : '';

    return image + text;
  }

  class MatchingPlayer {
    constructor(root, activity) {
      this.root = root;

      this.activity =
        MatchingCore.normaliseActivity(activity);

      this.engine =
        new MatchingCore.MatchingEngine(
          this.activity
        );

      this.selected = null;
      this.dragged = null;
      this.hasChecked = false;

      this.render();
    }

    render() {
      const instantMode =
        this.activity.feedbackMode === 'instant';

      this.root.innerHTML = `
        <header class="activity-header">
          <h2>
            ${escapeHtml(this.activity.title)}
          </h2>

          <p class="activity-instructions">
            ${escapeHtml(
              this.activity.instructions
            )}
          </p>
        </header>

        <p class="orientation-notice">
          For the best experience on a phone,
          turn your device sideways.
        </p>

        <div class="match-board-scroll">
          <div class="match-board">

            <section class="match-area">
              <h3 class="visually-hidden">
                Left matching items
              </h3>

              <div
                class="match-column left-column"
                aria-label="Left matching items"
              ></div>
            </section>

            <section
              class="connected-area"
              aria-label="Connected pairs"
            >
              <p class="connected-placeholder">
                Your matched pairs will appear here.
              </p>

              <div class="connected-pairs"></div>
            </section>

            <section class="match-area">
              <h3 class="visually-hidden">
                Right matching items
              </h3>

              <div
                class="match-column right-column"
                aria-label="Right matching items"
              ></div>
            </section>

          </div>
        </div>

        <p
          class="status-message"
          role="status"
          aria-live="polite"
        ></p>

        <div class="activity-actions">

          <button
            class="button check-button"
            type="button"
            ${instantMode ? 'hidden' : ''}
          >
            Check
          </button>

          <button
            class="button button-secondary solution-button"
            type="button"
            ${
              this.activity.allowSolution
                ? ''
                : 'hidden'
            }
          >
            Show solution
          </button>

          <button
            class="button button-secondary retry-button"
            type="button"
            hidden
          >
            Retry
          </button>

        </div>
      `;

      this.drawBoard();
      this.bindActions();
    }

    drawBoard() {
      const leftColumn =
        this.root.querySelector('.left-column');

      const rightColumn =
        this.root.querySelector('.right-column');

      const connectedPairs =
        this.root.querySelector('.connected-pairs');

      const placeholder =
        this.root.querySelector(
          '.connected-placeholder'
        );

      const usedLeft = new Set(
        this.engine.matches.map(
          (match) => match.leftPairId
        )
      );

      const usedRight = new Set(
        this.engine.matches.map(
          (match) => match.rightPairId
        )
      );

      leftColumn.innerHTML = this.engine.left
        .filter(
          (entry) => !usedLeft.has(entry.pairId)
        )
        .map(
          (entry) =>
            this.itemButton('left', entry)
        )
        .join('');

      rightColumn.innerHTML = this.engine.right
        .filter(
          (entry) => !usedRight.has(entry.pairId)
        )
        .map(
          (entry) =>
            this.itemButton('right', entry)
        )
        .join('');

      connectedPairs.innerHTML =
        this.engine.matches
          .map(
            (match, index) =>
              this.connectedPairMarkup(
                match,
                index
              )
          )
          .join('');

      placeholder.hidden =
        this.engine.matches.length > 0;

      this.bindItems();
      this.bindConnectedPairs();
    }

    itemButton(side, entry) {
      return `
        <button
          class="match-item"
          type="button"
          draggable="true"
          data-side="${side}"
          data-pair-id="${escapeHtml(
            entry.pairId
          )}"
          aria-pressed="false"
        >
          ${itemMarkup(entry.item)}
        </button>
      `;
    }

    connectedPairMarkup(match, index) {
      const leftItem =
        this.engine.item(
          'left',
          match.leftPairId
        ) ||
        this.activity.pairs.find(
          (pair) =>
            pair.id === match.leftPairId
        )?.left;

      const rightItem =
        this.engine.item(
          'right',
          match.rightPairId
        ) ||
        this.activity.pairs.find(
          (pair) =>
            pair.id === match.rightPairId
        )?.right;

      const locked =
        this.activity.feedbackMode === 'instant' ||
        this.hasChecked;

      const label = locked
        ? 'Connected matching pair'
        : 'Connected pair. Select to separate it.';

      return `
        <button
          class="connected-pair ${
            locked ? 'locked' : ''
          }"
          type="button"
          data-match-index="${index}"
          data-left-pair-id="${escapeHtml(
            match.leftPairId
          )}"
          data-right-pair-id="${escapeHtml(
            match.rightPairId
          )}"
          aria-label="${label}"
          ${locked ? 'disabled' : ''}
        >
          <span class="puzzle-half puzzle-left">
            ${itemMarkup(leftItem)}
          </span>

          <span class="puzzle-half puzzle-right">
            ${itemMarkup(rightItem)}
          </span>
        </button>
      `;
    }

    bindItems() {
      this.root
        .querySelectorAll('.match-item')
        .forEach((element) => {
          element.addEventListener(
            'click',
            () => this.select(element)
          );

          element.addEventListener(
            'keydown',
            (event) => {
              if (
                event.key === 'Enter' ||
                event.key === ' '
              ) {
                event.preventDefault();
                this.select(element);
              }
            }
          );

          element.addEventListener(
            'dragstart',
            (event) =>
              this.dragStart(event, element)
          );

          element.addEventListener(
            'dragend',
            () => this.clearDragState()
          );

          element.addEventListener(
            'dragover',
            (event) =>
              this.dragOver(event, element)
          );

          element.addEventListener(
            'dragleave',
            () =>
              element.classList.remove(
                'drag-over'
              )
          );

          element.addEventListener(
            'drop',
            (event) =>
              this.drop(event, element)
          );

          element.addEventListener(
            'pointerdown',
            (event) =>
              this.pointerDown(event, element)
          );
        });
    }

    bindConnectedPairs() {
      this.root
        .querySelectorAll(
          '.connected-pair:not(.locked)'
        )
        .forEach((element) => {
          element.addEventListener(
            'click',
            () => this.disconnectPair(element)
          );
        });
    }

    dragStart(event, element) {
      this.dragged = element;

      element.classList.add('dragging');

      event.dataTransfer.effectAllowed =
        'move';

      event.dataTransfer.setData(
        'text/plain',
        `${element.dataset.side}:${element.dataset.pairId}`
      );
    }

    dragOver(event, element) {
      if (
        this.dragged &&
        this.dragged.dataset.side !==
          element.dataset.side
      ) {
        event.preventDefault();

        element.classList.add('drag-over');
      }
    }

    drop(event, element) {
      event.preventDefault();

      element.classList.remove('drag-over');

      if (
        this.dragged &&
        this.dragged.dataset.side !==
          element.dataset.side
      ) {
        this.makeMatch(
          this.dragged,
          element
        );
      }

      this.clearDragState();
    }

    clearDragState() {
      this.root
        .querySelectorAll(
          '.dragging, .drag-over'
        )
        .forEach((element) => {
          element.classList.remove(
            'dragging',
            'drag-over'
          );
        });

      this.dragged = null;
    }

    pointerDown(event, element) {
      if (event.pointerType === 'mouse') {
        return;
      }

      const startX = event.clientX;
      const startY = event.clientY;

      let moved = false;

      const move = (moveEvent) => {
        const distance = Math.hypot(
          moveEvent.clientX - startX,
          moveEvent.clientY - startY
        );

        if (distance < 8) {
          return;
        }

        moved = true;

        moveEvent.preventDefault();

        element.classList.add('dragging');

        const target =
          document
            .elementFromPoint(
              moveEvent.clientX,
              moveEvent.clientY
            )
            ?.closest('.match-item');

        this.root
          .querySelectorAll('.drag-over')
          .forEach((item) => {
            item.classList.remove(
              'drag-over'
            );
          });

        if (
          target &&
          target !== element &&
          target.dataset.side !==
            element.dataset.side
        ) {
          target.classList.add('drag-over');
        }
      };

      const up = (upEvent) => {
        document.removeEventListener(
          'pointermove',
          move
        );

        document.removeEventListener(
          'pointerup',
          up
        );

        document.removeEventListener(
          'pointercancel',
          up
        );

        const target =
          document
            .elementFromPoint(
              upEvent.clientX,
              upEvent.clientY
            )
            ?.closest('.match-item');

        this.root
          .querySelectorAll(
            '.dragging, .drag-over'
          )
          .forEach((item) => {
            item.classList.remove(
              'dragging',
              'drag-over'
            );
          });

        if (
          moved &&
          target &&
          target !== element &&
          target.dataset.side !==
            element.dataset.side
        ) {
          this.makeMatch(element, target);
        }
      };

      document.addEventListener(
        'pointermove',
        move,
        { passive: false }
      );

      document.addEventListener(
        'pointerup',
        up
      );

      document.addEventListener(
        'pointercancel',
        up
      );
    }

    select(element) {
      if (!this.selected) {
        this.selected = element;

        element.classList.add('selected');

        element.setAttribute(
          'aria-pressed',
          'true'
        );

        return;
      }

      if (this.selected === element) {
        this.clearSelection();
        return;
      }

      if (
        this.selected.dataset.side ===
        element.dataset.side
      ) {
        this.clearSelection();

        this.selected = element;

        element.classList.add('selected');

        element.setAttribute(
          'aria-pressed',
          'true'
        );

        return;
      }

      this.makeMatch(
        this.selected,
        element
      );
    }

    clearSelection() {
      if (this.selected) {
        this.selected.classList.remove(
          'selected'
        );

        this.selected.setAttribute(
          'aria-pressed',
          'false'
        );
      }

      this.selected = null;
    }

    makeMatch(first, second) {
      const left =
        first.dataset.side === 'left'
          ? first
          : second;

      const right =
        first.dataset.side === 'right'
          ? first
          : second;

      const isCorrect =
        left.dataset.pairId ===
        right.dataset.pairId;

      const status =
        this.root.querySelector(
          '.status-message'
        );

      this.clearSelection();

      if (
        this.activity.feedbackMode ===
          'instant' &&
        !isCorrect
      ) {
        left.classList.add('flash-wrong');
        right.classList.add('flash-wrong');

        status.textContent =
          'Not quite. Try again.';

        window.setTimeout(() => {
          left.classList.remove(
            'flash-wrong'
          );

          right.classList.remove(
            'flash-wrong'
          );

          status.textContent = '';
        }, 850);

        return;
      }

      const result = this.engine.match(
        left.dataset.pairId,
        right.dataset.pairId
      );

      if (!result) {
        return;
      }

      if (
        this.activity.feedbackMode ===
        'instant'
      ) {
        status.textContent = 'Correct.';
      } else {
        status.textContent =
          'Pair connected. Select the connected pair to change it.';
      }

      this.drawBoard();

      if (this.engine.isComplete()) {
        if (
          this.activity.feedbackMode ===
          'instant'
        ) {
          window.setTimeout(
            () =>
              this.showResults(
                this.engine.check()
              ),
            450
          );
        } else {
          status.textContent =
            'All pairs are connected. Select Check.';
        }
      }
    }

    disconnectPair(element) {
      if (
        this.activity.feedbackMode ===
          'instant' ||
        this.hasChecked
      ) {
        return;
      }

      const leftPairId =
        element.dataset.leftPairId;

      const rightPairId =
        element.dataset.rightPairId;

      this.engine.matches =
        this.engine.matches.filter(
          (match) =>
            !(
              match.leftPairId ===
                leftPairId &&
              match.rightPairId ===
                rightPairId
            )
        );

      this.clearSelection();
      this.drawBoard();

      this.root.querySelector(
        '.status-message'
      ).textContent =
        'Pair separated. Choose another match.';
    }

    bindActions() {
      const checkButton =
        this.root.querySelector(
          '.check-button'
        );

      if (checkButton) {
        checkButton.addEventListener(
          'click',
          () => {
            if (!this.engine.isComplete()) {
              this.root.querySelector(
                '.status-message'
              ).textContent =
                'Connect all items before checking.';

              return;
            }

            this.hasChecked = true;

            this.showResults(
              this.engine.check()
            );
          }
        );
      }

      this.root
        .querySelector('.solution-button')
        .addEventListener('click', () => {
          this.hasChecked = true;

          this.showResults(
            this.engine.solution(),
            true
          );
        });

      this.root
        .querySelector('.retry-button')
        .addEventListener('click', () => {
          this.engine.reset();
          this.selected = null;
          this.dragged = null;
          this.hasChecked = false;
          this.render();
        });
    }

    showResults(
      results,
      showingSolution = false
    ) {
      const rows = results
        .map((match) => {
          const leftItem =
            this.engine.item(
              'left',
              match.leftPairId
            ) ||
            this.activity.pairs.find(
              (pair) =>
                pair.id ===
                match.leftPairId
            )?.left;

          const rightItem =
            this.engine.item(
              'right',
              match.rightPairId
            ) ||
            this.activity.pairs.find(
              (pair) =>
                pair.id ===
                match.rightPairId
            )?.right;

          return `
            <div
              class="result-row ${
                match.correct
                  ? 'correct'
                  : 'incorrect'
              }"
            >
              <div class="result-content">
                ${itemMarkup(leftItem)}
              </div>

              <div
                class="result-mark"
                aria-label="${
                  match.correct
                    ? 'Correct'
                    : 'Incorrect'
                }"
              >
                ${
                  match.correct
                    ? '✓'
                    : '×'
                }
              </div>

              <div class="result-content">
                ${itemMarkup(rightItem)}
              </div>
            </div>
          `;
        })
        .join('');

      const score = showingSolution
        ? this.activity.pairs.length
        : this.engine.score();

      const maximum =
        this.activity.pairs.length;

      const boardScroll =
        this.root.querySelector(
          '.match-board-scroll'
        );

      boardScroll.outerHTML = `
        <div class="results-list">
          ${rows}
        </div>

        <div
          class="score-wrap"
          aria-label="Score ${score} out of ${maximum}"
        >
          <div class="score-track">
            <div
              class="score-fill"
              style="width:${
                maximum
                  ? (score / maximum) * 100
                  : 0
              }%"
            ></div>
          </div>

          <div class="score-text">
            ${score}/${maximum}
          </div>
        </div>
      `;

      this.root.querySelector(
        '.status-message'
      ).textContent = showingSolution
        ? 'Solution shown.'
        : `${score} out of ${maximum} correct.`;

      const checkButton =
        this.root.querySelector(
          '.check-button'
        );

      if (checkButton) {
        checkButton.hidden = true;
      }

      this.root.querySelector(
        '.solution-button'
      ).hidden = true;

      this.root.querySelector(
        '.retry-button'
      ).hidden =
        !this.activity.allowRetry;
    }
  }

  function initialisePage() {
    const root =
      document.getElementById(
        'activityRoot'
      );

    if (!root) {
      return;
    }

    const activity =
      decodeActivityFromHash() ||
      DEFAULT_ACTIVITY;

    const title =
      document.getElementById(
        'pageTitle'
      );

    if (title) {
      title.textContent =
        activity.title ||
        'Matching Activity';
    }

    new MatchingPlayer(root, activity);
  }

  global.MatchingPlayer = MatchingPlayer;
  global.MATCHING_DEFAULT =
    DEFAULT_ACTIVITY;

  document.addEventListener(
    'DOMContentLoaded',
    initialisePage
  );
}(window));
