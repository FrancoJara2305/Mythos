/**
 * La saga: estructura narrativa de MYTHOS (Narratorio, 2026-11-09).
 *
 * «Parte I — Ruta completa de la mitología griega», en temáticas y capítulos progresivos. La Torre del
 * Conocimiento (`/`) la recorre de arriba abajo: del cosmos primordial a la bóveda olímpica y, más abajo, hacia
 * el mundo mortal (capítulos futuros). Cada historia puede enlazar relatos de la colección `myths`
 * (`mythIds`); una historia sin relato publicado se anuncia como «próximamente», con un adelanto que
 * no afirma nada fuera de la tradición antigua más conocida.
 *
 * Los nombres siguen la grafía del archivo (Crono, Ártemis); `deityId` enlaza con la colección
 * `deities` cuando existe el registro. tests/content/saga.test.ts comprueba que cada ID exista.
 */
import { CHAPTERS, type Chapter } from './chapters.ts';

/** Nivel de la torre: decide la paleta de la página (src/styles/tokens.css, `data-tier`). */
export type Tier = 'cosmos' | 'olympus' | 'earth';

export interface SagaCharacter {
  name: string;
  /** Quién es, en pocas palabras. */
  role: string;
  /** Registro en la colección `deities`, si existe. */
  deityId?: string;
}

export interface SagaStory {
  title: string;
  /** Adelanto del relato, para cualquier edad. */
  teaser: string;
  /** Relatos de la colección `myths` que lo cuentan. Vacío: próximamente. */
  mythIds: readonly string[];
  /** Ciclo complementario: se cuenta aparte del hilo principal. */
  complementary?: boolean;
}

export interface SagaChapter {
  /** ID estable del capítulo (src/config/chapters.ts). */
  id: string;
  /** Frase que resume el capítulo en la torre. */
  hook: string;
  /** Presentación del capítulo, dos o tres frases. */
  intro: string;
  characters: readonly SagaCharacter[];
  stories: readonly SagaStory[];
  /** Capítulo completo e interactivo (planetario, linajes, hilo del destino). */
  featured?: boolean;
}

export interface SagaTheme {
  id: string;
  number: string;
  title: string;
  summary: string;
  tier: Tier;
  /** Ancla del nivel en la torre. */
  anchor: string;
  /** Nombre del nivel en el indicador de altitud. */
  altitude: string;
  chapters: readonly SagaChapter[];
}

export const SAGA_PART = {
  number: 'Parte I',
  title: 'Ruta completa de la mitología griega',
} as const;

export const SAGA: readonly SagaTheme[] = [
  {
    id: 'cosmogony',
    number: 'Temática 1',
    title: 'Cosmogonía y origen del mundo',
    summary:
      'Cómo surge el universo, quiénes fueron las primeras divinidades y cómo se estableció, entre luchas de padres e hijos, el orden del cosmos.',
    tier: 'cosmos',
    anchor: 'cosmos',
    altitude: 'Cosmos primordial',
    chapters: [
      {
        id: 'before-the-gods',
        hook: 'Cuando aún no había cielo, ni mar, ni nadie que los nombrara.',
        intro:
          'Antes que Zeus, antes incluso que los titanes, hubo fuerzas tan antiguas que casi no tienen rostro: un vacío, una tierra, un abismo y un deseo. Con ellas empieza el relato que el poeta Hesíodo dijo haber aprendido de las Musas.',
        characters: [
          { name: 'Caos', role: 'la abertura primera, anterior a todo' },
          { name: 'Gea', role: 'la Tierra de ancho pecho, suelo firme de todos' },
          { name: 'Tártaro', role: 'el abismo brumoso bajo la tierra' },
          { name: 'Eros', role: 'el deseo, el más hermoso de los inmortales' },
          { name: 'Nix', role: 'la Noche negra' },
          { name: 'Érebo', role: 'la tiniebla profunda' },
        ],
        stories: [
          {
            title: 'El surgimiento de los primeros elementos del cosmos',
            teaser:
              'Lo primero no fue una luz ni un dios con corona: fue Caos, una abertura inmensa. Después llegaron la Tierra, el abismo del Tártaro y Eros, el deseo que lo pone todo en marcha.',
            mythIds: [],
          },
          {
            title: 'El nacimiento de Gea y las primeras generaciones primordiales',
            teaser:
              'Gea, sin ayuda de nadie, dio a luz a Urano, el Cielo estrellado, tan grande como ella para que la cubriera entera; luego a las montañas y al mar.',
            mythIds: [],
          },
          {
            title: 'La aparición de las primeras fuerzas divinas',
            teaser:
              'De Caos brotaron Érebo y la negra Noche; y de la Noche, por sorpresa, nacieron sus contrarios: el Éter luminoso y el Día.',
            mythIds: [],
          },
        ],
      },
      {
        id: 'reign-of-the-titans',
        hook: 'Un cielo que no deja nacer a sus hijos, y una hoz que lo cambia todo.',
        intro:
          'Gea y Urano tuvieron hijos poderosos: los titanes. Pero el primer reinado del mundo empezó con miedo, y el miedo se heredó de padre a hijo, hasta que una profecía anunció que también Crono caería.',
        characters: [
          { name: 'Urano', role: 'el Cielo estrellado, primer señor del mundo', deityId: 'uranus' },
          { name: 'Gea', role: 'la Tierra, que trama la primera rebelión' },
          { name: 'Crono', role: 'el menor de los titanes, de mente retorcida', deityId: 'cronus' },
          { name: 'Rea', role: 'titánide, madre de los futuros olímpicos', deityId: 'rhea' },
          { name: 'Océano', role: 'el río que rodea el mundo' },
          { name: 'Tetis', role: 'titánide de las aguas, esposa de Océano' },
          { name: 'Hiperión', role: 'padre del Sol, la Luna y la Aurora' },
          { name: 'Mnemósine', role: 'la Memoria, madre de las Musas' },
        ],
        stories: [
          {
            title: 'La caída de Urano',
            teaser:
              'Urano escondía a sus hijos en lo hondo de la Tierra. Gea forjó una hoz enorme y pidió ayuda; solo el más joven, Crono, se atrevió a empuñarla.',
            mythIds: ['fall-of-uranus'],
          },
          {
            title: 'El ascenso de Crono',
            teaser: 'Con su padre vencido, Crono se convierte en rey de los dioses. Pero quien conquista un trono por la fuerza teme perderlo igual.',
            mythIds: [],
          },
          {
            title: 'El nacimiento de los hijos de Crono y Rea',
            teaser:
              'Hestia, Deméter, Hera, Hades, Poseidón… Uno tras otro, Crono se traga a sus hijos recién nacidos. Hasta que Rea, con el último, decide engañarlo.',
            mythIds: ['cronus-swallows-his-children'],
          },
          {
            title: 'La profecía que amenaza el reinado de Crono',
            teaser: 'Gea y Urano se lo habían advertido: un hijo suyo lo vencería. Todo lo que Crono hizo para evitarlo fue justo lo que lo hizo posible.',
            mythIds: [],
          },
        ],
      },
      {
        id: 'war-for-the-cosmos',
        hook: 'Diez años de trueno: los hijos de Crono contra los titanes.',
        intro:
          'Zeus crece escondido, vuelve y libera a sus hermanos. Entonces estalla la guerra que decide quién gobierna el universo, y al terminar hay que repartir un mundo entero entre tres.',
        characters: [
          { name: 'Zeus', role: 'el hijo oculto que regresa', deityId: 'zeus' },
          { name: 'Crono', role: 'el rey que teme a sus hijos', deityId: 'cronus' },
          { name: 'Rea', role: 'la madre que salvó al menor', deityId: 'rhea' },
          { name: 'Los titanes', role: 'los dioses antiguos, hijos de Gea y Urano' },
          { name: 'Los cíclopes', role: 'forjadores del trueno, el rayo y el relámpago' },
          { name: 'Los hecatónquiros', role: 'los de cien brazos, aliados decisivos' },
        ],
        stories: [
          {
            title: 'El rescate de los hijos de Crono',
            teaser: 'Engañado, Crono devuelve uno a uno a los hijos que había tragado: primero la piedra, después los dioses.',
            mythIds: [],
          },
          {
            title: 'La Titanomaquia',
            teaser:
              'Zeus libera a los hermanos de su padre y ellos, agradecidos, le entregan el trueno, el rayo y el relámpago. Con esas armas empieza la gran guerra.',
            mythIds: ['zeus-becomes-king'],
          },
          {
            title: 'La derrota de los titanes',
            teaser: 'Los titanes vencidos son encerrados en el Tártaro, tan abajo de la tierra como la tierra lo está del cielo.',
            mythIds: [],
          },
          {
            title: 'La distribución del cielo, el mar y el inframundo',
            teaser: 'Tres hermanos, tres reinos y un sorteo: así cuenta Poseidón, en la Ilíada, cómo se repartió el mundo.',
            mythIds: ['division-of-the-world'],
          },
          {
            title: 'La Gigantomaquia',
            teaser: 'Más tarde, los gigantes nacidos de la Tierra desafiaron a los olímpicos. Es un ciclo que los poetas posteriores contaron por separado.',
            mythIds: [],
            complementary: true,
          },
        ],
      },
    ],
  },
  {
    id: 'olympian-order',
    number: 'Temática 2',
    title: 'El panteón olímpico y el orden divino',
    summary:
      'El punto más accesible para explorar el universo griego: los doce dioses del Olimpo, sus familias, sus disputas y las historias de amor y transformación que dejaron en el mundo.',
    tier: 'olympus',
    anchor: 'olimpo',
    altitude: 'Bóveda olímpica',
    chapters: [
      {
        id: 'dodekatheon',
        featured: true,
        hook: 'Doce constelaciones, doce dioses. Y un asiento que cambia según quién cuente la historia.',
        intro:
          'Los griegos hablaban de «los Doce», pero no siempre nombraban a los mismos. Recorre la bóveda celeste, viaja de constelación en constelación y descubre quién es cada dios, qué historias se cuentan de él y por qué Hestia y Dioniso se disputan el duodécimo lugar.',
        characters: [
          { name: 'Zeus', role: 'cielo, soberanía y rayo', deityId: 'zeus' },
          { name: 'Hera', role: 'matrimonio y realeza', deityId: 'hera' },
          { name: 'Poseidón', role: 'mares y terremotos', deityId: 'poseidon' },
          { name: 'Deméter', role: 'agricultura y cosechas', deityId: 'demeter' },
          { name: 'Atenea', role: 'sabiduría y estrategia', deityId: 'athena' },
          { name: 'Apolo', role: 'profecía, música y artes', deityId: 'apollo' },
          { name: 'Ártemis', role: 'caza y naturaleza', deityId: 'artemis' },
          { name: 'Ares', role: 'guerra y violencia', deityId: 'ares' },
          { name: 'Afrodita', role: 'amor y belleza', deityId: 'aphrodite' },
          { name: 'Hefesto', role: 'forja y artesanía', deityId: 'hephaestus' },
          { name: 'Hermes', role: 'mensajería y viajes', deityId: 'hermes' },
          { name: 'Hestia', role: 'hogar y fuego sagrado', deityId: 'hestia' },
          { name: 'Dioniso', role: 'vino, vegetación y éxtasis', deityId: 'dionysus' },
        ],
        stories: [
          {
            title: 'El nacimiento de Atenea',
            teaser: 'Una diosa que no nace de una madre, sino de la cabeza del rey de los dioses, armada de astucia.',
            mythIds: ['birth-of-athena'],
          },
          {
            title: 'El nacimiento de Afrodita y las distintas versiones de su origen',
            teaser: 'Para Hesíodo nació de la espuma del mar; para Homero, es hija de Zeus y Dione. Dos poetas, dos orígenes.',
            mythIds: ['birth-of-aphrodite'],
          },
          {
            title: 'El robo del fuego y el castigo de Prometeo',
            teaser: 'Un titán engaña a Zeus y regala el fuego a los humanos. El precio será terrible… y eterno.',
            mythIds: [],
          },
          {
            title: 'La disputa entre Atenea y Poseidón por Atenas',
            teaser: 'Dos dioses, una ciudad y dos regalos. Los atenienses contaban que eligieron el olivo.',
            mythIds: [],
          },
          {
            title: 'El nacimiento de Apolo y Ártemis',
            teaser: 'Leto da a luz a los gemelos arqueros: a ella en Ortigia, a él en la rocosa Delos.',
            mythIds: ['birth-of-apollo-and-artemis'],
          },
          {
            title: 'Hermes inventa la lira',
            teaser: 'Un dios recién nacido, una tortuga y la primera canción.',
            mythIds: ['hermes-and-the-lyre'],
          },
          {
            title: 'Hera engendra sola a Hefesto',
            teaser: 'El herrero de los dioses tiene dos historias de nacimiento, y no encajan.',
            mythIds: ['birth-of-hephaestus'],
          },
          {
            title: 'Las tres diosas que Afrodita no somete',
            teaser: 'El deseo vence a casi todos. A casi todos: hay tres corazones que no logra convencer.',
            mythIds: ['goddesses-beyond-aphrodite'],
          },
        ],
      },
      {
        id: 'divine-families',
        hook: 'Una familia inmortal también discute. Y cuando discute, tiembla el mundo.',
        intro:
          'Los olímpicos son padres, hijos, hermanos y rivales. Sus alianzas y sus enfados no se quedan en el cielo: llegan a la tierra en forma de hambre, de prodigios y de pruebas para los mortales.',
        characters: [
          { name: 'Zeus', role: 'padre de dioses y hombres', deityId: 'zeus' },
          { name: 'Hera', role: 'la reina que no olvida', deityId: 'hera' },
          { name: 'Leto', role: 'madre de los gemelos arqueros', deityId: 'leto' },
          { name: 'Apolo', role: 'el del arco de plata', deityId: 'apollo' },
          { name: 'Ártemis', role: 'la cazadora de los montes', deityId: 'artemis' },
          { name: 'Hefesto', role: 'el herrero arrojado del cielo', deityId: 'hephaestus' },
          { name: 'Atenea', role: 'la hija nacida de Zeus', deityId: 'athena' },
          { name: 'Dioniso', role: 'el dios que debe hacerse reconocer', deityId: 'dionysus' },
        ],
        stories: [
          {
            title: 'Los conflictos de Hera con los hijos y amantes de Zeus',
            teaser: 'Hefesto quiso defender a su madre en una pelea con Zeus. Cayó del cielo durante un día entero.',
            mythIds: ['fall-of-hephaestus'],
          },
          {
            title: 'El nacimiento y reconocimiento de Dioniso',
            teaser: 'Hijo de Zeus y de una mortal, Dioniso tiene que demostrar quién es. Unos piratas lo aprenden por las malas.',
            mythIds: ['dionysus-and-the-pirates'],
          },
          {
            title: 'Las disputas entre dioses y sus consecuencias para los mortales',
            teaser: 'Cuando Hades se lleva a Perséfone, Deméter esconde la semilla y la tierra entera deja de dar fruto.',
            mythIds: ['abduction-of-persephone', 'song-of-ares-and-aphrodite'],
          },
          {
            title: 'Los castigos divinos y las pruebas impuestas a los humanos',
            teaser: 'Licurgo persiguió a un dios niño por el monte. Los antiguos lo recordaban como aviso.',
            mythIds: ['lycurgus-and-dionysus'],
          },
        ],
      },
      {
        id: 'love-and-metamorphosis',
        hook: 'Amores que convierten a alguien en laurel, en eco, en flor… o en inmortal.',
        intro:
          'En estas historias el deseo lo transforma todo: los cuerpos, las voces y hasta la frontera entre vivos y muertos. Son los relatos que más han viajado, de poeta en poeta, hasta hoy.',
        characters: [
          { name: 'Eros', role: 'el deseo, ahora con arco y flechas' },
          { name: 'Psique', role: 'la mortal que se enamora del amor' },
          { name: 'Apolo', role: 'el dios que no alcanza lo que persigue', deityId: 'apollo' },
          { name: 'Dafne', role: 'la ninfa que se vuelve laurel' },
          { name: 'Eco', role: 'la ninfa que solo puede repetir' },
          { name: 'Narciso', role: 'el joven que se enamora de su reflejo' },
          { name: 'Orfeo', role: 'el músico que baja al inframundo' },
          { name: 'Eurídice', role: 'la esposa perdida dos veces' },
        ],
        stories: [
          { title: 'Eros y Psique', teaser: 'Un esposo al que no se puede mirar y una lámpara encendida en mitad de la noche.', mythIds: [] },
          { title: 'Apolo y Dafne', teaser: 'Una carrera por el bosque que termina en corteza, hojas y una corona de laurel.', mythIds: [] },
          { title: 'Eco y Narciso', teaser: 'Ella solo puede repetir las últimas palabras; él solo puede mirarse a sí mismo.', mythIds: [] },
          { title: 'Pigmalión y Galatea', teaser: 'Un escultor se enamora de su propia estatua, y una diosa escucha su deseo.', mythIds: [] },
          { title: 'Orfeo y Eurídice', teaser: 'Una sola condición para salir del inframundo: no mirar atrás.', mythIds: [] },
        ],
      },
    ],
  },
];

/** Continuación de la torre hacia la superficie: capítulos futuros, sin rutas todavía. */
export const SAGA_EARTH = {
  tier: 'earth' as const,
  anchor: 'tierra',
  altitude: 'Mundo mortal',
  title: 'Hacia la Tierra: los ciclos heroicos',
  summary:
    'La torre sigue bajando entre nubes hasta tocar el suelo. Allí esperan los héroes y los guerreros: mortales que se midieron con monstruos, con el mar y con su propio destino.',
  upcoming: [
    { title: 'Héroes y monstruos', teaser: 'Perseo, Heracles, Teseo: hazañas que empiezan con un oráculo.' },
    { title: 'La guerra de Troya', teaser: 'Una manzana, una promesa y diez años de asedio.' },
    { title: 'El regreso de Odiseo', teaser: 'Volver a casa puede ser la aventura más larga.' },
  ],
};

export interface ResolvedSagaChapter extends SagaChapter {
  chapter: Chapter;
  theme: SagaTheme;
  /** Posición en la saga (0…n−1). */
  index: number;
}

const chapterById = new Map<string, Chapter>(CHAPTERS.map((chapter) => [chapter.id, chapter]));

/** Capítulos de la saga en orden de lectura, con sus datos de capítulo y su temática. */
export function sagaChapters(): ResolvedSagaChapter[] {
  return SAGA.flatMap((theme) => theme.chapters.map((entry) => ({ entry, theme }))).map(({ entry, theme }, index) => {
    const chapter = chapterById.get(entry.id);
    if (chapter === undefined) throw new Error(`saga: el capítulo "${entry.id}" no existe en src/config/chapters.ts.`);
    return { ...entry, chapter, theme, index };
  });
}

export interface SagaEpisode {
  mythId: string;
  chapter: ResolvedSagaChapter;
  story: SagaStory;
}

/** Relatos con página propia, en el orden en que la saga los cuenta (cada relato, una sola vez). */
export function sagaEpisodes(): SagaEpisode[] {
  const seen = new Set<string>();
  return sagaChapters().flatMap((chapter) =>
    chapter.stories.flatMap((story) =>
      story.mythIds.flatMap((mythId) => {
        if (seen.has(mythId)) return [];
        seen.add(mythId);
        return [{ mythId, chapter, story }];
      }),
    ),
  );
}
