import { csvEscape, rowsToCsv, rowsToUnifiedCsv } from './export-csv';
import { buildZipStore } from './export-zip';

describe('export-csv', () => {
  it('escapes quotes and commas', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape(null)).toBe('');
  });

  it('builds a UTF-8 BOM CSV table', () => {
    const csv = rowsToCsv(
      ['id', 'name'],
      [
        { id: '1', name: 'Alpha' },
        { id: '2', name: 'Be,ta' },
      ],
    );
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('id,name');
    expect(csv).toContain('1,Alpha');
    expect(csv).toContain('2,"Be,ta"');
  });

  it('builds a unified CSV with a table discriminator column', () => {
    const csv = rowsToUnifiedCsv([
      {
        name: 'profiles',
        rows: [{ id: 'p1', profileName: 'alice' }],
      },
      {
        name: 'products',
        rows: [{ id: 'pr1', profileId: 'p1', name: 'Coffee' }],
      },
      { name: 'orders', rows: [], emptyHeaders: ['id'] },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('table,id,profileName');
    expect(csv).toContain('profiles,p1,alice');
    expect(csv).toContain('products,pr1,,p1,Coffee');
    expect(csv).toContain('orders,,,,');
  });
});

describe('export-zip', () => {
  it('builds a readable store zip with local + central signatures', () => {
    const zip = buildZipStore([
      { name: 'a.csv', data: 'id\n1\n' },
      { name: 'b.csv', data: 'id\n2\n' },
    ]);
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    expect(zip.includes(Buffer.from('a.csv'))).toBe(true);
    expect(zip.includes(Buffer.from('b.csv'))).toBe(true);
    // End of central directory signature somewhere near the end
    const endSig = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
    expect(zip.includes(endSig)).toBe(true);
  });
});
