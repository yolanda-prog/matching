(function (global) {
  'use strict';

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = () => `pair-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;

  function shuffle(items) {
    const output = [...items];
    for (let index = output.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [output[index], output[randomIndex]] = [output[randomIndex], output[index]];
    }
    return output;
  }

  function normaliseItem(item) {
    const source = item || {};
    return {
      text: String(source.text || '').trim(),
      image: String(source.image || ''),
      alt: String(source.alt || source.text || '').trim()
    };
  }

  function normaliseActivity(input) {
    const source = input || {};
    const pairs = (Array.isArray(source.pairs) ? source.pairs : [])
      .map((pair) => ({
        id: String(pair.id || uid()),
        left: normaliseItem(pair.left),
        right: normaliseItem(pair.right)
      }))
      .filter((pair) => (pair.left.text || pair.left.image) && (pair.right.text || pair.right.image));

    return {
      version: 2,
      title: String(source.title || 'Match the pairs').trim() || 'Match the pairs',
      instructions: String(source.instructions || 'Drag or tap to match each item with its partner.').trim(),
      feedbackMode: source.feedbackMode === 'instant' ? 'instant' : 'check',
      allowRetry: source.allowRetry !== false,
      allowSolution: source.allowSolution !== false,
      pairs
    };
  }

  class MatchingEngine {
    constructor(activity) {
      this.activity = normaliseActivity(activity);
      this.reset();
    }

    reset() {
      this.left = shuffle(this.activity.pairs.map((pair) => ({ pairId: pair.id, item: clone(pair.left) })));
      this.right = shuffle(this.activity.pairs.map((pair) => ({ pairId: pair.id, item: clone(pair.right) })));
      this.matches = [];
      this.firstAttempts = new Map();
      this.locked = false;
    }

    isSideUsed(side, pairId) {
      return this.matches.some((match) => (
        side === 'left' ? match.leftPairId === pairId : match.rightPairId === pairId
      ));
    }

    match(leftPairId, rightPairId) {
      if (this.locked || this.isSideUsed('left', leftPairId) || this.isSideUsed('right', rightPairId)) {
        return null;
      }

      const correct = leftPairId === rightPairId;
      if (!this.firstAttempts.has(leftPairId)) {
        this.firstAttempts.set(leftPairId, correct);
      }

      const record = { leftPairId, rightPairId, correct };
      if (this.activity.feedbackMode === 'instant' && !correct) {
        return record;
      }

      this.matches.push(record);
      return record;
    }

    isComplete() {
      return this.matches.length === this.activity.pairs.length;
    }

    check() {
      this.locked = true;
      this.matches = this.matches.map((match) => ({
        ...match,
        correct: match.leftPairId === match.rightPairId
      }));
      return clone(this.matches);
    }

    solution() {
      this.locked = true;
      this.matches = this.activity.pairs.map((pair) => ({
        leftPairId: pair.id,
        rightPairId: pair.id,
        correct: true,
        solution: true
      }));
      return clone(this.matches);
    }

    score() {
      if (this.activity.feedbackMode === 'instant') {
        return this.activity.pairs.reduce((total, pair) => total + (this.firstAttempts.get(pair.id) === true ? 1 : 0), 0);
      }
      return this.matches.filter((match) => match.correct).length;
    }

    item(side, pairId) {
      const source = side === 'left' ? this.left : this.right;
      return source.find((entry) => entry.pairId === pairId)?.item || null;
    }
  }

  global.MatchingCore = { MatchingEngine, normaliseActivity, shuffle, uid };
}(window));
