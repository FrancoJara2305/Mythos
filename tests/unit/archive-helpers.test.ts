/**
 * Utilidades puras de Phase 3–4: marcado del griego, redacción de cartelas,
 * localizadores abreviados y registro de emblemas editoriales.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { EMBLEM_VIEWBOX, EMBLEMS, emblemMarkup } from '../../src/components/archive/emblems.ts';
import { DODEKATHEON, emblemOf, profileIds } from '../../src/config/chapters.ts';
import { shortLocator } from '../../src/lib/content/citations.ts';
import { joinNames } from '../../src/lib/content/queries.ts';
import { sentence } from '../../src/lib/text/format.ts';
import { hasGreek, splitGreek } from '../../src/lib/text/greek.ts';

describe('splitGreek', () => {
  test('aísla una palabra griega dentro de una frase española', () => {
    assert.deepEqual(splitGreek('Hesíodo lo relaciona con los μήδεα de los que nació'), [
      { text: 'Hesíodo lo relaciona con los ', greek: false },
      { text: 'μήδεα', greek: true },
      { text: ' de los que nació', greek: false },
    ]);
  });

  test('una frase griega con espacios es una sola racha y la puntuación de cierre queda fuera', () => {
    assert.deepEqual(splitGreek('Ἥρην χρυσοπέδιλον (v. 454).'), [
      { text: 'Ἥρην χρυσοπέδιλον', greek: true },
      { text: ' (v. 454).', greek: false },
    ]);
  });

  test('conserva elisiones con apóstrofo y el punto alto', () => {
    const [first] = splitGreek('τὸν δʼ ἠμείβετʼ ἔπειτα βοῶπις πότνια Ἥρη· y sigue');
    assert.deepEqual(first, { text: 'τὸν δʼ ἠμείβετʼ ἔπειτα βοῶπις πότνια Ἥρη', greek: true });
  });

  test('las comillas españolas no forman parte de la racha', () => {
    assert.deepEqual(splitGreek('«φιλομμειδής»'), [
      { text: '«', greek: false },
      { text: 'φιλομμειδής', greek: true },
      { text: '»', greek: false },
    ]);
  });

  test('una letra latina entre palabras griegas corta la racha', () => {
    assert.deepEqual(
      splitGreek('θεά s θεός').map((segment) => segment.greek),
      [true, false, true],
    );
  });

  test('texto sin normalizar: el acento combinante final queda con su letra', () => {
    const decomposed = 'θεά y más';
    assert.deepEqual(splitGreek(decomposed)[0], { text: 'θεά', greek: true });
  });

  test('texto solo en español o vacío', () => {
    assert.deepEqual(splitGreek('Atenea, hija de Zeus'), [{ text: 'Atenea, hija de Zeus', greek: false }]);
    assert.deepEqual(splitGreek(''), []);
    assert.equal(hasGreek('Atenea'), false);
    assert.equal(hasGreek('Ἀθήνη'), true);
  });

  test('la concatenación de los segmentos reproduce el texto', () => {
    const text = 'En la Ilíada, λευκώλενος Ἥρη; en la Teogonía, Ἥρην χρυσοπέδιλον.';
    assert.equal(
      splitGreek(text)
        .map((segment) => segment.text)
        .join(''),
      text,
    );
  });
});

describe('sentence', () => {
  test('añade punto final solo si falta', () => {
    assert.equal(sentence('Mármol'), 'Mármol.');
    assert.equal(sentence('Ca. 530 a. C.'), 'Ca. 530 a. C.');
    assert.equal(sentence('Título «Aphrodite?»'), 'Título «Aphrodite?»');
    assert.equal(sentence('Fragmento (sin fecha.)'), 'Fragmento (sin fecha.)');
    assert.equal(sentence('  Bronce  '), 'Bronce.');
    assert.equal(sentence(''), '');
  });

  test('un paréntesis o una cita sin punto no cierran la frase', () => {
    assert.equal(sentence('siglo I a. C. – siglo I d. C. (helenístico)'), 'Siglo I a. C. – siglo I d. C. (helenístico).');
    assert.equal(sentence('Mármol pentélico (ficha: «Pentelic marble»)'), 'Mármol pentélico (ficha: «Pentelic marble»).');
    assert.equal(sentence('Rótulo «Hestia»'), 'Rótulo «Hestia».');
  });

  test('mayúscula inicial', () => {
    assert.equal(sentence('ca. 530 a. C.'), 'Ca. 530 a. C.');
    assert.equal(sentence('«cabeza de una diosa»'), '«cabeza de una diosa».');
  });
});

describe('joinNames', () => {
  test('enumera en español', () => {
    assert.equal(joinNames([]), '');
    assert.equal(joinNames(['Hera']), 'Hera');
    assert.equal(joinNames(['Hebe', 'Ares']), 'Hebe y Ares');
    assert.equal(joinNames(['Hebe', 'Ares', 'Ilitía']), 'Hebe, Ares y Ilitía');
  });
});

describe('shortLocator', () => {
  test('libro y versos, verso único y rango', () => {
    assert.equal(shortLocator({ scheme: 'book.line', book: 18, lineStart: 468, lineEnd: 477, display: 'Ilíada 18.468–477' }), '18.468–477');
    assert.equal(shortLocator({ scheme: 'line', lineStart: 176, lineEnd: 187, display: 'Teog. 176–187' }), '176–187');
    assert.equal(shortLocator({ scheme: 'line', lineStart: 900, display: 'Teog. 900' }), '900');
    assert.equal(shortLocator({ scheme: 'line', lineStart: 900, lineEnd: 900, display: 'Teog. 900' }), '900');
  });
});

describe('emblemas editoriales', () => {
  test('hay exactamente un emblema por cada divinidad con ficha (roster y otra tradición)', () => {
    assert.deepEqual(Object.keys(EMBLEMS).sort(), profileIds(DODEKATHEON).sort());
  });

  test('marcado estático, en trazo con currentColor y dentro del lienzo', () => {
    assert.equal(EMBLEM_VIEWBOX, '0 0 120 160');
    for (const id of profileIds(DODEKATHEON)) {
      const markup = emblemMarkup(id);
      assert.ok(markup.length > 40, id);
      assert.doesNotMatch(markup, /<script|\son[a-z]+=|href=|<image|url\(/i, `${id}: sin scripts, enlaces ni imágenes`);
      assert.doesNotMatch(markup, /#[0-9a-f]{3,6}\b|rgb\(/i, `${id}: sin colores fijos (usa currentColor)`);
      for (const value of markup.matchAll(/\b(?:cx|x|x1|x2)="(-?[\d.]+)"/g)) {
        const x = Number(value[1]);
        assert.ok(x >= 0 && x <= 120, `${id}: x=${x} fuera del lienzo`);
      }
      for (const value of markup.matchAll(/\b(?:cy|y|y1|y2)="(-?[\d.]+)"/g)) {
        const y = Number(value[1]);
        assert.ok(y >= 0 && y <= 160, `${id}: y=${y} fuera del lienzo`);
      }
    }
  });

  test('un emblema ausente es un error, no un hueco silencioso', () => {
    assert.throws(() => emblemMarkup('hades'));
  });

  test('cada emblema declara qué dibuja y de qué símbolo procede', () => {
    for (const id of profileIds(DODEKATHEON)) {
      const emblem = emblemOf(DODEKATHEON, id);
      assert.ok(emblem !== undefined && emblem.symbol.trim().length > 0, id);
      assert.ok(emblem !== undefined && emblem.depicts.trim().length > 0, id);
    }
  });
});
