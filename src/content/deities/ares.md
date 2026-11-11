---
name: "Ares"
greekName: "Ἄρης"
transliteration: "Arēs"
summary: "Hijo de Zeus y Hera. En la Ilíada, Zeus le reprocha que solo ame la discordia y la guerra, aunque lo reconoce como hijo; Hesíodo cuenta que Citerea le dio a Fobos, Deimos y Harmonía."
tagline: "El estruendo de la batalla."
narrativeHook: "Es hijo de los reyes del Olimpo, y sin embargo su propio padre le dice que es el dios que menos le agrada. Ares es la guerra tal como asusta: el choque, el grito y el pánico. Pero incluso él tiene una historia de amor… y una hija llamada Harmonía."
entityKind: "deity"
profile: "full"
epithets:
  - term: "πτολίπορθος"
    language: "grc"
    explanation: "«Saqueador de ciudades»."
    evidence:
      - source: "hesiod-theogony"
        passageId: "ares-and-cytherea"
        claim: "σὺν Ἄρηι πτολιπόρθῳ (v. 936)."
        role: "supports"
  - term: "ῥινοτόρος"
    language: "grc"
    explanation: "«Que perfora los escudos de cuero»."
    evidence:
      - source: "hesiod-theogony"
        passageId: "ares-and-cytherea"
        claim: "Ἄρηι ῥινοτόρῳ (vv. 933–934)."
        role: "supports"
domains:
  - label: "Guerra y discordia"
    context: "Zeus le reprocha que siempre le sean gratas la discordia, las guerras y las batallas."
    evidence:
      - kind: "passage"
        evidence:
          source: "homer-iliad"
          passageId: "zeus-rebukes-ares"
          claim: "αἰεὶ γάρ τοι ἔρις τε φίλη πόλεμοί τε μάχαι τε (5.891)."
          role: "supports"
      - kind: "passage"
        evidence:
          source: "homer-iliad"
          passageId: "zeus-assigns-marriage"
          claim: "La guerra quedará a cargo de Ares y Atenea (5.430)."
          role: "supports"
symbols:
  - label: "Casco y lanza"
    context: "Atributos con que lo representa el relieve Walters 23.40."
    evidence:
      - kind: "artifact"
        artifactId: "walters-23-40"
        catalogueUrl: "https://art.thewalters.org/object/23.40/"
        claim: "La ficha describe a Ares «with helmet and spear»."
storySections:
  - kind: "origin"
    heading: "Hijo de Zeus y Hera"
    body: "Hesíodo cuenta que Hera, la última esposa de Zeus, dio a luz a tres hijos: Hebe, Ares e Ilitía. Ares es, por tanto, un príncipe del Olimpo, nacido de la pareja real."
  - kind: "character"
    heading: "El dios al que su padre regaña"
    body: "En la Ilíada, Ares vuelve herido de la batalla y se queja ante Zeus. La respuesta es durísima: Zeus le dice que siempre le gustan la discordia, las guerras y las peleas, y que es para él el más odioso de los dioses del Olimpo. Pero enseguida añade que no lo dejará sufrir, porque es su hijo.\n\nLos griegos admiraban el valor, pero temían la guerra. En Ares pusieron esa parte que nadie quiere ver de cerca."
  - kind: "deeds"
    heading: "Miedo, Terror… y Harmonía"
    body: "Con Afrodita —a quien Hesíodo llama aquí Citerea— Ares tuvo tres hijos. Dos lo acompañan en el combate: Fobos, el Miedo, y Deimos, el Terror, que desbaratan las filas de los guerreros. La tercera es muy distinta: Harmonía.\n\nLa Odisea, por su parte, guarda una canción famosa: el poeta Demódoco canta cómo Ares y Afrodita se amaban en secreto en casa de Hefesto."
  - kind: "symbolism"
    heading: "El casco y la lanza"
    body: "No necesita más: un casco y una lanza. Así aparece en el relieve de los doce dioses. Sus apodos, en cambio, hablan del resultado: «saqueador de ciudades», «el que perfora los escudos»."
didacticNotes:
  - kind: "name"
    title: "Saqueador de ciudades"
    term: "πτολίπορθος"
    body: "Une «ciudad» y «destruir». Curiosamente, Homero da el mismo apodo a algunos héroes humanos, como Odiseo. Era el título de quien gana una guerra… visto desde el lado del vencedor."
  - kind: "name"
    title: "El que perfora los escudos"
    term: "ῥινοτόρος"
    body: "ῥινός era el cuero con que se forraban los escudos; el apodo significa «el que lo atraviesa». Suena a golpe de lanza."
  - kind: "curiosity"
    title: "Dos lunas con nombre de miedo"
    body: "Los hijos de Ares, Fobos y Deimos, dan hoy nombre a las dos lunas del planeta Marte. Y Marte es el nombre que los romanos dieron a su dios de la guerra."
  - kind: "question"
    title: "Para pensar"
    body: "De la unión de la guerra (Ares) y el amor (Afrodita) nace Harmonía. ¿Qué crees que querían decir los griegos con eso?"
constellationConfig:
  position: [-0.5, -0.176, 0.866]
  color: "#f87171"
  shape: "La Lanza"
  stars:
    - { x: -0.6, y: -0.95, magnitude: 0.8, facet: "origin" }
    - { x: -0.3, y: -0.45 }
    - { x: 0, y: 0.05, magnitude: 0.8, facet: "tales" }
    - { x: 0.3, y: 0.5, magnitude: 0.7, facet: "names" }
    - { x: 0.2, y: 0.75 }
    - { x: 0.52, y: 0.6 }
    - { x: 0.6, y: 0.98, magnitude: 0.95, facet: "domains" }
  links: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]]
review:
  status: "draft"
---
