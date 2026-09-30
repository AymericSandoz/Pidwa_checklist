# Pidwa Checklist

Application hors ligne (PWA Android) pour cocher et géolocaliser les oiseaux et mammifères de Pidwa Wilderness Reserve / Greater Makalali.

```
Animals List/      photos de la checklist papier (source de la liste d'espèces)
data/
  species_list.csv liste transcrite : groupe, nom anglais, nom scientifique, nom du carnet, notes
  curated.json     corrections à la main (noms français des mammifères, traits)
  scripts/         pipeline de données (Node 22, `npm install` à la racine)
  raw/             téléchargements bruts (ignorés par git)
  out/             ce que l'app embarque : species.json, images/, sounds/, map/, packs.json
app/               la PWA (Vite + Preact + TypeScript), `app/public/data` est une jonction vers `data/out`
```

## Pipeline de données

À lancer depuis la racine, dans l'ordre. Chaque étape est reprenable : elle saute ce qui est déjà téléchargé.

| Étape | Commande | Source |
|---|---|---|
| 1 | `node data/scripts/01_wikidata.mjs` | Wikidata : QID, noms, famille, ordre, photo (P18), liens Wikipédia, statut UICN |
| 2 | `node data/scripts/02_wikipedia.mjs` | Wikipédia FR + EN : résumé d'intro |
| 3 | `node data/scripts/03_images.mjs` | Wikimedia Commons (photo Wikidata P18) : WebP 900 px + auteur et licence. Secours seulement |
| 3b | `node data/scripts/03b_inat_images.mjs` | iNaturalist : photo par défaut de l'espèce, Creative Commons uniquement. Source principale des photos |
| 4 | `node data/scripts/04_avonet.mjs` | AVONET (Tobias et al. 2022, CC BY 4.0) : masse, bec, tarse, aile, habitat, mode de vie, régime |
| 5 | `node data/scripts/05_xenocanto.mjs` | xeno-canto : 2 enregistrements MP3 de 3-30 s par oiseau. Clé API requise dans `data/xc_key.txt` |
| 5b | `node data/scripts/05b_transcode.mjs` | coupe à 25 s après le silence initial et ré-encode en mono 48 kbps (décodeur et encodeur en WebAssembly, pas de ffmpeg) |
| 7 | `node data/scripts/07_ioc_french.mjs` | IOC World Bird List (multilingue) : noms français officiels |
| 8 | `node data/scripts/08_map.mjs --sat` | OpenFreeMap (tuiles vectorielles OSM, polices, sprites) + Sentinel-2 cloudless EOX pour la zone |
| 6 | `node data/scripts/06_build.mjs` | fusion → `data/out/species.json` + `data/out/preview.html` |
| 9 | `node data/scripts/09_packs.mjs` | inventaire des packs à la demande → `data/out/packs.json` |
| 10 | `node data/scripts/10_icons.mjs` | icônes de l'app, logo Askari et motif girafe |
| 11 | `node data/scripts/11_birdnet.mjs` | modèle BirdNET V2.4 en TensorFlow.js + modèle de répartition, depuis le dépôt officiel `birdnet-team/real-time-pwa` ; correspondance des classes avec la liste Pidwa |
| 13 | `node data/scripts/13_thumbs.mjs` | vignettes carrées des photos → `data/out/thumbs/` (repères de la carte, bandeau d'espèces) ; à relancer après l'étape 3b |

Wikimedia limite fortement le débit depuis ce réseau (429 puis blocages de 10 min) : les étapes 2 et 3 attendent automatiquement, mais c'est lent. D'où iNaturalist pour les photos, et l'étape 3 gardée en secours.

Les mesures AVONET sont converties en classes de terrain dans `06_build.mjs` (taille, bec, pattes). Ce sont des dérivations indicatives, pas des critères d'un guide.

## App

```
cd app
npm install
npm run dev        # http://localhost:5173/Pidwa_checklist/  (sur le téléphone : http://<ip-du-pc>:5173/Pidwa_checklist/)
npm run build      # -> app/dist
npm run deploy     # optionnel : chaque push sur main déploie automatiquement (GitHub Actions)
```

Base path : `/Pidwa_checklist/` par défaut (GitHub Pages), `VITE_BASE=/ npm run build` pour un hébergement à la racine.

Hors ligne : le service worker précache l'app, `species.json` et les photos à l'installation. Les sons, la carte et le satellite sont des packs que l'on télécharge depuis l'écran Réglages (mis en cache par nom : `pack-sounds`, `pack-map`, `pack-sat`). Les observations sont dans IndexedDB (`pidwa` / `observations`), photos incluses ; les lieux ajoutés sur la carte dans `pidwa` / `places`.

## Reconnaissance par le son

Écran **Listen** : écoute continue, une fenêtre de 3 s analysée toutes les 1,5 s, entièrement sur le téléphone.

- Moteur : BirdNET V2.4 (6 522 classes) exécuté par TensorFlow.js dans un web worker, accélération WebGL obligatoire. La couche de spectrogramme et le noyau STFT viennent de BirdNET Live (MIT), copiés tels quels dans `app/src/soundid/birdnet-kernel.js`.
- 184 des 228 oiseaux de la liste sont couverts, dont 3 regroupés avec une espèce sœur. Les 44 autres sont marqués "sound ID not covered" sur leur fiche.
- Espèces hors liste : affichées avec l'étiquette "not on the Pidwa checklist" si le modèle de répartition de BirdNET les juge plausibles à cet endroit et cette semaine, avec un seuil de confiance plus élevé et deux fenêtres positives au minimum. Elles peuvent être enregistrées, sans compter dans le score.
- Le modèle (60 Mo) est un pack hors ligne, à télécharger dans Settings. Il est redistribué tel quel sous licence CC BY-NC-SA 4.0, voir `data/out/birdnet/README.md` ; usage personnel et non commercial.
- Tests headless, Chrome jouant un fichier WAV comme micro : `node scripts/soundid-test.mjs <mic.wav>`, `node scripts/offline-soundid.mjs <mic.wav>`, et `node scripts/soundid-bench.mjs` pour mesurer la reconnaissance sur nos propres extraits de référence.
