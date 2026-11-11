---
name: "Ártemis"
greekName: "Ἄρτεμις"
transliteration: "Artemis"
summary: "Hija de Zeus y Leto y hermana de Apolo; según el Himno a Apolo nació en Ortigia. La Odisea y el Himno a Afrodita la presentan como cazadora en los montes, a la que Afrodita no somete."
tagline: "La que se deleita en las flechas."
narrativeHook: "Mientras otros dioses discuten en el Olimpo, ella corre por las cumbres con el arco al hombro. Ártemis es la hermana de Apolo, la señora de los montes y de los animales salvajes, y una de las tres diosas a las que ni siquiera Afrodita pudo convencer de enamorarse."
entityKind: "deity"
profile: "full"
epithets:
  - term: "ἰοχέαιρα"
    language: "grc"
    explanation: "«Flechadora»; Evelyn-White traduce «who delights in arrows»."
    evidence:
      - source: "hesiod-theogony"
        passageId: "leto-apollo-artemis"
        claim: "Ἄρτεμιν ἰοχέαιραν (v. 918)."
        role: "supports"
      - source: "hymn-apollo"
        passageId: "birth-on-delos"
        claim: "Ἄρτεμιν ἰοχέαιραν (v. 15)."
        role: "supports"
  - term: "κελαδεινή"
    language: "grc"
    explanation: "«Bulliciosa», por el griterío de la caza."
    evidence:
      - source: "hymn-aphrodite"
        passageId: "artemis-unmoved"
        claim: "χρυσηλάκατον, κελαδεινὴν (v. 16)."
        role: "supports"
domains:
  - label: "Caza en los montes"
    context: "Recorre los montes entre jabalíes y ciervos; le agradan el arco y cazar fieras."
    evidence:
      - kind: "passage"
        evidence:
          source: "homer-odyssey"
          passageId: "artemis-the-archer"
          claim: "τερπομένη κάπροισι καὶ ὠκείῃς ἐλάφοισι (6.104)."
          role: "supports"
      - kind: "passage"
        evidence:
          source: "hymn-aphrodite"
          passageId: "artemis-unmoved"
          claim: "τῇ ἅδε τόξα καὶ οὔρεσι θῆρας ἐναίρειν (v. 18)."
          role: "supports"
symbols:
  - label: "Arco y aljaba"
    context: "Atributos con que la representa el relieve Walters 23.40."
    evidence:
      - kind: "artifact"
        artifactId: "walters-23-40"
        catalogueUrl: "https://art.thewalters.org/object/23.40/"
        claim: "La ficha describe a Ártemis «with bow and quiver»."
storySections:
  - kind: "origin"
    heading: "La gemela de Ortigia"
    body: "Ártemis es hija de Zeus y de Leto, y hermana de Apolo. El Himno a Apolo dice que su madre la dio a luz en Ortigia, y a su hermano en la isla de Delos. Desde el principio los poetas la nombran con su arma: Hesíodo la presenta como «Ártemis flechadora» en el mismo verso en que cuenta su nacimiento."
  - kind: "character"
    heading: "Libre como el monte"
    body: "El Himno a Afrodita explica que el deseo vence a casi todos los seres del mundo, pero no a Ártemis. A ella le gustan otras cosas: el arco y cazar fieras en los montes, las liras, los coros, los gritos agudos, los bosques sombríos y la ciudad de los hombres justos."
  - kind: "deeds"
    heading: "La cazadora de la Odisea"
    body: "Cuando Homero quiere describir a una joven que destaca entre todas sus amigas, la compara con Ártemis: la diosa recorre los montes, el altísimo Taigeto o el Erimanto, disfrutando entre jabalíes y ciervas veloces, mientras las ninfas del campo juegan a su alrededor. Su madre, Leto, se alegra al mirarla, porque aun entre tantas hermosas, a ella se la reconoce enseguida."
  - kind: "symbolism"
    heading: "El arco y la aljaba"
    body: "El arco es su firma. Con arco y aljaba —la funda donde se guardan las flechas— la esculpieron en el relieve de los doce dioses. Representa la distancia, la puntería y la vida al aire libre, lejos de los palacios."
didacticNotes:
  - kind: "name"
    title: "La que se deleita en las flechas"
    term: "ἰοχέαιρα"
    body: "La palabra esconde ἰός, «flecha». Unos la entendían como «la que derrama flechas» y otros como «la que se deleita en ellas». La segunda es la más bonita: no dice solo que dispara, sino que disfruta haciéndolo, como quien ama su oficio."
  - kind: "name"
    title: "La bulliciosa"
    term: "κελαδεινή"
    body: "Viene de κέλαδος, el ruido fuerte: el griterío de la cacería, los perros, las voces que resuenan en el valle. Ártemis es una diosa que se oye antes de verse."
  - kind: "concept"
    title: "¿Qué es una aljaba?"
    body: "Es el estuche, colgado del hombro, donde el arquero lleva las flechas. En griego se decía φαρέτρα."
  - kind: "question"
    title: "Para pensar"
    body: "Ártemis prefiere el monte a los palacios del Olimpo. ¿Qué lugar elegirías tú para sentirte libre?"
constellationConfig:
  position: [0, -0.096, 1]
  color: "#cfe8ff"
  shape: "El Arco"
  stars:
    - { x: -0.1, y: 0.95, magnitude: 0.85, facet: "origin" }
    - { x: -0.5, y: 0.55 }
    - { x: -0.65, y: 0, magnitude: 0.8, facet: "domains" }
    - { x: -0.5, y: -0.55 }
    - { x: -0.1, y: -0.95, magnitude: 0.85, facet: "names" }
    - { x: 0.3, y: 0, magnitude: 0.9, facet: "tales" }
    - { x: -0.98, y: 0, magnitude: 0.95 }
  links: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 4], [5, 2], [2, 6]]
review:
  status: "draft"
---
