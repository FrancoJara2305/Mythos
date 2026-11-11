---
name: "Hestia"
greekName: "Ἑστία"
transliteration: "Hestia"
summary: "Primogénita de Crono y Rea. El Himno a Afrodita la cuenta entre las diosas que Afrodita no somete; el Himno 29 le atribuye una sede perpetua y la primera y última libación en las casas de dioses y hombres. Figura en el relieve Walters 23.40."
tagline: "El fuego que nunca se apaga en el centro de la casa."
narrativeHook: "No tiene aventuras lejanas ni batallas. Hestia se queda: es el fuego del hogar, el centro alrededor del cual se reúne la familia. Y precisamente por eso, dice su himno, a ella se le ofrece el primer sorbo y el último en cada banquete de dioses y de humanos."
entityKind: "deity"
profile: "full"
epithets:
  - term: "αἰδοίη κούρη"
    language: "grc"
    explanation: "«Doncella venerable», digna de respeto."
    evidence:
      - source: "hymn-aphrodite"
        passageId: "hestia-unmoved"
        claim: "αἰδοίῃ κούρῃ… Ἱστίῃ (vv. 21–22)."
        role: "supports"
  - term: "πότνια"
    language: "grc"
    explanation: "«Señora», título de las grandes diosas."
    evidence:
      - source: "hymn-aphrodite"
        passageId: "hestia-unmoved"
        claim: "πότνιαν, ἣν ἐμνῶντο Ποσειδάων καὶ Ἀπόλλων (v. 24)."
        role: "supports"
domains:
  - label: "Hogar y libación"
    context: "Sin ella no hay banquete: con ella empieza y termina la libación."
    evidence:
      - kind: "passage"
        evidence:
          source: "hymn-hestia"
          passageId: "hestia-seat-and-honor"
          claim: "ἕδρην ἀίδιον ἔλαχες, πρεσβηίδα τιμήν (v. 3)."
          role: "supports"
symbols:
  - label: "Cetro"
    context: "Atributo con que la representa el relieve Walters 23.40."
    evidence:
      - kind: "artifact"
        artifactId: "walters-23-40"
        catalogueUrl: "https://art.thewalters.org/object/23.40/"
        claim: "La ficha describe a Hestia «with scepter»."
storySections:
  - kind: "origin"
    heading: "La primera y la última"
    body: "Hestia fue la primera hija de Crono y Rea. El Himno a Afrodita la llama, en un solo verso, la primogénita de Crono y a la vez la más joven. El acertijo suele explicarse así: Crono se tragó a sus hijos y tuvo que devolverlos en orden inverso, de modo que la mayor fue la última en volver a la luz."
  - kind: "deeds"
    heading: "El día que dijo que no"
    body: "Dos dioses poderosos quisieron casarse con ella: Poseidón y Apolo. Hestia se negó con firmeza. Tocó la cabeza de Zeus y pronunció un gran juramento: permanecería siempre como estaba, sin casarse.\n\nZeus, en lugar del matrimonio, le concedió un honor hermoso: sentarse en el centro de la casa y recibir lo mejor de las ofrendas. En todos los templos de los dioses tiene su parte, y entre los mortales es la más venerada."
  - kind: "character"
    heading: "La que se queda"
    body: "Hestia es una de las tres diosas a las que Afrodita no puede convencer, junto con Atenea y Ártemis. Pero si Atenea elige la estrategia y Ártemis el monte, Hestia elige la casa. Es la calma, la constancia, el lugar al que siempre se vuelve."
  - kind: "symbolism"
    heading: "El hogar"
    body: "En griego, ἑστία es a la vez el nombre de la diosa y la palabra «hogar»: el fuego encendido en el centro de la casa. Su himno más breve lo resume: tiene una sede eterna en las moradas de los dioses y de los hombres, y sin ella no hay banquete, porque a Hestia se le ofrece el vino dulce al principio y al final.\n\nEn el relieve de los doce dioses del museo Walters aparece con un cetro, en el lugar que otras listas dan a Dioniso."
didacticNotes:
  - kind: "name"
    title: "La doncella venerable"
    term: "αἰδοίη κούρη"
    body: "El Himno a Afrodita la llama «muchacha digna de respeto». αἰδώς era para los griegos el respeto profundo, casi sagrado, que se debe a ciertas personas y lugares. El hogar era uno de ellos."
  - kind: "name"
    title: "Señora"
    term: "πότνια"
    body: "Un título antiquísimo que los poetas reservan a las grandes diosas. Que Hestia lo lleve recuerda que la discreta diosa del hogar es, por nacimiento, la mayor de todas."
  - kind: "concept"
    title: "¿Por qué a veces Hestia y a veces Dioniso?"
    body: "Los griegos hablaban de «los Doce», pero las listas cambian. Un relieve de mármol del museo Walters, en Baltimore, muestra a doce dioses en procesión: está Hestia y no está Dioniso. Otras tradiciones cuentan a Dioniso. Ninguna fuente antigua narra que Hestia «cediera» su trono: sencillamente, hubo más de una manera de contar hasta doce."
  - kind: "question"
    title: "Para pensar"
    body: "Hestia no viaja ni combate, y aun así recibe la primera y la última ofrenda. ¿Qué cosas importantes de tu vida ocurren alrededor de una mesa o de un fuego?"
constellationConfig:
  position: [-0.5, -0.176, -0.866]
  color: "#ffb38a"
  shape: "La Llama del Hogar"
  stars:
    - { x: -0.6, y: -0.85, magnitude: 0.7, facet: "names" }
    - { x: 0.6, y: -0.85 }
    - { x: -0.38, y: -0.45 }
    - { x: 0.38, y: -0.45 }
    - { x: -0.42, y: 0.05, magnitude: 0.8, facet: "tales" }
    - { x: 0.3, y: 0.15 }
    - { x: 0, y: 0.95, magnitude: 0.95, facet: "origin" }
    - { x: 0, y: -0.15, magnitude: 0.9, facet: "domains" }
  links: [[0, 1], [0, 2], [1, 3], [2, 4], [4, 6], [6, 5], [5, 3], [2, 7], [7, 3]]
review:
  status: "draft"
---
