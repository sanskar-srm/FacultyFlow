import { strFromU8, unzipSync } from 'fflate';
import { exportFileName, rangeFor, rangeLabel, shiftRange } from '@/src/export/exportRange';
import { buildTaskWorkbook, filterByStatus } from '@/src/export/taskSheet';
import { buildXlsx, columnName, excelDate, excelTime } from '@/src/export/xlsx';
import type { Task } from '@/src/types/task';

const task = (over: Partial<Task>): Task => ({
  id: 'id',
  title: 'Lecture',
  description: null,
  scheduledDate: '2026-10-15',
  scheduledTime: '09:30',
  priority: 'medium',
  category: 'academic',
  reminderMinutes: 10,
  repeatType: 'none',
  completed: false,
  completedAt: null,
  notificationId: null,
  createdAt: '2026-10-01T04:00:00.000Z',
  updatedAt: '2026-10-01T04:00:00.000Z',
  ...over,
});

describe('export ranges', () => {
  it('builds Monday–Sunday weeks', () => {
    // 2026-10-15 is a Thursday; 2026-10-18 a Sunday.
    expect(rangeFor('week', '2026-10-15')).toMatchObject({ start: '2026-10-12', end: '2026-10-18' });
    expect(rangeFor('week', '2026-10-18')).toMatchObject({ start: '2026-10-12', end: '2026-10-18' });
    expect(rangeFor('week', '2026-10-12')).toMatchObject({ start: '2026-10-12', end: '2026-10-18' });
  });

  it('builds whole months and steps between them', () => {
    const feb = rangeFor('month', '2028-02-10');
    expect(feb).toMatchObject({ start: '2028-02-01', end: '2028-02-29' });
    expect(shiftRange(rangeFor('month', '2026-01-31'), -1)).toMatchObject({ start: '2025-12-01', end: '2025-12-31' });
    expect(shiftRange(rangeFor('week', '2026-10-15'), 1)).toMatchObject({ start: '2026-10-19', end: '2026-10-25' });
  });

  it('orders custom ranges', () => {
    expect(rangeFor('custom', '2026-10-20', '2026-10-01')).toMatchObject({ start: '2026-10-01', end: '2026-10-20' });
  });

  it('labels ranges and names files', () => {
    expect(rangeLabel(rangeFor('day', '2026-10-15'))).toBe('15 Oct 2026');
    expect(rangeLabel(rangeFor('week', '2026-10-15'))).toBe('12 – 18 Oct 2026');
    expect(rangeLabel(rangeFor('week', '2026-12-30'))).toBe('28 Dec 2026 – 03 Jan 2027');
    expect(rangeLabel(rangeFor('month', '2026-10-15'))).toBe('October 2026');
    expect(exportFileName(rangeFor('month', '2026-10-15'))).toBe('FacultyFlow_Tasks_October-2026.xlsx');
    expect(exportFileName(rangeFor('custom', '2026-10-01', '2026-10-15'))).toBe(
      'FacultyFlow_Tasks_01-Oct-2026_to_15-Oct-2026.xlsx',
    );
  });
});

describe('xlsx writer', () => {
  it('converts dates, times and column names', () => {
    expect(excelDate('1900-03-01')).toBe(61);
    expect(excelDate('2026-10-15')).toBe(46310);
    expect(excelTime('18:00')).toBe(0.75);
    expect([0, 25, 26, 701].map(columnName)).toEqual(['A', 'Z', 'AA', 'ZZ']);
  });

  it('writes a valid workbook with the task data', () => {
    const tasks = [
      task({ id: 'a', title: 'Grade <papers> & "quizzes"', description: 'Line 1\nLine 2', completed: true, completedAt: '2026-10-15T06:00:00.000Z' }),
      task({ id: 'b', title: 'Staff meeting', category: 'meeting', reminderMinutes: null, scheduledDate: '2026-10-16' }),
    ];
    const wb = buildTaskWorkbook(tasks, {
      range: rangeFor('week', '2026-10-15'),
      status: 'all',
      profile: { name: 'Asha', designation: 'Professor' },
      now: new Date(2026, 9, 15, 12, 0),
    });
    expect(wb.summary).toEqual({ total: 2, completed: 1, pending: 1, overdue: 0 });
    expect(wb.preview.rows[1]).toEqual(expect.arrayContaining(['Staff meeting', 'Meeting', 'Off', 'Pending', 'Friday']));

    const files = unzipSync(buildXlsx(wb.sheets));
    expect(Object.keys(files).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
    ]);
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(sheet).toContain('Grade &lt;papers&gt; &amp; &quot;quizzes&quot;');
    expect(sheet).toContain('Line 1\nLine 2');
    expect(sheet).toContain('<autoFilter ref="A1:M3"/>');
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain(`<v>${excelDate('2026-10-15')}</v>`);
    expect(strFromU8(files['xl/workbook.xml'])).toContain('<sheet name="Summary" sheetId="2" r:id="rId2"/>');
    expect(strFromU8(files['xl/worksheets/sheet2.xml'])).toContain('Professor');
  });

  it('filters by status', () => {
    const tasks = [task({ id: 'a', completed: true }), task({ id: 'b' })];
    expect(filterByStatus(tasks, 'completed').map((t) => t.id)).toEqual(['a']);
    expect(filterByStatus(tasks, 'pending').map((t) => t.id)).toEqual(['b']);
    expect(filterByStatus(tasks, 'all')).toHaveLength(2);
  });
});
