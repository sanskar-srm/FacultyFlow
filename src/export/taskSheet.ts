// Turns tasks into the export workbook ("Tasks" + "Summary" sheets) and the in-app preview table.
import {
  CATEGORY_OPTIONS,
  labelFor,
  PRIORITY_OPTIONS,
  REMINDER_OPTIONS,
  REPEAT_OPTIONS,
} from '@/src/constants/appConstants';
import type { Profile, Task } from '@/src/types/task';
import { formatTime12, parseLocal, weekdayName } from '@/src/utils/dateUtils';
import { isOverdue } from '@/src/utils/taskUtils';
import { rangeLabel, type ExportRange } from './exportRange';
import { excelDate, excelDateTime, excelTime, type Cell, type CellStyle, type Sheet } from './xlsx';

export type StatusFilter = 'all' | 'pending' | 'completed';

type Status = 'Completed' | 'Overdue' | 'Pending';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function shortDateTime(d: Date): string {
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${shortDate(d)} ${formatTime12(time)}`;
}

export function taskStatus(task: Task, now: Date = new Date()): Status {
  if (task.completed) return 'Completed';
  return isOverdue(task, now) ? 'Overdue' : 'Pending';
}

export function filterByStatus(tasks: Task[], filter: StatusFilter): Task[] {
  if (filter === 'all') return tasks;
  return tasks.filter((t) => t.completed === (filter === 'completed'));
}

interface Column {
  header: string;
  width: number;
  /** Spreadsheet cell, and the same value as text for the preview. */
  cell: (t: Task, i: number, now: Date) => { v: string | number | null; s: CellStyle; text: string };
}

const text = (v: string, s: CellStyle = 'text') => ({ v, s, text: v });

const COLUMNS: Column[] = [
  { header: 'No.', width: 6, cell: (_, i) => ({ v: i + 1, s: 'center', text: String(i + 1) }) },
  {
    header: 'Date',
    width: 13,
    cell: (t) => ({ v: excelDate(t.scheduledDate), s: 'date', text: shortDate(parseLocal(t.scheduledDate)) }),
  },
  { header: 'Day', width: 11, cell: (t) => text(weekdayName(t.scheduledDate)) },
  {
    header: 'Time',
    width: 10,
    cell: (t) => ({ v: excelTime(t.scheduledTime), s: 'time', text: formatTime12(t.scheduledTime) }),
  },
  { header: 'Title', width: 32, cell: (t) => text(t.title, 'wrap') },
  { header: 'Description', width: 44, cell: (t) => text(t.description?.trim() ?? '', 'wrap') },
  { header: 'Category', width: 15, cell: (t) => text(labelFor(CATEGORY_OPTIONS, t.category)) },
  { header: 'Priority', width: 10, cell: (t) => text(labelFor(PRIORITY_OPTIONS, t.priority)) },
  { header: 'Repeats', width: 16, cell: (t) => text(labelFor(REPEAT_OPTIONS, t.repeatType)) },
  {
    header: 'Reminder',
    width: 15,
    cell: (t) => text(t.reminderMinutes === null ? 'Off' : labelFor(REMINDER_OPTIONS, t.reminderMinutes) || `${t.reminderMinutes} min before`),
  },
  { header: 'Status', width: 12, cell: (t, _, now) => text(taskStatus(t, now)) },
  {
    header: 'Completed on',
    width: 21,
    cell: (t) => {
      if (!t.completedAt) return { v: null, s: 'datetime', text: '' };
      const d = new Date(t.completedAt);
      return { v: excelDateTime(d), s: 'datetime', text: shortDateTime(d) };
    },
  },
  {
    header: 'Created on',
    width: 21,
    cell: (t) => {
      const d = new Date(t.createdAt);
      return { v: excelDateTime(d), s: 'datetime', text: shortDateTime(d) };
    },
  },
];

export interface PreviewTable {
  headers: string[];
  /** Approximate column widths in characters, as in the spreadsheet. */
  widths: number[];
  rows: string[][];
}

export interface ExportSummary {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

export interface TaskWorkbook {
  sheets: Sheet[];
  preview: PreviewTable;
  summary: ExportSummary;
}

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: 'All tasks',
  pending: 'Pending tasks only',
  completed: 'Completed tasks only',
};

export function buildTaskWorkbook(
  tasks: Task[],
  opts: { range: ExportRange; status: StatusFilter; profile: Profile | null; now?: Date },
): TaskWorkbook {
  const now = opts.now ?? new Date();
  const cells = tasks.map((t, i) => COLUMNS.map((col) => col.cell(t, i, now)));

  const statuses = tasks.map((t) => taskStatus(t, now));
  const summary: ExportSummary = {
    total: tasks.length,
    completed: statuses.filter((s) => s === 'Completed').length,
    pending: statuses.filter((s) => s === 'Pending').length,
    overdue: statuses.filter((s) => s === 'Overdue').length,
  };

  const tasksSheet: Sheet = {
    name: 'Tasks',
    widths: COLUMNS.map((c) => c.width),
    headerRows: 1,
    rows: [
      COLUMNS.map((c): Cell => ({ v: c.header, s: 'header' })),
      ...cells.map((row) => row.map(({ v, s }): Cell => ({ v, s }))),
    ],
  };

  const pair = (label: string, value: string | number): Cell[] => [
    { v: label, s: 'label' },
    { v: value },
  ];
  const summarySheet: Sheet = {
    name: 'Summary',
    widths: [18, 40],
    rows: [
      [{ v: 'Faculty Flow – Task report', s: 'title' }],
      [],
      ...(opts.profile
        ? [pair('Name', opts.profile.name), pair('Designation', opts.profile.designation)]
        : []),
      pair('Period', rangeLabel(opts.range)),
      pair('Included', STATUS_LABEL[opts.status]),
      pair('Exported on', shortDateTime(now)),
      [],
      pair('Total tasks', summary.total),
      pair('Completed', summary.completed),
      pair('Pending', summary.pending),
      pair('Overdue', summary.overdue),
    ],
  };

  return {
    sheets: [tasksSheet, summarySheet],
    summary,
    preview: {
      headers: COLUMNS.map((c) => c.header),
      widths: COLUMNS.map((c) => c.width),
      rows: cells.map((row) => row.map((c) => c.text)),
    },
  };
}
