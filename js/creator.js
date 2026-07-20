body.modal-open {
  overflow: hidden;
}

.creator-layout {
  display: block;
  width: min(1100px, calc(100% - 32px));
}

.creator-panel {
  width: 100%;
}

.preview-panel {
  display: none;
}

.creator-section {
  margin-bottom: 34px;
}

.settings-section {
  margin-top: 38px;
  padding-top: 30px;
  border-top: 1px solid var(--line);
}

/* Preview modal */

.preview-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 2.5vh 2.5vw;

  opacity: 0;
  visibility: hidden;

  transition:
    opacity 0.18s ease,
    visibility 0.18s ease;
}

.preview-modal[hidden] {
  display: none;
}

.preview-modal.is-open {
  opacity: 1;
  visibility: visible;
}

.preview-backdrop {
  position: absolute;
  inset: 0;

  background: rgba(18, 29, 48, 0.72);
  backdrop-filter: blur(5px);
}

.preview-dialog {
  position: relative;
  z-index: 1;

  display: flex;
  flex-direction: column;

  width: min(95vw, 1400px);
  height: min(94vh, 1000px);

  overflow: hidden;

  border: 1px solid var(--line);
  border-radius: 24px;

  background: var(--surface);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.3);

  transform: translateY(18px) scale(0.985);

  transition: transform 0.18s ease;
}

.preview-modal.is-open .preview-dialog {
  transform: translateY(0) scale(1);
}

.preview-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  padding: 22px 28px;

  border-bottom: 1px solid var(--line);
  background: #ffffff;
}

.preview-dialog-header h2 {
  margin-bottom: 0;
}

.preview-dialog-header .eyebrow {
  margin-bottom: 5px;
}

.preview-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 52px;
  height: 52px;

  flex: 0 0 auto;

  border: 0;
  border-radius: 50%;

  background: var(--soft);
  color: var(--ink);

  font-family: Arial, sans-serif;
  font-size: 36px;
  line-height: 1;
}

.preview-close:hover {
  background: #e4ebf4;
}

.preview-close:focus-visible {
  outline: 4px solid rgba(23, 105, 224, 0.25);
  outline-offset: 2px;
}

.preview-dialog-body {
  flex: 1;
  overflow: auto;

  padding: 28px;

  background: #eef3f9;
}

.preview-dialog-body .activity-card {
  width: min(1100px, 100%);
  margin: 0 auto;
}

.preview-dialog-footer {
  display: flex;
  justify-content: flex-end;

  padding: 18px 28px;

  border-top: 1px solid var(--line);
  background: #ffffff;
}

@media (max-width: 700px) {
  .creator-layout {
    width: calc(100% - 16px);
  }

  .preview-modal {
    padding: 0;
  }

  .preview-dialog {
    width: 100%;
    height: 100%;
    max-height: none;

    border: 0;
    border-radius: 0;
  }

  .preview-dialog-header {
    padding: 16px;
  }

  .preview-dialog-header h2 {
    font-size: 26px;
  }

  .preview-close {
    width: 46px;
    height: 46px;
    font-size: 31px;
  }

  .preview-dialog-body {
    padding: 12px;
  }

  .preview-dialog-footer {
    padding: 14px 16px;
  }

  .preview-dialog-footer .button {
    width: 100%;
  }
}
