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
  const badgeTemplateApiPathPrefix =
    parsedContext && typeof parsedContext.badgeTemplateApiPathPrefix === 'string'
      ? parsedContext.badgeTemplateApiPathPrefix
      : '';
  const badgeRuleApiPath =
    parsedContext && typeof parsedContext.badgeRuleApiPath === 'string'
      ? parsedContext.badgeRuleApiPath
      : '';
  const assertionsApiPathPrefix =
    parsedContext && typeof parsedContext.assertionsApiPathPrefix === 'string'
      ? parsedContext.assertionsApiPathPrefix
      : '';
  const tenantUsersApiPathPrefix =
    parsedContext && typeof parsedContext.tenantUsersApiPathPrefix === 'string'
      ? parsedContext.tenantUsersApiPathPrefix
      : '';

  if (
    tenantAdminPath.length === 0 ||
    manualIssueApiPath.length === 0 ||
    createApiKeyPath.length === 0 ||
    createOrgUnitPath.length === 0 ||
    badgeTemplateApiPathPrefix.length === 0 ||
    badgeRuleApiPath.length === 0 ||
    assertionsApiPathPrefix.length === 0 ||
    tenantUsersApiPathPrefix.length === 0
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
  const badgeTemplateImageUploadForm = document.getElementById('badge-template-image-upload-form');
  const badgeTemplateImageUploadStatus = document.getElementById(
    'badge-template-image-upload-status',
  );
  const apiKeyRevokeStatus = document.getElementById('api-key-revoke-status');
  const ruleCreateForm = document.getElementById('rule-create-form');
  const ruleCreateStatus = document.getElementById('rule-create-status');
  const ruleBuilderConditionList = document.getElementById('rule-builder-condition-list');
  const ruleBuilderRootLogic = document.getElementById('rule-builder-root-logic');
  const ruleBuilderDefinitionJson = document.getElementById('rule-builder-definition-json');
  const ruleBuilderTemplatePreset = document.getElementById('rule-builder-template-preset');
  const ruleBuilderApplyTemplateButton = document.getElementById('rule-builder-apply-template');
  const ruleBuilderAddConditionButton = document.getElementById('rule-builder-add-condition');
  const ruleBuilderSaveDraftButton = document.getElementById('rule-builder-save-draft');
  const ruleBuilderLoadDraftButton = document.getElementById('rule-builder-load-draft');
  const ruleBuilderExportJsonButton = document.getElementById('rule-builder-export-json');
  const ruleBuilderImportJsonButton = document.getElementById('rule-builder-import-json');
  const ruleBuilderImportFileInput = document.getElementById('rule-builder-import-file');
  const ruleBuilderApplyJsonButton = document.getElementById('rule-builder-apply-json');
  const ruleBuilderCloneRuleSelect = document.getElementById('rule-builder-clone-rule');
  const ruleBuilderCloneLoadButton = document.getElementById('rule-builder-clone-load');
  const ruleBuilderTestButton = document.getElementById('rule-builder-test');
  const ruleBuilderTestPresetSelect = document.getElementById('rule-builder-test-preset');
  const ruleBuilderApplyTestPresetButton = document.getElementById('rule-builder-apply-test-preset');
  const ruleBuilderTestOutput = document.getElementById('rule-builder-test-output');
  const ruleBuilderStepPrevButton = document.getElementById('rule-builder-step-prev');
  const ruleBuilderStepNextButton = document.getElementById('rule-builder-step-next');
  const ruleBuilderStepProgress = document.getElementById('rule-builder-step-progress');
  const ruleBuilderSubmitButton = document.getElementById('rule-builder-submit');
  const ruleBuilderCanvasCount = document.getElementById('rule-builder-canvas-count');
  const ruleBuilderCanvasLogic = document.getElementById('rule-builder-canvas-logic');
  const ruleBuilderConditionEmpty = document.getElementById('rule-builder-condition-empty');
  const ruleBuilderSummaryMessage = document.getElementById('rule-builder-summary-message');
  const ruleBuilderSummaryRuleName = document.getElementById('rule-builder-summary-rule-name');
  const ruleBuilderSummaryConditionCount = document.getElementById(
    'rule-builder-summary-condition-count',
  );
  const ruleBuilderSummaryRootLogic = document.getElementById('rule-builder-summary-root-logic');
  const ruleBuilderSummaryValidity = document.getElementById('rule-builder-summary-validity');
  const ruleBuilderSummaryLastTest = document.getElementById('rule-builder-summary-last-test');
  const ruleBuilderStepButtons = Array.from(
    document.querySelectorAll('[data-rule-step-target]'),
  ).filter((candidate) => candidate instanceof HTMLButtonElement);
  const ruleEvaluateForm = document.getElementById('rule-evaluate-form');
  const ruleEvaluateStatus = document.getElementById('rule-evaluate-status');
  const ruleActionStatus = document.getElementById('rule-action-status');
  const issuedBadgesFilterForm = document.getElementById('issued-badges-filter-form');
  const issuedBadgesStatus = document.getElementById('issued-badges-status');
  const issuedBadgesBody = document.getElementById('issued-badges-body');
  const issuedBadgesActionStatus = document.getElementById('issued-badges-action-status');
  const membershipScopeForm = document.getElementById('membership-scope-form');
  const membershipScopeStatus = document.getElementById('membership-scope-status');
  const membershipScopeRemoveForm = document.getElementById('membership-scope-remove-form');
  const membershipScopeRemoveStatus = document.getElementById('membership-scope-remove-status');
  const delegatedGrantForm = document.getElementById('delegated-grant-form');
  const delegatedGrantStatus = document.getElementById('delegated-grant-status');
  const delegatedRevokeForm = document.getElementById('delegated-revoke-form');
  const delegatedRevokeStatus = document.getElementById('delegated-revoke-status');
  const assertionLifecycleViewForm = document.getElementById('assertion-lifecycle-view-form');
  const assertionLifecycleViewStatus = document.getElementById('assertion-lifecycle-view-status');
  const assertionLifecycleOutput = document.getElementById('assertion-lifecycle-output');
  const assertionLifecycleTransitionForm = document.getElementById(
    'assertion-lifecycle-transition-form',
  );
  const assertionLifecycleTransitionStatus = document.getElementById(
    'assertion-lifecycle-transition-status',
  );
  const ruleGovernanceForm = document.getElementById('rule-governance-form');
  const ruleGovernanceStatus = document.getElementById('rule-governance-status');
  const ruleGovernanceOutput = document.getElementById('rule-governance-output');

  const setStatus = (el, text, isError, tone = 'info') => {
    el.textContent = text;
    el.dataset.tone = isError ? 'error' : tone;
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
  const toCommaSeparatedList = (value) => {
    return typeof value !== 'string'
      ? []
      : value
          .split(',')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);
  };
  const setCodeOutput = (el, value) => {
    if (!(el instanceof HTMLElement)) {
      return;
    }

    if (typeof value !== 'string' || value.length === 0) {
      el.hidden = true;
      el.textContent = '';
      return;
    }

    el.hidden = false;
    el.textContent = value;
  };
  const escapeHtml = (value) => {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  };
  const formatTimestamp = (value) => {
    if (typeof value !== 'string' || value.length === 0) {
      return 'n/a';
    }

    const parsed = Date.parse(value);

    if (!Number.isFinite(parsed)) {
      return value;
    }

    return new Date(parsed).toLocaleString();
  };
  const parseIssuedBadgesLimit = (rawValue) => {
    const fallbackLimit = 100;

    if (typeof rawValue !== 'string') {
      return fallbackLimit;
    }

    const parsed = Number(rawValue.trim());

    if (!Number.isFinite(parsed)) {
      return fallbackLimit;
    }

    return Math.max(1, Math.min(500, Math.trunc(parsed)));
  };
  const fillLifecycleAssertionIdInputs = (assertionId) => {
    if (typeof assertionId !== 'string' || assertionId.length === 0) {
      return;
    }

    if (assertionLifecycleViewForm instanceof HTMLFormElement) {
      const lifecycleInput = assertionLifecycleViewForm.elements.namedItem('assertionId');

      if (lifecycleInput instanceof HTMLInputElement) {
        lifecycleInput.value = assertionId;
      }
    }

    if (assertionLifecycleTransitionForm instanceof HTMLFormElement) {
      const transitionInput = assertionLifecycleTransitionForm.elements.namedItem('assertionId');

      if (transitionInput instanceof HTMLInputElement) {
        transitionInput.value = assertionId;
      }
    }
  };
  const setIssuedBadgesEmptyState = (message) => {
    if (!(issuedBadgesBody instanceof HTMLElement)) {
      return;
    }

    issuedBadgesBody.innerHTML =
      '<tr><td colspan="6" class="ct-admin__empty">' + escapeHtml(message) + '</td></tr>';
  };
  const loadAssertionLifecycle = async (assertionId, statusElement) => {
    const normalizedAssertionId =
      typeof assertionId === 'string' ? assertionId.trim() : '';

    if (normalizedAssertionId.length === 0) {
      if (statusElement instanceof HTMLElement) {
        setStatus(statusElement, 'Assertion ID is required.', true);
      }

      return null;
    }

    if (statusElement instanceof HTMLElement) {
      setStatus(statusElement, 'Loading lifecycle state...', false);
    }

    setCodeOutput(assertionLifecycleOutput, '');

    try {
      const response = await fetch(
        assertionsApiPathPrefix + '/' + encodeURIComponent(normalizedAssertionId) + '/lifecycle',
      );
      const payload = await parseJsonBody(response);

      if (!response.ok) {
        if (statusElement instanceof HTMLElement) {
          setStatus(statusElement, errorDetailFromPayload(payload), true);
        }

        return null;
      }

      const state = payload && typeof payload.state === 'string' ? payload.state : 'unknown';
      const source = payload && typeof payload.source === 'string' ? payload.source : 'unknown';
      const eventCount = payload && Array.isArray(payload.events) ? payload.events.length : 0;

      if (statusElement instanceof HTMLElement) {
        setStatus(
          statusElement,
          'Lifecycle loaded: state=' +
            state +
            ', source=' +
            source +
            ', events=' +
            String(eventCount) +
            '.',
          false,
        );
      }

      setCodeOutput(assertionLifecycleOutput, JSON.stringify(payload, null, 2));
      fillLifecycleAssertionIdInputs(normalizedAssertionId);
      return payload;
    } catch {
      if (statusElement instanceof HTMLElement) {
        setStatus(statusElement, 'Unable to load lifecycle state from this browser session.', true);
      }

      return null;
    }
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

  if (
    badgeTemplateImageUploadForm instanceof HTMLFormElement &&
    badgeTemplateImageUploadStatus instanceof HTMLElement
  ) {
    badgeTemplateImageUploadForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(badgeTemplateImageUploadStatus, 'Uploading template image...', false);
      const data = new FormData(badgeTemplateImageUploadForm);
      const badgeTemplateIdRaw = data.get('badgeTemplateId');
      const upload = data.get('file');
      const badgeTemplateId =
        typeof badgeTemplateIdRaw === 'string' ? badgeTemplateIdRaw.trim() : '';

      if (badgeTemplateId.length === 0 || !(upload instanceof File)) {
        setStatus(
          badgeTemplateImageUploadStatus,
          'Badge template and image file are required.',
          true,
        );
        return;
      }

      if (upload.size > 2 * 1024 * 1024) {
        setStatus(
          badgeTemplateImageUploadStatus,
          'Image file exceeds 2 MB limit.',
          true,
        );
        return;
      }

      const normalizedMimeType = upload.type.trim().toLowerCase();
      const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

      if (!allowedMimeTypes.has(normalizedMimeType)) {
        setStatus(
          badgeTemplateImageUploadStatus,
          'Unsupported image type. Use PNG, JPEG, or WebP.',
          true,
        );
        return;
      }

      const uploadBody = new FormData();
      uploadBody.set('file', upload);

      try {
        const response = await fetch(
          badgeTemplateApiPathPrefix +
            '/' +
            encodeURIComponent(badgeTemplateId) +
            '/image-upload',
          {
            method: 'POST',
            body: uploadBody,
          },
        );
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(badgeTemplateImageUploadStatus, errorDetailFromPayload(payload), true);
          return;
        }

        const imageUrl =
          payload &&
          payload.image &&
          typeof payload.image.url === 'string'
            ? payload.image.url
            : null;

        setStatus(
          badgeTemplateImageUploadStatus,
          imageUrl === null ? 'Template image uploaded.' : 'Template image uploaded: ' + imageUrl,
          false,
        );
        setTimeout(() => {
          window.location.assign(tenantAdminPath);
        }, 900);
      } catch {
        setStatus(
          badgeTemplateImageUploadStatus,
          'Unable to upload template image from this browser session.',
          true,
        );
      }
    });
  }

  if (membershipScopeForm instanceof HTMLFormElement && membershipScopeStatus instanceof HTMLElement) {
    membershipScopeForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(membershipScopeStatus, 'Assigning org-unit scope...', false);
      const data = new FormData(membershipScopeForm);
      const userIdRaw = data.get('userId');
      const orgUnitIdRaw = data.get('orgUnitId');
      const roleRaw = data.get('role');
      const userId = typeof userIdRaw === 'string' ? userIdRaw.trim() : '';
      const orgUnitId = typeof orgUnitIdRaw === 'string' ? orgUnitIdRaw.trim() : '';
      const role = typeof roleRaw === 'string' ? roleRaw.trim() : '';

      if (userId.length === 0 || orgUnitId.length === 0 || role.length === 0) {
        setStatus(membershipScopeStatus, 'User ID, org unit, and role are required.', true);
        return;
      }

      const validRoles = new Set(['owner', 'admin', 'issuer', 'viewer']);

      if (!validRoles.has(role)) {
        setStatus(membershipScopeStatus, 'Invalid role. Use owner/admin/issuer/viewer.', true);
        return;
      }

      try {
        const response = await fetch(
          tenantUsersApiPathPrefix +
            '/' +
            encodeURIComponent(userId) +
            '/org-unit-scopes/' +
            encodeURIComponent(orgUnitId),
          {
            method: 'PUT',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              role,
            }),
          },
        );
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(membershipScopeStatus, errorDetailFromPayload(payload), true);
          return;
        }

        setStatus(membershipScopeStatus, 'Org-unit scope assigned for ' + userId + '.', false);
      } catch {
        setStatus(
          membershipScopeStatus,
          'Unable to assign org-unit scope from this browser session.',
          true,
        );
      }
    });
  }

  if (
    membershipScopeRemoveForm instanceof HTMLFormElement &&
    membershipScopeRemoveStatus instanceof HTMLElement
  ) {
    membershipScopeRemoveForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(membershipScopeRemoveStatus, 'Removing org-unit scope...', false);
      const data = new FormData(membershipScopeRemoveForm);
      const userIdRaw = data.get('userId');
      const orgUnitIdRaw = data.get('orgUnitId');
      const userId = typeof userIdRaw === 'string' ? userIdRaw.trim() : '';
      const orgUnitId = typeof orgUnitIdRaw === 'string' ? orgUnitIdRaw.trim() : '';

      if (userId.length === 0 || orgUnitId.length === 0) {
        setStatus(membershipScopeRemoveStatus, 'User ID and org unit are required.', true);
        return;
      }

      try {
        const response = await fetch(
          tenantUsersApiPathPrefix +
            '/' +
            encodeURIComponent(userId) +
            '/org-unit-scopes/' +
            encodeURIComponent(orgUnitId),
          {
            method: 'DELETE',
          },
        );
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(membershipScopeRemoveStatus, errorDetailFromPayload(payload), true);
          return;
        }

        const removed =
          payload && typeof payload.removed === 'boolean' ? payload.removed : false;
        setStatus(
          membershipScopeRemoveStatus,
          removed
            ? 'Org-unit scope removed for ' + userId + '.'
            : 'No matching org-unit scope was found.',
          false,
        );
      } catch {
        setStatus(
          membershipScopeRemoveStatus,
          'Unable to remove org-unit scope from this browser session.',
          true,
        );
      }
    });
  }

  if (delegatedGrantForm instanceof HTMLFormElement && delegatedGrantStatus instanceof HTMLElement) {
    delegatedGrantForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(delegatedGrantStatus, 'Granting delegated authority...', false);
      const data = new FormData(delegatedGrantForm);
      const delegateUserIdRaw = data.get('delegateUserId');
      const orgUnitIdRaw = data.get('orgUnitId');
      const badgeTemplateIdsRaw = data.get('badgeTemplateIds');
      const reasonRaw = data.get('reason');
      const endsAtRaw = data.get('endsAt');
      const delegateUserId = typeof delegateUserIdRaw === 'string' ? delegateUserIdRaw.trim() : '';
      const orgUnitId = typeof orgUnitIdRaw === 'string' ? orgUnitIdRaw.trim() : '';
      const badgeTemplateIds = toCommaSeparatedList(badgeTemplateIdsRaw);
      const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : '';
      const endsAtLocal = typeof endsAtRaw === 'string' ? endsAtRaw.trim() : '';
      const allowedActions = data
        .getAll('allowedAction')
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0);

      if (delegateUserId.length === 0 || orgUnitId.length === 0) {
        setStatus(delegatedGrantStatus, 'Delegate user ID and org unit are required.', true);
        return;
      }

      if (allowedActions.length === 0) {
        setStatus(delegatedGrantStatus, 'Select at least one allowed action.', true);
        return;
      }

      const validActions = new Set(['issue_badge', 'revoke_badge', 'manage_lifecycle']);
      const invalidAction = allowedActions.find((action) => !validActions.has(action));

      if (invalidAction !== undefined) {
        setStatus(
          delegatedGrantStatus,
          'Invalid delegated action: ' + invalidAction + '.',
          true,
        );
        return;
      }

      let endsAtIso = null;

      if (endsAtLocal.length > 0) {
        const parsedEndsAtMs = Date.parse(endsAtLocal);

        if (!Number.isFinite(parsedEndsAtMs)) {
          setStatus(delegatedGrantStatus, 'Ends at must be a valid date/time.', true);
          return;
        }

        endsAtIso = new Date(parsedEndsAtMs).toISOString();
      }

      try {
        const response = await fetch(
          tenantUsersApiPathPrefix +
            '/' +
            encodeURIComponent(delegateUserId) +
            '/issuing-authority-grants',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              orgUnitId,
              allowedActions,
              ...(badgeTemplateIds.length > 0 ? { badgeTemplateIds } : {}),
              ...(endsAtIso === null ? {} : { endsAt: endsAtIso }),
              ...(reason.length > 0 ? { reason } : {}),
            }),
          },
        );
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(delegatedGrantStatus, errorDetailFromPayload(payload), true);
          return;
        }

        const grantId =
          payload && payload.grant && typeof payload.grant.id === 'string'
            ? payload.grant.id
            : '';
        setStatus(
          delegatedGrantStatus,
          'Delegated authority granted.' + (grantId.length > 0 ? ' Grant ID: ' + grantId + '.' : ''),
          false,
        );
      } catch {
        setStatus(
          delegatedGrantStatus,
          'Unable to grant delegated authority from this browser session.',
          true,
        );
      }
    });
  }

  if (delegatedRevokeForm instanceof HTMLFormElement && delegatedRevokeStatus instanceof HTMLElement) {
    delegatedRevokeForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(delegatedRevokeStatus, 'Revoking delegated grant...', false);
      const data = new FormData(delegatedRevokeForm);
      const delegateUserIdRaw = data.get('delegateUserId');
      const grantIdRaw = data.get('grantId');
      const reasonRaw = data.get('reason');
      const delegateUserId = typeof delegateUserIdRaw === 'string' ? delegateUserIdRaw.trim() : '';
      const grantId = typeof grantIdRaw === 'string' ? grantIdRaw.trim() : '';
      const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : '';

      if (delegateUserId.length === 0 || grantId.length === 0) {
        setStatus(delegatedRevokeStatus, 'Delegate user ID and grant ID are required.', true);
        return;
      }

      try {
        const response = await fetch(
          tenantUsersApiPathPrefix +
            '/' +
            encodeURIComponent(delegateUserId) +
            '/issuing-authority-grants/' +
            encodeURIComponent(grantId) +
            '/revoke',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              ...(reason.length > 0 ? { reason } : {}),
            }),
          },
        );
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(delegatedRevokeStatus, errorDetailFromPayload(payload), true);
          return;
        }

        const status = payload && typeof payload.status === 'string' ? payload.status : 'updated';
        setStatus(
          delegatedRevokeStatus,
          'Delegated grant status: ' + status + '.',
          false,
        );
      } catch {
        setStatus(
          delegatedRevokeStatus,
          'Unable to revoke delegated grant from this browser session.',
          true,
        );
      }
    });
  }

  if (
    assertionLifecycleViewForm instanceof HTMLFormElement &&
    assertionLifecycleViewStatus instanceof HTMLElement
  ) {
    assertionLifecycleViewForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(assertionLifecycleViewForm);
      const assertionIdRaw = data.get('assertionId');
      await loadAssertionLifecycle(assertionIdRaw, assertionLifecycleViewStatus);
    });
  }

  if (
    assertionLifecycleTransitionForm instanceof HTMLFormElement &&
    assertionLifecycleTransitionStatus instanceof HTMLElement
  ) {
    assertionLifecycleTransitionForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(assertionLifecycleTransitionStatus, 'Applying lifecycle transition...', false);
      const data = new FormData(assertionLifecycleTransitionForm);
      const assertionIdRaw = data.get('assertionId');
      const toStateRaw = data.get('toState');
      const reasonCodeRaw = data.get('reasonCode');
      const reasonRaw = data.get('reason');
      const assertionId = typeof assertionIdRaw === 'string' ? assertionIdRaw.trim() : '';
      const toState = typeof toStateRaw === 'string' ? toStateRaw.trim() : '';
      const reasonCode = typeof reasonCodeRaw === 'string' ? reasonCodeRaw.trim() : '';
      const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : '';

      if (assertionId.length === 0 || toState.length === 0 || reasonCode.length === 0) {
        setStatus(
          assertionLifecycleTransitionStatus,
          'Assertion ID, target state, and reason code are required.',
          true,
        );
        return;
      }

      try {
        const response = await fetch(
          assertionsApiPathPrefix +
            '/' +
            encodeURIComponent(assertionId) +
            '/lifecycle/transition',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              toState,
              reasonCode,
              ...(reason.length > 0 ? { reason } : {}),
            }),
          },
        );
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(assertionLifecycleTransitionStatus, errorDetailFromPayload(payload), true);
          return;
        }

        const status = payload && typeof payload.status === 'string' ? payload.status : 'updated';
        const currentState =
          payload && typeof payload.currentState === 'string' ? payload.currentState : toState;
        setStatus(
          assertionLifecycleTransitionStatus,
          'Lifecycle transition result: status=' + status + ', currentState=' + currentState + '.',
          false,
        );
      } catch {
        setStatus(
          assertionLifecycleTransitionStatus,
          'Unable to apply lifecycle transition from this browser session.',
          true,
        );
      }
    });
  }

  if (
    issuedBadgesFilterForm instanceof HTMLFormElement &&
    issuedBadgesStatus instanceof HTMLElement &&
    issuedBadgesBody instanceof HTMLElement &&
    issuedBadgesActionStatus instanceof HTMLElement
  ) {
    const renderIssuedBadgeRows = (assertions) => {
      if (!Array.isArray(assertions) || assertions.length === 0) {
        setIssuedBadgesEmptyState('No assertions matched the selected filters.');
        return;
      }

      issuedBadgesBody.innerHTML = assertions
        .map((entry) => {
          const assertionId =
            entry && typeof entry.assertionId === 'string' ? entry.assertionId : '';
          const recipientIdentity =
            entry && typeof entry.recipientIdentity === 'string' ? entry.recipientIdentity : 'unknown';
          const badgeTitle =
            entry && typeof entry.badgeTitle === 'string' ? entry.badgeTitle : 'Unknown template';
          const badgeTemplateId =
            entry && typeof entry.badgeTemplateId === 'string' ? entry.badgeTemplateId : '';
          const issuedAt = entry && typeof entry.issuedAt === 'string' ? entry.issuedAt : '';
          const state = entry && typeof entry.state === 'string' ? entry.state : 'active';
          const source = entry && typeof entry.source === 'string' ? entry.source : 'default_active';
          const publicId = entry && typeof entry.publicId === 'string' ? entry.publicId : null;
          const stateClass = ['active', 'suspended', 'revoked', 'expired'].includes(state)
            ? state
            : 'none';
          const canRevoke = state !== 'revoked';
          const viewBadgeHref = '/badges/' + encodeURIComponent(assertionId);
          const rawJsonHref =
            '/credentials/v1/' + encodeURIComponent(assertionId) + '/jsonld';

          return (
            '<tr>' +
            '<td>' +
            escapeHtml(formatTimestamp(issuedAt)) +
            '</td>' +
            '<td><strong>' +
            escapeHtml(recipientIdentity) +
            '</strong></td>' +
            '<td><strong>' +
            escapeHtml(badgeTitle) +
            '</strong><div class="ct-admin__meta">' +
            escapeHtml(badgeTemplateId) +
            '</div></td>' +
            '<td><span class="ct-admin__status-pill ct-admin__status-pill--' +
            escapeHtml(stateClass) +
            '">' +
            escapeHtml(state) +
            '</span><div class="ct-admin__meta">' +
            escapeHtml(source) +
            '</div></td>' +
            '<td><div class="ct-admin__assertion-id">' +
            escapeHtml(assertionId) +
            '</div>' +
            (publicId === null
              ? ''
              : '<div class="ct-admin__meta">public: ' + escapeHtml(publicId) + '</div>') +
            '</td>' +
            '<td><div class="ct-admin__actions">' +
            '<a class="ct-admin__button ct-admin__button--tiny ct-admin__button--secondary" href="' +
            escapeHtml(viewBadgeHref) +
            '" target="_blank" rel="noopener noreferrer">View badge</a>' +
            '<a class="ct-admin__button ct-admin__button--tiny ct-admin__button--ghost" href="' +
            escapeHtml(rawJsonHref) +
            '" target="_blank" rel="noopener noreferrer">JSON-LD</a>' +
            '<button type="button" class="ct-admin__button ct-admin__button--tiny ct-admin__button--secondary" data-issued-action="audit" data-assertion-id="' +
            escapeHtml(assertionId) +
            '">Audit</button>' +
            (canRevoke
              ? '<button type="button" class="ct-admin__button ct-admin__button--tiny ct-admin__button--danger" data-issued-action="revoke" data-assertion-id="' +
                escapeHtml(assertionId) +
                '">Revoke</button>'
              : '') +
            '</div></td>' +
            '</tr>'
          );
        })
        .join('');
    };

    const loadIssuedBadges = async () => {
      setStatus(issuedBadgesStatus, 'Loading issued badges...', false);
      setIssuedBadgesEmptyState('Loading assertions...');
      const data = new FormData(issuedBadgesFilterForm);
      const recipientQueryRaw = data.get('recipientQuery');
      const badgeTemplateIdRaw = data.get('badgeTemplateId');
      const stateRaw = data.get('state');
      const limitRaw = data.get('limit');
      const recipientQuery =
        typeof recipientQueryRaw === 'string' ? recipientQueryRaw.trim() : '';
      const badgeTemplateId =
        typeof badgeTemplateIdRaw === 'string' ? badgeTemplateIdRaw.trim() : '';
      const state = typeof stateRaw === 'string' ? stateRaw.trim() : '';
      const limit = parseIssuedBadgesLimit(limitRaw);
      const query = new URLSearchParams();
      query.set('limit', String(limit));

      if (recipientQuery.length > 0) {
        query.set('recipientQuery', recipientQuery);
      }

      if (badgeTemplateId.length > 0) {
        query.set('badgeTemplateId', badgeTemplateId);
      }

      if (state.length > 0) {
        query.set('state', state);
      }

      try {
        const response = await fetch(assertionsApiPathPrefix + '?' + query.toString());
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(issuedBadgesStatus, errorDetailFromPayload(payload), true);
          setIssuedBadgesEmptyState('Unable to load assertions.');
          return;
        }

        const assertions = payload && Array.isArray(payload.assertions) ? payload.assertions : [];
        renderIssuedBadgeRows(assertions);
        setStatus(
          issuedBadgesStatus,
          'Loaded ' + String(assertions.length) + ' assertion' + (assertions.length === 1 ? '' : 's') + '.',
          false,
        );
      } catch {
        setStatus(issuedBadgesStatus, 'Unable to load assertions from this browser session.', true);
        setIssuedBadgesEmptyState('Unable to load assertions.');
      }
    };

    const revokeAssertion = async (assertionId) => {
      const reasonPrompt = window.prompt(
        'Optional revocation reason for ' + assertionId + ':',
        'Institution admin revocation',
      );

      if (reasonPrompt === null) {
        return;
      }

      setStatus(issuedBadgesActionStatus, 'Revoking assertion ' + assertionId + '...', false);

      try {
        const response = await fetch(
          assertionsApiPathPrefix +
            '/' +
            encodeURIComponent(assertionId) +
            '/lifecycle/transition',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              toState: 'revoked',
              reasonCode: 'issuer_requested',
              ...(reasonPrompt.trim().length > 0 ? { reason: reasonPrompt.trim() } : {}),
            }),
          },
        );
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(issuedBadgesActionStatus, errorDetailFromPayload(payload), true);
          return;
        }

        setStatus(issuedBadgesActionStatus, 'Assertion revoked: ' + assertionId + '.', false);
        await loadAssertionLifecycle(assertionId, assertionLifecycleViewStatus);
        await loadIssuedBadges();
      } catch {
        setStatus(
          issuedBadgesActionStatus,
          'Unable to revoke assertion from this browser session.',
          true,
        );
      }
    };

    issuedBadgesFilterForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await loadIssuedBadges();
    });

    issuedBadgesBody.addEventListener('click', async (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const actionButton = target.closest('button[data-issued-action]');

      if (!(actionButton instanceof HTMLButtonElement)) {
        return;
      }

      const action = actionButton.dataset.issuedAction;
      const assertionId = actionButton.dataset.assertionId;

      if (typeof assertionId !== 'string' || assertionId.trim().length === 0) {
        setStatus(issuedBadgesActionStatus, 'Missing assertion ID for selected action.', true);
        return;
      }

      if (action === 'audit') {
        setStatus(issuedBadgesActionStatus, 'Loading lifecycle audit for ' + assertionId + '...', false);
        const lifecyclePayload = await loadAssertionLifecycle(
          assertionId,
          assertionLifecycleViewStatus,
        );

        if (lifecyclePayload === null) {
          setStatus(issuedBadgesActionStatus, 'Unable to load lifecycle audit.', true);
          return;
        }

        setStatus(issuedBadgesActionStatus, 'Lifecycle audit loaded for ' + assertionId + '.', false);
        const lifecyclePanel = document.getElementById('lifecycle-panel');

        if (lifecyclePanel instanceof HTMLElement) {
          lifecyclePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        return;
      }

      if (action === 'revoke') {
        if (
          !window.confirm(
            'Revoke assertion "' + assertionId + '"? This changes credential lifecycle state.',
          )
        ) {
          return;
        }

        await revokeAssertion(assertionId);
      }
    });

    void loadIssuedBadges();
  }

  if (ruleGovernanceForm instanceof HTMLFormElement && ruleGovernanceStatus instanceof HTMLElement) {
    ruleGovernanceForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(ruleGovernanceStatus, 'Loading rule governance context...', false);
      setCodeOutput(ruleGovernanceOutput, '');
      const data = new FormData(ruleGovernanceForm);
      const ruleIdRaw = data.get('ruleId');
      const auditLimitRaw = data.get('auditLimit');
      const ruleId = typeof ruleIdRaw === 'string' ? ruleIdRaw.trim() : '';
      const parsedAuditLimit = Number(
        typeof auditLimitRaw === 'string' ? auditLimitRaw.trim() : '',
      );
      const auditLimit =
        Number.isFinite(parsedAuditLimit) && parsedAuditLimit >= 1 && parsedAuditLimit <= 100
          ? Math.trunc(parsedAuditLimit)
          : 20;
      const ruleSelect = ruleGovernanceForm.elements.namedItem('ruleId');
      const selectedOption =
        ruleSelect instanceof HTMLSelectElement ? ruleSelect.selectedOptions.item(0) : null;
      const versionId = selectedOption?.dataset.versionId?.trim() ?? '';

      if (ruleId.length === 0) {
        setStatus(ruleGovernanceStatus, 'Rule selection is required.', true);
        return;
      }

      if (versionId.length === 0) {
        setStatus(
          ruleGovernanceStatus,
          'Selected rule has no version context to inspect.',
          true,
        );
        return;
      }

      const approvalHistoryPath =
        badgeRuleApiPath +
        '/' +
        encodeURIComponent(ruleId) +
        '/versions/' +
        encodeURIComponent(versionId) +
        '/approval-history';
      const auditLogPath =
        badgeRuleApiPath +
        '/' +
        encodeURIComponent(ruleId) +
        '/audit-log?limit=' +
        encodeURIComponent(String(auditLimit));

      try {
        const [approvalResponse, auditResponse] = await Promise.all([
          fetch(approvalHistoryPath),
          fetch(auditLogPath),
        ]);
        const [approvalPayload, auditPayload] = await Promise.all([
          parseJsonBody(approvalResponse),
          parseJsonBody(auditResponse),
        ]);

        if (!approvalResponse.ok) {
          setStatus(ruleGovernanceStatus, errorDetailFromPayload(approvalPayload), true);
          return;
        }

        if (!auditResponse.ok) {
          setStatus(ruleGovernanceStatus, errorDetailFromPayload(auditPayload), true);
          return;
        }

        const currentStep =
          approvalPayload &&
          approvalPayload.approval &&
          approvalPayload.approval.currentStep &&
          typeof approvalPayload.approval.currentStep.stepNumber === 'number'
            ? approvalPayload.approval.currentStep.stepNumber
            : null;
        const logCount = auditPayload && Array.isArray(auditPayload.logs) ? auditPayload.logs.length : 0;

        setStatus(
          ruleGovernanceStatus,
          'Governance context loaded: current approval step=' +
            (currentStep === null ? 'none' : String(currentStep)) +
            ', audit events=' +
            String(logCount) +
            '.',
          false,
        );
        setCodeOutput(
          ruleGovernanceOutput,
          JSON.stringify(
            {
              ruleId,
              versionId,
              approval: approvalPayload?.approval ?? null,
              auditLogs: auditPayload?.logs ?? [],
            },
            null,
            2,
          ),
        );
      } catch {
        setStatus(
          ruleGovernanceStatus,
          'Unable to load rule governance context from this browser session.',
          true,
        );
      }
    });
  }

  if (
    ruleCreateForm instanceof HTMLFormElement &&
    ruleCreateStatus instanceof HTMLElement &&
    ruleBuilderConditionList instanceof HTMLElement &&
    ruleBuilderRootLogic instanceof HTMLSelectElement &&
    ruleBuilderDefinitionJson instanceof HTMLTextAreaElement
  ) {
    const badgeRulePreviewApiPath = badgeRuleApiPath + '/preview-evaluate';
    const ruleBuilderDraftStorageKey = 'credtrail:rule-builder:' + tenantAdminPath;
    const validRoles = new Set(['owner', 'admin', 'issuer', 'viewer']);
    const conditionTypeLabels = {
      course_completion: 'Course completion',
      grade_threshold: 'Grade threshold',
      program_completion: 'Program completion',
      assignment_submission: 'Assignment submission',
      time_window: 'Time window',
      prerequisite_badge: 'Prerequisite badge',
    };
    const conditionTypeHelpText = {
      course_completion:
        'Requires completion facts for a course and optional minimum completion percent.',
      grade_threshold:
        'Checks current/final score against minimum and/or maximum thresholds.',
      program_completion:
        'Counts completions across required courses and compares with minimum completed.',
      assignment_submission:
        'Requires submission facts for a specific assignment, with optional score/workflow constraints.',
      time_window:
        'Limits rule execution to a date-time window using optional not-before and not-after values.',
      prerequisite_badge:
        'Requires the learner to already hold a specific badge template.',
    };

    const defaultTemplateDefinitions = {
      blank: {
        conditions: {
          all: [
            {
              type: 'course_completion',
              courseId: 'CS101',
              requireCompleted: true,
            },
          ],
        },
      },
      course_completion: {
        conditions: {
          all: [
            {
              type: 'course_completion',
              courseId: 'CS101',
              requireCompleted: true,
            },
          ],
        },
      },
      course_and_grade: {
        conditions: {
          all: [
            {
              type: 'course_completion',
              courseId: 'CS101',
              requireCompleted: true,
            },
            {
              type: 'grade_threshold',
              courseId: 'CS101',
              scoreField: 'final_score',
              minScore: 80,
            },
          ],
        },
      },
      program_completion: {
        conditions: {
          all: [
            {
              type: 'program_completion',
              courseIds: ['CS101', 'CS102', 'CS103'],
              minimumCompleted: 3,
            },
          ],
        },
      },
      time_limited: {
        conditions: {
          all: [
            {
              type: 'course_completion',
              courseId: 'CS101',
              requireCompleted: true,
            },
            {
              type: 'time_window',
              notBefore: new Date().toISOString(),
            },
          ],
        },
      },
      prerequisite_chain: {
        conditions: {
          all: [
            {
              type: 'prerequisite_badge',
              badgeTemplateId: 'badge_template_foundations',
            },
            {
              type: 'course_completion',
              courseId: 'CS201',
              requireCompleted: true,
            },
          ],
        },
      },
    };

    const getRuleCreateField = (fieldName) => {
      return ruleCreateForm.elements.namedItem(fieldName);
    };

    const getTextFieldValue = (fieldName) => {
      const field = getRuleCreateField(fieldName);

      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        return field.value.trim();
      }

      if (field instanceof HTMLSelectElement) {
        return field.value.trim();
      }

      return '';
    };

    const getCheckboxFieldValue = (fieldName) => {
      const field = getRuleCreateField(fieldName);
      return field instanceof HTMLInputElement ? field.checked : false;
    };

    const setRuleCreateFieldValue = (fieldName, value) => {
      const field = getRuleCreateField(fieldName);

      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.value = value;
      }

      if (field instanceof HTMLSelectElement) {
        field.value = value;
      }
    };

    const ruleBuilderStepPanels = Array.from(
      ruleCreateForm.querySelectorAll('[data-rule-step]'),
    ).filter((candidate) => candidate instanceof HTMLElement);
    const ruleBuilderStepOrder = ruleBuilderStepPanels
      .map((candidate) => candidate.dataset.ruleStep ?? '')
      .filter((stepName) => stepName.length > 0);
    const ruleBuilderStepLabels = {
      metadata: 'Metadata',
      conditions: 'Conditions',
      test: 'Test',
      review: 'Review',
    };
    let activeRuleBuilderStepIndex = 0;

    const setBuilderStepState = (requestedIndex) => {
      if (ruleBuilderStepOrder.length === 0) {
        return;
      }

      const nextIndex = Math.min(
        Math.max(requestedIndex, 0),
        ruleBuilderStepOrder.length - 1,
      );
      activeRuleBuilderStepIndex = nextIndex;
      const activeStep = ruleBuilderStepOrder[nextIndex] ?? '';
      const activeStepLabel = ruleBuilderStepLabels[activeStep] ?? 'Step';

      ruleBuilderStepPanels.forEach((panel) => {
        if (!(panel instanceof HTMLElement)) {
          return;
        }

        const isActive = (panel.dataset.ruleStep ?? '') === activeStep;
        panel.hidden = !isActive;
      });

      ruleBuilderStepButtons.forEach((candidate) => {
        if (!(candidate instanceof HTMLButtonElement)) {
          return;
        }

        const isActive = (candidate.dataset.ruleStepTarget ?? '') === activeStep;
        candidate.classList.toggle('is-active', isActive);

        if (isActive) {
          candidate.setAttribute('aria-current', 'step');
        } else {
          candidate.removeAttribute('aria-current');
        }
      });

      if (ruleBuilderStepPrevButton instanceof HTMLButtonElement) {
        ruleBuilderStepPrevButton.disabled = nextIndex === 0;
      }

      if (ruleBuilderStepNextButton instanceof HTMLButtonElement) {
        ruleBuilderStepNextButton.disabled = nextIndex >= ruleBuilderStepOrder.length - 1;
      }

      if (ruleBuilderSubmitButton instanceof HTMLButtonElement) {
        ruleBuilderSubmitButton.disabled = nextIndex < ruleBuilderStepOrder.length - 1;
      }
      if (ruleBuilderStepProgress instanceof HTMLElement) {
        ruleBuilderStepProgress.textContent =
          'Step ' +
          String(nextIndex + 1) +
          ' of ' +
          String(ruleBuilderStepOrder.length) +
          ' · ' +
          activeStepLabel;
      }
    };

    const getConditionCards = () => {
      return Array.from(
        ruleBuilderConditionList.querySelectorAll('.ct-admin__condition-card'),
      ).filter((candidate) => candidate instanceof HTMLElement);
    };

    const readFieldFromCard = (card, fieldName) => {
      const field = card.querySelector('[data-field="' + fieldName + '"]');

      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement ||
        field instanceof HTMLSelectElement
      ) {
        return field.value.trim();
      }

      return '';
    };

    const readCheckboxFromCard = (card, fieldName) => {
      const field = card.querySelector('[data-field="' + fieldName + '"]');
      return field instanceof HTMLInputElement ? field.checked : false;
    };

    const setFieldOnCard = (card, fieldName, value) => {
      const field = card.querySelector('[data-field="' + fieldName + '"]');

      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement ||
        field instanceof HTMLSelectElement
      ) {
        field.value = value;
      }
    };

    const setCheckboxOnCard = (card, fieldName, checked) => {
      const field = card.querySelector('[data-field="' + fieldName + '"]');

      if (field instanceof HTMLInputElement) {
        field.checked = checked;
      }
    };

    const parseNumberInput = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const parseCsv = (value) => {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    };

    const toDateTimeLocalInput = (isoValue) => {
      if (typeof isoValue !== 'string' || isoValue.length < 16) {
        return '';
      }

      return isoValue.slice(0, 16);
    };

    const toIsoTimestamp = (value) => {
      if (value.length === 0) {
        return undefined;
      }

      const parsed = Date.parse(value);

      if (!Number.isFinite(parsed)) {
        return null;
      }

      return new Date(parsed).toISOString();
    };

    const conditionTypeOptionsMarkup = Object.entries(conditionTypeLabels)
      .map((entry) => {
        return (
          '<option value="' + entry[0] + '">' + entry[1] + '</option>'
        );
      })
      .join('');

    const updateConditionCardClass = (card, conditionType) => {
      card.classList.remove(
        'ct-admin__condition-card--course_completion',
        'ct-admin__condition-card--grade_threshold',
        'ct-admin__condition-card--program_completion',
        'ct-admin__condition-card--assignment_submission',
        'ct-admin__condition-card--time_window',
        'ct-admin__condition-card--prerequisite_badge',
      );
      card.classList.add('ct-admin__condition-card--' + conditionType);
    };

    const updateConditionHelpText = (card, conditionType) => {
      const helpElement = card.querySelector('.ct-admin__condition-help');

      if (!(helpElement instanceof HTMLElement)) {
        return;
      }

      const helpText = conditionTypeHelpText[conditionType] ?? 'Configure condition inputs.';
      helpElement.textContent = helpText;
    };

    const setConditionResultState = (card, state, detail) => {
      card.classList.remove(
        'ct-admin__condition-card--result-pass',
        'ct-admin__condition-card--result-fail',
        'ct-admin__condition-card--result-idle',
      );
      card.classList.add('ct-admin__condition-card--result-' + state);

      const resultElement = card.querySelector('.ct-admin__condition-result');

      if (resultElement instanceof HTMLElement) {
        resultElement.dataset.state = state;
        resultElement.textContent = detail;
      }
    };

    const renderConditionFields = (card, seed) => {
      const typeSelect = card.querySelector('.ct-admin__condition-type');
      const fieldsContainer = card.querySelector('.ct-admin__condition-fields');

      if (!(typeSelect instanceof HTMLSelectElement) || !(fieldsContainer instanceof HTMLElement)) {
        return;
      }

      const conditionType = typeSelect.value;
      updateConditionCardClass(card, conditionType);
      updateConditionHelpText(card, conditionType);

      if (conditionType === 'course_completion') {
        fieldsContainer.innerHTML =
          '<label>Course ID<input type="text" data-field="courseId" placeholder="CS101" /></label>' +
          '<label>Min completion % (optional)<input type="number" data-field="minCompletionPercent" min="0" max="100" step="0.01" /></label>' +
          '<label class="ct-admin__checkbox-row ct-checkbox-row"><input type="checkbox" data-field="requireCompleted" checked />Require completed</label>';

        setFieldOnCard(card, 'courseId', typeof seed.courseId === 'string' ? seed.courseId : '');
        setFieldOnCard(
          card,
          'minCompletionPercent',
          typeof seed.minCompletionPercent === 'number' ? String(seed.minCompletionPercent) : '',
        );
        setCheckboxOnCard(
          card,
          'requireCompleted',
          seed.requireCompleted === undefined ? true : Boolean(seed.requireCompleted),
        );
        return;
      }

      if (conditionType === 'grade_threshold') {
        fieldsContainer.innerHTML =
          '<label>Course ID<input type="text" data-field="courseId" placeholder="CS101" /></label>' +
          '<label>Score field<select data-field="scoreField"><option value="final_score">Final score</option><option value="current_score">Current score</option></select></label>' +
          '<label>Min score (optional)<input type="number" data-field="minScore" min="0" max="100" step="0.01" /></label>' +
          '<label>Max score (optional)<input type="number" data-field="maxScore" min="0" max="100" step="0.01" /></label>';

        setFieldOnCard(card, 'courseId', typeof seed.courseId === 'string' ? seed.courseId : '');
        setFieldOnCard(
          card,
          'scoreField',
          seed.scoreField === 'current_score' ? 'current_score' : 'final_score',
        );
        setFieldOnCard(card, 'minScore', typeof seed.minScore === 'number' ? String(seed.minScore) : '');
        setFieldOnCard(card, 'maxScore', typeof seed.maxScore === 'number' ? String(seed.maxScore) : '');
        return;
      }

      if (conditionType === 'program_completion') {
        fieldsContainer.innerHTML =
          '<label>Course IDs (comma separated)<input type="text" data-field="courseIds" placeholder="CS101,CS102,CS103" /></label>' +
          '<label>Minimum completed (optional)<input type="number" data-field="minimumCompleted" min="1" max="200" step="1" /></label>';

        setFieldOnCard(
          card,
          'courseIds',
          Array.isArray(seed.courseIds) ? seed.courseIds.join(', ') : '',
        );
        setFieldOnCard(
          card,
          'minimumCompleted',
          typeof seed.minimumCompleted === 'number' ? String(seed.minimumCompleted) : '',
        );
        return;
      }

      if (conditionType === 'assignment_submission') {
        fieldsContainer.innerHTML =
          '<label>Course ID<input type="text" data-field="courseId" placeholder="CS101" /></label>' +
          '<label>Assignment ID<input type="text" data-field="assignmentId" placeholder="assignment_1" /></label>' +
          '<label>Min score (optional)<input type="number" data-field="minScore" min="0" max="100" step="0.01" /></label>' +
          '<label>Workflow states (comma separated, optional)<input type="text" data-field="workflowStates" placeholder="submitted,graded" /></label>' +
          '<label class="ct-admin__checkbox-row ct-checkbox-row"><input type="checkbox" data-field="requireSubmitted" checked />Require submitted</label>';

        setFieldOnCard(card, 'courseId', typeof seed.courseId === 'string' ? seed.courseId : '');
        setFieldOnCard(
          card,
          'assignmentId',
          typeof seed.assignmentId === 'string' ? seed.assignmentId : '',
        );
        setFieldOnCard(card, 'minScore', typeof seed.minScore === 'number' ? String(seed.minScore) : '');
        setFieldOnCard(
          card,
          'workflowStates',
          Array.isArray(seed.workflowStates) ? seed.workflowStates.join(', ') : '',
        );
        setCheckboxOnCard(
          card,
          'requireSubmitted',
          seed.requireSubmitted === undefined ? true : Boolean(seed.requireSubmitted),
        );
        return;
      }

      if (conditionType === 'time_window') {
        fieldsContainer.innerHTML =
          '<label>Not before (optional)<input type="datetime-local" data-field="notBefore" /></label>' +
          '<label>Not after (optional)<input type="datetime-local" data-field="notAfter" /></label>';

        setFieldOnCard(card, 'notBefore', toDateTimeLocalInput(seed.notBefore));
        setFieldOnCard(card, 'notAfter', toDateTimeLocalInput(seed.notAfter));
        return;
      }

      fieldsContainer.innerHTML =
        '<label>Required badge template ID<input type="text" data-field="badgeTemplateId" placeholder="badge_template_foundations" /></label>';
      setFieldOnCard(
        card,
        'badgeTemplateId',
        typeof seed.badgeTemplateId === 'string' ? seed.badgeTemplateId : '',
      );
    };

    const readConditionFromCard = (card, strict) => {
      const typeSelect = card.querySelector('.ct-admin__condition-type');
      const negate = readCheckboxFromCard(card, 'negate');

      if (!(typeSelect instanceof HTMLSelectElement)) {
        throw new Error('Condition card is missing type selection.');
      }

      const conditionType = typeSelect.value;
      let condition = null;

      if (conditionType === 'course_completion') {
        const courseId = readFieldFromCard(card, 'courseId');
        const minCompletionPercent = parseNumberInput(readFieldFromCard(card, 'minCompletionPercent'));

        if (strict && courseId.length === 0) {
          throw new Error('Course completion condition requires course ID.');
        }

        condition = {
          type: 'course_completion',
          courseId: courseId.length > 0 ? courseId : 'COURSE_ID',
          requireCompleted: readCheckboxFromCard(card, 'requireCompleted'),
        };

        if (minCompletionPercent !== null) {
          condition.minCompletionPercent = minCompletionPercent;
        }
      } else if (conditionType === 'grade_threshold') {
        const courseId = readFieldFromCard(card, 'courseId');
        const minScore = parseNumberInput(readFieldFromCard(card, 'minScore'));
        const maxScore = parseNumberInput(readFieldFromCard(card, 'maxScore'));

        if (strict && courseId.length === 0) {
          throw new Error('Grade threshold condition requires course ID.');
        }

        if (strict && minScore === null && maxScore === null) {
          throw new Error('Grade threshold requires min score or max score.');
        }

        condition = {
          type: 'grade_threshold',
          courseId: courseId.length > 0 ? courseId : 'COURSE_ID',
          scoreField: readFieldFromCard(card, 'scoreField') === 'current_score' ? 'current_score' : 'final_score',
        };

        if (minScore !== null) {
          condition.minScore = minScore;
        }

        if (maxScore !== null) {
          condition.maxScore = maxScore;
        }
      } else if (conditionType === 'program_completion') {
        const courseIds = parseCsv(readFieldFromCard(card, 'courseIds'));
        const minimumCompleted = parseNumberInput(readFieldFromCard(card, 'minimumCompleted'));

        if (strict && courseIds.length === 0) {
          throw new Error('Program completion requires at least one course ID.');
        }

        condition = {
          type: 'program_completion',
          courseIds: courseIds.length > 0 ? courseIds : ['COURSE_ID'],
        };

        if (minimumCompleted !== null) {
          condition.minimumCompleted = Math.trunc(minimumCompleted);
        }
      } else if (conditionType === 'assignment_submission') {
        const courseId = readFieldFromCard(card, 'courseId');
        const assignmentId = readFieldFromCard(card, 'assignmentId');
        const minScore = parseNumberInput(readFieldFromCard(card, 'minScore'));
        const workflowStates = parseCsv(readFieldFromCard(card, 'workflowStates'));

        if (strict && courseId.length === 0) {
          throw new Error('Assignment submission condition requires course ID.');
        }

        if (strict && assignmentId.length === 0) {
          throw new Error('Assignment submission condition requires assignment ID.');
        }

        condition = {
          type: 'assignment_submission',
          courseId: courseId.length > 0 ? courseId : 'COURSE_ID',
          assignmentId: assignmentId.length > 0 ? assignmentId : 'ASSIGNMENT_ID',
          requireSubmitted: readCheckboxFromCard(card, 'requireSubmitted'),
        };

        if (minScore !== null) {
          condition.minScore = minScore;
        }

        if (workflowStates.length > 0) {
          condition.workflowStates = workflowStates;
        }
      } else if (conditionType === 'time_window') {
        const notBeforeIso = toIsoTimestamp(readFieldFromCard(card, 'notBefore'));
        const notAfterIso = toIsoTimestamp(readFieldFromCard(card, 'notAfter'));

        if (notBeforeIso === null || notAfterIso === null) {
          throw new Error('Time window condition has an invalid timestamp.');
        }

        if (strict && notBeforeIso === undefined && notAfterIso === undefined) {
          throw new Error('Time window condition requires not before or not after.');
        }

        condition = {
          type: 'time_window',
        };

        if (notBeforeIso !== undefined) {
          condition.notBefore = notBeforeIso;
        }

        if (notAfterIso !== undefined) {
          condition.notAfter = notAfterIso;
        }
      } else {
        const badgeTemplateId = readFieldFromCard(card, 'badgeTemplateId');

        if (strict && badgeTemplateId.length === 0) {
          throw new Error('Prerequisite badge condition requires badge template ID.');
        }

        condition = {
          type: 'prerequisite_badge',
          badgeTemplateId: badgeTemplateId.length > 0 ? badgeTemplateId : 'badge_template_required',
        };
      }

      return negate ? { not: condition } : condition;
    };

    const readDefinitionFromBuilder = (strict) => {
      const cards = getConditionCards();

      if (cards.length === 0) {
        throw new Error('Add at least one condition block to the canvas.');
      }

      const conditions = cards.map((card) => readConditionFromCard(card, strict));
      const rootLogic = ruleBuilderRootLogic.value === 'any' ? 'any' : 'all';

      return {
        conditions: rootLogic === 'any' ? { any: conditions } : { all: conditions },
      };
    };

    let ruleBuilderLastTestSummary = 'Not run';

    const resetConditionEvaluationResults = () => {
      getConditionCards().forEach((card) => {
        setConditionResultState(card, 'idle', 'Not evaluated yet.');
      });
    };

    const collectLeafEvaluationNodes = (node, output) => {
      if (node === null || typeof node !== 'object') {
        return;
      }

      const children = Array.isArray(node.children) ? node.children : [];

      if (children.length === 0) {
        output.push(node);
        return;
      }

      children.forEach((child) => {
        collectLeafEvaluationNodes(child, output);
      });
    };

    const rootChildrenFromEvaluationTree = (tree) => {
      if (tree === null || typeof tree !== 'object') {
        return [];
      }

      return Array.isArray(tree.children) ? tree.children : [];
    };

    const applyConditionEvaluationResults = (evaluation) => {
      const cards = getConditionCards();

      if (cards.length === 0) {
        return {
          total: 0,
          matched: 0,
        };
      }

      const directChildren = rootChildrenFromEvaluationTree(
        evaluation && typeof evaluation === 'object' ? evaluation.tree : null,
      );
      let mappedNodes = directChildren;

      if (mappedNodes.length !== cards.length) {
        const leafNodes = [];
        collectLeafEvaluationNodes(
          evaluation && typeof evaluation === 'object' ? evaluation.tree : null,
          leafNodes,
        );
        mappedNodes = leafNodes.length === cards.length ? leafNodes : [];
      }

      if (mappedNodes.length !== cards.length) {
        resetConditionEvaluationResults();
        return {
          total: cards.length,
          matched: 0,
        };
      }

      let matchedCount = 0;

      cards.forEach((card, index) => {
        const node = mappedNodes[index];
        const matched = node && typeof node.matched === 'boolean' ? node.matched : null;
        const detail = node && typeof node.detail === 'string' ? node.detail : 'No evaluation detail.';

        if (matched === true) {
          matchedCount += 1;
          setConditionResultState(card, 'pass', 'Pass: ' + detail);
          return;
        }

        if (matched === false) {
          setConditionResultState(card, 'fail', 'Fail: ' + detail);
          return;
        }

        setConditionResultState(card, 'idle', 'Not evaluated.');
      });

      return {
        total: cards.length,
        matched: matchedCount,
      };
    };

    const setSummaryText = (element, value) => {
      if (element instanceof HTMLElement) {
        element.textContent = value;
      }
    };

    const setSummaryTone = (element, tone) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }

      if (typeof tone !== 'string' || tone.length === 0) {
        delete element.dataset.tone;
        return;
      }

      element.dataset.tone = tone;
    };

    const syncConditionCanvasMeta = () => {
      const cards = getConditionCards();

      cards.forEach((card, index) => {
        const indexElement = card.querySelector('[data-condition-index]');

        if (indexElement instanceof HTMLElement) {
          indexElement.textContent = 'Condition ' + String(index + 1);
        }

        const moveUpButton = card.querySelector('button[data-condition-move="up"]');
        const moveDownButton = card.querySelector('button[data-condition-move="down"]');

        if (moveUpButton instanceof HTMLButtonElement) {
          moveUpButton.disabled = index === 0;
        }

        if (moveDownButton instanceof HTMLButtonElement) {
          moveDownButton.disabled = index === cards.length - 1;
        }
      });

      if (ruleBuilderConditionEmpty instanceof HTMLElement) {
        ruleBuilderConditionEmpty.hidden = cards.length > 0;
      }

      if (ruleBuilderCanvasCount instanceof HTMLElement) {
        ruleBuilderCanvasCount.textContent =
          String(cards.length) + (cards.length === 1 ? ' card' : ' cards');
      }

      if (ruleBuilderCanvasLogic instanceof HTMLElement) {
        ruleBuilderCanvasLogic.textContent =
          (ruleBuilderRootLogic.value === 'any' ? 'OR' : 'AND') + ' logic';
        ruleBuilderCanvasLogic.dataset.tone = ruleBuilderRootLogic.value === 'any' ? 'warning' : 'success';
      }
    };

    const syncRuleBuilderStepCompletion = (definitionReady) => {
      const metadataReady =
        getTextFieldValue('name').length > 0 &&
        getTextFieldValue('badgeTemplateId').length > 0 &&
        getTextFieldValue('lmsProviderKind').length > 0;
      const testReady =
        ruleBuilderLastTestSummary.startsWith('Matched') ||
        ruleBuilderLastTestSummary.startsWith('No match');
      let reviewReady = getTextFieldValue('issuanceTiming').length > 0;

      try {
        buildApprovalChain(getTextFieldValue('approvalRoles'));
      } catch {
        reviewReady = false;
      }

      const completionByStep = {
        metadata: metadataReady,
        conditions: definitionReady,
        test: testReady,
        review: reviewReady,
      };

      ruleBuilderStepButtons.forEach((candidate) => {
        if (!(candidate instanceof HTMLButtonElement)) {
          return;
        }

        const targetStep = candidate.dataset.ruleStepTarget ?? '';
        const isDone = completionByStep[targetStep] === true;
        candidate.classList.toggle('is-done', isDone);
      });

      const completedCount = Object.values(completionByStep).filter((value) => value).length;
      const activeStep = ruleBuilderStepOrder[activeRuleBuilderStepIndex] ?? '';
      const activeStepLabel = ruleBuilderStepLabels[activeStep] ?? 'Step';

      if (ruleBuilderStepProgress instanceof HTMLElement) {
        ruleBuilderStepProgress.textContent =
          'Step ' +
          String(activeRuleBuilderStepIndex + 1) +
          ' of ' +
          String(ruleBuilderStepOrder.length) +
          ' · ' +
          activeStepLabel +
          ' · ' +
          String(completedCount) +
          '/' +
          String(ruleBuilderStepOrder.length) +
          ' complete';
      }
    };

    const syncRuleBuilderSummary = (statusOverride) => {
      const ruleName = getTextFieldValue('name');
      const cardCount = getConditionCards().length;
      const rootLogicLabel = ruleBuilderRootLogic.value === 'any' ? 'OR (any)' : 'AND (all)';
      let definitionStatus = 'Drafting';
      let definitionTone = 'warning';
      let summaryMessage = 'Build at least one condition card to create a draft.';

      try {
        const definition = readDefinitionFromBuilder(false);
        const rootConditions =
          definition &&
          typeof definition === 'object' &&
          definition.conditions &&
          typeof definition.conditions === 'object'
            ? definition.conditions
            : null;
        const childCount =
          rootConditions !== null && Array.isArray(rootConditions.all)
            ? rootConditions.all.length
            : rootConditions !== null && Array.isArray(rootConditions.any)
              ? rootConditions.any.length
              : cardCount;

        definitionStatus = childCount > 0 ? 'Ready for review' : 'Needs conditions';
        definitionTone = childCount > 0 ? 'success' : 'warning';
        summaryMessage =
          childCount > 0
            ? 'Definition JSON is synchronized with the condition canvas.'
            : 'Add one or more condition cards to continue.';
      } catch (error) {
        definitionStatus = 'Needs attention';
        definitionTone = 'error';
        summaryMessage =
          error instanceof Error ? error.message : 'Definition is not ready for submission.';
      }

      let lastTestTone = 'info';

      if (ruleBuilderLastTestSummary.startsWith('Matched')) {
        lastTestTone = 'success';
      } else if (ruleBuilderLastTestSummary.startsWith('No match')) {
        lastTestTone = 'warning';
      } else if (
        ruleBuilderLastTestSummary.startsWith('Failed') ||
        ruleBuilderLastTestSummary.includes('invalid') ||
        ruleBuilderLastTestSummary.includes('Missing')
      ) {
        lastTestTone = 'error';
      }

      setSummaryText(
        ruleBuilderSummaryRuleName,
        ruleName.length > 0 ? ruleName : '(unnamed draft)',
      );
      setSummaryText(ruleBuilderSummaryConditionCount, String(cardCount));
      setSummaryText(ruleBuilderSummaryRootLogic, rootLogicLabel);
      setSummaryText(ruleBuilderSummaryValidity, definitionStatus);
      setSummaryText(ruleBuilderSummaryLastTest, ruleBuilderLastTestSummary);
      setSummaryText(ruleBuilderSummaryMessage, statusOverride ?? summaryMessage);
      setSummaryTone(ruleBuilderSummaryValidity, definitionTone);
      setSummaryTone(ruleBuilderSummaryLastTest, lastTestTone);
      setSummaryTone(
        ruleBuilderSummaryMessage,
        statusOverride === undefined
          ? definitionTone
          : ruleCreateStatus.dataset.tone === 'error'
            ? 'error'
            : ruleCreateStatus.dataset.tone === 'success'
              ? 'success'
              : ruleCreateStatus.dataset.tone === 'warning'
                ? 'warning'
                : 'info',
      );
      syncRuleBuilderStepCompletion(definitionTone === 'success');
    };

    const syncDefinitionJsonFromBuilder = () => {
      syncConditionCanvasMeta();

      try {
        const definition = readDefinitionFromBuilder(false);
        ruleBuilderDefinitionJson.value = JSON.stringify(definition, null, 2);
      } catch {
        // Ignore transient editing errors while user updates fields.
      }

      ruleBuilderLastTestSummary = 'Not run';
      resetConditionEvaluationResults();
      syncRuleBuilderSummary();
    };

    const createConditionCard = (seed) => {
      const card = document.createElement('article');
      card.className = 'ct-admin__condition-card ct-stack';
      card.draggable = true;
      card.innerHTML =
        '<header class="ct-admin__condition-header ct-stack">' +
        '<div class="ct-admin__condition-header-row ct-cluster">' +
        '<span class="ct-admin__condition-index" data-condition-index>Condition</span>' +
        '<span class="ct-admin__condition-drag" title="Drag to reorder" aria-hidden="true">::</span>' +
        '<div class="ct-admin__condition-actions ct-cluster">' +
        '<button type="button" class="ct-admin__button ct-admin__button--tiny ct-admin__button--ghost" data-condition-move="up" aria-label="Move condition up">Up</button>' +
        '<button type="button" class="ct-admin__button ct-admin__button--tiny ct-admin__button--ghost" data-condition-move="down" aria-label="Move condition down">Down</button>' +
        '<button type="button" class="ct-admin__button ct-admin__button--tiny ct-admin__button--danger ct-admin__condition-remove">Remove</button>' +
        '</div>' +
        '</div>' +
        '<div class="ct-admin__condition-header-fields ct-admin__builder-grid ct-grid">' +
        '<label>Type<select class="ct-admin__condition-type">' +
        conditionTypeOptionsMarkup +
        '</select></label>' +
        '<label class="ct-admin__checkbox-row ct-checkbox-row"><input type="checkbox" data-field="negate" />Invert (NOT)</label>' +
        '</div>' +
        '</header>' +
        '<p class="ct-admin__condition-help"></p>' +
        '<div class="ct-admin__condition-fields ct-admin__builder-grid ct-grid"></div>' +
        '<p class="ct-admin__condition-result" data-state="idle" aria-live="polite">Not evaluated yet.</p>';

      const typeSelect = card.querySelector('.ct-admin__condition-type');

      if (typeSelect instanceof HTMLSelectElement) {
        typeSelect.value = typeof seed.type === 'string' ? seed.type : 'grade_threshold';
      }

      setCheckboxOnCard(card, 'negate', Boolean(seed.negate));
      renderConditionFields(card, seed);
      setConditionResultState(card, 'idle', 'Not evaluated yet.');

      card.addEventListener('change', (event) => {
        const target = event.target;

        if (target instanceof HTMLSelectElement && target.classList.contains('ct-admin__condition-type')) {
          renderConditionFields(card, {
            type: target.value,
            negate: readCheckboxFromCard(card, 'negate'),
          });
        }

        syncDefinitionJsonFromBuilder();
      });

      card.addEventListener('input', () => {
        syncDefinitionJsonFromBuilder();
      });

      card.addEventListener('click', (event) => {
        const target = event.target;

        if (target instanceof HTMLButtonElement && target.dataset.conditionMove === 'up') {
          const previous = card.previousElementSibling;

          if (previous instanceof HTMLElement) {
            ruleBuilderConditionList.insertBefore(card, previous);
          }

          syncDefinitionJsonFromBuilder();
          return;
        }

        if (target instanceof HTMLButtonElement && target.dataset.conditionMove === 'down') {
          const next = card.nextElementSibling;

          if (next instanceof HTMLElement) {
            ruleBuilderConditionList.insertBefore(next, card);
          }

          syncDefinitionJsonFromBuilder();
          return;
        }

        if (target instanceof HTMLButtonElement && target.classList.contains('ct-admin__condition-remove')) {
          card.remove();
          syncDefinitionJsonFromBuilder();
        }
      });

      card.addEventListener('dragstart', () => {
        card.classList.add('is-dragging');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        syncDefinitionJsonFromBuilder();
      });

      return card;
    };

    const getDragAfterElement = (container, y) => {
      const cards = Array.from(
        container.querySelectorAll('.ct-admin__condition-card:not(.is-dragging)'),
      );
      let closestOffset = Number.NEGATIVE_INFINITY;
      let closestElement = null;

      cards.forEach((card) => {
        if (!(card instanceof HTMLElement)) {
          return;
        }

        const box = card.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closestOffset) {
          closestOffset = offset;
          closestElement = card;
        }
      });

      return closestElement;
    };

    ruleBuilderConditionList.addEventListener('dragover', (event) => {
      event.preventDefault();
      const dragging = ruleBuilderConditionList.querySelector('.ct-admin__condition-card.is-dragging');

      if (!(dragging instanceof HTMLElement)) {
        return;
      }

      const afterElement = getDragAfterElement(ruleBuilderConditionList, event.clientY);

      if (afterElement === null) {
        ruleBuilderConditionList.appendChild(dragging);
        return;
      }

      ruleBuilderConditionList.insertBefore(dragging, afterElement);
    });

    const clearConditionCanvas = () => {
      ruleBuilderConditionList.innerHTML = '';
    };

    const addConditionToCanvas = (seed) => {
      ruleBuilderConditionList.appendChild(createConditionCard(seed));
      syncDefinitionJsonFromBuilder();
    };

    const normalizeLeafConditionForBuilder = (condition) => {
      if (condition === null || typeof condition !== 'object' || Array.isArray(condition)) {
        return null;
      }

      if ('type' in condition && typeof condition.type === 'string') {
        return {
          ...condition,
          negate: false,
        };
      }

      if ('not' in condition) {
        const nested = normalizeLeafConditionForBuilder(condition.not);

        if (nested === null) {
          return null;
        }

        return {
          ...nested,
          negate: true,
        };
      }

      return null;
    };

    const applyDefinitionToBuilder = (definition, sourceLabel) => {
      if (definition === null || typeof definition !== 'object' || !('conditions' in definition)) {
        throw new Error('Rule definition must include a conditions object.');
      }

      const rootConditions = definition.conditions;
      let rootLogic = 'all';
      let rawChildren = [];

      if (rootConditions && typeof rootConditions === 'object' && Array.isArray(rootConditions.all)) {
        rootLogic = 'all';
        rawChildren = rootConditions.all;
      } else if (rootConditions && typeof rootConditions === 'object' && Array.isArray(rootConditions.any)) {
        rootLogic = 'any';
        rawChildren = rootConditions.any;
      } else {
        rawChildren = [rootConditions];
      }

      const normalizedChildren = rawChildren
        .map((condition) => normalizeLeafConditionForBuilder(condition))
        .filter((condition) => condition !== null);

      if (normalizedChildren.length !== rawChildren.length) {
        setStatus(
          ruleCreateStatus,
          sourceLabel + ' includes nested condition groups not editable as cards. JSON mode remains active.',
          true,
        );
        syncRuleBuilderSummary(
          sourceLabel +
            ' includes nested condition groups not editable as cards. Adjust JSON manually.',
        );
        return;
      }

      clearConditionCanvas();
      ruleBuilderRootLogic.value = rootLogic;
      normalizedChildren.forEach((seed) => {
        addConditionToCanvas(seed);
      });

      if (normalizedChildren.length === 0) {
        addConditionToCanvas({
          type: 'course_completion',
          courseId: 'CS101',
          requireCompleted: true,
          negate: false,
        });
      }

      syncDefinitionJsonFromBuilder();
      setStatus(ruleCreateStatus, sourceLabel + ' loaded into visual builder.', false, 'success');
      syncRuleBuilderSummary(sourceLabel + ' loaded into visual builder.');
    };

    const parseDefinitionJson = () => {
      const definitionJsonText = ruleBuilderDefinitionJson.value.trim();
      const fallbackDefinition = readDefinitionFromBuilder(true);

      if (definitionJsonText.length === 0) {
        return fallbackDefinition;
      }

      let parsed;

      try {
        parsed = JSON.parse(definitionJsonText);
      } catch {
        throw new Error('Rule JSON is not valid JSON.');
      }

      if (parsed === null || typeof parsed !== 'object' || !('conditions' in parsed)) {
        throw new Error('Rule JSON must include a top-level conditions object.');
      }

      return parsed;
    };

    const applyTemplatePreset = () => {
      const presetKey =
        ruleBuilderTemplatePreset instanceof HTMLSelectElement
          ? ruleBuilderTemplatePreset.value.trim()
          : 'course_and_grade';
      const selectedTemplate = defaultTemplateDefinitions[presetKey] ?? defaultTemplateDefinitions.course_and_grade;
      ruleBuilderDefinitionJson.value = JSON.stringify(selectedTemplate, null, 2);
      applyDefinitionToBuilder(selectedTemplate, 'Template');
    };

    const applyTestFactPreset = () => {
      const presetKey =
        ruleBuilderTestPresetSelect instanceof HTMLSelectElement
          ? ruleBuilderTestPresetSelect.value.trim()
          : 'canvas_course_grade';
      const learnerId = getTextFieldValue('testLearnerId') || 'canvas:12345';
      const recipientIdentity = getTextFieldValue('testRecipientIdentity') || 'learner@example.edu';

      setRuleCreateFieldValue('testLearnerId', learnerId);
      setRuleCreateFieldValue('testRecipientIdentity', recipientIdentity);

      if (presetKey === 'program_completion') {
        setRuleCreateFieldValue('testCourseId', 'CS101');
        setRuleCreateFieldValue('testFinalScore', '92');
        setRuleCreateFieldValue(
          'testFactsJson',
          JSON.stringify(
            {
              completions: [
                {
                  courseId: 'CS101',
                  learnerId,
                  completed: true,
                  completionPercent: 100,
                },
                {
                  courseId: 'CS102',
                  learnerId,
                  completed: true,
                  completionPercent: 100,
                },
                {
                  courseId: 'CS103',
                  learnerId,
                  completed: true,
                  completionPercent: 100,
                },
              ],
            },
            null,
            2,
          ),
        );
      } else if (presetKey === 'assignment_submission') {
        setRuleCreateFieldValue('testCourseId', 'CS101');
        setRuleCreateFieldValue('testFinalScore', '88');
        setRuleCreateFieldValue(
          'testFactsJson',
          JSON.stringify(
            {
              submissions: [
                {
                  courseId: 'CS101',
                  assignmentId: 'assignment_1',
                  learnerId,
                  score: 88,
                  workflowState: 'submitted',
                  submittedAt: new Date().toISOString(),
                },
              ],
            },
            null,
            2,
          ),
        );
      } else if (presetKey === 'prerequisite_badge') {
        setRuleCreateFieldValue('testCourseId', 'CS201');
        setRuleCreateFieldValue('testFinalScore', '95');
        setRuleCreateFieldValue(
          'testFactsJson',
          JSON.stringify(
            {
              earnedBadgeTemplateIds: ['badge_template_foundations'],
            },
            null,
            2,
          ),
        );
      } else {
        setRuleCreateFieldValue('testCourseId', 'CS101');
        setRuleCreateFieldValue('testFinalScore', '92');
        setRuleCreateFieldValue('testFactsJson', '');
      }

      const testCompletedField = getRuleCreateField('testCompleted');

      if (testCompletedField instanceof HTMLInputElement) {
        testCompletedField.checked = true;
      }

      ruleBuilderLastTestSummary = 'Not run';
      resetConditionEvaluationResults();
      setStatus(ruleCreateStatus, 'Applied test facts preset.', false);
      syncRuleBuilderSummary('Applied test facts preset.');
    };

    const buildApprovalChain = (approvalRolesText) => {
      const approvalRoles =
        approvalRolesText.length === 0
          ? []
          : approvalRolesText
              .split(',')
              .map((entry) => entry.trim())
              .filter((entry) => entry.length > 0);
      const invalidRole = approvalRoles.find((role) => !validRoles.has(role));

      if (invalidRole !== undefined) {
        throw new Error('Invalid approval role: ' + invalidRole + '. Use owner/admin/issuer/viewer.');
      }

      return approvalRoles.map((requiredRole, index) => {
        return {
          requiredRole,
          label: 'Step ' + String(index + 1) + ' · ' + requiredRole,
        };
      });
    };

    if (ruleBuilderStepButtons.length > 0) {
      ruleBuilderStepButtons.forEach((candidate) => {
        if (!(candidate instanceof HTMLButtonElement)) {
          return;
        }

        candidate.addEventListener('click', () => {
          const targetStep = candidate.dataset.ruleStepTarget ?? '';
          const targetIndex = ruleBuilderStepOrder.indexOf(targetStep);

          if (targetIndex >= 0) {
            setBuilderStepState(targetIndex);
          }
        });
      });
    }

    if (ruleBuilderStepPrevButton instanceof HTMLButtonElement) {
      ruleBuilderStepPrevButton.addEventListener('click', () => {
        setBuilderStepState(activeRuleBuilderStepIndex - 1);
      });
    }

    if (ruleBuilderStepNextButton instanceof HTMLButtonElement) {
      ruleBuilderStepNextButton.addEventListener('click', () => {
        setBuilderStepState(activeRuleBuilderStepIndex + 1);
      });
    }

    ruleCreateForm.addEventListener('input', () => {
      syncRuleBuilderSummary();
    });

    ruleCreateForm.addEventListener('change', () => {
      syncRuleBuilderSummary();
    });

    if (ruleBuilderAddConditionButton instanceof HTMLButtonElement) {
      ruleBuilderAddConditionButton.addEventListener('click', () => {
        addConditionToCanvas({
          type: 'grade_threshold',
          courseId: 'CS101',
          scoreField: 'final_score',
          minScore: 80,
          negate: false,
        });
      });
    }

    if (ruleBuilderApplyTemplateButton instanceof HTMLButtonElement) {
      ruleBuilderApplyTemplateButton.addEventListener('click', () => {
        applyTemplatePreset();
      });
    }

    if (ruleBuilderApplyTestPresetButton instanceof HTMLButtonElement) {
      ruleBuilderApplyTestPresetButton.addEventListener('click', () => {
        applyTestFactPreset();
      });
    }

    if (ruleBuilderApplyJsonButton instanceof HTMLButtonElement) {
      ruleBuilderApplyJsonButton.addEventListener('click', () => {
        try {
          const definition = parseDefinitionJson();
          applyDefinitionToBuilder(definition, 'JSON');
        } catch (error) {
          setStatus(
            ruleCreateStatus,
            error instanceof Error ? error.message : 'Unable to apply JSON to builder.',
            true,
          );
        }
      });
    }

    if (ruleBuilderRootLogic instanceof HTMLSelectElement) {
      ruleBuilderRootLogic.addEventListener('change', () => {
        syncDefinitionJsonFromBuilder();
      });
    }

    if (ruleBuilderSaveDraftButton instanceof HTMLButtonElement) {
      ruleBuilderSaveDraftButton.addEventListener('click', () => {
        try {
          const draft = {
            savedAt: new Date().toISOString(),
            name: getTextFieldValue('name'),
            description: getTextFieldValue('description'),
            badgeTemplateId: getTextFieldValue('badgeTemplateId'),
            lmsProviderKind: getTextFieldValue('lmsProviderKind'),
            approvalRoles: getTextFieldValue('approvalRoles'),
            changeSummary: getTextFieldValue('changeSummary'),
            issuanceTiming: getTextFieldValue('issuanceTiming'),
            testLearnerId: getTextFieldValue('testLearnerId'),
            testRecipientIdentity: getTextFieldValue('testRecipientIdentity'),
            testCourseId: getTextFieldValue('testCourseId'),
            testFinalScore: getTextFieldValue('testFinalScore'),
            testFactsJson: getTextFieldValue('testFactsJson'),
            testCompleted: getCheckboxFieldValue('testCompleted'),
            definition: parseDefinitionJson(),
          };
          localStorage.setItem(ruleBuilderDraftStorageKey, JSON.stringify(draft));
          setStatus(
            ruleCreateStatus,
            'Rule builder draft saved locally in this browser.',
            false,
            'success',
          );
          syncRuleBuilderSummary('Rule builder draft saved locally in this browser.');
        } catch (error) {
          setStatus(
            ruleCreateStatus,
            error instanceof Error ? error.message : 'Unable to save draft.',
            true,
          );
          syncRuleBuilderSummary(
            error instanceof Error ? error.message : 'Unable to save draft.',
          );
        }
      });
    }

    if (ruleBuilderLoadDraftButton instanceof HTMLButtonElement) {
      ruleBuilderLoadDraftButton.addEventListener('click', () => {
        const rawDraft = localStorage.getItem(ruleBuilderDraftStorageKey);

        if (rawDraft === null) {
          setStatus(ruleCreateStatus, 'No saved draft found in this browser.', true);
          syncRuleBuilderSummary('No saved draft found in this browser.');
          return;
        }

        try {
          const draft = JSON.parse(rawDraft);
          setRuleCreateFieldValue('name', typeof draft.name === 'string' ? draft.name : '');
          setRuleCreateFieldValue('description', typeof draft.description === 'string' ? draft.description : '');
          setRuleCreateFieldValue('badgeTemplateId', typeof draft.badgeTemplateId === 'string' ? draft.badgeTemplateId : '');
          setRuleCreateFieldValue('lmsProviderKind', typeof draft.lmsProviderKind === 'string' ? draft.lmsProviderKind : 'canvas');
          setRuleCreateFieldValue('approvalRoles', typeof draft.approvalRoles === 'string' ? draft.approvalRoles : 'admin,owner');
          setRuleCreateFieldValue('changeSummary', typeof draft.changeSummary === 'string' ? draft.changeSummary : '');
          setRuleCreateFieldValue('issuanceTiming', typeof draft.issuanceTiming === 'string' ? draft.issuanceTiming : 'immediate');
          setRuleCreateFieldValue('testLearnerId', typeof draft.testLearnerId === 'string' ? draft.testLearnerId : 'canvas:12345');
          setRuleCreateFieldValue('testRecipientIdentity', typeof draft.testRecipientIdentity === 'string' ? draft.testRecipientIdentity : 'learner@example.edu');
          setRuleCreateFieldValue('testCourseId', typeof draft.testCourseId === 'string' ? draft.testCourseId : 'CS101');
          setRuleCreateFieldValue('testFinalScore', typeof draft.testFinalScore === 'string' ? draft.testFinalScore : '92');
          setRuleCreateFieldValue('testFactsJson', typeof draft.testFactsJson === 'string' ? draft.testFactsJson : '');
          const testCompletedField = getRuleCreateField('testCompleted');

          if (testCompletedField instanceof HTMLInputElement) {
            testCompletedField.checked = draft.testCompleted === undefined ? true : Boolean(draft.testCompleted);
          }

          const definition = draft && typeof draft.definition === 'object' ? draft.definition : null;

          if (definition !== null) {
            ruleBuilderDefinitionJson.value = JSON.stringify(definition, null, 2);
            applyDefinitionToBuilder(definition, 'Saved draft');
          } else {
            syncDefinitionJsonFromBuilder();
          }
        } catch {
          setStatus(ruleCreateStatus, 'Saved draft data is invalid JSON.', true);
          syncRuleBuilderSummary('Saved draft data is invalid JSON.');
        }
      });
    }

    if (
      ruleBuilderImportJsonButton instanceof HTMLButtonElement &&
      ruleBuilderImportFileInput instanceof HTMLInputElement
    ) {
      ruleBuilderImportJsonButton.addEventListener('click', () => {
        ruleBuilderImportFileInput.click();
      });

      ruleBuilderImportFileInput.addEventListener('change', async () => {
        const file = ruleBuilderImportFileInput.files?.item(0);

        if (!(file instanceof File)) {
          return;
        }

        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          const definition =
            parsed && typeof parsed === 'object' && 'definition' in parsed
              ? parsed.definition
              : parsed && typeof parsed === 'object' && 'conditions' in parsed
                ? parsed
                : null;

          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed) &&
            'name' in parsed &&
            typeof parsed.name === 'string'
          ) {
            setRuleCreateFieldValue('name', parsed.name);
          }

          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed) &&
            'description' in parsed &&
            typeof parsed.description === 'string'
          ) {
            setRuleCreateFieldValue('description', parsed.description);
          }

          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed) &&
            'badgeTemplateId' in parsed &&
            typeof parsed.badgeTemplateId === 'string'
          ) {
            setRuleCreateFieldValue('badgeTemplateId', parsed.badgeTemplateId);
          }

          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed) &&
            'lmsProviderKind' in parsed &&
            typeof parsed.lmsProviderKind === 'string'
          ) {
            setRuleCreateFieldValue('lmsProviderKind', parsed.lmsProviderKind);
          }

          if (definition === null) {
            throw new Error('Imported JSON must contain definition.conditions or conditions.');
          }

          ruleBuilderDefinitionJson.value = JSON.stringify(definition, null, 2);
          applyDefinitionToBuilder(definition, 'Imported JSON');
          ruleBuilderImportFileInput.value = '';
        } catch (error) {
          setStatus(
            ruleCreateStatus,
            error instanceof Error ? error.message : 'Unable to import JSON.',
            true,
          );
          ruleBuilderImportFileInput.value = '';
        }
      });
    }

    if (ruleBuilderExportJsonButton instanceof HTMLButtonElement) {
      ruleBuilderExportJsonButton.addEventListener('click', () => {
        try {
          const definition = parseDefinitionJson();
          const payload = {
            name: getTextFieldValue('name'),
            description: getTextFieldValue('description'),
            badgeTemplateId: getTextFieldValue('badgeTemplateId'),
            lmsProviderKind: getTextFieldValue('lmsProviderKind'),
            definition,
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          const exportName =
            payload.name.length === 0
              ? 'rule-definition.json'
              : payload.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-+|-+$/g, '') + '.json';
          anchor.href = url;
          anchor.download = exportName;
          anchor.click();
          URL.revokeObjectURL(url);
          setStatus(ruleCreateStatus, 'Rule JSON exported.', false, 'success');
          syncRuleBuilderSummary('Rule JSON exported.');
        } catch (error) {
          setStatus(
            ruleCreateStatus,
            error instanceof Error ? error.message : 'Unable to export JSON.',
            true,
          );
          syncRuleBuilderSummary(
            error instanceof Error ? error.message : 'Unable to export JSON.',
          );
        }
      });
    }

    if (
      ruleBuilderCloneLoadButton instanceof HTMLButtonElement &&
      ruleBuilderCloneRuleSelect instanceof HTMLSelectElement
    ) {
      ruleBuilderCloneLoadButton.addEventListener('click', async () => {
        const ruleId = ruleBuilderCloneRuleSelect.value.trim();

        if (ruleId.length === 0) {
          setStatus(ruleCreateStatus, 'Select a rule to clone.', true);
          syncRuleBuilderSummary('Select a rule to clone.');
          return;
        }

        setStatus(ruleCreateStatus, 'Loading rule for clone...', false);
        syncRuleBuilderSummary('Loading rule for clone...');

        try {
          const response = await fetch(badgeRuleApiPath + '/' + encodeURIComponent(ruleId));
          const payload = await parseJsonBody(response);

          if (!response.ok) {
            setStatus(ruleCreateStatus, errorDetailFromPayload(payload), true);
            syncRuleBuilderSummary(errorDetailFromPayload(payload));
            return;
          }

          const rule = payload && payload.rule ? payload.rule : null;
          const versions = payload && Array.isArray(payload.versions) ? payload.versions : [];
          const latestVersion = versions
            .slice()
            .sort((left, right) => {
              const leftVersion = typeof left.versionNumber === 'number' ? left.versionNumber : 0;
              const rightVersion = typeof right.versionNumber === 'number' ? right.versionNumber : 0;
              return rightVersion - leftVersion;
            })[0];

          if (rule && typeof rule.name === 'string') {
            setRuleCreateFieldValue('name', rule.name + ' copy');
          }

          if (rule && typeof rule.description === 'string' && rule.description.length > 0) {
            setRuleCreateFieldValue('description', rule.description);
          }

          if (rule && typeof rule.badgeTemplateId === 'string') {
            setRuleCreateFieldValue('badgeTemplateId', rule.badgeTemplateId);
          }

          if (rule && typeof rule.lmsProviderKind === 'string') {
            setRuleCreateFieldValue('lmsProviderKind', rule.lmsProviderKind);
          }

          if (latestVersion && typeof latestVersion.ruleJson === 'string') {
            const definition = JSON.parse(latestVersion.ruleJson);
            ruleBuilderDefinitionJson.value = JSON.stringify(definition, null, 2);
            applyDefinitionToBuilder(definition, 'Cloned rule');
          } else {
            setStatus(ruleCreateStatus, 'Selected rule has no version JSON to clone.', true);
            syncRuleBuilderSummary('Selected rule has no version JSON to clone.');
          }
        } catch {
          setStatus(ruleCreateStatus, 'Unable to clone selected rule from this browser session.', true);
          syncRuleBuilderSummary('Unable to clone selected rule from this browser session.');
        }
      });
    }

    if (ruleBuilderTestButton instanceof HTMLButtonElement) {
      ruleBuilderTestButton.addEventListener('click', async () => {
        setStatus(ruleCreateStatus, 'Evaluating rule in test mode...', false);
        setCodeOutput(ruleBuilderTestOutput, '');
        resetConditionEvaluationResults();
        ruleBuilderLastTestSummary = 'Running...';
        syncRuleBuilderSummary('Evaluating rule in test mode...');

        let definition;

        try {
          definition = parseDefinitionJson();
        } catch (error) {
          setStatus(
            ruleCreateStatus,
            error instanceof Error ? error.message : 'Rule definition is invalid.',
            true,
          );
          ruleBuilderLastTestSummary = 'Definition invalid';
          syncRuleBuilderSummary(error instanceof Error ? error.message : 'Rule definition is invalid.');
          return;
        }

        const learnerId = getTextFieldValue('testLearnerId');
        const recipientIdentity = getTextFieldValue('testRecipientIdentity').toLowerCase();
        const lmsProviderKind = getTextFieldValue('lmsProviderKind');
        const sampleCourseId = getTextFieldValue('testCourseId');
        const sampleFinalScoreText = getTextFieldValue('testFinalScore');
        const testFactsJson = getTextFieldValue('testFactsJson');
        const testCompleted = getCheckboxFieldValue('testCompleted');

        if (learnerId.length === 0 || recipientIdentity.length === 0) {
          setStatus(ruleCreateStatus, 'Test mode requires learner ID and recipient email.', true);
          ruleBuilderLastTestSummary = 'Missing test identifiers';
          syncRuleBuilderSummary('Test mode requires learner ID and recipient email.');
          return;
        }

        let facts = undefined;

        if (testFactsJson.length > 0) {
          try {
            facts = JSON.parse(testFactsJson);
          } catch {
            setStatus(ruleCreateStatus, 'Advanced facts JSON is invalid.', true);
            ruleBuilderLastTestSummary = 'Facts JSON invalid';
            syncRuleBuilderSummary('Advanced facts JSON is invalid.');
            return;
          }
        } else if (sampleCourseId.length > 0) {
          const sampleFinalScore = Number(sampleFinalScoreText);

          if (!Number.isFinite(sampleFinalScore) || sampleFinalScore < 0 || sampleFinalScore > 100) {
            setStatus(
              ruleCreateStatus,
              'Sample final score must be a number between 0 and 100.',
              true,
            );
            ruleBuilderLastTestSummary = 'Sample score invalid';
            syncRuleBuilderSummary('Sample final score must be a number between 0 and 100.');
            return;
          }

          facts = {
            grades: [
              {
                courseId: sampleCourseId,
                learnerId,
                finalScore: sampleFinalScore,
              },
            ],
            completions: [
              {
                courseId: sampleCourseId,
                learnerId,
                completed: testCompleted,
                completionPercent: testCompleted ? 100 : 0,
              },
            ],
          };
        }

        try {
          const response = await fetch(badgeRulePreviewApiPath, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              definition,
              lmsProviderKind: lmsProviderKind.length === 0 ? 'canvas' : lmsProviderKind,
              learnerId,
              recipientIdentity,
              recipientIdentityType: 'email',
              ...(facts === undefined ? {} : { facts }),
            }),
          });
          const payload = await parseJsonBody(response);

          if (!response.ok) {
            setStatus(ruleCreateStatus, errorDetailFromPayload(payload), true);
            ruleBuilderLastTestSummary = 'Failed';
            syncRuleBuilderSummary(errorDetailFromPayload(payload));
            return;
          }

          const matched =
            payload && payload.evaluation && payload.evaluation.matched === true;
          const conditionSummary = applyConditionEvaluationResults(
            payload && payload.evaluation ? payload.evaluation : null,
          );
          const conditionSummaryText =
            conditionSummary.total === 0
              ? ''
              : ' Conditions passed: ' +
                String(conditionSummary.matched) +
                '/' +
                String(conditionSummary.total) +
                '.';
          setStatus(
            ruleCreateStatus,
            'Test evaluation complete. matched=' +
              String(Boolean(matched)) +
              '.' +
              conditionSummaryText,
            false,
            matched ? 'success' : 'warning',
          );
          ruleBuilderLastTestSummary =
            (matched ? 'Matched' : 'No match') +
            ' (' +
            String(conditionSummary.matched) +
            '/' +
            String(conditionSummary.total) +
            ' conditions)';
          syncRuleBuilderSummary(
            'Test evaluation complete. matched=' +
              String(Boolean(matched)) +
              '.' +
              conditionSummaryText,
          );
          setCodeOutput(ruleBuilderTestOutput, JSON.stringify(payload, null, 2));
        } catch {
          setStatus(ruleCreateStatus, 'Unable to run rule test from this browser session.', true);
          ruleBuilderLastTestSummary = 'Failed';
          syncRuleBuilderSummary('Unable to run rule test from this browser session.');
        }
      });
    }

    ruleCreateForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(ruleCreateStatus, 'Creating rule draft...', false);
      setCodeOutput(ruleBuilderTestOutput, '');
      syncRuleBuilderSummary('Creating rule draft...');

      const name = getTextFieldValue('name');
      const description = getTextFieldValue('description');
      const badgeTemplateId = getTextFieldValue('badgeTemplateId');
      const lmsProviderKind = getTextFieldValue('lmsProviderKind');
      const approvalRolesText = getTextFieldValue('approvalRoles');
      const issuanceTiming = getTextFieldValue('issuanceTiming');
      const changeSummaryInput = getTextFieldValue('changeSummary');

      if (name.length === 0 || badgeTemplateId.length === 0 || lmsProviderKind.length === 0) {
        setStatus(
          ruleCreateStatus,
          'Rule name, badge template, and LMS provider are required.',
          true,
        );
        syncRuleBuilderSummary('Rule name, badge template, and LMS provider are required.');
        return;
      }

      let definition;
      let approvalChain;

      try {
        definition = parseDefinitionJson();
        approvalChain = buildApprovalChain(approvalRolesText);
      } catch (error) {
        setStatus(
          ruleCreateStatus,
          error instanceof Error ? error.message : 'Rule payload is invalid.',
          true,
        );
        syncRuleBuilderSummary(
          error instanceof Error ? error.message : 'Rule payload is invalid.',
        );
        return;
      }

      const definitionWithOptions = {
        ...definition,
        options: {
          ...(definition && typeof definition === 'object' && definition.options && typeof definition.options === 'object'
            ? definition.options
            : {}),
          issuanceTiming:
            issuanceTiming === 'manual' || issuanceTiming === 'end_of_term'
              ? issuanceTiming
              : 'immediate',
        },
      };

      let changeSummary = changeSummaryInput;
      const issuanceLabel = definitionWithOptions.options.issuanceTiming.replaceAll('_', ' ');

      if (changeSummary.length === 0) {
        changeSummary = 'Rule created via visual builder; issuance timing: ' + issuanceLabel + '.';
      } else if (!changeSummary.toLowerCase().includes('issuance timing')) {
        changeSummary =
          changeSummary + ' Issuance timing: ' + issuanceLabel + '.';
      }

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
            definition: definitionWithOptions,
            ...(approvalChain.length > 0 ? { approvalChain } : {}),
            ...(changeSummary.length > 0 ? { changeSummary } : {}),
          }),
        });
        const payload = await parseJsonBody(response);

        if (!response.ok) {
          setStatus(ruleCreateStatus, errorDetailFromPayload(payload), true);
          syncRuleBuilderSummary(errorDetailFromPayload(payload));
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
          'success',
        );
        syncRuleBuilderSummary(
          'Rule draft created: ' + ruleId + (versionId.length > 0 ? ' (' + versionId + ')' : ''),
        );
        setTimeout(() => {
          window.location.assign(tenantAdminPath);
        }, 900);
      } catch {
        setStatus(ruleCreateStatus, 'Unable to create rule draft from this browser session.', true);
        syncRuleBuilderSummary('Unable to create rule draft from this browser session.');
      }
    });

    setBuilderStepState(0);
    applyTemplatePreset();
    syncRuleBuilderSummary();
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
