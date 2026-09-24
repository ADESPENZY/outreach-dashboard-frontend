// Run: node --test src/utils/cardState.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    BELOW_BAR_TEXT, canRetryDraft, cardState, draftFailureText, isBelowBar,
    isRetryingDraft, LONG_WAIT_LABEL, SLOW_LABEL, WORKING_LABEL, workingStage,
} from './cardState.js';

const job = (overrides) => ({
    status: 'scraped', has_draft: false, has_real_contact: false,
    has_live_contact: false, is_queued: false, draft_failed_at: null,
    draft_failure_reason: '', ...overrides,
});

test('a failed draft with a live contact shows the contact, not "no hiring manager"', () => {
    const j = job({
        status: 'approved', has_real_contact: true, has_live_contact: true,
        draft_failed_at: '2026-09-15T10:00:00Z', draft_failure_reason: 'generation_failed',
    });
    assert.equal(cardState(j), 'contact_no_draft');
    assert.equal(draftFailureText(j), "we couldn't draft the intro");
});

test('a legacy manual_apply row with a live contact shows the contact', () => {
    // Job 17885 as stored today: Apollo contact, no draft, flipped to manual_apply.
    const j = job({ status: 'manual_apply', has_real_contact: true, has_live_contact: true });
    assert.equal(cardState(j), 'contact_no_draft');
    assert.equal(draftFailureText(j), "the intro wasn't drafted");
});

test('below the bar keeps the contact and is NOT a failure', () => {
    const j = job({
        status: 'approved', has_real_contact: true, has_live_contact: true,
        draft_failed_at: '2026-09-15T10:00:00Z', draft_failure_reason: 'below_fit_floor',
    });
    assert.equal(cardState(j), 'contact_no_draft');
    assert.equal(isBelowBar(j), true);
    assert.equal(draftFailureText(j), BELOW_BAR_TEXT);
    // It must never borrow the failure wording.
    assert.ok(!draftFailureText(j).includes("couldn't"));
});

test('only below_fit_floor is below the bar', () => {
    assert.equal(isBelowBar(job({ draft_failure_reason: 'generation_failed' })), false);
    assert.equal(isBelowBar(job({ draft_failure_reason: 'retrying' })), false);
    assert.equal(isBelowBar(job({})), false);
});

test('a working card names its phase, and every label is a working one', () => {
    const finding = job({ status: 'approved' });
    const writing = job({ status: 'approved', has_real_contact: true, has_live_contact: true });
    assert.equal(workingStage(finding), 'finding');
    assert.equal(workingStage(writing), 'writing');
    // Nothing a slow or abandoned card says may imply failure.
    for (const label of [WORKING_LABEL.finding, WORKING_LABEL.writing, SLOW_LABEL, LONG_WAIT_LABEL]) {
        assert.ok(!/couldn't|could not|no hiring manager|apply directly|failed/i.test(label), label);
    }
    assert.ok(SLOW_LABEL.startsWith('Still working'));
    assert.ok(LONG_WAIT_LABEL.includes('Introductions'));
});

test('manual_apply with no contact is still Apply Direct', () => {
    assert.equal(cardState(job({ status: 'manual_apply' })), 'no_contact');
});

test('a contact that has gone does not count as a found contact', () => {
    const j = job({ status: 'manual_apply', has_real_contact: true, has_live_contact: false });
    assert.equal(cardState(j), 'no_contact');
});

test('a draft only against a placeholder is still no_contact', () => {
    assert.equal(cardState(job({ status: 'approved', has_draft: true })), 'no_contact');
});

test('an approved job with a contact and no failure is still in flight', () => {
    const j = job({ status: 'approved', has_real_contact: true, has_live_contact: true });
    assert.equal(cardState(j), 'working');
});

test('unchanged states', () => {
    assert.equal(cardState(job({})), 'new');
    assert.equal(cardState(job({ status: 'approved', is_queued: true })), 'queued');
    assert.equal(cardState(job({ status: 'approved' })), 'working');
    assert.equal(cardState(job({ status: 'approved', has_draft: true, has_real_contact: true })), 'drafted');
    assert.equal(cardState(job({ status: 'outreach_automated', has_real_contact: true })), 'sent');
});

test('payloads without has_live_contact fall back to has_real_contact', () => {
    const j = { status: 'manual_apply', has_draft: false, has_real_contact: true };
    assert.equal(cardState(j), 'contact_no_draft');
});

const failed = (reason, overrides = {}) => job({
    status: 'approved', has_real_contact: true, has_live_contact: true,
    draft_failed_at: '2026-09-15T10:00:00Z', draft_failure_reason: reason, ...overrides,
});

test('Try again is offered when drafting failed, including legacy manual_apply rows', () => {
    assert.equal(canRetryDraft(failed('generation_failed')), true);
    assert.equal(canRetryDraft(job({ status: 'manual_apply', has_real_contact: true, has_live_contact: true })), true);
});

test('Try again is not offered below the fit floor or while a retry runs', () => {
    assert.equal(canRetryDraft(failed('below_fit_floor')), false);
    assert.equal(canRetryDraft(failed('retrying')), false);
});

test('a retry in flight stays a contact card and says so', () => {
    const j = failed('retrying');
    assert.equal(cardState(j), 'contact_no_draft');
    assert.equal(isRetryingDraft(j), true);
    assert.equal(draftFailureText(j), 'retrying the intro now');
});

test('Try again never appears on cards without a found contact', () => {
    assert.equal(canRetryDraft(job({ status: 'manual_apply' })), false);
    assert.equal(canRetryDraft(job({})), false);
    assert.equal(canRetryDraft(job({ status: 'approved', has_draft: true, has_real_contact: true })), false);
});
