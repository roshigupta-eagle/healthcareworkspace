 'use client';

import React from 'react';
import AnimatedLink from '@/components/AnimatedLink';
import { useThemeLang } from '@/components/ThemeLangProvider';

type Props = { session?: any; role?: string };

export default function Sidebar({ session, role = 'PATIENT' }: Props) {
  const { t } = useThemeLang();
  return (
    <nav aria-label="Main navigation" className="w-full h-full bg-blue-400 text-white p-4 shadow-none">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white" data-i18n="title">{t('title')}</h2>
        <p className="text-xs text-blue-200 mt-1">{session?.user?.name} &bull; {role}</p>
      </div>

      <ul className="space-y-1" role="list">
        <li>
          <AnimatedLink href="/dashboard" className="block px-3 py-2 rounded-md text-sm font-medium bg-blue-500 text-white" aria-current="page" data-i18n="dashboard">
            {t('dashboard')}
          </AnimatedLink>
        </li>

        {(role === 'PATIENT' || role === 'DOCTOR' || role === 'ADMIN') && (
          <>
            <li>
              <AnimatedLink href="/dashboard/appointments" className="block px-3 py-2 rounded-md text-sm text-blue-200 hover:bg-blue-500/10" data-i18n="appointments">
                {t('appointments')}
              </AnimatedLink>
            </li>
            <li>
              <AnimatedLink href="/dashboard/records" className="block px-3 py-2 rounded-md text-sm text-blue-200 hover:bg-blue-500/10" data-i18n="healthRecords">
                {t('healthRecords')}
              </AnimatedLink>
            </li>
          </>
        )}

        {(role === 'DOCTOR' || role === 'ADMIN') && (
          <>
            <li>
              <AnimatedLink href="/doctor" className="block px-3 py-2 rounded-md text-sm text-blue-200 hover:bg-blue-500/10" data-i18n="doctorView">
                {t('doctorView')}
              </AnimatedLink>
            </li>
            <li>
              <AnimatedLink href="/dashboard/patients" className="block px-3 py-2 rounded-md text-sm text-blue-200 hover:bg-blue-500/10" data-i18n="patientList">
                {t('patientList')}
              </AnimatedLink>
            </li>
            <li>
              <AnimatedLink href="/dashboard/encounters" className="block px-3 py-2 rounded-md text-sm text-blue-200 hover:bg-blue-500/10" data-i18n="encounters">
                {t('encounters')}
              </AnimatedLink>
            </li>
            <li>
              <AnimatedLink href="/dashboard/orders" className="block px-3 py-2 rounded-md text-sm text-blue-200 hover:bg-blue-500/10" data-i18n="orders">
                {t('orders')}
              </AnimatedLink>
            </li>
          </>
        )}

        {role === 'ADMIN' && (
          <>
            <li>
              <AnimatedLink href="/admin/users" className="block px-3 py-2 rounded-md text-sm text-blue-200 hover:bg-blue-500/10" data-i18n="userManagement">
                {t('userManagement')}
              </AnimatedLink>
            </li>
            <li>
              <AnimatedLink href="/admin/audit" className="block px-3 py-2 rounded-md text-sm text-blue-200 hover:bg-blue-500/10" data-i18n="auditLog">
                {t('auditLog')}
              </AnimatedLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
