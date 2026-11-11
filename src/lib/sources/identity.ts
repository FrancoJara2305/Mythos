/**
 * Identidad visual de las obras de la biblioteca (El Códice de las Fuentes): cada obra pertenece a una familia
 * de tradición textual y la familia fija el material de su «volumen» (color y rótulo de género). Es
 * presentación: no añade datos sobre las obras; el rótulo describe el género que ya consta en su
 * atribución.
 */

export type WorkFamily = 'hesiod' | 'iliad' | 'odyssey' | 'hymn';

const FAMILIES: readonly (readonly [prefix: string, family: WorkFamily])[] = [
  ['hesiod-', 'hesiod'],
  ['homer-iliad', 'iliad'],
  ['homer-odyssey', 'odyssey'],
  ['hymn-', 'hymn'],
];

export const WORK_FAMILY_LABELS: Readonly<Record<WorkFamily, string>> = {
  hesiod: 'Poesía hesiódica',
  iliad: 'Épica homérica',
  odyssey: 'Épica homérica',
  hymn: 'Himnos homéricos',
};

/** Familia de una obra por su identificador; una obra nueva sin familia es un error visible en el build. */
export function workFamily(id: string): WorkFamily {
  const match = FAMILIES.find(([prefix]) => id.startsWith(prefix));
  if (match === undefined) throw new Error(`Obra sin familia visual: "${id}" (src/lib/sources/identity.ts).`);
  return match[1];
}
