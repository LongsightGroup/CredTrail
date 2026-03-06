export const INSTITUTION_ADMIN_CSS = `
.ct-admin {
  --ct-stack-gap: var(--ct-space-4);
}
.ct-admin__hero {
  --ct-stack-gap: 0.9rem;
  padding: var(--ct-space-5);
  border-radius: var(--ct-radius-lg);
  border: 1px solid var(--ct-border-strong);
  background: var(--ct-theme-gradient-hero);
  color: var(--ct-theme-text-on-brand);
  box-shadow: var(--ct-shadow-card);
}
.ct-admin__hero h1 {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 2rem);
  color: var(--ct-theme-text-on-brand);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
}
.ct-admin__meta-grid {
  --ct-cluster-gap: 0.5rem;
}
.ct-admin__quick-links {
  --ct-cluster-gap: 0.45rem;
}
.ct-admin__quick-links a {
  display: inline-flex;
  align-items: center;
  border-radius: var(--ct-radius-pill);
  border: 1px solid var(--ct-theme-surface-brand-chip-strong);
  background: var(--ct-theme-surface-brand-chip);
  color: var(--ct-theme-text-on-brand);
  font-size: 0.82rem;
  font-weight: 700;
  min-height: 2.75rem;
  padding: 0.5rem 0.9rem;
  text-decoration: none;
}
.ct-admin__quick-links a:hover {
  background: var(--ct-theme-surface-brand-chip-strong);
}
.ct-admin__cta-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ct-radius-pill);
  border: 1px solid var(--ct-border-strong);
  min-height: 2.75rem;
  padding: 0.5rem 0.9rem;
  font-weight: 700;
  text-decoration: none;
  background: var(--ct-theme-surface-info);
}
.ct-admin__pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: var(--ct-radius-pill);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: var(--ct-theme-surface-brand-chip);
}
.ct-admin__layout {
  --ct-grid-gap: var(--ct-space-4);
  --ct-sidebar-width: 360px;
  min-width: 0;
}
.ct-admin__layout > * {
  min-width: 0;
}
.ct-admin__panel {
  --ct-stack-gap: 0.7rem;
  background: linear-gradient(
    170deg,
    var(--ct-theme-surface-card-strong),
    var(--ct-theme-surface-soft)
  );
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-lg);
  padding: var(--ct-space-4);
  min-width: 0;
}
.ct-admin__panel h2 {
  margin: 0;
  font-size: 1rem;
}
.ct-admin__panel p {
  margin: 0;
  color: var(--ct-color-ink-soft);
}
.ct-admin__video-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-md);
  overflow: hidden;
  background: var(--ct-theme-surface-info);
}
.ct-admin__video-frame iframe {
  width: 100%;
  height: 100%;
  border: 0;
}
.ct-admin__grid {
  --ct-stack-gap: var(--ct-space-4);
  min-width: 0;
}
.ct-admin__form {
  --ct-stack-gap: 0.65rem;
  min-width: 0;
}
.ct-admin__form--inline.ct-grid {
  --ct-grid-gap: 0.6rem;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  align-items: end;
}
.ct-admin__form label {
  --ct-stack-gap: 0.28rem;
  display: grid;
  gap: 0.28rem;
  font-size: 0.9rem;
  color: var(--ct-color-ink);
}
.ct-admin__fieldset {
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-md);
  padding: 0.55rem;
}
.ct-admin__fieldset legend {
  padding-inline: 0.2rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ct-color-ink-soft);
}
.ct-admin__form input:not([type='checkbox']),
.ct-admin__form select,
.ct-admin__form textarea {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid var(--ct-border-strong);
  border-radius: var(--ct-radius-md);
  min-height: 2.75rem;
  padding: 0.65rem 0.72rem;
  font-size: 0.94rem;
}
.ct-admin__form textarea {
  min-height: 5.5rem;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.84rem;
  line-height: 1.35;
}
.ct-admin__builder-grid {
  --ct-grid-gap: 0.65rem;
}
.ct-admin__builder-grid.ct-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.ct-admin__builder-inline {
  --ct-cluster-gap: 0.5rem;
  align-items: end;
}
.ct-admin__builder-progress {
  margin-top: -0.15rem;
  font-size: 0.85rem;
  font-weight: 700;
}
.ct-admin__step-head {
  --ct-stack-gap: 0.28rem;
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-md);
  background: linear-gradient(
    180deg,
    var(--ct-theme-surface-card-strong),
    var(--ct-theme-surface-soft)
  );
  padding: 0.62rem 0.66rem;
}
.ct-admin__step-kicker {
  margin: 0;
  font-size: 0.73rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ct-theme-text-subtle);
  font-weight: 700;
}
.ct-admin__step-head h3 {
  margin: 0;
  font-size: 0.98rem;
}
.ct-admin__step-head p {
  margin: 0;
  font-size: 0.87rem;
  color: var(--ct-theme-text-muted);
}
.ct-admin__builder-toolbar {
  --ct-cluster-gap: 0.45rem;
}
.ct-admin__inline-control {
  display: grid;
  gap: 0.25rem;
  min-width: 12rem;
}
.ct-admin__builder-canvas {
  --ct-stack-gap: 0.55rem;
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-md);
  background: var(--ct-theme-surface-info);
  padding: 0.58rem;
}
.ct-admin__builder-canvas-header {
  justify-content: space-between;
}
.ct-admin__builder-canvas-meta {
  --ct-cluster-gap: 0.35rem;
}
.ct-admin__builder-canvas-empty {
  margin: 0;
  padding: 0.62rem 0.66rem;
  border-radius: var(--ct-radius-sm);
  border: 1px dashed var(--ct-border-soft);
  background: var(--ct-theme-surface-card-strong);
  color: var(--ct-theme-text-subtle);
  font-size: 0.84rem;
}
.ct-admin__builder-condition-list {
  --ct-stack-gap: 0.55rem;
}
.ct-admin__condition-card {
  --ct-stack-gap: 0.5rem;
  border: 1px solid var(--ct-theme-border-info);
  border-left: 4px solid var(--ct-brand-lake-600);
  border-radius: var(--ct-radius-md);
  background: var(--ct-theme-surface-card-strong);
  padding: 0.58rem;
}
.ct-admin__condition-card.is-dragging {
  opacity: 0.65;
  box-shadow: var(--ct-focus-ring);
}
.ct-admin__condition-card--course_completion {
  border-left-color: var(--ct-theme-state-success);
}
.ct-admin__condition-card--grade_threshold {
  border-left-color: var(--ct-brand-lake-700);
}
.ct-admin__condition-card--program_completion {
  border-left-color: var(--ct-brand-lake-500);
}
.ct-admin__condition-card--assignment_submission {
  border-left-color: var(--ct-theme-state-warning);
}
.ct-admin__condition-card--time_window {
  border-left-color: var(--ct-theme-text-muted);
}
.ct-admin__condition-card--prerequisite_badge {
  border-left-color: var(--ct-theme-state-danger);
}
.ct-admin__condition-card--result-idle {
  border-right: 3px solid var(--ct-border-soft);
}
.ct-admin__condition-card--result-pass {
  border-right: 3px solid var(--ct-theme-state-success);
  background: linear-gradient(
    160deg,
    var(--ct-theme-surface-success),
    var(--ct-theme-surface-card-strong)
  );
}
.ct-admin__condition-card--result-fail {
  border-right: 3px solid var(--ct-theme-state-danger);
  background: linear-gradient(
    160deg,
    var(--ct-theme-surface-danger),
    var(--ct-theme-surface-card-strong)
  );
}
.ct-admin__condition-header {
  --ct-cluster-gap: 0.5rem;
  align-items: stretch;
}
.ct-admin__condition-header-row {
  --ct-cluster-gap: 0.42rem;
  justify-content: space-between;
  align-items: center;
}
.ct-admin__condition-index {
  display: inline-flex;
  align-items: center;
  border-radius: var(--ct-radius-pill);
  border: 1px solid var(--ct-border-soft);
  background: var(--ct-theme-surface-soft);
  color: var(--ct-theme-text-muted);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 0.16rem 0.48rem;
}
.ct-admin__condition-drag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: var(--ct-radius-sm);
  border: 1px solid var(--ct-border-soft);
  background: var(--ct-theme-surface-info);
  color: var(--ct-theme-text-muted);
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: grab;
  user-select: none;
}
.ct-admin__condition-actions {
  --ct-cluster-gap: 0.36rem;
}
.ct-admin__condition-header-fields.ct-grid {
  --ct-grid-gap: 0.5rem;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}
.ct-admin__condition-header-fields label {
  min-width: 0;
}
.ct-admin__condition-fields.ct-grid {
  --ct-grid-gap: 0.5rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.ct-admin__condition-help {
  margin: 0;
  font-size: 0.79rem;
  color: var(--ct-theme-text-subtle);
}
.ct-admin__condition-result {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
}
.ct-admin__condition-result[data-state='idle'] {
  color: var(--ct-theme-text-subtle);
}
.ct-admin__condition-result[data-state='pass'] {
  color: var(--ct-theme-state-success);
}
.ct-admin__condition-result[data-state='fail'] {
  color: var(--ct-theme-state-danger);
}
.ct-admin__checkbox-row {
  font-size: 0.92rem;
}
.ct-admin__checkbox-row input[type='checkbox'] {
  margin: 0;
}
.ct-admin__form button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  border: none;
  border-radius: var(--ct-radius-md);
  min-height: 2.75rem;
  padding: 0.6rem 0.96rem;
  font-weight: 700;
  color: var(--ct-theme-text-on-brand);
  background: var(--ct-theme-gradient-action);
  cursor: pointer;
}
.ct-admin__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--ct-radius-sm);
  min-height: 2.75rem;
  padding: 0.58rem 0.88rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ct-theme-text-on-brand);
  background: var(--ct-theme-gradient-action);
  text-decoration: none;
  line-height: 1.1;
  cursor: pointer;
}
.ct-admin__button:disabled {
  opacity: 0.66;
  cursor: progress;
}
.ct-admin__button--tiny {
  padding: 0.45rem 0.72rem;
  font-size: 0.78rem;
}
.ct-admin__button--danger {
  background: var(--ct-theme-gradient-danger);
}
.ct-admin__button--secondary {
  color: var(--ct-color-ink);
  border: 1px solid var(--ct-border-strong);
  background: linear-gradient(
    180deg,
    var(--ct-theme-surface-card-strong),
    var(--ct-theme-surface-info)
  );
}
.ct-admin__button--ghost {
  color: var(--ct-theme-text-body);
  border: 1px solid var(--ct-border-soft);
  background: var(--ct-theme-surface-card-strong);
}
.ct-admin__status {
  margin: 0;
  font-size: 0.88rem;
  color: var(--ct-theme-text-muted);
}
.ct-admin__status[data-tone='error'] {
  color: var(--ct-theme-state-danger);
}
.ct-admin__status[data-tone='success'] {
  color: var(--ct-theme-state-success);
}
.ct-admin__status[data-tone='info'] {
  color: var(--ct-theme-text-muted);
}
.ct-admin__status[data-tone='warning'] {
  color: var(--ct-theme-state-warning);
}
.ct-admin__hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ct-theme-text-subtle);
}
.ct-admin__secret {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.4;
  padding: 0.6rem;
  border-radius: var(--ct-radius-sm);
  background: var(--ct-theme-surface-info);
  border: 1px solid var(--ct-border-soft);
  overflow-wrap: anywhere;
}
.ct-admin__code-output {
  margin: 0;
  padding: 0.68rem;
  border-radius: var(--ct-radius-sm);
  border: 1px solid var(--ct-border-soft);
  background: var(--ct-theme-surface-info);
  color: var(--ct-theme-text-body);
  font-size: 0.79rem;
  line-height: 1.35;
  overflow: auto;
  max-height: 14rem;
}
.ct-admin__table-wrap {
  overflow: auto;
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-md);
  background: var(--ct-theme-surface-shell);
}
.ct-admin__table {
  width: 100%;
  border-collapse: collapse;
}
.ct-admin__table th,
.ct-admin__table td {
  text-align: left;
  border-bottom: 1px solid var(--ct-border-soft);
  padding: 0.55rem;
  vertical-align: top;
  font-size: 0.9rem;
}
.ct-admin__table a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
}
.ct-admin__empty {
  color: var(--ct-color-ink-soft);
  text-align: center;
  padding: 0.8rem 0.55rem;
}
.ct-admin__meta {
  color: var(--ct-color-ink-soft);
  font-size: 0.82rem;
}
.ct-admin__status-pill {
  display: inline-flex;
  padding: 0.14rem 0.45rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
  border: 1px solid var(--ct-border-soft);
  background: var(--ct-theme-surface-soft);
  color: var(--ct-theme-text-muted);
}
.ct-admin__status-pill--draft,
.ct-admin__status-pill--pending_approval {
  background: var(--ct-theme-surface-warning);
  color: var(--ct-theme-state-warning);
  border-color: var(--ct-theme-border-warning);
}
.ct-admin__status-pill--approved,
.ct-admin__status-pill--active {
  background: var(--ct-theme-surface-success);
  color: var(--ct-theme-state-success);
  border-color: var(--ct-theme-border-success);
}
.ct-admin__status-pill--suspended,
.ct-admin__status-pill--expired {
  background: var(--ct-theme-surface-warning);
  color: var(--ct-theme-state-warning);
  border-color: var(--ct-theme-border-warning);
}
.ct-admin__status-pill--rejected,
.ct-admin__status-pill--deprecated,
.ct-admin__status-pill--revoked {
  background: var(--ct-theme-surface-danger);
  color: var(--ct-theme-state-danger);
  border-color: var(--ct-theme-border-danger);
}
.ct-admin__assertion-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  color: var(--ct-theme-text-subtle);
  overflow-wrap: anywhere;
}
.ct-admin__actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.32rem;
}
.ct-admin__template-image {
  width: 3.2rem;
  height: 3.2rem;
  border-radius: var(--ct-radius-sm);
  object-fit: cover;
  border: 1px solid var(--ct-border-strong);
}
.ct-admin__template-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.2rem;
  height: 3.2rem;
  border-radius: var(--ct-radius-sm);
  border: 1px dashed var(--ct-border-strong);
  font-size: 0.72rem;
  color: var(--ct-color-ink-soft);
}
.ct-admin__panel--table {
  padding: 0.9rem;
}
.ct-admin__panel--table > h2,
.ct-admin__panel--table > p,
.ct-admin__panel--table > .ct-admin__status {
  padding-inline: 0.1rem;
}
.ct-admin__builder-layout {
  --ct-grid-gap: var(--ct-space-4);
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 21rem);
  align-items: start;
}
.ct-admin__builder-step[hidden] {
  display: none;
}
.ct-admin__builder-step-nav {
  justify-content: flex-start;
  position: sticky;
  bottom: 0;
  z-index: 2;
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-md);
  background: var(--ct-theme-surface-shell);
  box-shadow: var(--ct-shadow-soft);
  padding: 0.58rem 0.62rem;
  backdrop-filter: blur(6px);
}
.ct-admin__builder-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.44rem;
}
.ct-admin__step-button {
  border: 1px solid var(--ct-border-strong);
  border-radius: var(--ct-radius-pill);
  background: var(--ct-theme-surface-info);
  color: var(--ct-theme-text-body);
  min-height: 2.75rem;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.5rem 0.92rem;
  cursor: pointer;
  transition:
    border-color var(--ct-duration-fast) var(--ct-ease-standard),
    background var(--ct-duration-fast) var(--ct-ease-standard),
    color var(--ct-duration-fast) var(--ct-ease-standard),
    box-shadow var(--ct-duration-fast) var(--ct-ease-standard);
}
.ct-admin__step-button:hover {
  border-color: var(--ct-theme-border-focus);
}
.ct-admin__step-button.is-done {
  border-color: var(--ct-theme-border-success);
  background: var(--ct-theme-surface-success);
  color: var(--ct-theme-state-success);
}
.ct-admin__step-button.is-done::after {
  content: "  ✓";
  font-weight: 800;
}
.ct-admin__step-button.is-active {
  color: var(--ct-theme-text-on-brand);
  border-color: transparent;
  background: var(--ct-theme-gradient-action);
  box-shadow: var(--ct-shadow-soft);
}
.ct-admin__builder-step-nav #rule-builder-submit {
  margin-left: auto;
}
.ct-admin__builder-advanced {
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-md);
  background: var(--ct-theme-surface-soft);
  padding: 0.58rem 0.64rem;
}
.ct-admin__builder-advanced > summary {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  cursor: pointer;
  font-weight: 700;
  color: var(--ct-color-ink);
}
.ct-admin__builder-advanced[open] > summary {
  margin-bottom: 0.45rem;
}
.ct-admin__builder-guide {
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-md);
  background: var(--ct-theme-surface-soft);
  padding: 0.58rem 0.64rem;
}
.ct-admin__builder-guide > summary {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  cursor: pointer;
  font-weight: 700;
  color: var(--ct-color-ink);
}
.ct-admin__builder-guide[open] > summary {
  margin-bottom: 0.45rem;
}
.ct-admin__builder-guide-list {
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}
.ct-admin__builder-guide-list > div {
  display: grid;
  gap: 0.1rem;
}
.ct-admin__builder-guide-list dt {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ct-color-ink);
}
.ct-admin__builder-guide-list dd {
  margin: 0;
  font-size: 0.79rem;
  color: var(--ct-theme-text-muted);
}
.ct-admin__builder-rail {
  position: sticky;
  top: 1rem;
  align-self: start;
}
.ct-admin__builder-summary-list {
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.48rem;
}
.ct-admin__builder-summary-list > div {
  display: grid;
  gap: 0.12rem;
}
.ct-admin__builder-summary-list dt {
  font-size: 0.8rem;
  color: var(--ct-color-ink-soft);
}
.ct-admin__builder-summary-list dd {
  margin: 0;
  color: var(--ct-color-ink);
  font-weight: 700;
}
.ct-admin__builder-summary-value[data-tone='success'] {
  color: var(--ct-theme-state-success);
}
.ct-admin__builder-summary-value[data-tone='warning'] {
  color: var(--ct-theme-state-warning);
}
.ct-admin__builder-summary-value[data-tone='error'] {
  color: var(--ct-theme-state-danger);
}
@media (max-width: 780px) {
  .ct-admin__form--inline.ct-grid,
  .ct-admin__builder-grid.ct-grid,
  .ct-admin__condition-fields.ct-grid,
  .ct-admin__condition-header-fields.ct-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ct-admin__quick-links,
  .ct-admin__builder-steps {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ct-admin__quick-links a,
  .ct-admin__step-button {
    width: 100%;
    justify-content: center;
    text-align: center;
  }

  .ct-admin__builder-inline,
  .ct-admin__builder-toolbar,
  .ct-admin__builder-step-nav {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .ct-admin__builder-step-nav {
    justify-items: stretch;
  }

  .ct-admin__builder-inline > .ct-admin__button,
  .ct-admin__builder-toolbar .ct-admin__button,
  .ct-admin__builder-step-nav .ct-admin__button,
  .ct-admin__builder-step-nav #rule-builder-submit {
    width: 100%;
  }

  .ct-admin__builder-step-nav #rule-builder-submit {
    margin-left: 0;
  }
}
@media (max-width: 980px) {
  .ct-admin__builder-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .ct-admin__builder-rail {
    position: static;
    top: auto;
  }
}
@media (min-width: 980px) {
  .ct-admin__layout {
    align-items: start;
  }
}

`;
