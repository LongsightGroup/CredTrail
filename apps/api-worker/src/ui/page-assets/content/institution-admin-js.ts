export const INSTITUTION_ADMIN_JS = `
(() => {
  const contextElement = document.getElementById('ct-admin-context');

  if (!(contextElement instanceof HTMLScriptElement)) {
    return;
  }

  let parsedContext;

  try {
    parsedContext = JSON.parse(contextElement.textContent ?? '{}');
  } catch {
    return;
  }

  const tenantAdminPath =
    parsedContext && typeof parsedContext.tenantAdminPath === 'string'
      ? parsedContext.tenantAdminPath
      : '';
  const manualIssueApiPath =
    parsedContext && typeof parsedContext.manualIssueApiPath === 'string'
      ? parsedContext.manualIssueApiPath
      : '';
  const createApiKeyPath =
    parsedContext && typeof parsedContext.createApiKeyPath === 'string'
      ? parsedContext.createApiKeyPath
      : '';
  const createOrgUnitPath =
    parsedContext && typeof parsedContext.createOrgUnitPath === 'string'
      ? parsedContext.createOrgUnitPath
      : '';
  const badgeRuleApiPath =
    parsedContext && typeof parsedContext.badgeRuleApiPath === 'string'
      ? parsedContext.badgeRuleApiPath
      : '';

  if (
    tenantAdminPath.length === 0 ||
    manualIssueApiPath.length === 0 ||
    createApiKeyPath.length === 0 ||
    createOrgUnitPath.length === 0 ||
    badgeRuleApiPath.length === 0
  ) {
    return;
  }
  const manualIssueForm = document.getElementById('manual-issue-form');
  const manualIssueStatus = document.getElementById('manual-issue-status');
  const apiKeyForm = document.getElementById('api-key-form');
  const apiKeyStatus = document.getElementById('api-key-status');
  const apiKeySecret = document.getElementById('api-key-secret');
  const orgUnitForm = document.getElementById('org-unit-form');
  const orgUnitStatus = document.getElementById('org-unit-status');
  const apiKeyRevokeStatus = document.getElementById('api-key-revoke-status');
  const ruleCreateForm = document.getElementById('rule-create-form');
  const ruleCreateStatus = document.getElementById('rule-create-status');
  const ruleEvaluateForm = document.getElementById('rule-evaluate-form');
  const ruleEvaluateStatus = document.getElementById('rule-evaluate-status');
  const ruleActionStatus = document.getElementById('rule-action-status');

  const setStatus = (el, text, isError) => {
    el.textContent = text;
    el.style.color = isError ? '#8b1f12' : '#235079';
  };
  const parseJsonBody = async (response) => {
    try {
      return await response.json();
    } catch {
      return null;
    }
  };
  const errorDetailFromPayload = (payload) => {
    return payload && typeof payload.error === 'string' ? payload.error : 'Request failed';
  };

  if (manualIssueForm instanceof HTMLFormElement && manualIssueStatus instanceof HTMLElement) {
    manualIssueForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(manualIssueStatus, 'Issuing badge...', false);
      const data = new FormData(manualIssueForm);
      const recipientIdentityRaw = data.get('recipientIdentity');
      const badgeTemplateIdRaw = data.get('badgeTemplateId');
      const recipientIdentity =
        typeof recipientIdentityRaw === 'string' ? recipientIdentityRaw.trim().toLowerCase() : '';
      const badgeTemplateId =
        typeof badgeTemplateIdRaw === 'string' ? badgeTemplateIdRaw.trim() : '';

      if (recipientIdentity.length === 0 || badgeTemplateId.length === 0) {
        setStatus(manualIssueStatus, 'Recipient email and badge template are required.', true);
        return;
      }

      try {
        const response = await fetch(manualIssueApiPath, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            badgeTemplateId,
            recipientIdentity,
            recipientIdentityType: 'email',
            recipientIdentifiers: [
              {
                identifierType: 'emailAddress',
                identifier: recipientIdentity,
              },
            ],
          }),
        });

        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(manualIssueStatus, errorDetailFromPayload(payload), true);
          return;
        }

        const assertionId =
          payload && typeof payload.assertionId === 'string' ? payload.assertionId : null;
        const link =
          assertionId === null
            ? ''
            : ' Open /badges/' + assertionId + ' (redirects to canonical URL).';
        setStatus(manualIssueStatus, 'Badge issued for ' + recipientIdentity + '.' + link, false);
        setTimeout(() => {
          window.location.assign(tenantAdminPath);
        }, 900);
      } catch {
        setStatus(manualIssueStatus, 'Unable to issue badge from this browser session.', true);
      }
    });
  }

  if (
    apiKeyForm instanceof HTMLFormElement &&
    apiKeyStatus instanceof HTMLElement &&
    apiKeySecret instanceof HTMLElement
  ) {
    apiKeyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(apiKeyStatus, 'Creating API key...', false);
      apiKeySecret.hidden = true;
      apiKeySecret.textContent = '';

      const data = new FormData(apiKeyForm);
      const labelRaw = data.get('label');
      const scopesRaw = data.get('scopes');
      const label = typeof labelRaw === 'string' ? labelRaw.trim() : '';
      const scopeList =
        typeof scopesRaw !== 'string'
          ? []
          : scopesRaw
              .split(',')
              .map((entry) => entry.trim())
              .filter((entry) => entry.length > 0);

      if (label.length === 0) {
        setStatus(apiKeyStatus, 'Label is required.', true);
        return;
      }

      try {
        const response = await fetch(createApiKeyPath, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            label,
            scopes: scopeList,
          }),
        });
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(apiKeyStatus, errorDetailFromPayload(payload), true);
          return;
        }

        const apiKey = payload && typeof payload.apiKey === 'string' ? payload.apiKey : null;

        if (apiKey !== null) {
          apiKeySecret.hidden = false;
          apiKeySecret.textContent = 'Store this now. It is shown once:\\n\\n' + apiKey;
        }

        setStatus(apiKeyStatus, 'API key created.', false);
        setTimeout(() => {
          window.location.assign(tenantAdminPath);
        }, 900);
      } catch {
        setStatus(apiKeyStatus, 'Unable to create API key from this browser session.', true);
      }
    });
  }

  if (orgUnitForm instanceof HTMLFormElement && orgUnitStatus instanceof HTMLElement) {
    const unitTypeInput = orgUnitForm.elements.namedItem('unitType');
    const parentOrgUnitInput = orgUnitForm.elements.namedItem('parentOrgUnitId');
    const requiredParentTypeByUnitType = {
      institution: null,
      college: 'institution',
      department: 'college',
      program: 'department',
    };

    const syncParentOptions = () => {
      if (!(unitTypeInput instanceof HTMLSelectElement)) {
        return;
      }

      if (!(parentOrgUnitInput instanceof HTMLSelectElement)) {
        return;
      }

      const unitType = unitTypeInput.value;
      const requiredParentType = requiredParentTypeByUnitType[unitType];

      Array.from(parentOrgUnitInput.options).forEach((option) => {
        if (option.value.length === 0) {
          option.hidden = false;
          option.disabled = false;
          option.textContent = requiredParentType === null ? 'None' : 'Select parent';
          return;
        }

        const parentType = option.dataset.unitType ?? null;
        const matches = requiredParentType === null || parentType === requiredParentType;
        option.hidden = !matches;
        option.disabled = !matches;
      });

      const selected = parentOrgUnitInput.selectedOptions.item(0);

      if (selected !== null && selected.value.length > 0 && (selected.hidden || selected.disabled)) {
        parentOrgUnitInput.value = '';
      }
    };

    syncParentOptions();

    if (unitTypeInput instanceof HTMLSelectElement) {
      unitTypeInput.addEventListener('change', syncParentOptions);
    }

    orgUnitForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(orgUnitStatus, 'Creating org unit...', false);
      const data = new FormData(orgUnitForm);
      const unitTypeRaw = data.get('unitType');
      const slugRaw = data.get('slug');
      const displayNameRaw = data.get('displayName');
      const parentOrgUnitIdRaw = data.get('parentOrgUnitId');
      const unitType = typeof unitTypeRaw === 'string' ? unitTypeRaw.trim() : '';
      const slug = typeof slugRaw === 'string' ? slugRaw.trim() : '';
      const displayName = typeof displayNameRaw === 'string' ? displayNameRaw.trim() : '';
      const parentOrgUnitId =
        typeof parentOrgUnitIdRaw === 'string' ? parentOrgUnitIdRaw.trim() : '';

      if (unitType.length === 0 || slug.length === 0 || displayName.length === 0) {
        setStatus(orgUnitStatus, 'Unit type, slug, and display name are required.', true);
        return;
      }

      const requiredParentType = requiredParentTypeByUnitType[unitType] ?? null;

      if (requiredParentType !== null && parentOrgUnitId.length === 0) {
        setStatus(orgUnitStatus, 'Selected unit type requires a parent org unit.', true);
        return;
      }

      try {
        const response = await fetch(createOrgUnitPath, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            unitType,
            slug,
            displayName,
            ...(parentOrgUnitId.length > 0 ? { parentOrgUnitId } : {}),
          }),
        });
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(orgUnitStatus, errorDetailFromPayload(payload), true);
          return;
        }

        setStatus(orgUnitStatus, 'Org unit created.', false);
        setTimeout(() => {
          window.location.assign(tenantAdminPath);
        }, 900);
      } catch {
        setStatus(orgUnitStatus, 'Unable to create org unit from this browser session.', true);
      }
    });
  }

  if (ruleCreateForm instanceof HTMLFormElement && ruleCreateStatus instanceof HTMLElement) {
    ruleCreateForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(ruleCreateStatus, 'Creating rule draft...', false);
      const data = new FormData(ruleCreateForm);
      const nameRaw = data.get('name');
      const descriptionRaw = data.get('description');
      const badgeTemplateIdRaw = data.get('badgeTemplateId');
      const lmsProviderKindRaw = data.get('lmsProviderKind');
      const courseIdRaw = data.get('courseId');
      const minScoreRaw = data.get('minScore');
      const approvalRolesRaw = data.get('approvalRoles');
      const changeSummaryRaw = data.get('changeSummary');
      const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
      const description = typeof descriptionRaw === 'string' ? descriptionRaw.trim() : '';
      const badgeTemplateId =
        typeof badgeTemplateIdRaw === 'string' ? badgeTemplateIdRaw.trim() : '';
      const lmsProviderKind =
        typeof lmsProviderKindRaw === 'string' ? lmsProviderKindRaw.trim() : '';
      const courseId = typeof courseIdRaw === 'string' ? courseIdRaw.trim() : '';
      const minScoreText = typeof minScoreRaw === 'string' ? minScoreRaw.trim() : '';
      const approvalRolesText =
        typeof approvalRolesRaw === 'string' ? approvalRolesRaw.trim() : '';
      const changeSummary =
        typeof changeSummaryRaw === 'string' ? changeSummaryRaw.trim() : '';

      if (
        name.length === 0 ||
        badgeTemplateId.length === 0 ||
        lmsProviderKind.length === 0 ||
        courseId.length === 0
      ) {
        setStatus(
          ruleCreateStatus,
          'Rule name, template, LMS provider, and course ID are required.',
          true,
        );
        return;
      }

      const minScore = Number(minScoreText);

      if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) {
        setStatus(ruleCreateStatus, 'Minimum score must be a number between 0 and 100.', true);
        return;
      }

      const validRoles = new Set(['owner', 'admin', 'issuer', 'viewer']);
      const approvalRoles =
        approvalRolesText.length === 0
          ? []
          : approvalRolesText
              .split(',')
              .map((entry) => entry.trim())
              .filter((entry) => entry.length > 0);
      const invalidRole = approvalRoles.find((role) => !validRoles.has(role));

      if (invalidRole !== undefined) {
        setStatus(
          ruleCreateStatus,
          'Invalid approval role: ' + invalidRole + '. Use owner/admin/issuer/viewer.',
          true,
        );
        return;
      }

      const approvalChain = approvalRoles.map((requiredRole, index) => {
        return {
          requiredRole,
          label: 'Step ' + String(index + 1) + ' · ' + requiredRole,
        };
      });

      try {
        const response = await fetch(badgeRuleApiPath, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            name,
            ...(description.length > 0 ? { description } : {}),
            badgeTemplateId,
            lmsProviderKind,
            definition: {
              conditions: {
                all: [
                  {
                    type: 'course_completion',
                    courseId,
                    requireCompleted: true,
                  },
                  {
                    type: 'grade_threshold',
                    courseId,
                    scoreField: 'final_score',
                    minScore,
                  },
                ],
              },
            },
            ...(approvalChain.length > 0 ? { approvalChain } : {}),
            ...(changeSummary.length > 0 ? { changeSummary } : {}),
          }),
        });
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(ruleCreateStatus, errorDetailFromPayload(payload), true);
          return;
        }

        const ruleId = payload && payload.rule && typeof payload.rule.id === 'string' ? payload.rule.id : '';
        const versionId =
          payload && payload.version && typeof payload.version.id === 'string'
            ? payload.version.id
            : '';
        setStatus(
          ruleCreateStatus,
          'Rule draft created: ' + ruleId + (versionId.length > 0 ? ' (' + versionId + ')' : ''),
          false,
        );
        setTimeout(() => {
          window.location.assign(tenantAdminPath);
        }, 900);
      } catch {
        setStatus(ruleCreateStatus, 'Unable to create rule draft from this browser session.', true);
      }
    });
  }

  if (ruleEvaluateForm instanceof HTMLFormElement && ruleEvaluateStatus instanceof HTMLElement) {
    ruleEvaluateForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(ruleEvaluateStatus, 'Evaluating rule...', false);
      const data = new FormData(ruleEvaluateForm);
      const ruleIdRaw = data.get('ruleId');
      const learnerIdRaw = data.get('learnerId');
      const recipientIdentityRaw = data.get('recipientIdentity');
      const courseIdRaw = data.get('courseId');
      const finalScoreRaw = data.get('finalScore');
      const completed = data.get('completed') !== null;
      const dryRun = data.get('dryRun') !== null;
      const ruleId = typeof ruleIdRaw === 'string' ? ruleIdRaw.trim() : '';
      const learnerId = typeof learnerIdRaw === 'string' ? learnerIdRaw.trim() : '';
      const recipientIdentity =
        typeof recipientIdentityRaw === 'string'
          ? recipientIdentityRaw.trim().toLowerCase()
          : '';
      const courseId = typeof courseIdRaw === 'string' ? courseIdRaw.trim() : '';
      const finalScoreText = typeof finalScoreRaw === 'string' ? finalScoreRaw.trim() : '';
      const finalScore = Number(finalScoreText);

      if (
        ruleId.length === 0 ||
        learnerId.length === 0 ||
        recipientIdentity.length === 0 ||
        courseId.length === 0
      ) {
        setStatus(
          ruleEvaluateStatus,
          'Rule, learner ID, recipient email, and course ID are required.',
          true,
        );
        return;
      }

      if (!Number.isFinite(finalScore) || finalScore < 0 || finalScore > 100) {
        setStatus(ruleEvaluateStatus, 'Final score must be a number between 0 and 100.', true);
        return;
      }

      const evaluatePath = badgeRuleApiPath + '/' + encodeURIComponent(ruleId) + '/evaluate';
      let selectedVersionId = '';
      const ruleSelect = ruleEvaluateForm.elements.namedItem('ruleId');

      if (ruleSelect instanceof HTMLSelectElement) {
        const selectedOption = ruleSelect.selectedOptions.item(0);
        selectedVersionId = selectedOption?.dataset.versionId?.trim() ?? '';
      }

      try {
        const response = await fetch(evaluatePath, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            learnerId,
            recipientIdentity,
            recipientIdentityType: 'email',
            dryRun,
            ...(selectedVersionId.length > 0 ? { versionId: selectedVersionId } : {}),
            facts: {
              grades: [
                {
                  courseId,
                  learnerId,
                  finalScore,
                },
              ],
              completions: [
                {
                  courseId,
                  learnerId,
                  completed,
                  completionPercent: completed ? 100 : 0,
                },
              ],
            },
          }),
        });
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(ruleEvaluateStatus, errorDetailFromPayload(payload), true);
          return;
        }

        const matched =
          Boolean(payload && payload.evaluation && payload.evaluation.matched === true) ===
          true;
        const issuanceStatus =
          payload && payload.issuance && typeof payload.issuance.status === 'string'
            ? payload.issuance.status
            : dryRun
              ? 'dry_run'
              : 'not_issued';
        const assertionId =
          payload && payload.issuance && typeof payload.issuance.assertionId === 'string'
            ? payload.issuance.assertionId
            : null;
        const suffix =
          assertionId === null
            ? ''
            : ' Assertion: ' + assertionId + '.';
        setStatus(
          ruleEvaluateStatus,
          'Evaluation complete. matched=' +
            String(matched) +
            ', issuance=' +
            issuanceStatus +
            '.' +
            suffix,
          false,
        );
      } catch {
        setStatus(ruleEvaluateStatus, 'Unable to evaluate rule from this browser session.', true);
      }
    });
  }

  if (ruleActionStatus instanceof HTMLElement) {
    const postRuleAction = async (candidate, actionPath, body, actionLabel) => {
      if (!(candidate instanceof HTMLButtonElement)) {
        return;
      }

      if (typeof actionPath !== 'string' || actionPath.length === 0) {
        setStatus(ruleActionStatus, 'Missing rule action path.', true);
        return;
      }

      candidate.disabled = true;
      setStatus(ruleActionStatus, actionLabel + '...', false);

      try {
        const response = await fetch(actionPath, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(ruleActionStatus, errorDetailFromPayload(payload), true);
          candidate.disabled = false;
          return;
        }

        setStatus(ruleActionStatus, actionLabel + ' complete.', false);
        setTimeout(() => {
          window.location.assign(tenantAdminPath);
        }, 700);
      } catch {
        setStatus(ruleActionStatus, 'Unable to perform rule action.', true);
        candidate.disabled = false;
      }
    };

    document.querySelectorAll('button[data-rule-submit-path]').forEach((candidate) => {
      if (!(candidate instanceof HTMLButtonElement)) {
        return;
      }

      candidate.addEventListener('click', async () => {
        await postRuleAction(
          candidate,
          candidate.dataset.ruleSubmitPath,
          {},
          'Submitting rule for approval',
        );
      });
    });

    document.querySelectorAll('button[data-rule-decision-path]').forEach((candidate) => {
      if (!(candidate instanceof HTMLButtonElement)) {
        return;
      }

      candidate.addEventListener('click', async () => {
        const decision = candidate.dataset.ruleDecision;
        const label = candidate.dataset.ruleLabel ?? 'rule';

        if (decision !== 'approved' && decision !== 'rejected') {
          setStatus(ruleActionStatus, 'Invalid decision for selected rule action.', true);
          return;
        }

        const confirmed = window.confirm(
          (decision === 'approved' ? 'Approve' : 'Reject') +
            ' latest version for "' +
            label +
            '"?',
        );

        if (!confirmed) {
          return;
        }

        await postRuleAction(
          candidate,
          candidate.dataset.ruleDecisionPath,
          { decision },
          (decision === 'approved' ? 'Approving' : 'Rejecting') + ' rule version',
        );
      });
    });

    document.querySelectorAll('button[data-rule-activate-path]').forEach((candidate) => {
      if (!(candidate instanceof HTMLButtonElement)) {
        return;
      }

      candidate.addEventListener('click', async () => {
        const label = candidate.dataset.ruleLabel ?? 'rule';
        const confirmed = window.confirm('Activate latest approved version for "' + label + '"?');

        if (!confirmed) {
          return;
        }

        await postRuleAction(
          candidate,
          candidate.dataset.ruleActivatePath,
          {},
          'Activating rule version',
        );
      });
    });
  }

  if (apiKeyRevokeStatus instanceof HTMLElement) {
    document
      .querySelectorAll('button[data-revoke-api-key-path]')
      .forEach((candidate) => {
        if (!(candidate instanceof HTMLButtonElement)) {
          return;
        }

        candidate.addEventListener('click', async () => {
          const revokePath = candidate.dataset.revokeApiKeyPath;
          const label = candidate.dataset.apiKeyLabel ?? 'API key';

          if (typeof revokePath !== 'string' || revokePath.length === 0) {
            setStatus(apiKeyRevokeStatus, 'Missing revoke path for selected key.', true);
            return;
          }

          if (!window.confirm('Revoke key "' + label + '"? This action cannot be undone.')) {
            return;
          }

          candidate.disabled = true;
          setStatus(apiKeyRevokeStatus, 'Revoking API key...', false);

          try {
            const response = await fetch(revokePath, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
              },
              body: JSON.stringify({}),
            });
            const payload = await parseJsonBody(response);

            if (!response.ok) {
              setStatus(apiKeyRevokeStatus, errorDetailFromPayload(payload), true);
              candidate.disabled = false;
              return;
            }

            setStatus(apiKeyRevokeStatus, 'API key revoked.', false);
            setTimeout(() => {
              window.location.assign(tenantAdminPath);
            }, 700);
          } catch {
            setStatus(
              apiKeyRevokeStatus,
              'Unable to revoke API key from this browser session.',
              true,
            );
            candidate.disabled = false;
          }
        });
      });
  }
})();

`;
