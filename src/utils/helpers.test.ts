import { describe, expect, it } from 'vitest';
import { parseAppointmentText, parseQuickEntry } from './helpers';

describe('parseQuickEntry', () => {
  it('detects transport entry from taxi text', () => {
    const result = parseQuickEntry('4000 taxi');
    expect(result.amount).toBe(4000);
    expect(result.category).toBe('Transport');
    expect(result.account).toBe('6011');
    expect(result.type).toBe('debit');
  });

  it('detects vendor and debit for payer text', () => {
    const result = parseQuickEntry('payer EEC 53390');
    expect(result.amount).toBe(53390);
    expect(result.category).toBe('Énergie');
    expect(result.account).toBe('6061');
    expect(result.type).toBe('debit');
  });

  it('detects telecom category for Airtel internet expense', () => {
    const result = parseQuickEntry('internet Airtel 25000');
    expect(result.amount).toBe(25000);
    expect(result.category).toBe('Télécommunications');
    expect(result.account).toBe('6062');
  });
});

describe('parseAppointmentText', () => {
  it('extracts date and time from text', () => {
    const result = parseAppointmentText('RDV demain 10h');
    expect(result.date).toBe('Demain');
    expect(result.hour).toBe('10h');
    expect(result.title).toBe('Rendez-vous');
  });
});
