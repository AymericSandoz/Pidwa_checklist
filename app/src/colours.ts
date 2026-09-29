// Obvious colours for the ID guide, hand-curated. Only colours you notice at first glance on an adult (usually the male):
// plumage, or a striking bill / face / legs (e.g. the red bill of a red-billed hornbill). Dull or subtle birds have no entry.
// Black-and-white ("pied") birds are tagged black + white.

export const COLOURS: [string, string, string][] = [
  // key, label, swatch
  ['yellow', 'yellow', '#f5c518'],
  ['orange', 'orange / rufous', '#e07b24'],
  ['red', 'red', '#d0302a'],
  ['violet', 'violet / lilac', '#8e5bb5'],
  ['blue', 'blue', '#2f78c4'],
  ['green', 'green', '#3e9b4a'],
  ['black', 'black', '#1a1a1a'],
  ['white', 'white', '#f4f4f4'],
];

const P = ['black', 'white']; // pied

export const BIRD_COLOURS: Record<string, string[]> = {
  // storks, herons, ibises
  'ciconia-abdimii': ['black'], 'anastomus-lamelligerus': ['black'], 'ciconia-nigra': ['black', 'red'],
  'ephippiorhynchus-senegalensis': [...P, 'red', 'yellow'], 'ciconia-ciconia': ['white', 'red'], 'ciconia-microscelis': ['black', 'white'],
  'mycteria-ibis': ['white', 'yellow'], 'platalea-alba': ['white'], 'ardea-alba': ['white'], 'egretta-garzetta': ['white'], 'bubulcus-ibis': ['white'],
  // barbets, woodpeckers
  'tricholaema-leucomelas': [...P, 'red'], 'lybius-torquatus': ['red', 'black'], 'trachyphonus-vaillantii': ['yellow'],
  'chloropicus-namaquus': ['red'], 'campethera-bennettii': ['red'], 'dendropicos-fuscescens': ['red'], 'campethera-abingoni': ['red'],
  // swifts, swallows
  'apus-barbatus': ['black'], 'apus-affinis': ['black'], 'apus-caffer': ['black'],
  'hirundo-rustica': ['blue', 'orange'], 'cecropis-abyssinica': ['orange'],
  // crakes, waders
  'zapornia-flavirostra': ['black', 'yellow', 'red'], 'actophilornis-africanus': ['orange', 'blue'],
  'vanellus-senegallus': ['yellow'], 'vanellus-armatus': P,
  // cuckoos, turacos, parrots, mousebirds
  'cuculus-clamosus': ['black'], 'centropus-grillii': ['black'], 'chrysococcyx-caprius': ['green'], 'chrysococcyx-klaas': ['green'],
  'clamator-jacobinus': P, 'clamator-levaillantii': P, 'gallirex-porphyreolophus': ['green', 'violet', 'red'],
  'poicephalus-cryptoxanthus': ['green', 'yellow'], 'urocolius-indicus': ['red'],
  // raptors, vultures
  'haliaeetus-vocifer': ['white'], 'terathopius-ecaudatus': ['black', 'red'], 'elanus-caeruleus': ['white'], 'trigonoceps-occipitalis': ['white', 'red'],
  // waxbills, firefinches
  'lagonosticta-rubricata': ['red'], 'lagonosticta-rhodopareia': ['red'], 'lagonosticta-senegala': ['red'], 'uraeginthus-angolensis': ['blue'],
  'estrilda-astrild': ['red'], 'pytilia-melba': ['red', 'green'],
  // pigeons
  'treron-calvus': ['green'],
  // hornbills, hoopoes
  'tockus-rufirostris': ['red'], 'tockus-leucomelas': ['yellow'], 'bycanistes-bucinator': P, 'bucorvus-leadbeateri': ['black', 'red'],
  'upupa-africana': ['orange'], 'rhinopomastus-cyanomelas': ['black'], 'phoeniculus-purpureus': ['green', 'red'],
  // flycatchers, chats, robins
  'terpsiphone-viridis': ['orange'], 'saxicola-torquatus': ['black', 'orange'], 'thamnolaea-cinnamomeiventris': ['black', 'orange'],
  'melaenornis-pammelaina': ['black'], 'cossypha-heuglini': ['orange'], 'dessonornis-humeralis': ['orange'], 'batis-molitor': P,
  // wagtails, longclaws
  'motacilla-aguimp': P, 'macronyx-croceus': ['yellow'],
  // kingfishers, bee-eaters, rollers
  'ispidina-picta': ['blue', 'orange'], 'halcyon-albiventris': ['blue', 'red'], 'megaceryle-maxima': P, 'halcyon-leucocephala': ['blue', 'orange', 'red'],
  'corythornis-cristatus': ['blue', 'orange', 'red'], 'ceryle-rudis': P, 'halcyon-senegalensis': ['blue'],
  'merops-apiaster': ['yellow', 'blue', 'green', 'orange'], 'merops-pusillus': ['green', 'yellow'], 'merops-bullockoides': ['red', 'green', 'white'],
  'eurystomus-glaucurus': ['blue', 'yellow'], 'coracias-garrulus': ['blue'], 'coracias-caudatus': ['blue', 'violet'], 'coracias-naevius': ['violet'],
  // shrikes, bushshrikes, drongo, orioles, crows
  'campephaga-flava': ['black'], 'dryoscopus-cubla': P, 'telophorus-viridis': ['green', 'red'], 'malaconotus-blanchoti': ['yellow', 'green', 'orange'],
  'chlorophoneus-sulfureopectus': ['yellow', 'orange', 'green'], 'laniarius-ferrugineus': P, 'lanius-melanoleucus': P,
  'oriolus-larvatus': ['yellow', 'black'], 'oriolus-oriolus': ['yellow', 'black'], 'dicrurus-adsimilis': ['black'], 'corvus-albus': P,
  'prionops-retzii': ['black', 'red'], 'prionops-plumatus': P, 'melaniparus-niger': ['black'],
  // starlings, oxpeckers, bulbuls, white-eyes
  'lamprotornis-nitens': ['blue'], 'lamprotornis-chalybaeus': ['blue'], 'cinnyricinclus-leucogaster': ['violet', 'white'],
  'buphagus-erythrorynchus': ['red'], 'buphagus-africanus': ['yellow'],
  'pycnonotus-tricolor': ['yellow'], 'chlorocichla-flaviventris': ['yellow'], 'zosterops-virens': ['yellow', 'green'],
  // sunbirds
  'hedydipna-collaris': ['green', 'yellow'], 'cinnyris-afer': ['green', 'red'], 'cinnyris-mariquensis': ['green', 'violet'],
  'chalcomitra-senegalensis': ['red', 'black'], 'cinnyris-talatala': ['green', 'white'],
  // weavers, whydahs, canaries, buntings
  'ploceus-intermedius': ['yellow'], 'ploceus-velatus': ['yellow'], 'ploceus-cucullatus': ['yellow'], 'anaplectes-rubriceps': ['red'],
  'bubalornis-niger': ['black', 'red'], 'quelea-quelea': ['red'], 'vidua-funerea': ['black'], 'vidua-macroura': [...P, 'red'],
  'crithagra-mozambica': ['yellow'], 'emberiza-tahapisi': ['orange'],
  // gamebirds, ducks, cormorants
  'pternistis-swainsonii': ['red'], 'numida-meleagris': ['blue'],
  'sarkidiornis-melanotos': P, 'plectropterus-gambensis': [...P, 'red'], 'dendrocygna-viduata': ['white'], 'microcarbo-africanus': ['black'],
};
