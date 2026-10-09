import { addressName, greeting } from '@/src/utils/greeting';

const morning = new Date(2026, 9, 9, 9, 0);
const evening = new Date(2026, 9, 9, 18, 0);

describe('greeting', () => {
  test('titled designations come before the name', () => {
    expect(greeting({ name: 'Sanskar', designation: 'Professor' }, morning)).toBe('Good Morning, Professor Sanskar');
    expect(greeting({ name: 'Sanskar', designation: 'HOD' }, morning)).toBe('Good Morning, HOD Sanskar');
    expect(greeting({ name: 'Sanskar', designation: 'Teacher' }, morning)).toBe('Good Morning, Teacher Sanskar');
    expect(greeting({ name: 'Sanskar', designation: 'Assistant Professor' }, evening))
      .toBe('Good Evening, Assistant Professor Sanskar');
    expect(addressName({ name: 'Sanskar', designation: 'Associate Professor' })).toBe('Associate Professor Sanskar');
  });

  test('Faculty, Other and custom designations fall back to the name', () => {
    expect(greeting({ name: 'Sanskar', designation: 'Faculty' }, morning)).toBe('Good Morning, Sanskar');
    expect(greeting({ name: 'Sanskar', designation: 'Other' }, morning)).toBe('Good Morning, Sanskar');
    expect(greeting({ name: 'Sanskar', designation: 'Lecturer' }, morning)).toBe('Good Morning, Sanskar');
  });

  test('tolerates stray spaces and case', () => {
    expect(addressName({ name: ' Sanskar ', designation: 'hod ' })).toBe('HOD Sanskar');
  });

  test('no profile yet', () => {
    expect(greeting(null, morning)).toBe('Good Morning');
  });
});
