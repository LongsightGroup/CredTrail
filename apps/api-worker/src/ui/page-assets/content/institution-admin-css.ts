export const INSTITUTION_ADMIN_CSS = `
/* ── Admin shell layout ── */
.ct-admin-shell {
  display: grid;
  grid-template-columns: 15rem 1fr;
  min-height: 100vh;
}
.ct-admin-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  background: #ffffff;
  border-right: 1px solid var(--ct-border-soft);
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 0;
}
.ct-admin-sidebar__brand {
  padding: 1.25rem 1.25rem 1rem;
  font-family: var(--ct-font-display);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ct-theme-text-title);
  letter-spacing: -0.02em;
  text-decoration: none;
  display: block;
  border-bottom: 1px solid var(--ct-border-soft);
}
.ct-admin-sidebar__nav {
  padding: 0.75rem 0;
  display: grid;
  gap: 0.15rem;
  align-content: start;
}
.ct-admin-sidebar__section-label {
  margin: 0;
  padding: 0.85rem 1.25rem 0.35rem;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  color: var(--ct-theme-text-subtle);
}
.ct-admin-sidebar__link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  font-size: 0.86rem;
  font-weight: 500;
  color: var(--ct-theme-text-body);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition:
    background var(--ct-duration-fast) var(--ct-ease-standard),
    color var(--ct-duration-fast) var(--ct-ease-standard),
    border-color var(--ct-duration-fast) var(--ct-ease-standard);
}
.ct-admin-sidebar__link:hover {
  background: var(--ct-theme-surface-soft);
  color: var(--ct-theme-text-title);
}
.ct-admin-sidebar__link[aria-current='page'] {
  background: var(--ct-theme-surface-info);
  color: var(--ct-brand-lake-700);
  font-weight: 600;
  border-left-color: var(--ct-brand-lake-700);
}
.ct-admin-sidebar__link--sub {
  padding-left: 2.25rem;
  font-size: 0.83rem;
}
.ct-admin-sidebar__link--external::after {
  content: '↗';
  font-size: 0.72rem;
  opacity: 0.5;
  margin-left: auto;
}
.ct-admin-sidebar__footer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--ct-border-soft);
}
.ct-admin-sidebar__footer-link {
  display: block;
  padding: 0.4rem 0;
  font-size: 0.82rem;
  color: var(--ct-theme-text-muted);
  text-decoration: none;
}
.ct-admin-sidebar__footer-link:hover {
  color: var(--ct-theme-text-title);
}
.ct-admin-main {
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 100vh;
  min-width: 0;
}
.ct-admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 1.5rem;
  border-bottom: 1px solid var(--ct-border-soft);
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
}
.ct-admin-topbar__title {
  margin: 0;
  font-family: var(--ct-font-sans);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ct-theme-text-title);
}
.ct-admin-topbar__user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--ct-theme-text-muted);
}
.ct-admin-topbar__chip {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.5rem;
  border-radius: var(--ct-radius-pill);
  font-size: 0.73rem;
  font-weight: 600;
  background: var(--ct-theme-surface-soft);
  border: 1px solid var(--ct-border-soft);
  color: var(--ct-theme-text-muted);
}
.ct-admin-topbar__toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-sm);
  background: transparent;
  cursor: pointer;
  font-size: 1.1rem;
  color: var(--ct-theme-text-body);
}
.ct-admin-content {
  padding: 1.75rem 2rem;
  max-width: 1200px;
}
.ct-admin-page-header {
  margin-bottom: 1.5rem;
}
.ct-admin-page-header h1 {
  margin: 0 0 0.35rem;
  font-size: clamp(1.25rem, 2.5vw, 1.6rem);
  color: var(--ct-theme-text-title);
  line-height: 1.25;
}
.ct-admin-page-header p {
  margin: 0;
  color: var(--ct-theme-text-muted);
  font-size: 0.92rem;
  line-height: 1.5;
  max-width: 46rem;
}
.ct-admin-page-header__note {
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  border-radius: var(--ct-radius-md);
  border: 1px solid var(--ct-theme-border-info);
  background: var(--ct-theme-surface-info);
}
.ct-admin-page-header__note h2 {
  margin: 0 0 0.25rem;
  font-size: 0.92rem;
}
.ct-admin-page-header__note p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ct-theme-text-muted);
}

/* ── Mobile responsive ── */
@media (max-width: 768px) {
  .ct-admin-shell {
    grid-template-columns: 1fr;
  }
  .ct-admin-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 16rem;
    height: 100vh;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform var(--ct-duration-standard) var(--ct-ease-standard);
    box-shadow: var(--ct-shadow-shell);
  }
  .ct-admin-sidebar--open {
    transform: translateX(0);
  }
  .ct-admin-sidebar__backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(7, 26, 49, 0.3);
    z-index: 99;
  }
  .ct-admin-sidebar--open + .ct-admin-main .ct-admin-sidebar__backdrop {
    display: block;
  }
  .ct-admin-topbar__toggle {
    display: inline-flex;
  }
  .ct-admin-content {
    padding: 1.25rem 1rem;
  }
}

/* ── Legacy admin content styles ── */
.ct-admin {
  --ct-stack-gap: var(--ct-space-4);
}
.ct-admin__eyebrow {
  margin: 0;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  color: var(--ct-theme-text-subtle);
}
.ct-admin__workspace-grid.ct-grid {
  --ct-grid-gap: 0.9rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.ct-admin__workspace-card {
  --ct-stack-gap: 0.7rem;
  padding: 1rem;
  border-radius: var(--ct-radius-lg);
  border: 1px solid var(--ct-border-soft);
  background: linear-gradient(
    165deg,
    var(--ct-theme-surface-card-strong),
    var(--ct-theme-surface-soft)
  );
  box-shadow: var(--ct-shadow-soft);
}
.ct-admin__workspace-card h2 {
  margin: 0;
  font-size: 1.05rem;
}
.ct-admin__workspace-card p {
  margin: 0;
  color: var(--ct-theme-text-muted);
  font-size: 0.9rem;
}
.ct-admin__workspace-stats {
  --ct-cluster-gap: 0.4rem;
}
.ct-admin__workspace-actions {
  --ct-cluster-gap: 0.45rem;
}
.ct-admin__workspace-actions .ct-admin__button,
.ct-admin__workspace-actions .ct-admin__cta-link {
  min-height: 2.75rem;
  border-radius: var(--ct-radius-pill);
}
.ct-admin__metric-grid {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}
.ct-admin__metric-grid--rates {
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
}
.ct-admin__metric-card {
  padding: 1rem;
  border-radius: var(--ct-radius-lg);
  border: 1px solid var(--ct-border-soft);
  background: var(--ct-theme-surface-card);
  box-shadow: var(--ct-shadow-soft);
}
.ct-admin__metric-card--rate {
  background: linear-gradient(
    165deg,
    rgba(238, 246, 255, 0.95),
    rgba(255, 255, 255, 0.98)
  );
}
.ct-admin__metric-value {
  font-size: 2rem;
  line-height: 1;
}
.ct-admin__reporting-bar-value {
  --ct-reporting-bar-ratio: 0;
  display: grid;
  gap: 0.32rem;
  min-width: 6.2rem;
}
.ct-admin__reporting-bar-number {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--ct-theme-text-title);
}
.ct-admin__reporting-bar-track {
  display: block;
  width: 100%;
  height: 0.38rem;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(15, 95, 166, 0.12);
}
.ct-admin__reporting-bar-fill {
  display: block;
  width: calc(var(--ct-reporting-bar-ratio) * 100%);
  min-width: 0;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ct-brand-lake-500), var(--ct-brand-lake-700));
  transition: width var(--ct-duration-standard) var(--ct-ease-standard);
}
.ct-admin__reporting-root-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}
.ct-admin__reporting-root-link {
  display: inline-flex;
  align-items: center;
  min-height: 2.25rem;
  padding: 0.35rem 0.85rem;
  border-radius: var(--ct-radius-pill);
  border: 1px solid var(--ct-border-soft);
  background: var(--ct-theme-surface-card);
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
}
.ct-admin__reporting-focus-section {
  padding: 1rem;
  border-radius: var(--ct-radius-md);
  border: 1px solid var(--ct-border-soft);
  background: rgba(255, 255, 255, 0.72);
}
.ct-admin__reporting-focus-section:target,
.ct-admin__reporting-focus-section[data-reporting-focus-active='true'] {
  border-color: var(--ct-theme-border-info);
  box-shadow: 0 0 0 3px rgba(15, 95, 166, 0.12);
  background: rgba(238, 246, 255, 0.72);
}
.ct-admin__reporting-breadcrumb {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ct-theme-text-title);
}
.ct-admin__reporting-performer-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
}
.ct-admin__table--compact th,
.ct-admin__table--compact td {
  padding-block: 0.55rem;
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
  font-size: 0.88rem;
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
  font-size: 0.9rem;
}
.ct-admin__panel h3,
.ct-admin__panel h4 {
  margin: 0;
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
  font-size: 0.88rem;
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
  font-size: 0.92rem;
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
.ct-admin__builder-shell {
  --ct-grid-gap: var(--ct-space-4);
  grid-template-columns: minmax(16rem, 18rem) minmax(0, 1fr) minmax(17rem, 20rem);
  align-items: start;
}
.ct-admin__builder-shell > * {
  min-width: 0;
}
.ct-admin__builder-sidebar,
.ct-admin__builder-rail {
  position: sticky;
  top: 1rem;
  align-self: start;
}
.ct-admin__builder-main {
  min-width: 0;
}
.ct-admin__builder-intro-grid.ct-grid {
  --ct-grid-gap: 0.7rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.ct-admin__builder-intro-card {
  --ct-stack-gap: 0.35rem;
  padding: 0.8rem 0.82rem;
  border-radius: var(--ct-radius-md);
  border: 1px solid var(--ct-border-soft);
  background: var(--ct-theme-surface-soft);
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
.ct-admin__builder-workbench.ct-grid {
  --ct-grid-gap: 0.8rem;
  grid-template-columns: minmax(0, 1.7fr) minmax(15rem, 0.95fr);
  align-items: start;
}
.ct-admin__builder-workbench-main {
  min-width: 0;
}
.ct-admin__builder-patterns {
  --ct-stack-gap: 0.6rem;
  padding: 0.75rem;
  border-radius: var(--ct-radius-md);
  border: 1px solid var(--ct-border-soft);
  background: linear-gradient(
    180deg,
    var(--ct-theme-surface-card-strong),
    var(--ct-theme-surface-soft)
  );
}
.ct-admin__builder-patterns-head {
  --ct-stack-gap: 0.28rem;
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
.ct-admin__builder-test-layout.ct-grid,
.ct-admin__builder-review-layout.ct-grid {
  --ct-grid-gap: 0.8rem;
  grid-template-columns: minmax(0, 1.45fr) minmax(15rem, 0.95fr);
  align-items: start;
}
.ct-admin__builder-simulation {
  padding: 0.82rem;
  border-radius: var(--ct-radius-md);
  border: 1px solid var(--ct-border-soft);
  background: linear-gradient(
    180deg,
    var(--ct-theme-surface-card-strong),
    var(--ct-theme-surface-soft)
  );
}
.ct-admin__builder-test-rail,
.ct-admin__builder-checklist-panel,
.ct-admin__builder-rail-card {
  padding: 0.78rem 0.82rem;
  border-radius: var(--ct-radius-md);
  border: 1px solid var(--ct-border-soft);
  background: var(--ct-theme-surface-soft);
}
.ct-admin__builder-checklist {
  margin: 0;
  padding: 0 0 0 1rem;
  display: grid;
  gap: 0.34rem;
  color: var(--ct-theme-text-body);
}
.ct-admin__builder-checklist li {
  line-height: 1.35;
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
.ct-admin__condition-card--result-review {
  border-right: 3px solid var(--ct-theme-state-warning);
  background: linear-gradient(
    160deg,
    var(--ct-theme-surface-warning),
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
.ct-admin__condition-result[data-state='review'] {
  color: var(--ct-theme-state-warning);
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
  transition:
    transform var(--ct-duration-fast) var(--ct-ease-standard),
    box-shadow var(--ct-duration-fast) var(--ct-ease-standard),
    filter var(--ct-duration-fast) var(--ct-ease-standard);
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
  transition:
    transform var(--ct-duration-fast) var(--ct-ease-standard),
    box-shadow var(--ct-duration-fast) var(--ct-ease-standard),
    filter var(--ct-duration-fast) var(--ct-ease-standard);
}
@media (hover: hover) {
  .ct-admin__form button:hover:not(:disabled),
  .ct-admin__button:hover {
    transform: translateY(-1px);
    box-shadow: var(--ct-shadow-soft);
    filter: brightness(1.03);
  }

  .ct-admin__table .ct-admin__action-pill:hover,
  .ct-admin__action-menu-item:hover {
    transform: translateY(-1px);
  }

  .ct-admin__table .ct-admin__action-pill--primary:hover {
    box-shadow: var(--ct-shadow-card);
    filter: brightness(1.03);
  }

  .ct-admin__table .ct-admin__action-pill:not(.ct-admin__action-pill--primary):hover {
    background: var(--ct-theme-surface-info);
  }

  .ct-admin__action-menu-item:hover {
    background: var(--ct-theme-surface-info);
  }

  .ct-admin__action-menu-item--danger:hover {
    background: var(--ct-theme-surface-danger);
  }
}
.ct-admin__form button:focus-visible,
.ct-admin__button:focus-visible {
  outline: 2px solid var(--ct-theme-border-focus);
  outline-offset: 3px;
  box-shadow: var(--ct-shadow-soft);
}
.ct-admin__table .ct-admin__action-pill:focus-visible,
.ct-admin__action-menu-item:focus-visible {
  outline: 2px solid var(--ct-theme-border-focus);
  outline-offset: 2px;
}
.ct-admin__form button:active:not(:disabled),
.ct-admin__button:active {
  transform: translateY(0);
  box-shadow: none;
  filter: none;
}
.ct-admin__table .ct-admin__action-pill:active,
.ct-admin__action-menu-item:active {
  transform: translateY(0);
}
.ct-admin__form button:disabled {
  opacity: 0.66;
  cursor: progress;
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
  font-size: 0.88rem;
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
.ct-admin__issued-actions-cell {
  width: 1%;
  white-space: nowrap;
}
.ct-admin__issued-actions {
  display: grid;
  justify-items: start;
  gap: 0.4rem;
}
.ct-admin__action-bar {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.18rem;
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-pill);
  background: linear-gradient(
    180deg,
    var(--ct-theme-surface-card-strong),
    var(--ct-theme-surface-shell)
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.ct-admin__table .ct-admin__action-pill,
.ct-admin__table button.ct-admin__action-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.1rem;
  padding: 0.45rem 0.78rem;
  border: none;
  border-radius: var(--ct-radius-pill);
  background: transparent;
  color: var(--ct-theme-text-body);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--ct-duration-fast) var(--ct-ease-standard),
    color var(--ct-duration-fast) var(--ct-ease-standard),
    box-shadow var(--ct-duration-fast) var(--ct-ease-standard),
    transform var(--ct-duration-fast) var(--ct-ease-standard);
}
.ct-admin__table button.ct-admin__action-pill {
  font: inherit;
}
.ct-admin__table .ct-admin__action-pill--primary {
  color: var(--ct-theme-text-on-brand);
  background: var(--ct-theme-gradient-action);
  box-shadow: var(--ct-shadow-soft);
}
.ct-admin__action-pill--menu {
  min-width: 2.1rem;
  padding-inline: 0.62rem;
}
.ct-admin__action-menu > summary {
  list-style: none;
}
.ct-admin__action-menu > summary::-webkit-details-marker {
  display: none;
}
.ct-admin__action-menu[open] > .ct-admin__action-pill--menu {
  background: var(--ct-theme-surface-info);
}
.ct-admin__action-menu-popover {
  display: none;
}
.ct-admin__action-menu[open] .ct-admin__action-menu-popover {
  display: grid;
  gap: 0.18rem;
  min-width: 11rem;
  margin-top: 0.42rem;
  padding: 0.32rem;
  border: 1px solid var(--ct-border-strong);
  border-radius: var(--ct-radius-md);
  background: linear-gradient(
    180deg,
    var(--ct-theme-surface-card-strong),
    var(--ct-theme-surface-soft)
  );
  box-shadow: var(--ct-shadow-card);
}
.ct-admin__table .ct-admin__action-menu-item,
.ct-admin__table button.ct-admin__action-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 0;
  padding: 0.55rem 0.7rem;
  border: none;
  border-radius: var(--ct-radius-sm);
  background: transparent;
  color: var(--ct-theme-text-body);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.25;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}
.ct-admin__table button.ct-admin__action-menu-item {
  font: inherit;
}
.ct-admin__action-menu-item--danger {
  color: var(--ct-theme-state-danger);
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
.ct-admin__panel--nested {
  padding: 0.75rem;
  background: var(--ct-theme-surface-soft);
}
.ct-admin__builder-step[hidden] {
  display: none;
}
.ct-admin__builder-step-nav {
  --ct-grid-gap: 0.5rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-md);
  background: var(--ct-theme-surface-shell);
  box-shadow: var(--ct-shadow-soft);
  padding: 0.58rem 0.62rem;
}
.ct-admin__builder-step-nav #rule-builder-submit {
  grid-column: 1 / -1;
}
.ct-admin__builder-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.48rem;
}
.ct-admin__step-button {
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 0.65rem;
  text-align: left;
  border: 1px solid var(--ct-border-strong);
  border-radius: var(--ct-radius-md);
  background: var(--ct-theme-surface-info);
  color: var(--ct-theme-text-body);
  min-height: 2.75rem;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
  transition:
    border-color var(--ct-duration-fast) var(--ct-ease-standard),
    background var(--ct-duration-fast) var(--ct-ease-standard),
    color var(--ct-duration-fast) var(--ct-ease-standard),
    box-shadow var(--ct-duration-fast) var(--ct-ease-standard);
}
.ct-admin__step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.7rem;
  block-size: 1.7rem;
  border-radius: 999px;
  border: 1px solid var(--ct-border-soft);
  background: var(--ct-theme-surface-card-strong);
  color: var(--ct-theme-text-subtle);
  font-size: 0.78rem;
}
.ct-admin__step-copy {
  display: grid;
  gap: 0.16rem;
}
.ct-admin__step-copy strong {
  font-size: 0.84rem;
}
.ct-admin__step-copy small {
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--ct-theme-text-muted);
}
.ct-admin__step-button:hover {
  border-color: var(--ct-theme-border-focus);
}
.ct-admin__step-button.is-done {
  border-color: var(--ct-theme-border-success);
  background: var(--ct-theme-surface-success);
  color: var(--ct-theme-state-success);
}
.ct-admin__step-button.is-done .ct-admin__step-number {
  border-color: var(--ct-theme-border-success);
  background: var(--ct-theme-surface-card-strong);
  color: var(--ct-theme-state-success);
}
.ct-admin__step-button.is-done .ct-admin__step-copy strong::after {
  content: ' \u2713';
  font-weight: 800;
}
.ct-admin__step-button.is-active {
  color: var(--ct-theme-text-on-brand);
  border-color: transparent;
  background: var(--ct-theme-gradient-action);
  box-shadow: var(--ct-shadow-soft);
}
.ct-admin__step-button.is-active .ct-admin__step-number {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.18);
  color: var(--ct-theme-text-on-brand);
}
.ct-admin__step-button.is-active .ct-admin__step-copy small {
  color: rgba(255, 255, 255, 0.78);
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

/* ── Responsive breakpoints ── */
@media (max-width: 780px) {
  .ct-admin__form--inline.ct-grid,
  .ct-admin__builder-grid.ct-grid,
  .ct-admin__condition-fields.ct-grid,
  .ct-admin__condition-header-fields.ct-grid,
  .ct-admin__builder-intro-grid.ct-grid,
  .ct-admin__builder-workbench.ct-grid,
  .ct-admin__builder-test-layout.ct-grid,
  .ct-admin__builder-review-layout.ct-grid,
  .ct-admin__workspace-grid.ct-grid {
    grid-template-columns: minmax(0, 1fr);
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
}
@media (max-width: 1180px) {
  .ct-admin__builder-shell,
  .ct-admin__workspace-grid.ct-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ct-admin__builder-sidebar,
  .ct-admin__builder-rail {
    position: static;
    top: auto;
  }
}
@media (max-width: 980px) {
  .ct-admin__layout.ct-grid--sidebar {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (min-width: 980px) {
  .ct-admin__layout {
    align-items: start;
  }
}

`;
