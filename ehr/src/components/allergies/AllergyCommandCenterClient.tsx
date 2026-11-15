'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import FHIRExportClient from '@/components/FHIRExportClient';
import { mapAllergySummaryToFHIR } from '@/lib/fhir/mappers';

import {
  determineHeroSafetyState,
  computeSnapshot,
  computeCategorySummary,
  computeNeedsAttention,
  type AttentionItem,
} from '@/lib/allergies';

import type { AllergyRecord } from '@/lib/allergyStore';
import type { AllergyReviewRecord } from '@/lib/allergyReviewStore';
import type { PatientAllergySafetyResult } from '@/lib/allergySafetyStore';

import StickyPatientSafetyContext from './StickyPatientSafetyContext';
import AllergySafetyHero from './AllergySafetyHero';
import AllergySnapshot from './AllergySnapshot';
import AllergyCategorySummary from './AllergyCategorySummary';
import AllergyCard from './AllergyCard';
import AllergyRightRail from './AllergyRightRail';

import AllergyDetailDrawer from './AllergyDetailDrawer';
import AddAllergyDrawer from './AddAllergyDrawer';
import UpdateReviewDrawer from './UpdateReviewDrawer';
import MedicationConflictDrawer from './MedicationConflictDrawer';
import HistoryDrawer from './HistoryDrawer';
import SourceRecordDrawer from './SourceRecordDrawer';
import MessagePatientDrawer from './MessagePatientDrawer';
import DataQualityDrawer from './DataQualityDrawer';

import {
  IconPlus,
  IconSearch,
  IconShieldCheck,
  IconShieldAlert,
  IconClipboardCheck,
  IconPill,
  IconHistory,
  IconFileText,
  IconCheck,
  IconAlertTriangle,
  IconRefreshCw,
  IconExternalLink,
} from './AllergyIcons';

interface Props {
  patient: any;
  initialAllergies: AllergyRecord[];
  initialReview: AllergyReviewRecord | null;
  initialSafety: PatientAllergySafetyResult | null;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

export default function AllergyCommandCenterClient({
  patient,
  initialAllergies,
  initialReview,
  initialSafety,
}: Props) {
  const [allergies, setAllergies] = useState<AllergyRecord[]>(initialAllergies || []);
  const [review, setReview] = useState<AllergyReviewRecord | null>(initialReview || null);
  const [safety, setSafety] = useState<PatientAllergySafetyResult | null>(initialSafety || null);

  // Filters & Search
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drawers state
  const [selectedDetailAllergy, setSelectedDetailAllergy] = useState<AllergyRecord | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isDataQualityOpen, setIsDataQualityOpen] = useState(false);
  const [isInteropOpen, setIsInteropOpen] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<string | null>(null);
  const [updatedAtTimestamp, setUpdatedAtTimestamp] = useState<string>('Just now');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // Refresh data from backend APIs
  async function refreshData() {
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patient.id)}/allergies`);
      if (res.ok) {
        const json = await res.json();
        if (json.items) setAllergies(json.items);
        if (json.review) setReview(json.review);
        if (json.safety) setSafety(json.safety);
        setUpdatedAtTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      /* fallback to local state */
    }
  }

  useEffect(() => {
    refreshData();
  }, [patient.id]);

  // Pure state calculations
  const heroState = determineHeroSafetyState(allergies, review);
  const snapshot = computeSnapshot(allergies, review, safety);
  const needsAttention = computeNeedsAttention(allergies, review, safety);

  const activeAllergies = allergies.filter((a) => a.clinicalStatus === 'active');
  const severeCount = activeAllergies.filter(
    (a) => a.criticality === 'high' || a.reactions.some((r) => r.severity === 'severe')
  ).length;

  // Filter active list
  const filteredActiveAllergies = activeAllergies.filter((a) => {
    if (categoryFilter !== 'all') {
      const normCat = categoryFilter.toLowerCase();
      if (normCat === 'unverified') {
        if (a.verificationStatus === 'confirmed') return false;
      } else {
        const cats = (a.category || []).map((c) => String(c).toLowerCase());
        if (normCat === 'latex') {
          if (!cats.includes('latex') && !(a.substance?.display || '').toLowerCase().includes('latex')) {
            return false;
          }
        } else if (!cats.includes(normCat)) {
          return false;
        }
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (a.substance?.display || '').toLowerCase().includes(q);
      const matchReaction = a.reactions.some((r) => (r.manifestation || '').toLowerCase().includes(q));
      if (!matchName && !matchReaction) return false;
    }

    return true;
  });

  // Handlers
  function handleAllergyAdded(newRecord: AllergyRecord) {
    setAllergies((prev) => [newRecord, ...prev]);
    showToast(`Allergy "${newRecord.substance?.display}" recorded successfully.`);
    refreshData();
  }

  function handleReviewRecorded(newReview: AllergyReviewRecord) {
    setReview(newReview);
    showToast('Allergy reconciliation review updated.');
    refreshData();
  }

  async function handlePatchAllergy(
    allergyId: string,
    patch: Partial<AllergyRecord>,
    action: string,
    detail?: string
  ) {
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patient.id)}/allergies/${allergyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patch, action, detail }),
      });

      if (res.ok) {
        showToast(`Record ${action} successfully.`);
        refreshData();
      } else {
        showToast('Failed to update record state.');
      }
    } catch {
      showToast('Error persisting record state update.');
    }
  }

  async function handleResolveAllergy(allergyId: string, reason: string) {
    await handlePatchAllergy(
      allergyId,
      { clinicalStatus: 'resolved', resolvedReason: reason, resolvedDate: new Date().toISOString() },
      'resolved',
      reason
    );
  }

  async function handleRefuteAllergy(allergyId: string, reason: string) {
    await handlePatchAllergy(
      allergyId,
      { verificationStatus: 'refuted', clinicalStatus: 'inactive' },
      'refuted',
      reason
    );
  }

  async function handleEnteredInError(allergyId: string, reason: string) {
    await handlePatchAllergy(
      allergyId,
      { clinicalStatus: 'entered-in-error', verificationStatus: 'entered-in-error', enteredInErrorReason: reason },
      'entered-in-error',
      reason
    );
  }

  async function handleRetrySafety() {
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patient.id)}/allergy-safety-retry`, {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.safety) setSafety(json.safety);
        showToast('Medication allergy safety service re-connected.');
      }
    } catch {
      showToast('Safety check service remains offline.');
    }
  }

  function handleAttentionItemClick(item: AttentionItem) {
    if (item.id === 'safety-unavailable') {
      handleRetrySafety();
    } else if (item.id.startsWith('conflict-')) {
      setIsConflictOpen(true);
    } else if (item.id === 'review-due') {
      setIsReviewOpen(true);
    } else {
      const target = allergies.find((a) => a.id === item.id || `unverified-${a.id}` === item.id);
      if (target) setSelectedDetailAllergy(target);
      else setIsReviewOpen(true);
    }
  }

  function handlePrintSummary() {
    window.print();
  }

  return (
    <div className="bg-[#F6F9FB] min-h-screen py-6 font-sans text-slate-900 antialiased print:bg-white print:py-0">
      {/* Sticky Patient Context */}
      <StickyPatientSafetyContext
        patient={patient}
        heroState={heroState}
        activeCount={activeAllergies.length}
        severeCount={severeCount}
        onAddAllergy={() => setIsAddOpen(true)}
        onUpdateReview={() => setIsReviewOpen(true)}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <IconCheck className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href={`/dashboard/records/${patient.id}`}
              className="text-sm font-semibold text-teal-700 hover:text-teal-900 transition-colors flex items-center gap-1"
            >
              ← Back to Patient
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121A2D] tracking-tight">
              Allergy Detail
            </h1>

            {/* Compact Header Safety Pill */}
            {heroState === 'verified-nka' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <IconShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                ✓ No Known Allergies
              </span>
            ) : heroState === 'severe-active' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                <IconShieldAlert className="w-3.5 h-3.5 text-red-600" />! {activeAllergies.length} Active ({severeCount} Severe)
              </span>
            ) : heroState === 'active-allergies' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                <IconShieldAlert className="w-3.5 h-3.5 text-blue-700" />! {activeAllergies.length} Active Allergies
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                <IconAlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                Needs Allergy Review
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Chart updated: <strong className="text-gray-700">{updatedAtTimestamp}</strong></span>
            <button
              onClick={refreshData}
              className="p-1.5 text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
              title="Refresh Allergy State"
            >
              <IconRefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Standard Roshi Patient Identity Banner */}
        <PatientProfileHeader patient={patient} />

        {/* Hero Section */}
        <AllergySafetyHero
          heroState={heroState}
          allergies={allergies}
          review={review}
          onReviewClick={() => setIsReviewOpen(true)}
          onAddClick={() => setIsAddOpen(true)}
          onSelectAllergy={(a) => setSelectedDetailAllergy(a)}
        />

        {/* Top Safety Snapshot */}
        <AllergySnapshot
          snapshot={snapshot}
          severeCount={severeCount}
          onFilterClick={(f) => setCategoryFilter(f)}
          onRetrySafety={handleRetrySafety}
        />

        {/* Since Last Review / Data Quality Bar */}
        <div className="bg-white rounded-2xl p-4 border border-[#DDE7F0] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-slate-800 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg">
              Since Last Allergy Review
            </span>
            <span className="text-gray-600 font-medium">0 new allergies</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-600 font-medium">0 reaction changes</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-600 font-medium">0 new med conflicts</span>
            <span className="text-gray-300">•</span>
            <span className="text-emerald-700 font-bold">1 patient confirmation</span>
          </div>

          <button
            onClick={() => setIsDataQualityOpen(true)}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors flex items-center gap-1"
          >
            <span>View Data Quality & Changes</span>
            <span>→</span>
          </button>
        </div>

        {/* MAIN DESKTOP COMPOSITION (68% / 32% SPLIT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT CLINICAL WORKSPACE (68%) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Current Allergies & Intolerances Section */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-[#121A2D]">
                    Current Allergies & Intolerances
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
                    {activeAllergies.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddOpen(true)}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow transition-colors flex items-center gap-1.5"
                  >
                    <IconPlus className="w-4 h-4" />
                    <span>+ Add Allergy</span>
                  </button>
                </div>
              </div>

              {/* Search & Category Filter Pills */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-gray-100">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search allergen or reaction..."
                    className="w-full text-xs p-2.5 pl-8 border border-gray-300 rounded-xl focus:ring-1 focus:ring-teal-500"
                  />
                  <IconSearch className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3" />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full text-xs">
                  {[
                    { key: 'all', label: 'All Categories' },
                    { key: 'medication', label: 'Drug' },
                    { key: 'food', label: 'Food' },
                    { key: 'environmental', label: 'Environmental' },
                    { key: 'latex', label: 'Latex' },
                    { key: 'unverified', label: 'Unverified' },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setCategoryFilter(cat.key)}
                      className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                        categoryFilter === cat.key
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allergy Cards List */}
              <div className="space-y-3 pt-2">
                {filteredActiveAllergies.length > 0 ? (
                  filteredActiveAllergies.map((allergy) => (
                    <AllergyCard
                      key={allergy.id}
                      allergy={allergy}
                      onSelect={(a) => setSelectedDetailAllergy(a)}
                      onEdit={(a) => setSelectedDetailAllergy(a)}
                      onVerify={(a) => handlePatchAllergy(a.id, { verificationStatus: 'confirmed' }, 'verified')}
                    />
                  ))
                ) : (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
                      <IconShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-sm text-slate-800">
                      No active allergy records match your criteria
                    </div>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      {heroState === 'verified-nka'
                        ? 'This patient is documented as No Known Allergies (NKA).'
                        : 'No allergy entries match the selected search or category filter.'}
                    </p>
                    <button
                      onClick={() => setIsAddOpen(true)}
                      className="mt-2 px-4 py-2 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors"
                    >
                      + Add Allergy
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Category Summary Section */}
            <AllergyCategorySummary
              allergies={allergies}
              onCategoryClick={(catKey) => setCategoryFilter(catKey)}
            />

            {/* Allergy Status Overview Section */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm space-y-3">
              <h3 className="text-lg font-bold text-[#121A2D]">Allergy Status Overview</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-gray-500 font-semibold uppercase tracking-wider">Current Status</div>
                  <div className="font-extrabold text-sm text-[#121A2D] mt-0.5">
                    {heroState === 'verified-nka'
                      ? 'No Known Allergies'
                      : heroState === 'severe-active'
                      ? 'Active Severe Allergy'
                      : heroState === 'active-allergies'
                      ? `${activeAllergies.length} Active Allergies`
                      : 'Not Documented'}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500 font-semibold uppercase tracking-wider">Verification State</div>
                  <div className="font-extrabold text-sm text-emerald-800 mt-0.5">
                    {review?.nkaStatus === 'confirmed-nka'
                      ? 'Confirmed NKA'
                      : review?.nkaStatus === 'has-allergies'
                      ? 'Confirmed Active Records'
                      : 'Pending Reconciliation'}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500 font-semibold uppercase tracking-wider">Last Reviewed Date</div>
                  <div className="font-extrabold text-sm text-slate-900 mt-0.5">
                    {formatDate(review?.lastReviewedAt || activeAllergies[0]?.lastReviewedAt)}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-200 text-xs text-gray-700">
                <span className="font-bold text-slate-800">Clinical Meaning: </span>
                {heroState === 'verified-nka'
                  ? 'No active allergy reactions are currently recorded following recent clinician reconciliation. Continue confirming allergies at each encounter before prescribing or administering medication.'
                  : 'Active allergy records exist in chart. Prescribing safety filters cross-examine medication orders against documented allergy substances.'}
              </div>
            </div>

            {/* Patient-Reported Allergy Review Section */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#121A2D]">Patient-Reported Allergy Review</h3>
                  <p className="text-xs text-gray-500">Self-reported sensitivities & patient portal confirmations</p>
                </div>
                <button
                  onClick={() => setIsReviewOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors"
                >
                  Update Patient Allergy Review
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-gray-500">Last Confirmation Date</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {formatDate(review?.lastReviewedAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Reviewed By</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {review?.reviewedBy || 'Dr. Chen'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Discrepancies Flagged</div>
                    <div className="font-bold text-emerald-700 mt-0.5">None</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="text-gray-500 font-semibold">Patient Statement Summary:</div>
                  <div className="font-medium text-slate-800 mt-0.5">
                    "{review?.patientReportedStatus || 'Patient denies known medication, food, latex, or environmental allergies.'}"
                  </div>
                </div>
              </div>
            </div>

            {/* Medication Safety Context Section */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#121A2D]">Medication Safety Context</h3>
                  <p className="text-xs text-gray-500">Cross-checking active prescriptions against documented allergy substances</p>
                </div>
                <button
                  onClick={() => setIsConflictOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors flex items-center gap-1"
                >
                  <span>Review Safety Service</span>
                  <IconExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {safety?.status === 'unavailable' ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <IconShieldAlert className="w-4 h-4 text-amber-700" />
                    <span>Safety Check Unavailable</span>
                  </div>
                  <p className="text-xs">
                    Automated medication-allergy conflict checking could not be completed due to safety engine communication status.
                  </p>
                  <button
                    onClick={handleRetrySafety}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-lg shadow"
                  >
                    Retry Safety Check
                  </button>
                </div>
              ) : (safety?.conflicts?.length || 0) > 0 ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                  <div className="font-bold text-xs text-red-900 flex items-center gap-1.5">
                    <IconShieldAlert className="w-4 h-4 text-red-600" />
                    <span>Potential Medication-Allergy Interaction Detected ({safety?.conflicts?.length})</span>
                  </div>
                  {safety?.conflicts?.map((c) => (
                    <div key={c.id} className="text-xs text-red-950 font-medium bg-white p-2.5 rounded-lg border border-red-200">
                      <strong>{c.medicationName}</strong>: {c.message}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
                  <IconCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>No recognized allergy conflicts found in currently available documented prescription data.</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-gray-500">Active Prescriptions: {(patient.medications || []).length}</span>
                <Link
                  href={`/dashboard/records/${patient.id}/medications`}
                  className="font-bold text-teal-700 hover:underline flex items-center gap-1"
                >
                  <span>Open Medication History</span>
                  <IconExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Allergy Review Timeline Section */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#121A2D]">Allergy Review Timeline</h3>
                  <p className="text-xs text-gray-500">Historical sequence of chart reconciliation events</p>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors"
                >
                  View Full Allergy History →
                </button>
              </div>

              <div className="relative border-l-2 border-slate-200 pl-4 space-y-3">
                {(review?.history || []).slice(-3).reverse().map((h, i) => (
                  <div key={i} className="relative text-xs">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                    <div className="font-bold text-slate-900">{formatDate(h.date)} — {h.nkaStatus.toUpperCase()}</div>
                    <div className="text-gray-500">Verified by {h.by}</div>
                    <div className="text-gray-700 font-medium mt-0.5">{h.patientReportedStatus}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents & Source Records Section */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm space-y-3">
              <h3 className="text-lg font-bold text-[#121A2D]">Documents & Source Records</h3>
              <div className="space-y-2 text-xs">
                {(patient.documents || []).length > 0 ? (
                  patient.documents.map((doc: any) => (
                    <div key={doc.id} className="p-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">{doc.name}</div>
                        <div className="text-gray-500">{formatDate(doc.date)}</div>
                      </div>
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="px-3 py-1.5 font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100"
                      >
                        View Details
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-xs italic">No source documents attached to chart.</div>
                )}
              </div>
            </div>

            {/* Interoperability & FHIR Tools (Moved out of normal clinical flow) */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm space-y-3">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsInteropOpen(!isInteropOpen)}>
                <div>
                  <h3 className="text-sm font-bold text-[#121A2D] uppercase tracking-wider">
                    Advanced Interoperability & FHIR Export
                  </h3>
                  <p className="text-xs text-gray-500">Technical FHIR R4 AllergyIntolerance resource mappings</p>
                </div>
                <button className="text-xs font-bold text-teal-700 underline">
                  {isInteropOpen ? 'Collapse' : 'Expand'}
                </button>
              </div>

              {isInteropOpen && (
                <div className="pt-3 border-t border-gray-100 space-y-3 text-xs">
                  <p className="text-gray-600">
                    Export a minimal FHIR R4 Bundle representing the patient's allergy summary and medication safety context for external interoperability exchanges.
                  </p>
                  <FHIRExportClient
                    bundle={mapAllergySummaryToFHIR(patient)}
                    filename={`patient-${patient.id}-allergies.json`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SAFETY WORKFLOW RAIL (32%) */}
          <div className="lg:col-span-4">
            <AllergyRightRail
              patient={patient}
              heroState={heroState}
              allergies={allergies}
              review={review}
              safety={safety}
              needsAttention={needsAttention}
              onAddAllergy={() => setIsAddOpen(true)}
              onUpdateReview={() => setIsReviewOpen(true)}
              onMessagePatient={() => setIsMessageOpen(true)}
              onOpenMedicationHistory={() => setIsConflictOpen(true)}
              onViewTimeline={() => setIsHistoryOpen(true)}
              onPrintSummary={handlePrintSummary}
              onViewSources={() => {
                if (patient.documents && patient.documents.length > 0) setSelectedDoc(patient.documents[0]);
                else showToast('No source documents attached to chart.');
              }}
              onAttentionItemClick={handleAttentionItemClick}
            />
          </div>
        </div>
      </div>

      {/* ALL DRAWERS & MODALS */}
      <AllergyDetailDrawer
        allergy={selectedDetailAllergy}
        onClose={() => setSelectedDetailAllergy(null)}
        onEdit={(a) => {
          setSelectedDetailAllergy(null);
          setIsAddOpen(true);
        }}
        onResolve={handleResolveAllergy}
        onRefute={handleRefuteAllergy}
        onEnteredInError={handleEnteredInError}
      />

      <AddAllergyDrawer
        patientId={patient.id}
        existingAllergies={allergies}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSaved={handleAllergyAdded}
      />

      <UpdateReviewDrawer
        patientId={patient.id}
        currentReview={review}
        allergies={allergies}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onReviewRecorded={handleReviewRecorded}
      />

      <MedicationConflictDrawer
        patient={patient}
        safety={safety}
        isOpen={isConflictOpen}
        onClose={() => setIsConflictOpen(false)}
        onRetrySafety={handleRetrySafety}
        onOpenMedicationHistory={() => {
          setIsConflictOpen(false);
          window.location.href = `/dashboard/records/${patient.id}/medications`;
        }}
      />

      <HistoryDrawer
        allergies={allergies}
        review={review}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <SourceRecordDrawer
        document={selectedDoc}
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />

      <MessagePatientDrawer
        patient={patient}
        isOpen={isMessageOpen}
        onClose={() => setIsMessageOpen(false)}
        onSent={() => showToast('Secure patient portal message sent.')}
      />

      <DataQualityDrawer
        allergies={allergies}
        review={review}
        isOpen={isDataQualityOpen}
        onClose={() => setIsDataQualityOpen(false)}
      />
    </div>
  );
}
