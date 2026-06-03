import { parseCSV, csvResponse } from './_csvParser';

function parseSongName(raw: string): { name: string; extra: string | undefined } {
  const newline = raw.indexOf('\n');
  if (newline === -1) return { name: raw.trim(), extra: undefined };
  const name = raw.substring(0, newline).trim();
  const extra = raw.substring(newline).trim().replace(/^\n+/, '') || undefined;
  return { name, extra };
}

const ERA_ORDER = [
  'Purple Thoughtz',
  'Home Economic$',
  'The Real Uzi',
  'Luv Is Rage',
  'Lil Uzi Vert vs. The World',
  'The Perfect LUV Tape',
  'Luv Is Rage 2 [V1]',
  '1017 vs. The World',
  'Luv Is Rage 1.5',
  '2 Luv Is 2 Rage',
  'Luv Is Rage 2 [V2]',
  'Too Fast',
  'Lil Uzi Vert vs. The World 2 [V1]',
  '16*29',
  'Tsunami Island',
  'Eternal Atake [V1]',
  'Eternal Atake [V2]',
  'Eternal Atake [V3]',
  'Baby Pluto Era',
  'Pluto x Baby Pluto',
  'Forever Young',
  'Pink Tape [V1]',
  'Super geeky',
  'Pink Tape [V2]',
  'RED & WHITE',
  'METROOOO PINK',
  'Pink Tape [V3]',
  'DPONTHEBEAT Vol 5',
  'Barter 16',
  'Luv Is Rage 3 [V2]',
  'Eternal Atake 2',
  'ALL WHITE',
  'W.H.2.U',
  'LP 5',
];

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const url = new URL(context.request.url);
    const csvUrl = `${url.origin}/data/unreleased.csv`;

    const res = await fetch(csvUrl);
    if (!res.ok) return new Response('CSV not found', { status: 404 });

    const text = await res.text();
    const rows = parseCSV(text);

    const NAME_KEY = 'Name';
    const eras: Record<string, any> = {};

    const validEraNames = new Set<string>();
    for (const row of rows) {
      const eraField = row['Era'] ?? '';
      if (!eraField.includes('\n')) continue;
      const { name: eraName } = parseSongName(row[NAME_KEY] ?? '');
      if (eraName && !/^\d+\s/.test(eraName)) validEraNames.add(eraName);
    }

    for (const row of rows) {
      const eraField = row['Era'] ?? '';
      const nameField = row[NAME_KEY] ?? '';

      if (eraField.includes('\n')) {
        const { name: rawName, extra } = parseSongName(nameField);
        if (!rawName || !validEraNames.has(rawName)) continue;

        eras[rawName] = {
          name: rawName,
          extra: extra ?? undefined,
          timeline: row['Notes']?.trim() || undefined,
          fileInfo: eraField.split('\n').map((l: string) => l.trim()).filter(Boolean),
          data: { 'Unreleased Tracks': [] },
        };
      } else if (eraField && validEraNames.has(eraField.trim())) {
        const eraName = eraField.trim();
        if (!eras[eraName]) {
          eras[eraName] = { name: eraName, data: { 'Unreleased Tracks': [] } };
        }

        const { name, extra } = parseSongName(nameField);
        const links = (row['Link(s)'] ?? '').split('\n').map((l: string) => l.trim()).filter(Boolean);

        eras[eraName].data['Unreleased Tracks'].push({
          name,
          extra: extra ?? undefined,
          description: row['Notes'] ?? '',
          track_length: row['Track Length'] ?? '',
          file_date: row['File Date'] ?? '',
          leak_date: row['Leak Date'] ?? '',
          available_length: row['Availability'] ?? row['Available Length'] ?? '',
          quality: row['Quality'] ?? '',
          url: links[0] ?? '',
          urls: links,
        });
      }
    }

    const orderedEras: Record<string, any> = {};
    for (const name of ERA_ORDER) {
      if (eras[name]) orderedEras[name] = eras[name];
    }
    for (const name of Object.keys(eras)) {
      if (!orderedEras[name]) orderedEras[name] = eras[name];
    }

    const trackerData = {
      name: 'UZIGOLD',
      tabs: ['eras'],
      current_tab: 'eras',
      eras: orderedEras,
    };

    return csvResponse(trackerData);
  } catch (err) {
    return new Response('Failed to build tracker data', { status: 500 });
  }
};
