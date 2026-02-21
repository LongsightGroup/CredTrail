export const LTI_PAGES_CSS = `
.lti-launch {
  display: grid;
  gap: 1rem;
  max-width: 58rem;
}

.lti-launch__hero {
  border: 1px solid rgba(0, 39, 76, 0.16);
  border-radius: 1rem;
  padding: 1rem;
  background:
    radial-gradient(circle at 90% 12%, rgba(255, 203, 5, 0.24), transparent 43%),
    linear-gradient(135deg, rgba(0, 39, 76, 0.95), rgba(12, 83, 158, 0.88));
  color: #f7fcff;
}

.lti-launch__hero h1 {
  margin: 0;
  color: #f7fcff;
}

.lti-launch__hero p {
  margin: 0.25rem 0 0 0;
  color: rgba(247, 252, 255, 0.88);
}

.lti-launch__card {
  border: 1px solid rgba(0, 39, 76, 0.14);
  border-radius: 1rem;
  padding: 1rem;
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.97), rgba(247, 251, 255, 0.94));
  box-shadow: 0 14px 25px rgba(0, 39, 76, 0.12);
}

.lti-launch__card--stack {
  display: grid;
  gap: 0.45rem;
}

.lti-launch__hint {
  margin: 0;
  color: #3f5f83;
}

.lti-launch__details {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(12rem, max-content) 1fr;
  gap: 0.45rem 0.8rem;
}

.lti-launch__details dt {
  font-weight: 600;
  color: #103861;
}

.lti-launch__details dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: #3a587a;
}

.lti-deep-link {
  display: grid;
  gap: 1rem;
  max-width: 64rem;
}

.lti-deep-link__hero {
  border: 1px solid rgba(0, 39, 76, 0.16);
  border-radius: 1rem;
  padding: 1rem;
  background:
    radial-gradient(circle at 88% 14%, rgba(255, 203, 5, 0.26), transparent 42%),
    linear-gradient(135deg, rgba(0, 39, 76, 0.95), rgba(12, 83, 158, 0.88));
  color: #f7fcff;
}

.lti-deep-link__hero h1 {
  margin: 0;
  color: #f7fcff;
}

.lti-deep-link__hero p {
  margin: 0.3rem 0 0 0;
  color: rgba(247, 252, 255, 0.9);
}

.lti-deep-link__details {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(11rem, max-content) 1fr;
  gap: 0.35rem 0.7rem;
}

.lti-deep-link__details dt {
  font-weight: 600;
}

.lti-deep-link__details dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.lti-deep-link__details-card {
  border: 1px solid rgba(0, 39, 76, 0.14);
  border-radius: 0.9rem;
  padding: 0.9rem;
  background: rgba(255, 255, 255, 0.94);
}

.lti-deep-link__options {
  display: grid;
  gap: 0.85rem;
}

.lti-deep-link__option {
  border: 1px solid rgba(0, 39, 76, 0.14);
  border-radius: 0.9rem;
  padding: 0.9rem;
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.97), rgba(247, 251, 255, 0.94));
  box-shadow: 0 12px 22px rgba(0, 39, 76, 0.1);
  display: grid;
  gap: 0.4rem;
}

.lti-deep-link__option h2 {
  margin: 0;
  font-size: 1.08rem;
}

.lti-deep-link__meta,
.lti-deep-link__description {
  margin: 0;
  color: #355577;
  overflow-wrap: anywhere;
}

.lti-deep-link__form {
  margin-top: 0.25rem;
}

.lti-deep-link__form button {
  border: none;
  border-radius: 0.7rem;
  padding: 0.5rem 0.9rem;
  font-weight: 700;
  color: #f7fbff;
  background: linear-gradient(115deg, #00274c 0%, #0a4c8f 78%);
  cursor: pointer;
}

.lti-deep-link__notice {
  margin: 0;
  padding: 0.75rem;
  border-radius: 0.7rem;
  border: 1px solid rgba(173, 94, 0, 0.28);
  background: rgba(255, 245, 230, 0.9);
  color: #7f4a0c;
}

.lti-deep-link__empty {
  margin: 0;
  color: #3f5f83;
}

.lti-registration {
  display: grid;
  gap: 1rem;
  max-width: 64rem;
}

.lti-registration__title,
.lti-registration__lede {
  margin: 0;
}

.lti-registration__lede {
  color: #334155;
}

.lti-registration__error {
  margin: 0;
  padding: 0.75rem;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.lti-registration__form {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
}

.lti-registration__field {
  display: grid;
  gap: 0.35rem;
}

.lti-registration__checkbox {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.lti-registration__actions {
  display: flex;
  gap: 0.5rem;
}

.lti-registration__table-wrap {
  overflow: auto;
}

.lti-registration__table {
  width: 100%;
  border-collapse: collapse;
}

.lti-registration__table th {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 1px solid #cbd5e1;
}

.lti-registration__table td {
  padding: 0.5rem;
  vertical-align: top;
}

.lti-registration__wrap-anywhere {
  word-break: break-word;
}

.lti-registration__empty {
  padding: 0.75rem;
}
`;
