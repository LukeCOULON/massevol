MATÉRIAU ID — Identificateur de masse volumique

Contenu
- index.html : structure de la page
- styles.css : mise en page responsive
- database.js : base de données locale transcrite depuis Table_des_masses_volumiques.pdf
- app.js : recherche, conversion d’unités et affichage des résultats

Utilisation
1. Décompressez le dossier.
2. Ouvrez index.html dans un navigateur moderne.
3. Saisissez une masse volumique et choisissez kg/m³ ou g/cm³.
4. Cliquez sur « Identifier ». La recherche est entièrement locale.

La base comprend les matériaux répertoriés dans le PDF fourni. Les plages sont conservées lorsque la source en donne une. Les valeurs des gaz sont reprises telles qu’imprimées dans le PDF; la table originale comporte un en-tête « Gaz à 0 °C » avec une exception explicite pour l’air à 20 °C.
Les résultats sont indicatifs : une masse volumique seule ne permet pas toujours d’identifier de façon unique un matériau.

Fonction ajoutée : calcul de la masse volumique à partir de la masse et du volume.
- Masse : mg, g ou kg
- Volume : mm³, cm³, m³, mL ou L
- Formule utilisée : masse volumique = masse / volume
Le résultat est converti en kg/m³ et envoyé automatiquement au moteur d’identification.
