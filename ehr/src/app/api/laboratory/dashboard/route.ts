import { NextResponse } from 'next/server';
import { getLaboratoryDashboardSnapshot, type LaboratoryDashboardFilters, type LaboratoryFilter, type LaboratorySort } from '@/lib/laboratoryDashboard';
import { LABORATORY_WORKSPACE_ROLES, resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

const FILTERS = new Set<LaboratoryFilter>(['all', 'needs-review', 'abnormal', 'critical', 'follow-up', 'specimen-issue']);
const SORTS = new Set<LaboratorySort>(['most-urgent', 'newest', 'updated', 'name']);

function text(value: string | null, max = 160) {
	return value?.trim().slice(0, max) || '';
}

function positiveNumber(value: string | null) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? Math.floor(number) : undefined;
}

function queryFilters(request: Request): LaboratoryDashboardFilters {
	const params = new URL(request.url).searchParams;
	const filter = text(params.get('filter'));
	const sort = text(params.get('sort'));
	return {
		q: text(params.get('q')) || undefined,
		filter: FILTERS.has(filter as LaboratoryFilter) ? filter as LaboratoryFilter : undefined,
		sort: SORTS.has(sort as LaboratorySort) ? sort as LaboratorySort : undefined,
		page: positiveNumber(params.get('page')),
		pageSize: positiveNumber(params.get('pageSize')),
	};
}

export async function GET(request: Request) {
	const access = await resolveDoctorWorkspaceActor(request, LABORATORY_WORKSPACE_ROLES);
	if (access.response) return access.response;
	return NextResponse.json(
		await getLaboratoryDashboardSnapshot(access.actor!, queryFilters(request)),
		{ headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
	);
}