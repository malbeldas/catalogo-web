// Regla hard 7: el núcleo que se copia a cada cliente no nombra ninguna marca. demo.js queda solo en la base (SPEC.md §6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../../core/', import.meta.url);

test('regla hard 7: core/ sin demo.js no nombra a Pueyrredón, PLED ni Mostrador', () => {
  for (const f of readdirSync(dir).filter(f => f !== 'demo.js')) {
    const m = readFileSync(new URL(f, dir), 'utf8').match(/pueyrred[oó]n|\bpled\b|mostrador/i);
    assert.equal(m, null, `core/${f} dice "${m?.[0]}"`);
  }
});
