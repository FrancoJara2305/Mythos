---
name: "Apolo"
greekName: "Ἀπόλλων"
transliteration: "Apollōn"
summary: "Hijo de Zeus y Leto, nacido en Delos según el Himno homérico a Apolo. Recién nacido reclama la cítara y el arco y anuncia que revelará a los hombres la voluntad de Zeus."
tagline: "El del arco de plata, la cítara y la verdad."
narrativeHook: "Acababa de nacer en una isla rocosa cuando pronunció sus primeras palabras. No pidió leche ni abrigo: pidió una cítara, un arco y el derecho a anunciar a los hombres lo que Zeus tiene decidido. Así, de golpe, Apolo eligió sus tres oficios."
entityKind: "deity"
profile: "full"
epithets:
  - term: "ἀργυρότοξος"
    language: "grc"
    explanation: "«Del arco de plata»."
    evidence:
      - source: "homer-iliad"
        passageId: "apollo-silver-bow"
        claim: "κλῦθί μευ ἀργυρότοξ’ (1.37)."
        role: "supports"
domains:
  - label: "Profecía"
    context: "El himno pone en su boca el anuncio de revelar a los hombres la voluntad de Zeus."
    evidence:
      - kind: "passage"
        evidence:
          source: "hymn-apollo"
          passageId: "lyre-bow-and-oracle"
          claim: "χρήσω δ’ ἀνθρώποισι Διὸς νημερτέα βουλήν (v. 132)."
          role: "supports"
symbols:
  - label: "Arco y aljaba"
    context: "En la Ilíada desciende del Olimpo con ellos al hombro; en el himno reclama el arco curvo."
    evidence:
      - kind: "passage"
        evidence:
          source: "homer-iliad"
          passageId: "apollo-bow-and-quiver"
          claim: "τόξ’ ὤμοισιν ἔχων ἀμφηρεφέα τε φαρέτρην (1.45)."
          role: "supports"
      - kind: "passage"
        evidence:
          source: "hymn-apollo"
          passageId: "lyre-bow-and-oracle"
          claim: "καμπύλα τόξα (v. 131)."
          role: "supports"
  - label: "Cítara"
    context: "La reclama al nacer; el relieve Walters 23.40 lo muestra con una cítara."
    evidence:
      - kind: "passage"
        evidence:
          source: "hymn-apollo"
          passageId: "lyre-bow-and-oracle"
          claim: "εἴη μοι κίθαρίς τε φίλη (v. 131)."
          role: "supports"
      - kind: "artifact"
        artifactId: "walters-23-40"
        catalogueUrl: "https://art.thewalters.org/object/23.40/"
        claim: "La ficha describe a Apolo «with “kithara”»."
storySections:
  - kind: "origin"
    heading: "Un dios nacido en Delos"
    body: "Leto, unida a Zeus, dio a luz a Apolo y a Ártemis, los hijos más encantadores entre todos los descendientes del Cielo, dice Hesíodo. Según el himno que le cantaban los griegos, ella nació en Ortigia y él en la rocosa Delos, mientras su madre se apoyaba en el monte Cinto, junto a una palmera, a orillas del río Inopo."
  - kind: "deeds"
    heading: "Tres deseos al nacer"
    body: "El himno cuenta que el recién nacido habló enseguida: quería la cítara y el arco curvo, y prometió revelar a los hombres la voluntad infalible de Zeus. Música, arquería y profecía. Quizá los tres dones se parecen: una cuerda tensa, y acertar."
  - kind: "character"
    heading: "Luminoso y temible"
    body: "Apolo no es solo el dios amable de la música. La Ilíada se abre con su enfado: un sacerdote suyo, Crises, ha sido ofendido, y le reza llamándolo «el del arco de plata». El dios baja del Olimpo con el arco y la aljaba al hombro; las flechas resuenan a su espalda mientras avanza, semejante a la noche."
  - kind: "symbolism"
    heading: "La cítara y el arco"
    body: "Dos objetos con cuerdas: uno para cantar, otro para disparar. El relieve de los doce dioses lo muestra con la cítara, el gran instrumento de los músicos. Y los poetas lo recordaron siempre por su arco de plata."
didacticNotes:
  - kind: "name"
    title: "El del arco de plata"
    term: "ἀργυρότοξος"
    body: "Une «plata» (ἄργυρος) y «arco» (τόξον). Es una de las primeras formas en que alguien nombra a Apolo en la Ilíada. La plata brilla con una luz fría y limpia: buena imagen para un dios que nunca falla."
  - kind: "concept"
    title: "¿Cítara o lira?"
    body: "La lira era un instrumento sencillo, con caja de caparazón de tortuga; la cítara, más grande y de madera, era la de los conciertos. Cuenta otro himno que la primera lira la inventó Hermes, hermano de Apolo, cuando era un bebé."
  - kind: "curiosity"
    title: "El oráculo"
    body: "Cuando Apolo promete revelar la voluntad de Zeus, los griegos pensaban en algo muy concreto: sus oráculos, lugares como Delfos adonde la gente viajaba para hacer preguntas al dios."
  - kind: "question"
    title: "Para pensar"
    body: "Apolo eligió tres oficios en cuanto nació. Si pudieras pedir tres talentos el primer día de tu vida, ¿cuáles pedirías?"
constellationConfig:
  position: [0.5, 0.176, 0.866]
  color: "#fff1b8"
  shape: "La Lira"
  stars:
    - { x: 0, y: -0.85, magnitude: 0.85, facet: "names" }
    - { x: -0.45, y: -0.45 }
    - { x: -0.55, y: 0.2 }
    - { x: -0.4, y: 0.8, magnitude: 0.85, facet: "origin" }
    - { x: 0.45, y: -0.45 }
    - { x: 0.55, y: 0.2 }
    - { x: 0.4, y: 0.8, magnitude: 0.8, facet: "domains" }
    - { x: 0, y: 0.8, magnitude: 0.7, facet: "tales" }
  links: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], [3, 7], [7, 6], [7, 0]]
review:
  status: "draft"
---
