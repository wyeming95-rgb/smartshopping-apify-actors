// Compares this run's cashback rates with the previous run's and reports what changed.

export const stateKey = (row) => `${row.portal}|${row.merchant.toLowerCase()}`;

/** What we remember about one merchant on one portal between runs. */
export const snapshot = (row, reportedBoost = null) => ({
    status: row.status,
    rateType: row.rateType,
    rateValue: row.rateValue,
    rateText: row.rateText,
    currency: row.currency,
    checkedAt: row.checkedAt,
    reportedBoost,
});

const round = (n) => Math.round(n * 100) / 100;

/**
 * @param {Record<string, object>} previous  snapshots from the last run (empty on the first run)
 * @param {object[]} rows                    this run's rows from toRow()
 * @param {{ firstRun: boolean }} opts
 * @returns {{ changes: object[], next: Record<string, object> }}
 */
export function detectChanges(previous, rows, { firstRun }) {
    const changes = [];
    const next = { ...previous };
    for (const row of rows) {
        const key = stateKey(row);
        const prev = previous[key];
        // A failed fetch says nothing new: keep the last known rate and report nothing.
        if (row.status === 'error') continue;
        const ok = row.status === 'ok';
        const base = {
            merchant: row.merchant,
            matchedName: row.matchedName,
            portal: row.portal,
            portalName: row.portalName,
            country: row.country,
            newRateText: ok ? row.rateText : null,
            newRateValue: ok ? row.rateValue : null,
            rateType: ok ? row.rateType : prev?.rateType ?? null,
            currency: ok ? row.currency : prev?.currency ?? null,
            isUpTo: ok ? row.isUpTo : null,
            oldRateText: prev?.status === 'ok' ? prev.rateText : null,
            oldRateValue: prev?.status === 'ok' ? prev.rateValue : null,
            previousCheckAt: prev?.checkedAt ?? null,
            newStatus: row.status,
            url: row.url,
            checkedAt: row.checkedAt,
        };

        let change = null;
        if (prev?.status === 'ok' && ok) {
            if (prev.rateType !== row.rateType) change = { changeType: 'changed', changePoints: null };
            else if (row.rateValue > prev.rateValue) change = { changeType: 'increase', changePoints: round(row.rateValue - prev.rateValue) };
            else if (row.rateValue < prev.rateValue) change = { changeType: 'decrease', changePoints: round(row.rateValue - prev.rateValue) };
        } else if (prev?.status === 'ok' && !ok) {
            change = { changeType: 'removed', changePoints: null };
        } else if (!firstRun && ok && prev?.status !== 'ok') {
            change = { changeType: 'new', changePoints: null };
        }

        // Some portals show their own "was X%" when a rate is boosted. Report it once per boost, even on
        // the first run, unless the change against our own history already covers it.
        let reportedBoost = prev?.reportedBoost ?? null;
        const boostId = ok && row.previousRateValue !== null && row.previousRateValue !== undefined && row.rateValue > row.previousRateValue
            ? `${row.previousRateText}->${row.rateText}` : null;
        if (boostId && boostId !== reportedBoost) {
            if (!change) {
                change = { changeType: 'portal-boost', changePoints: round(row.rateValue - row.previousRateValue) };
                base.oldRateText = row.previousRateText;
                base.oldRateValue = row.previousRateValue;
            }
            reportedBoost = boostId;
        }
        if (!boostId) reportedBoost = null;

        if (change) changes.push({ ...base, ...change });
        next[key] = snapshot(row, reportedBoost);
    }
    return { changes, next };
}
