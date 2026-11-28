// Writes a valid one-page PDF that says "the WORD report", padded to SIZE bytes with an unreferenced stream: node large-pdf.mjs OUT SIZE WORD
import { writeFileSync } from 'node:fs';

const [out, sizeArg, word] = process.argv.slice(2);
const size = Number(sizeArg);
const content = `BT /F1 24 Tf 72 700 Td (the ${word} report) Tj ET`;
const objs = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
].map((o) => Buffer.from(o));

function build(pad) {
  const parts = [...objs, Buffer.concat([Buffer.from(`<< /Length ${pad} >>\nstream\n`), Buffer.alloc(pad), Buffer.from('\nendstream')])];
  const chunks = [Buffer.from('%PDF-1.4\n')];
  const offsets = [];
  let length = chunks[0].length;
  parts.forEach((part, i) => {
    offsets.push(length);
    const obj = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), part, Buffer.from('\nendobj\n')]);
    chunks.push(obj);
    length += obj.length;
  });
  const xref = offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  chunks.push(Buffer.from(`xref\n0 ${parts.length + 1}\n0000000000 65535 f \n${xref}trailer\n<< /Size ${parts.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`));
  return Buffer.concat(chunks);
}

// The padding's digits change the file's length, so nudge it until the size is exact
let pad = size - build(0).length;
let pdf = build(pad);
for (let i = 0; i < 5 && pdf.length !== size; i++) {
  pad += size - pdf.length;
  pdf = build(pad);
}
if (pdf.length !== size) throw new Error(`the PDF came out at ${pdf.length} bytes, not ${size}`);
writeFileSync(out, pdf);
