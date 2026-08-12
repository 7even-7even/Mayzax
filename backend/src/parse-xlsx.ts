import ExcelJS from 'exceljs';
import path from 'path';

async function parse() {
  const workbook = new ExcelJS.Workbook();
  const filePath = path.resolve('c:/Users/siddharth/Desktop/Repos/Mayzax/apps.xlsx');
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.getWorksheet(1);
  console.log(`Sheet Name: ${worksheet?.name}`);
  console.log(`Row count: ${worksheet?.rowCount}`);

  if (!worksheet) return;

  // Print first 5 rows to understand columns
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber <= 30) {
      const vals = Array.isArray(row.values) ? row.values.slice(1) : Object.values(row.values);
      console.log(`Row ${rowNumber}:`, vals.map(v => typeof v === 'object' && v !== null ? (v as any).text || JSON.stringify(v) : v));
    }
  });
}

parse();
