'use client';

import React, {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';

type ReviewDisposition =
  | 'reviewed-no-changes'
  | 'reviewed-edited'
  | 'follow-up-required'
  | 'not-suitable';

type ExportFormat = 'pdf' | 'json' | 'fhir';

type NotificationState = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

type AISummaryPermissions = {
  canRegenerate: boolean;
  canReview: boolean;
  canExport: boolean;
  canPrint: boolean;
  canViewFhir: boolean;
  canViewAudit: boolean;
  canViewVersionHistory: boolean;
  canViewProvenance: boolean;
};

type AISummaryActionsProps = {
  patientId: string;
  versionId?: string;
  patientName?: string;
  isReviewed?: boolean;
  className?: string;
  permissions?: Partial<AISummaryPermissions>;
  auditHref?: string;
  versionHistoryHref?: string;
  provenanceHref?: string;
};

type RegenerateResponse = {
  versionId?: string;
  message?: string;
};

type ReviewResponse = {
  versionId: string;
  reviewStatus: string;
  message?: string;
};

type ApiErrorBody = {
  error?: string;
  message?: string;
  correlationId?: string;
};

const DEFAULT_PERMISSIONS: AISummaryPermissions = {
  canRegenerate: true,
  canReview: true,
  canExport: true,
  canPrint: true,
  canViewFhir: true,
  canViewAudit: true,
  canViewVersionHistory: true,
  canViewProvenance: true,
};

const primaryButton =
  'inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600';

const secondaryButton =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

const tertiaryButton =
  'inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-400';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  let body: unknown = null;

  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    const text = await response.text();
    body = text ? { message: text } : null;
  }

  if (!response.ok) {
    const apiError = body as ApiErrorBody | null;
    const correlationText = apiError?.correlationId
      ? ` Correlation ID: ${apiError.correlationId}`
      : '';

    throw new Error(
      `${
        apiError?.error ??
        apiError?.message ??
        `Request failed with status ${response.status}.`
      }${correlationText}`,
    );
  }

  return body as T;
}

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1_000);
}

function getDownloadFilename(
  response: Response,
  fallback: string,
): string {
  const disposition = response.headers.get('content-disposition');
  const match = disposition?.match(
    /filename\*?=(?:UTF-8'')?["']?([^;"']+)/i,
  );

  return match?.[1]
    ? decodeURIComponent(match[1].replace(/["']/g, ''))
    : fallback;
}

function openSecureTab(url: string): void {
  const openedWindow = window.open(
    url,
    '_blank',
    'noopener,noreferrer',
  );

  if (openedWindow) {
    openedWindow.opener = null;
  }
}

function AccessibleDialog({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className={`fixed inset-0 z-50 items-center justify-center backdrop:bg-slate-950/50 ${open ? 'flex' : 'hidden'}`}
    >
      <div className="w-[min(94vw,34rem)] rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id={titleId}
                className="text-lg font-semibold text-slate-950"
              >
                {title}
              </h2>

              {description ? (
                <p
                  id={descriptionId}
                  className="mt-1 text-sm leading-6 text-slate-600"
                >
                  {description}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title}`}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              ✕
            </button>
          </div>
        </div>

        {children}
      </div>
    </dialog>
  );
}

export default function AISummaryActions({
  patientId,
  versionId,
  patientName = 'this patient',
  isReviewed = false,
  className = '',
  permissions: permissionOverrides,
  auditHref,
  versionHistoryHref,
  provenanceHref,
}: AISummaryActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();

  const menuRef = useRef<HTMLDivElement | null>(null);
  const exportTriggerRef = useRef<HTMLButtonElement | null>(null);
  const exportWasOpenRef = useRef(false);

  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(
    () => currentSearchParams.get('openRegenerate') === '1',
  );
  const [reviewDialogOpen, setReviewDialogOpen] = useState(
    () => currentSearchParams.get('openReview') === '1',
  );
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const [regenerating, setRegenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [notification, setNotification] =
    useState<NotificationState>(null);
  const [actionError, setActionError] = useState<string | null>(
    null,
  );

  const [reviewDisposition, setReviewDisposition] =
    useState<ReviewDisposition>('reviewed-no-changes');
  const [reviewNote, setReviewNote] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);

  const [exportFormat, setExportFormat] =
    useState<ExportFormat>('pdf');
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeTrends, setIncludeTrends] = useState(true);
  const [
    includePatientFriendlySummary,
    setIncludePatientFriendlySummary,
  ] = useState(false);

  const permissions = useMemo<AISummaryPermissions>(
    () => ({
      ...DEFAULT_PERMISSIONS,
      ...permissionOverrides,
    }),
    [permissionOverrides],
  );

  const encodedPatientId = encodeURIComponent(patientId);
  const apiBase = `/api/patients/${encodedPatientId}/ai-summary`;
  const pageBase = `/dashboard/records/${encodedPatientId}/ai-clinical-summary`;
  const previewActor = process.env.NODE_ENV !== 'production'
    ? currentSearchParams.get('asUser') || (currentSearchParams.get('noauth') ? 'dev' : '')
    : '';

  function actionUrl(path: string, query?: string): string {
    const params = new URLSearchParams(query || '');
    if (previewActor) params.set('asUser', previewActor);
    const serialized = params.toString();
    return `${path}${serialized ? `?${serialized}` : ''}`;
  }

  const resolvedAuditHref =
    auditHref ??
    `${pageBase}/audit${versionId ? `?version=${encodeURIComponent(versionId)}` : ''}`;

  const resolvedVersionHistoryHref =
    versionHistoryHref ??
    `${pageBase}/history${versionId ? `?version=${encodeURIComponent(versionId)}` : ''}`;

  const resolvedProvenanceHref =
    provenanceHref ??
    `${pageBase}/provenance${versionId ? `?version=${encodeURIComponent(versionId)}` : ''}`;

  const reviewDisabled =
    !permissions.canReview ||
    !versionId ||
    isReviewed ||
    reviewing;

  useEffect(() => {
    if (!moreMenuOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMoreMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick,
      );
      document.removeEventListener('keydown', handleEscape);
    };
  }, [moreMenuOpen]);

  function openRegenerateDialog(): void {
    setActionError(null);
    setRegenerateDialogOpen(true);
  }

  function openReviewDialog(): void {
    setActionError(null);
    setReviewDialogOpen(true);
  }

  function openExportDialog(): void {
    setActionError(null);
    setExportDialogOpen(true);
  }

  const closeExportDialog = useCallback((): void => {
    if (exporting) {
      return;
    }

    setExportDialogOpen(false);
    setActionError(null);
  }, [exporting]);

  useEffect(() => {
    if (exportDialogOpen) {
      exportWasOpenRef.current = true;
      return;
    }

    if (exportWasOpenRef.current) {
      exportWasOpenRef.current = false;
      exportTriggerRef.current?.focus();
    }
  }, [exportDialogOpen]);

  useEffect(() => {
    if (!exportDialogOpen) {
      return;
    }

    function handleExportEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeExportDialog();
      }
    }

    document.addEventListener('keydown', handleExportEscape);
    return () => document.removeEventListener('keydown', handleExportEscape);
  }, [exportDialogOpen, closeExportDialog]);

  function refreshToNewVersion(newVersionId?: string): void {
    if (!newVersionId) {
      router.refresh();
      return;
    }

    const nextParams = new URLSearchParams(
      currentSearchParams.toString(),
    );

    nextParams.set('version', newVersionId);

    router.replace(`${pathname}?${nextParams.toString()}`);
    router.refresh();
  }

  async function handleRegenerate(): Promise<void> {
    if (!permissions.canRegenerate || regenerating) {
      return;
    }

    setRegenerating(true);
    setActionError(null);
    setNotification({
      type: 'info',
      message: 'Generating a new summary version…',
    });

    try {
      const result = await requestJson<RegenerateResponse>(
        actionUrl(`${apiBase}/regenerate`),
        {
          method: 'POST',
          body: JSON.stringify({
            baseVersionId: versionId ?? null,
          }),
        },
      );

      setRegenerateDialogOpen(false);
      setNotification({
        type: 'success',
        message:
          result.message ?? 'A new summary version was created.',
      });

      refreshToNewVersion(result.versionId);
    } catch (error: unknown) {
      const message = getErrorMessage(error);

      setActionError(message);
      setNotification({
        type: 'error',
        message: `Summary regeneration failed. ${message}`,
      });
    } finally {
      setRegenerating(false);
    }
  }

  async function handleMarkReviewed(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!versionId || reviewDisabled) {
      return;
    }

    setReviewing(true);
    setActionError(null);

    try {
      const result = await requestJson<ReviewResponse>(
        actionUrl(`${apiBase}/review`),
        {
          method: 'POST',
          body: JSON.stringify({
            versionId,
            disposition: reviewDisposition,
            note: reviewNote.trim(),
            followUpRequired,
          }),
        },
      );

      setReviewDialogOpen(false);
      setNotification({
        type: 'success',
        message:
          result.message ?? 'The summary was marked as reviewed.',
      });

      router.refresh();
    } catch (error: unknown) {
      const message = getErrorMessage(error);

      setActionError(message);
      setNotification({
        type: 'error',
        message: `The review could not be saved. ${message}`,
      });
    } finally {
      setReviewing(false);
    }
  }

  async function handleExport(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!permissions.canExport || exporting) {
      return;
    }

    setExporting(true);
    setActionError(null);

    try {
      const response = await fetch(actionUrl(`${apiBase}/export`), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          versionId: versionId ?? null,
          format: exportFormat,
          includeEvidence,
          includeTrends,
          includePatientFriendlySummary,
        }),
      });

      if (!response.ok) {
        const contentType =
          response.headers.get('content-type') ?? '';

        let errorMessage = `Export failed with status ${response.status}.`;

        if (contentType.includes('application/json')) {
          const errorBody =
            (await response.json()) as ApiErrorBody;

          errorMessage =
            errorBody.error ??
            errorBody.message ??
            errorMessage;

          if (errorBody.correlationId) {
            errorMessage += ` Correlation ID: ${errorBody.correlationId}`;
          }
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const extension =
        exportFormat === 'fhir' ? 'json' : exportFormat;

      const fallbackFilename = [
        patientName.replace(/[^a-z0-9]+/gi, '-'),
        'AI-Clinical-Summary',
        versionId ? `Version-${versionId}` : 'Latest',
      ]
        .filter(Boolean)
        .join('-')
        .concat(`.${extension}`);

      downloadBlob(
        blob,
        getDownloadFilename(response, fallbackFilename),
      );

      setExportDialogOpen(false);
      setNotification({
        type: 'success',
        message: 'The clinical summary export is ready.',
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error);

      setActionError(message);
      setNotification({
        type: 'error',
        message: `The summary could not be exported. ${message}`,
      });
    } finally {
      setExporting(false);
    }
  }

  function handlePrint(): void {
    if (!permissions.canPrint) {
      return;
    }

    setNotification({
      type: 'info',
      message: 'Opening the print dialog…',
    });

    window.print();
  }

  function openFhir(): void {
    if (!permissions.canViewFhir) {
      return;
    }

    const params = new URLSearchParams();

    if (versionId) {
      params.set('versionId', versionId);
    }

    openSecureTab(actionUrl(`${apiBase}/fhir`, params.toString()));
  }

  function openAuditHistory(): void {
    if (!permissions.canViewAudit) {
      return;
    }

    router.push(resolvedAuditHref);
  }

  function openVersionHistory(): void {
    if (!permissions.canViewVersionHistory) {
      return;
    }

    setMoreMenuOpen(false);
    router.push(resolvedVersionHistoryHref);
  }

  function openProvenance(): void {
    if (!permissions.canViewProvenance) {
      return;
    }

    setMoreMenuOpen(false);
    router.push(resolvedProvenanceHref);
  }

  async function copyInternalLink(): Promise<void> {
    setMoreMenuOpen(false);

    try {
      await navigator.clipboard.writeText(window.location.href);

      setNotification({
        type: 'success',
        message: 'The internal summary link was copied.',
      });
    } catch {
      setNotification({
        type: 'error',
        message: 'The internal link could not be copied.',
      });
    }
  }

  function refreshPage(): void {
    setMoreMenuOpen(false);
    router.refresh();

    setNotification({
      type: 'info',
      message: 'Refreshing the clinical summary…',
    });
  }

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={openReviewDialog}
            disabled={reviewDisabled}
            aria-disabled={reviewDisabled}
            title={
              !versionId
                ? 'No summary version is available to review.'
                : isReviewed
                  ? 'This summary version has already been reviewed.'
                  : !permissions.canReview
                    ? 'You do not have permission to review this summary.'
                    : undefined
            }
            className={primaryButton}
          >
            {reviewing
              ? 'Saving Review…'
              : isReviewed
                ? 'Reviewed'
                : 'Mark as Reviewed'}
          </button>

          <button
            type="button"
            onClick={openRegenerateDialog}
            disabled={
              regenerating || !permissions.canRegenerate
            }
            aria-disabled={
              regenerating || !permissions.canRegenerate
            }
            className={secondaryButton}
          >
            {regenerating ? 'Generating…' : 'Regenerate'}
          </button>

          <button
            type="button"
            onClick={openExportDialog}
            ref={exportTriggerRef}
            disabled={exporting || !permissions.canExport}
            aria-disabled={
              exporting || !permissions.canExport
            }
            className={secondaryButton}
          >
            {exporting ? 'Preparing Export…' : 'Export'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!permissions.canPrint}
            aria-disabled={!permissions.canPrint}
            className={secondaryButton}
          >
            Print
          </button>

          <button
            type="button"
            onClick={openFhir}
            disabled={!permissions.canViewFhir}
            aria-disabled={!permissions.canViewFhir}
            className={secondaryButton}
          >
            FHIR JSON
          </button>

          <button
            type="button"
            onClick={openAuditHistory}
            disabled={!permissions.canViewAudit}
            aria-disabled={!permissions.canViewAudit}
            className="hidden xl:inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            Audit History
          </button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={moreMenuOpen}
              onClick={() =>
                setMoreMenuOpen((current) => !current)
              }
              className={secondaryButton}
            >
              More Actions
              <span aria-hidden="true" className="ml-2">
                ▾
              </span>
            </button>

            {moreMenuOpen ? (
              <div
                role="menu"
                aria-label="AI summary actions"
                className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={openVersionHistory}
                  disabled={
                    !permissions.canViewVersionHistory
                  }
                  className={`${tertiaryButton} w-full justify-start`}
                >
                  Version History
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={openProvenance}
                  disabled={!permissions.canViewProvenance}
                  className={`${tertiaryButton} w-full justify-start`}
                >
                  Provenance
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={openAuditHistory}
                  disabled={!permissions.canViewAudit}
                  className={`${tertiaryButton} w-full justify-start xl:hidden`}
                >
                  Audit History
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={copyInternalLink}
                  className={`${tertiaryButton} w-full justify-start`}
                >
                  Copy Internal Link
                </button>

                <div
                  aria-hidden="true"
                  className="my-1 border-t border-slate-200"
                />

                <button
                  type="button"
                  role="menuitem"
                  onClick={refreshPage}
                  className={`${tertiaryButton} w-full justify-start`}
                >
                  Refresh Summary
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {notification ? (
          <div
            role={
              notification.type === 'error' ? 'alert' : 'status'
            }
            aria-live="polite"
            className={[
              'flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm',
              notification.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : notification.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-blue-200 bg-blue-50 text-blue-900',
            ].join(' ')}
          >
            <span>{notification.message}</span>

            <button
              type="button"
              onClick={() => setNotification(null)}
              aria-label="Dismiss notification"
              className="rounded p-1 font-semibold hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              ✕
            </button>
          </div>
        ) : null}
      </div>

      <AccessibleDialog
        open={regenerateDialogOpen}
        onClose={() => {
          setRegenerateDialogOpen(false);
          setActionError(null);
        }}
        title="Regenerate AI clinical summary"
        description={`Create a new immutable summary version for ${patientName}. The current version will remain available in version history.`}
      >
        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Regeneration should include newly available or changed
            patient data. A reviewed summary must never be
            overwritten.
          </div>

          {versionId ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="font-medium text-slate-500">
                Current version
              </dt>
              <dd className="font-semibold text-slate-900">
                {versionId}
              </dd>
            </dl>
          ) : null}

          {actionError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              {actionError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setRegenerateDialogOpen(false)}
              className={secondaryButton}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className={primaryButton}
            >
              {regenerating
                ? 'Generating New Version…'
                : 'Create New Version'}
            </button>
          </div>
        </div>
      </AccessibleDialog>

      <AccessibleDialog
        open={reviewDialogOpen}
        onClose={() => {
          setReviewDialogOpen(false);
          setActionError(null);
        }}
        title="Review AI clinical summary"
        description="Record your clinical review of this exact summary version."
      >
        <form
          onSubmit={handleMarkReviewed}
          className="space-y-5 px-6 py-5"
        >
          <div>
            <label
              htmlFor="review-disposition"
              className="block text-sm font-semibold text-slate-800"
            >
              Review disposition
            </label>

            <select
              id="review-disposition"
              value={reviewDisposition}
              onChange={(event) =>
                setReviewDisposition(
                  event.target.value as ReviewDisposition,
                )
              }
              disabled={reviewing}
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            >
              <option value="reviewed-no-changes">
                Reviewed — No Changes
              </option>
              <option value="reviewed-edited">
                Reviewed — Edited for Clarity
              </option>
              <option value="follow-up-required">
                Reviewed — Follow-up Required
              </option>
              <option value="not-suitable">
                Reviewed — Not Suitable for Clinical Use
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="review-note"
              className="block text-sm font-semibold text-slate-800"
            >
              Review note
              <span className="ml-1 font-normal text-slate-500">
                Optional
              </span>
            </label>

            <textarea
              id="review-note"
              value={reviewNote}
              onChange={(event) =>
                setReviewNote(event.target.value)
              }
              rows={4}
              maxLength={2_000}
              disabled={reviewing}
              placeholder="Document clarifications, limitations, or required follow-up."
              className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />

            <p className="mt-1 text-right text-xs text-slate-500">
              {reviewNote.length}/2000
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
            <input
              type="checkbox"
              checked={followUpRequired}
              onChange={(event) =>
                setFollowUpRequired(event.target.checked)
              }
              disabled={reviewing}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />

            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Follow-up is required
              </span>
              <span className="mt-0.5 block text-sm text-slate-600">
                Mark this version as requiring additional clinical
                action.
              </span>
            </span>
          </label>

          {actionError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              {actionError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setReviewDialogOpen(false)}
              className={secondaryButton}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={reviewing || !versionId}
              className={primaryButton}
            >
              {reviewing
                ? 'Saving Review…'
                : 'Confirm Clinical Review'}
            </button>
          </div>
        </form>
      </AccessibleDialog>

      <AccessibleDialog
        open={exportDialogOpen}
        onClose={closeExportDialog}
        title="Export AI clinical summary"
        description="Choose an approved format and the information to include."
      >
        <form
          onSubmit={handleExport}
          className="space-y-5 px-6 py-5"
        >
          <div>
            <label
              htmlFor="export-format"
              className="block text-sm font-semibold text-slate-800"
            >
              Export format
            </label>

            <select
              id="export-format"
              autoFocus
              value={exportFormat}
              onChange={(event) =>
                setExportFormat(
                  event.target.value as ExportFormat,
                )
              }
              disabled={exporting}
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            >
              <option value="pdf">PDF Clinical Summary</option>
              <option value="json">Structured JSON</option>
              <option value="fhir">FHIR Bundle JSON</option>
            </select>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-800">
              Include
            </legend>

            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeEvidence}
                onChange={(event) =>
                  setIncludeEvidence(event.target.checked)
                }
                disabled={exporting}
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              Evidence references
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeTrends}
                onChange={(event) =>
                  setIncludeTrends(event.target.checked)
                }
                disabled={exporting}
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              Clinical trends
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includePatientFriendlySummary}
                onChange={(event) =>
                  setIncludePatientFriendlySummary(
                    event.target.checked,
                  )
                }
                disabled={exporting}
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              Patient-friendly summary
            </label>
          </fieldset>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            The export must include the AI safety disclaimer and
            must exclude restricted evidence unless the current
            user is authorized.
          </div>

          {actionError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              {actionError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeExportDialog}
              className={secondaryButton}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={exporting}
              className={primaryButton}
            >
              {exporting
                ? 'Preparing Export…'
                : 'Generate Export'}
            </button>
          </div>
        </form>
      </AccessibleDialog>
    </>
  );
}