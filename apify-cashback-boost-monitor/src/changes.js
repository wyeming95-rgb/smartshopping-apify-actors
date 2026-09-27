// Compares this run's cashback rates with what we know from earlier runs and reports what changed.
//
// Rate moves between two readings of an active store (increase, decrease, % <-> fixed) are reported
// straight away. A store appearing (new) or disappearing (removed) must be seen on two runs in a row
// first: some portals intermittently serve pages without the cashback block, and a single odd reading
// would otherwise raise a false alarm.

export const stateKey = (row) => `${row.portal}|${row.merchant.toLowerCase()}`;
const CONFIRM_RUNS = 2;

const isActive = (status) => status === 'ok';
const round = (n) => Math.round(n * 100) / 100;

/** What we remember about one merchant on one portal between runs. */
export const snapshot = (row, extra = {}) => ({
    status: row.status,
    rateType: row.rateType,
    rateValue: row.rateValue,
    rateText: row.rateText,
    currency: row.currency,
    checkedAt: row.checkedAt,
    reportedBoost: null,
    pending: null, // { active: boolean, runs: number } while a new/removed transition awaits confirmation
    ...extra,
});

/**
 * @param {Record<string, object>} previous  snapshots from earlier runs (empty on the first run)
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
        // A failed fetch says nothing new: keep what we knew and report nothing.
        if (row.status === 'error') continue;
        const active = isActive(row.status);
        const base = {
            merchant: row.merchant,
            matchedName: row.matchedName,
            portal: row.portal,
            portalName: row.portalName,
            country: row.country,
            newRateText: active ? row.rateText : null,
            newRateValue: active ? row.rateValue : null,
            rateType: active ? row.rateType : prev?.rateType ?? null,
            currency: active ? row.currency : prev?.currency ?? null,
            isUpTo: active ? row.isUpTo : null,
            oldRateText: prev && isActive(prev.status) ? prev.rateText : null,
            oldRateValue: prev && isActive(prev.status) ? prev.rateValue : null,
            previousCheckAt: prev?.checkedAt ?? null,
            newStatus: row.status,
            url: row.url,
            checkedAt: row.checkedAt,
        };

        let change = null;
        let state;
        if (!prev) {
            // First sighting of this store on this portal: it becomes the baseline.
            state = snapshot(row);
        } else if (isActive(prev.status) === active) {
            // Same side as before: compare rates, drop any pending transition.
            if (active) {
                if (prev.rateType !== row.rateType) change = { changeType: 'changed', changePoints: null };
                else if (row.rateValue > prev.rateValue) change = { changeType: 'increase', changePoints: round(row.rateValue - prev.rateValue) };
                else if (row.rateValue < prev.rateValue) change = { changeType: 'decrease', changePoints: round(row.rateValue - prev.rateValue) };
            }
            state = snapshot(row, { reportedBoost: prev.reportedBoost });
        } else {
            // Crossed between active and inactive: wait for confirmation before reporting.
            const runs = prev.pending?.active === active ? prev.pending.runs + 1 : 1;
            if (runs >= CONFIRM_RUNS) {
                change = { changeType: active ? 'new' : 'removed', changePoints: null };
                state = snapshot(row);
            } else {
                state = { ...prev, pending: { active, runs } };
            }
        }

        // Some portals show their own "was X%" when a rate is boosted. Report it once per boost, even on
        // the first run, unless the change against our own history already covers it.
        const boostId = active && row.previousRateValue !== null && row.previousRateValue !== undefined && row.rateValue > row.previousRateValue
            ? `${row.previousRateText}->${row.rateText}` : null;
        if (boostId && boostId !== prev?.reportedBoost) {
            if (!change) {
                change = { changeType: 'portal-boost', changePoints: round(row.rateValue - row.previousRateValue) };
                base.oldRateText = row.previousRateText;
                base.oldRateValue = row.previousRateValue;
            }
            state.reportedBoost = boostId;
        } else if (!boostId && active) {
            state.reportedBoost = null;
        }

        if (change) changes.push({ ...base, ...change });
        next[key] = state;
    }
    return { changes, next };
}
