'use client';

import React from 'react';
import { IconPill, IconUtensils, IconLeaf, IconBandage, IconChevronRight } from './AllergyIcons';
import type { AllergyRecord } from '@/lib/allergyStore';

interface Props {
  allergies: AllergyRecord[];
  onCategoryClick: (categoryKey: string) => void;
}

export default function AllergyCategorySummary({ allergies, onCategoryClick }: Props) {
  const active = allergies.filter((a) => a.clinicalStatus === 'active');

  const categories = [
    {
      key: 'medication',
      label: 'Drug Allergies',
      sublabel: 'Medications & Antibiotics',
      icon: IconPill,
      iconBg: 'bg-blue-100 text-blue-800',
      borderColor: 'border-blue-200 hover:border-blue-300',
      items: active.filter((a) => (a.category || []).includes('medication')),
    },
    {
      key: 'food',
      label: 'Food Allergies',
      sublabel: 'Ingested allergens & nuts',
      icon: IconUtensils,
      iconBg: 'bg-amber-100 text-amber-800',
      borderColor: 'border-amber-200 hover:border-amber-300',
      items: active.filter((a) => (a.category || []).includes('food')),
    },
    {
      key: 'environmental',
      label: 'Environmental',
      sublabel: 'Pollen, dust, mold, dander',
      icon: IconLeaf,
      iconBg: 'bg-emerald-100 text-emerald-800',
      borderColor: 'border-emerald-200 hover:border-emerald-300',
      items: active.filter((a) => (a.category || []).includes('environmental')),
    },
    {
      key: 'latex',
      label: 'Latex & Material',
      sublabel: 'Gloves, rubber, medical materials',
      icon: IconBandage,
      iconBg: 'bg-purple-100 text-purple-800',
      borderColor: 'border-purple-200 hover:border-purple-300',
      items: active.filter(
        (a) =>
          (a.category || []).includes('latex') ||
          (a.substance?.display || '').toLowerCase().includes('latex')
      ),
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-[#121A2D]">Allergy Categories</h3>
          <p className="text-xs text-gray-500">
            Categorized active allergy counts and classification overview
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {categories.map((c) => {
          const count = c.items.length;
          const Icon = c.icon;
          const sampleNames = c.items.map((i) => i.substance?.display).join(', ');

          return (
            <button
              key={c.key}
              onClick={() => onCategoryClick(c.key)}
              className={`p-4 rounded-xl border text-left bg-white transition-all duration-150 hover:shadow-sm flex flex-col justify-between ${c.borderColor}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      count > 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count} active
                  </span>
                </div>

                <div className="mt-3 font-bold text-sm text-[#121A2D]">{c.label}</div>
                <div className="text-xs text-gray-500">{c.sublabel}</div>

                <div className="mt-2 text-xs font-medium text-gray-700 min-h-[32px]">
                  {count > 0 ? (
                    <span className="text-slate-900 font-semibold truncate block">{sampleNames}</span>
                  ) : (
                    <span className="text-gray-400 font-normal">No active records</span>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-teal-700">
                <span>View category</span>
                <IconChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
