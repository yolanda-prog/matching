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
      {
        id: '1',
        left: { text: '1' },
        right: { text: 'one' }
      },
      {
        id: '2',
        left: { text: '2' },
        right: { text: 'two' }
      },
      {
        id: '3',
        left: { text: '3' },
        right: { text: 'three' }
      },
      {
        id: '4',
        left: { text: '4' },
        right: { text: 'four' }
      }
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
      this.pointerDrag = null;

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

            <div class="unmatched-grid">
              <section class="match-area">
                <h3 class="visually-hidden">
                  Left matching items
                </h3>

                <div
                  class="match-column left-column"
                  aria-label="Left matching items"
                ></div>
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

            <section
              class="matched-area"
              aria-label="Matched pairs"
            >
              <div class="matched-pairs"></div>
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

      const matchedPairs =
        this.root.querySelector('.matched-pairs');

      const matchedArea =
        this.root.querySelector('.matched-area');

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

      matchedPairs.innerHTML =
        this.engine.matches
          .map(
            (match, index) =>
              this.matchedPairMarkup(
                match,
                index
              )
          )
          .join('');

      matchedArea.hidden =
        this.engine.matches.length === 0;

      this.bindItems();
      this.bindMatchedPairs();
    }

    itemButton(side, entry) {
      return `
        <button
          class="match-item"
          type="button"
          draggable="true"
          data-side="${escapeHtml(side)}"
          data-pair-id="${escapeHtml(
            entry.pairId
          )}"
          aria-pressed="false"
        >
          ${itemMarkup(entry.item)}
        </button>
      `;
    }

    matchedPairMarkup(match, index) {
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
        ? 'Matched pair'
        : 'Matched pair. Select to separate it.';

      return `
        <button
          class="matched-pair ${
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
          aria-label="${escapeHtml(label)}"
          ${locked ? 'disabled' : ''}
        >
          <span class="matched-half matched-left">
            ${itemMarkup(leftItem)}
          </span>

          <span class="matched-half matched-right">
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

    bindMatchedPairs() {
      this.root
        .querySelectorAll(
          '.matched-pair:not(.locked)'
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

        event.dataTransfer.dropEffect =
          'move';

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
      if (this.hasChecked) {
        return;
      }

      if (!this.selected) {
        this.selected = element;

        element.classList.add('selected');

        element.setAttribute(
          'aria-pressed',
          'true'
        );

        this.setStatus(
          'Item selected. Choose an item from the other column.'
        );

        return;
      }

      if (this.selected === element) {
        this.clearSelection();

        this.setStatus(
          'Selection cleared.'
        );

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

        this.setStatus(
          'New item selected. Choose an item from the other column.'
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

      if (!left || !right) {
        return;
      }

      if (
        left.dataset.side !== 'left' ||
        right.dataset.side !== 'right'
      ) {
        return;
      }

      const isCorrect =
        left.dataset.pairId ===
        right.dataset.pairId;

      this.clearSelection();

      if (
        this.activity.feedbackMode ===
          'instant' &&
        !isCorrect
      ) {
        left.classList.add('flash-wrong');
        right.classList.add('flash-wrong');

        this.setStatus(
          'Not quite. Try again.'
        );

        window.setTimeout(() => {
          left.classList.remove(
            'flash-wrong'
          );

          right.classList.remove(
            'flash-wrong'
          );

          this.setStatus('');
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
        this.setStatus('Correct.');
      } else {
        this.setStatus(
          'Pair matched. Select the joined pair to separate it.'
        );
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
          this.setStatus(
            'All pairs are matched. Select Check.'
          );
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

      this.setStatus(
        'Pair separated. Choose another match.'
      );
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
              this.setStatus(
                'Match all items before checking.'
              );

              return;
            }

            this.hasChecked = true;

            this.showResults(
              this.engine.check()
            );
          }
        );
      }

      const solutionButton =
        this.root.querySelector(
          '.solution-button'
        );

      if (solutionButton) {
        solutionButton.addEventListener(
          'click',
          () => {
            this.hasChecked = true;

            this.showResults(
              this.engine.solution(),
              true
            );
          }
        );
      }

      const retryButton =
        this.root.querySelector(
          '.retry-button'
        );

      if (retryButton) {
        retryButton.addEventListener(
          'click',
          () => {
            this.engine.reset();
            this.selected = null;
            this.dragged = null;
            this.hasChecked = false;
            this.pointerDrag = null;

            this.render();
          }
        );
      }
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

      if (!boardScroll) {
        return;
      }

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

      this.setStatus(
        showingSolution
          ? 'Solution shown.'
          : `${score} out of ${maximum} correct.`
      );

      const checkButton =
        this.root.querySelector(
          '.check-button'
        );

      if (checkButton) {
        checkButton.hidden = true;
      }

      const solutionButton =
        this.root.querySelector(
          '.solution-button'
        );

      if (solutionButton) {
        solutionButton.hidden = true;
      }

      const retryButton =
        this.root.querySelector(
          '.retry-button'
        );

      if (retryButton) {
        retryButton.hidden =
          !this.activity.allowRetry;
      }
    }

    setStatus(message) {
      const status =
        this.root.querySelector(
          '.status-message'
        );

      if (status) {
        status.textContent = message;
      }
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
