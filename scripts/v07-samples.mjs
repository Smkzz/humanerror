import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { makeRound } from '../build/modules/games.js';
import { V07_TEMPLATES } from '../build/modules/v07.js';

process.env.HUMAN_ERROR_ORACLE_BRIDGE = '1';
const { v07Oracle } = await import('../tests/v07.test.mjs');
const samples = V07_TEMPLATES.map((template, index) => {
  const round = makeRound(template, `human-review-v07-${index}`, index, `human-review:${index}`, '739', 1 + index % 4);
  const labels = round.options.map(option => option.label);
  const independentlyDerivedAnswer = v07Oracle(template, {title:round.title, hint:round.hint, options:labels.map(label => ({label}))});
  assert.equal(labels.filter(label => label === independentlyDerivedAnswer).length, 1, template);
  assert.equal(independentlyDerivedAnswer, round.expected, template);
  return {template, category:round.category, difficulty:1 + index % 4, title:round.title, hint:round.hint, options:labels, oracleAnswer:independentlyDerivedAnswer, durationMs:round.duration};
});
mkdirSync('qa', {recursive:true});
writeFileSync('qa/v07-human-samples.json', JSON.stringify({version:'0.7.0', ruleset:'7', sampling:'one fixed deterministic visible instance per new template; independent visible-contract oracle', templates:samples}, null, 2)+'\n');
console.log(JSON.stringify({count:samples.length, templates:samples.map(x=>x.template), receipt:'qa/v07-human-samples.json'},null,2));
