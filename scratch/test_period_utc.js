'use strict';

const { getPeriodRange, parseDateString, toSafeSqlString } = require('../middleware/src/utils/period');

console.log("=== TESTANDO PARSE DATE STRING ===");
const d1 = parseDateString('2026-06-01');
console.log("parseDateString('2026-06-01') ->", d1.toISOString(), "should be 2026-06-01T00:00:00.000Z");

const d2 = parseDateString('2026-06-01 23:59:59');
console.log("parseDateString('2026-06-01 23:59:59') ->", d2.toISOString(), "should be 2026-06-01T23:59:59.000Z");

const d3 = parseDateString('2026-06-01', 'T23:59:59Z');
console.log("parseDateString('2026-06-01', 'T23:59:59Z') ->", d3.toISOString(), "should be 2026-06-01T23:59:59.000Z");

console.log("\n=== TESTANDO TO SAFE SQL STRING ===");
console.log("toSafeSqlString(d1) ->", toSafeSqlString(d1), "should be 2026-06-01 00:00:00+00:00");
console.log("toSafeSqlString(d2) ->", toSafeSqlString(d2), "should be 2026-06-01 23:59:59+00:00");

console.log("\n=== TESTANDO GET PERIOD RANGE ===");
const prToday = getPeriodRange('today', null, null, '2026-06-01 12:00:00');
console.log("getPeriodRange('today', anchor='2026-06-01 12:00:00') ->", prToday);

const prThisMonth = getPeriodRange('thisMonth', null, null, '2026-06-01 12:00:00');
console.log("getPeriodRange('thisMonth', anchor='2026-06-01 12:00:00') ->", prThisMonth);

const prCustom = getPeriodRange('custom', '2026-06-01', '2026-06-05');
console.log("getPeriodRange('custom', '2026-06-01', '2026-06-05') ->", prCustom);

console.log("\n=== CONCLUÍDO ===");
