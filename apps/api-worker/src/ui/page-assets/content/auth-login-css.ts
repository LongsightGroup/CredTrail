export const AUTH_LOGIN_CSS = `
.ct-login {
  --ct-stack-gap: var(--ct-space-4);
  width: min(100%, 28rem);
  margin-inline: auto;
}

.ct-login__card {
  border: 1px solid var(--ct-theme-border-soft);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: var(--ct-theme-shadow-soft);
  background: var(--ct-theme-surface-card-strong);
}

.ct-login__header {
  display: grid;
  gap: 0.65rem;
  padding: 1.5rem 1.5rem 0;
}

.ct-login__brand {
  margin: 0;
  font-family: var(--ct-font-display);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ct-theme-text-title);
  letter-spacing: -0.02em;
}

.ct-login__title {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.2;
  color: var(--ct-theme-text-title);
  text-wrap: balance;
}

.ct-login__lede {
  margin: 0;
  color: var(--ct-theme-text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.ct-login__form-wrap {
  --ct-stack-gap: 0.9rem;
  padding: 1.25rem 1.5rem 1.5rem;
  align-content: start;
}

.ct-login__form-wrap > section {
  display: grid;
  gap: 0.72rem;
}

.ct-login__form-wrap > section + section {
  margin-top: 0.1rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--ct-theme-border-soft);
}

.ct-login__form-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--ct-theme-text-title);
}

.ct-login__form-text {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--ct-theme-text-muted);
}

.ct-login__context {
  margin: 0;
  border: 1px solid var(--ct-theme-border-info);
  border-radius: var(--ct-radius-md);
  padding: 0.65rem 0.75rem;
  background: var(--ct-theme-surface-info);
  color: var(--ct-theme-text-body);
  font-size: 0.86rem;
  line-height: 1.45;
}

.ct-login__form {
  --ct-stack-gap: 0.65rem;
}

.ct-login__field {
  --ct-stack-gap: 0.3rem;
}

.ct-login__field span {
  font-size: 0.84rem;
  color: var(--ct-theme-text-title);
  font-weight: 600;
}

.ct-login__field-help {
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--ct-theme-text-muted);
  font-weight: 400;
}

.ct-login__field input {
  border: 1px solid var(--ct-theme-border-default);
  border-radius: var(--ct-radius-md);
  min-height: 2.75rem;
  padding: 0.6rem 0.75rem;
  font-size: 0.92rem;
  color: var(--ct-theme-text-body);
  background: var(--ct-theme-surface-card-strong);
  transition:
    border-color var(--ct-duration-fast) var(--ct-ease-standard),
    box-shadow var(--ct-duration-fast) var(--ct-ease-standard);
}

.ct-login__field input:hover {
  border-color: var(--ct-theme-border-strong);
}

.ct-login__field input:focus {
  outline: none;
  border-color: var(--ct-brand-lake-700);
  box-shadow: var(--ct-focus-ring);
}

.ct-login__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--ct-radius-md);
  min-height: 2.75rem;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ct-theme-text-on-brand);
  background: var(--ct-theme-gradient-action);
  cursor: pointer;
  text-decoration: none;
  transition:
    transform var(--ct-duration-fast) var(--ct-ease-standard),
    box-shadow var(--ct-duration-fast) var(--ct-ease-standard),
    background var(--ct-duration-fast) var(--ct-ease-standard);
}

.ct-login__submit:hover {
  transform: translateY(-1px);
  background: var(--ct-theme-gradient-action-hover);
  box-shadow: var(--ct-theme-shadow-soft);
}

.ct-login__submit:focus-visible {
  outline: none;
  box-shadow:
    var(--ct-focus-ring),
    var(--ct-theme-shadow-soft);
}

.ct-login__status {
  margin: 0;
  border-radius: var(--ct-radius-md);
  padding: 0.55rem 0.65rem;
  font-size: 0.86rem;
  border: 1px solid var(--ct-border-soft);
  background: var(--ct-theme-surface-info);
  color: var(--ct-theme-text-muted);
  min-height: 1.2rem;
}

.ct-login__status[hidden] {
  display: none;
}

.ct-login__status[data-tone='info'] {
  border-color: var(--ct-theme-border-info);
  background: var(--ct-theme-surface-info);
  color: var(--ct-theme-text-body);
}

.ct-login__status[data-tone='error'] {
  border-color: var(--ct-theme-border-danger);
  background: var(--ct-theme-surface-danger);
  color: var(--ct-theme-state-danger);
}

.ct-login__status[data-tone='success'] {
  border-color: var(--ct-theme-border-success);
  background: var(--ct-theme-surface-success);
  color: var(--ct-theme-state-success);
}

.ct-login__dev {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ct-theme-text-muted);
}

.ct-login__dev a {
  font-weight: 700;
}

.ct-login__help {
  margin: 0;
  color: var(--ct-theme-text-muted);
  font-size: 0.82rem;
  line-height: 1.4;
}

.ct-login__back {
  margin: 0;
  color: var(--ct-theme-text-muted);
  font-size: 0.82rem;
  line-height: 1.35;
  padding-top: 0.25rem;
  border-top: 1px solid var(--ct-theme-border-soft);
}

.ct-login__back a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  padding: 0.25rem 0;
  font-weight: 600;
}

.ct-login__organization-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.6rem;
}

.ct-login__organization-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--ct-theme-border-soft);
  border-radius: var(--ct-radius-md);
  background: var(--ct-theme-surface-soft);
}

.ct-login__organization-copy {
  display: grid;
  gap: 0.18rem;
}

.ct-login__organization-name {
  margin: 0;
  color: var(--ct-theme-text-title);
  font-weight: 700;
  font-size: 0.92rem;
}

.ct-login__organization-current {
  display: inline-flex;
  align-items: center;
  margin-left: 0.4rem;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  background: var(--ct-theme-surface-info);
  color: var(--ct-theme-link);
  font-size: 0.72rem;
  font-weight: 700;
  vertical-align: middle;
}

.ct-login__organization-meta {
  margin: 0;
  color: var(--ct-theme-text-muted);
  font-size: 0.82rem;
  line-height: 1.4;
}

@media (min-width: 900px) {
  .ct-login {
    width: min(100%, 30rem);
  }
}
`;
