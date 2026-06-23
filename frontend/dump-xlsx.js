const xlsx = require('xlsx');
const path = 'C:/Users/Admin/Desktop/FRG/LISTA_E_KUZHINAVE_ME_CMIME_KODE_DIMENSIONE_12.06.2026_AT_ER.xlsx';
const wb = xlsx.readFile(path);
console.log('Sheets:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const json = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log('\n=== Sheet:', name, '===');
  console.log(JSON.stringify(json, null, 0));
}
