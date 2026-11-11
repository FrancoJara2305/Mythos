/**
 * La saga (src/config/saga.ts) frente al contenido real: cada capítulo existe, cada relato enlazado
 * está en la colección `myths` y ningún relato queda fuera del hilo.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { describe, test } from 'node:test';
import { CHAPTERS } from '../../src/config/chapters.ts';
import { SAGA, sagaChapters, sagaEpisodes } from '../../src/config/saga.ts';

const mythFile = (id: string) => `src/content/myths/${id}.md`;
const deityFile = (id: string) => `src/content/deities/${id}.md`;

describe('saga', () => {
  test('seis capítulos en dos temáticas, en el orden GR-01…GR-06', () => {
    assert.deepEqual(SAGA.map((theme) => theme.chapters.length), [3, 3]);
    assert.deepEqual(sagaChapters().map((chapter) => chapter.chapter.number), CHAPTERS.map((chapter) => chapter.number));
    assert.deepEqual(sagaChapters().filter((chapter) => chapter.featured).map((chapter) => chapter.id), ['dodekatheon']);
  });

  test('cada relato enlazado existe y cada personaje con registro también', () => {
    for (const chapter of sagaChapters()) {
      for (const story of chapter.stories) for (const id of story.mythIds) assert.ok(existsSync(mythFile(id)), `${chapter.id}: falta el relato ${id}`);
      for (const character of chapter.characters) {
        if (character.deityId !== undefined) assert.ok(existsSync(deityFile(character.deityId)), `${chapter.id}: falta la deidad ${character.deityId}`);
      }
    }
  });

  test('todos los relatos de la colección tienen su lugar en el hilo, una sola vez', () => {
    const episodes = sagaEpisodes().map((episode) => episode.mythId);
    const files = readdirSync('src/content/myths').map((file) => file.replace(/\.md$/, ''));
    assert.equal(new Set(episodes).size, episodes.length);
    assert.deepEqual([...episodes].sort(), files.sort());
  });
});
