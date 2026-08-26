'use client';

import React, { useState } from 'react';
import { IconX, IconSearch, IconAlertTriangle, IconPlus, IconCheck } from './AllergyIcons';
import type { AllergyRecord } from '@/lib/allergyStore';

interface Props {
  patientId: string;
  existingAllergies: AllergyRecord[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newRecord: AllergyRecord) => void;
}

const COMMON_ALLERGENS = [
  { display: 'Penicillin', category: 'medication', code: '70618006' },
  { display: 'Amoxicillin', category: 'medication', code: '372687004' },
  { display: 'Sulfa (Sulfonamides)', category: 'medication', code: '91936005' },
  { display: 'Aspirin', category: 'medication', code: '293586001' },
  { display: 'Iodine / Radiocontrast', category: 'medication', code: '293584003' },
  { display: 'Peanuts', category: 'food', code: '256349002' },
  { display: 'Tree Nuts', category: 'food', code: '227210005' },
  { display: 'Shellfish', category: 'food', code: '300913006' },
  { display: 'Eggs', category: 'food', code: '102263004' },
  { display: 'Latex', category: 'latex', code: '300916003' },
  { display: 'Bee Venom / Hymenoptera', category: 'environmental', code: '288531000' },
  { display: 'Ragweed Pollen', category: 'environmental', code: '256277009' },
];

export default function AddAllergyDrawer({
  patientId,
  existingAllergies,
  isOpen,
  onClose,
  onSaved,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAllergen, setSelectedAllergen] = useState<string>('');
  const [category, setCategory] = useState<string>('medication');
  const [clinicalStatus, setClinicalStatus] = useState<string>('active');
  const [verificationStatus, setVerificationStatus] = useState<string>('confirmed');
  const [type, setType] = useState<'allergy' | 'intolerance'>('allergy');
  const [reaction, setReaction] = useState<string>('');
  const [severity, setSeverity] = useState<string>('severe');
  const [onset, setOnset] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [source, setSource] = useState<string>('Clinician Documented');

  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredSuggestions = COMMON_ALLERGENS.filter((a) =>
    a.display.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleSelectSuggestion(item: typeof COMMON_ALLERGENS[0]) {
    setSelectedAllergen(item.display);
    setCategory(item.category);
    setSearchTerm(item.display);
  }

  function checkDuplicates(allergenName: string): boolean {
    const normNew = allergenName.trim().toLowerCase();
    const found = existingAllergies.find((a) => {
      const normExist = (a.substance?.display || '').trim().toLowerCase();
      return (
        normExist === normNew ||
        normExist.includes(normNew) ||
        normNew.includes(normExist)
      );
    });
    return !!found;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const allergenName = selectedAllergen || searchTerm;
    if (!allergenName.trim()) {
      setErrorMsg('Allergen name is required.');
      return;
    }

    // Check duplicate
    if (!duplicateWarning && checkDuplicates(allergenName)) {
      setDuplicateWarning(
        `A similar active allergy record for "${allergenName}" is already documented for this patient. Click 'Save Anyway' to create a separate entry.`
      );
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload = {
      patientId,
      substance: { display: allergenName },
      category: [category],
      type,
      clinicalStatus,
      verificationStatus,
      criticality: severity === 'severe' ? 'high' : 'low',
      reactions: reaction
        ? [{ manifestation: reaction, severity, onset: onset || undefined }]
        : [],
      onset: onset || undefined,
      recordedAt: new Date().toISOString().slice(0, 10),
      source,
      note,
    };

    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/allergies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Server returned an error');
      }

      const data = await res.json();
      if (data.item) {
        onSaved(data.item);
        onClose();
        // Reset form
        setSelectedAllergen('');
        setSearchTerm('');
        setReaction('');
        setNote('');
        setDuplicateWarning(null);
      }
    } catch (err: any) {
      setErrorMsg('We couldn\'t save this allergy. Your inputs have been preserved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-[620px] bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#DDE7F0] bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#121A2D]">Add New Allergy Record</h2>
            <p className="text-xs text-gray-500">
              Document an allergy or intolerance with terminology search & reaction profiling
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
              {errorMsg}
            </div>
          )}

          {duplicateWarning && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <IconAlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Possible Duplicate Record Detected</span>
              </div>
              <p>{duplicateWarning}</p>
            </div>
          )}

          {/* Allergen Search / Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Allergen / Substance <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedAllergen(e.target.value);
                  setDuplicateWarning(null);
                }}
                placeholder="Search or enter allergen (e.g. Penicillin, Peanuts, Latex)..."
                className="w-full text-sm p-3 pr-9 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <IconSearch className="w-4 h-4 text-gray-400 absolute right-3 top-3.5" />
            </div>

            {/* Suggestions list if typing */}
            {searchTerm && filteredSuggestions.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto p-1 mt-1 z-10 space-y-1">
                {filteredSuggestions.map((item) => (
                  <button
                    key={item.display}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-teal-50 hover:text-teal-900 flex items-center justify-between"
                  >
                    <span className="font-semibold">{item.display}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{item.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Reaction Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-sm p-2.5 border border-gray-300 rounded-xl bg-white"
              >
                <option value="allergy">Immune Allergy</option>
                <option value="intolerance">Non-Immune Intolerance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm p-2.5 border border-gray-300 rounded-xl bg-white capitalize"
              >
                <option value="medication">Medication / Drug</option>
                <option value="food">Food</option>
                <option value="environmental">Environmental</option>
                <option value="latex">Latex / Material</option>
                <option value="other">Other Substance</option>
              </select>
            </div>
          </div>

          {/* Reaction & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Manifested Reaction
              </label>
              <input
                type="text"
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
                placeholder="e.g. Anaphylaxis, Hives, Swelling..."
                className="w-full text-sm p-2.5 border border-gray-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full text-sm p-2.5 border border-gray-300 rounded-xl bg-white"
              >
                <option value="severe">Severe / Anaphylactic</option>
                <option value="moderate">Moderate</option>
                <option value="mild">Mild</option>
              </select>
            </div>
          </div>

          {/* Status & Verification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Clinical Status
              </label>
              <select
                value={clinicalStatus}
                onChange={(e) => setClinicalStatus(e.target.value)}
                className="w-full text-sm p-2.5 border border-gray-300 rounded-xl bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Verification Status
              </label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full text-sm p-2.5 border border-gray-300 rounded-xl bg-white"
              >
                <option value="confirmed">Confirmed / Clinician Verified</option>
                <option value="unconfirmed">Unconfirmed</option>
                <option value="provisional">Provisional / Patient Reported</option>
              </select>
            </div>
          </div>

          {/* Onset & Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Onset Date
              </label>
              <input
                type="date"
                value={onset}
                onChange={(e) => setOnset(e.target.value)}
                className="w-full text-sm p-2.5 border border-gray-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Source Provenance
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full text-sm p-2.5 border border-gray-300 rounded-xl bg-white"
              >
                <option value="Clinician Documented">Clinician Documented</option>
                <option value="Patient Reported">Patient Reported</option>
                <option value="Hospital Import">Hospital Import / Summary</option>
                <option value="External EHR">External EHR Transfer</option>
              </select>
            </div>
          </div>

          {/* Clinical Note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Clinical Context & Notes
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Record details of initial exposure, hospital discharge summary, or patient description..."
              className="w-full text-sm p-3 border border-gray-300 rounded-xl"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow transition-colors flex items-center gap-1.5"
            >
              {saving ? 'Saving Allergy...' : duplicateWarning ? 'Save Anyway' : 'Add Allergy Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
