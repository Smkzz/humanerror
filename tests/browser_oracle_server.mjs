import { createInterface } from 'node:readline';

process.env.HUMAN_ERROR_ORACLE_BRIDGE = '1';
const [{ novelOracle }, { v07Oracle }, { NOVEL_TEMPLATES }, { V07_TEMPLATES }, { OPPOSITES }] = await Promise.all([
  import('./novel.test.mjs'), import('./v07.test.mjs'), import('../build/modules/novel.js'), import('../build/modules/v07.js'), import('../build/modules/vocabulary.js')
]);
const novel = new Set(NOVEL_TEMPLATES), v07 = new Set(V07_TEMPLATES);
for await (const line of createInterface({ input: process.stdin })) {
  try {
    const q = JSON.parse(line), r = { title: q.title, hint: q.hint, options: q.labels.map(label => ({ label })) };
    const word = q.template === 'opposite' ? q.title.replace(/^OPPOSITE OF /, '').replace(/\.$/, '') : null;
    const pair = word === null ? null : OPPOSITES.find(x => x.includes(word));
    const positionName = q.template === 'position' ? q.title.match(/^PRESS THE (LEFT|MIDDLE-LEFT|MIDDLE-RIGHT|RIGHT) BUTTON\.$/)?.[1] : null;
    const positions = ['LEFT','MIDDLE-LEFT','MIDDLE-RIGHT','RIGHT'];
    let parityAnswer = null;
    if (q.template === 'parity') {
      const parity = q.title.includes('EVEN') ? 0 : 1, matches = q.labels.filter(label => /^\d+$/.test(label) && Number(label) % 2 === parity);
      if (matches.length !== 1) throw new Error(`Parity visible contract expected one answer: ${JSON.stringify(q)}`);
      parityAnswer = matches[0];
    }
    const answer = novel.has(q.template) ? novelOracle(q.template, r) : v07.has(q.template) ? v07Oracle(q.template, r)
      : pair ? pair[pair[0] === word ? 1 : 0] : positionName ? q.labels[positions.indexOf(positionName)] : parityAnswer;
    process.stdout.write(`${JSON.stringify({ supported: answer !== null, answer })}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ error: String(error?.stack ?? error) })}\n`);
  }
}
