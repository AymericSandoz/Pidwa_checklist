// "Land in South Africa": who uses the 122 million hectares, who protects them, and how it got that way.
// Compiled 2026-10-10. Percentages are of the mainland (121.97 M ha). Sources at the bottom; caveats inline.

export interface Slice { key: string; label: string; pct: number; note: string; hatched?: boolean }

/** One square = 1 % of the country. Slice order is the colour order validated for colour-blind readers (adjacent squares). Natural rangeland (82 % in the 2020 land cover) is split into what it is used for,
 *  so that the pieces add up to 100: protected 9 + private game ranches 13 + commercial grazing 47 + communal land 13. */
export const LAND_USE: Slice[] = [
  { key: 'game', label: 'Private game ranches', pct: 13, note: '≈ 9 000 fenced properties, 17 M ha (14 % of the country) in 2014, minus the ~1 % that is also formally protected. Counted as farmland in agricultural statistics.' },
  { key: 'graze', label: 'Commercial livestock farms', pct: 47, note: 'Natural veld grazed by cattle, sheep and goats on privately owned farms. The rest of the 82 % natural cover once parks, game ranches and communal land are taken out.' },
  { key: 'communal', hatched: true, label: 'Communal land, the former homelands', pct: 13, note: 'Land held in trust for Black communities since the 1913 and 1936 Land Acts: no individual title, grazed by village herds of cattle and goats, with subsistence plots and villages. About 13 %, inferred from the old reserve share; the 2017 land audit does not isolate it.' },
  { key: 'parks', label: 'Protected areas', pct: 9, note: 'National parks 3.5 %, nature reserves 4.1 %, protected environments 0.7 %, forest and mountain reserves 1 %. End of 2020.' },
  { key: 'urban', label: 'Towns, roads, mines', pct: 3, note: 'Built-up 2.9 %, mines 0.2 %.' },
  { key: 'crops', label: 'Crops, orchards, vines', pct: 11, note: 'Commercial field crops 9.4 %, subsistence crops 1.5 %, orchards and vines 0.4 %.' },
  { key: 'water', label: 'Water', pct: 2, note: 'Dams, lakes, rivers, wetlands.' },
  { key: 'timber', label: 'Timber plantations', pct: 2, note: 'Pine and eucalyptus, mostly Mpumalanga and KwaZulu-Natal.' },
];

export const PROTECTED = {
  year: 'end 2020',
  total: 9.2,
  rows: [
    { label: 'National parks', pct: 3.5, ha: 4_218_907, note: 'SANParks, 20 parks; Kruger alone 1.95 M ha' },
    { label: 'Nature reserves', pct: 4.1, ha: 5_022_911, note: 'provincial, municipal and declared private reserves' },
    { label: 'Protected environments', pct: 0.7, ha: 803_018, note: 'private and communal land under biodiversity stewardship; +171 % in 2015–2020' },
    { label: 'Forest, mountain and heritage areas', pct: 1.0, ha: 1_235_848, note: 'forest reserves and wilderness, mountain catchments, world heritage sites' },
  ],
  extra: [
    { label: 'Conservation areas, not formally protected', pct: 6.8, note: 'biosphere reserves, Ramsar sites, conservancies; the state counts them towards 30×30 but they are not legally protected' },
    { label: 'Game ranches outside any protection', pct: 13, note: 'fenced wildlife land with no legal conservation status' },
  ],
  target: { pct: 30, label: '30 % by 2030, South Africa\'s commitment under the global biodiversity framework. The gap is 16 M ha: a Kruger every year.' },
  growth: [{ y: 1980, pct: 5.4 }, { y: 2010, pct: 7.9 }, { y: 2015, pct: 8.3 }, { y: 2020, pct: 9.2 }, { y: 2023, pct: 9.8 }],
};

export const RANCHING = {
  tiles: [
    { n: '≈ 9 000', l: 'game ranches', s: '2014, the only national count' },
    { n: '17 M ha', l: '14 % of the country', s: '2.2 × the state park estate' },
    { n: '5 to 7 M', l: 'large wild herbivores on ranches', s: 'industry says 16 to 20 M' },
    { n: '65 %', l: 'of white rhinos are privately owned', s: '≈ 8 000 animals, 2023' },
    { n: '65 000', l: 'permanent jobs', s: '2014; median wage R3 400 a month' },
    { n: '32 vs 16', l: 'animals per 100 ha, ranches vs state parks', s: '2014 survey' },
  ],
  revenue: { year: 2014, total: 'R7.6 billion', rows: [
    { label: 'Live sales and breeding', pct: 57, note: '2014 was the peak of the colour-variant breeding bubble; this share has collapsed since' },
    { label: 'Trophy hunting', pct: 26, note: 'animal fees paid by foreign hunters' },
    { label: 'Locals paying to hunt for the pot', pct: 9, note: 'biltong hunting: ≈ 200 000 South Africans pay a fee per animal and take the meat home' },
    { label: 'Meat sold by the ranch', pct: 8, note: '21 000 t a year from culling and from trophy carcasses, sold to butchers and restaurants' },
  ], note: 'Ecotourism was not measured in this survey; about 800 ranches earn from it, and they employ 2.6 × more people per hectare than hunting ranches.' },
  hunting: [
    { n: '6 052', l: 'foreign hunters in 2023', s: '62 % American' },
    { n: '34 500', l: 'animals shot by them', s: 'impala, warthog, kudu, blesbok first' },
    { n: 'R1.5 bn', l: 'in trophy fees', s: '≈ 0.02 % of GDP' },
    { n: '521', l: 'lions, 90 % captive-bred', s: 'the government is closing that industry' },
    { n: '≈ 200 000', l: 'local meat hunters', s: 'R13 bn spent a season, far more than trophies' },
    { n: '150 · 12 · 11', l: 'elephant, black rhino, leopard quotas', s: '2026, set by CITES and DFFE' },
  ],
};

export const TIMELINE = [
  { y: 1913, t: 'Natives Land Act', d: 'Black South Africans, two thirds of the population, may own land on 7 % of the country.' },
  { y: 1926, t: 'Kruger National Park', d: 'The Sabi Game Reserve of 1898 becomes the first national park.' },
  { y: 1936, t: 'Native Trust and Land Act', d: 'The reserves are extended to a target of 13 %. They become the homelands.' },
  { y: 1960, t: 'First game ranches', d: 'A handful of landowners switch from cattle to wildlife. Game numbers on farms: about 560 000.' },
  { y: 1991, t: 'Game Theft Act', d: 'Wild animals behind an approved fence become the landowner\'s property. Game ranching takes off at 7 % a year.' },
  { y: 1993, t: 'Kruger fences come down', d: 'Timbavati, Klaserie and the other private reserves join the park: the Greater Kruger, 180 000 ha of private land.' },
  { y: 1994, t: 'Land reform starts', d: 'Target: 30 % of white-owned farmland transferred by 1999. By 2024 state programmes had moved 9.7 M ha, 11 % of commercial farmland.' },
  { y: 2017, t: 'Land audit', d: 'Of farmland owned by individuals, 72 % belongs to white owners, 4 % to Black owners. Company and trust land is not classified.' },
  { y: 2024, t: 'End of captive lion breeding', d: 'Cabinet decides to close the industry: 8 000 lions in 350 facilities, bred for hunting and bone exports.' },
  { y: 2030, t: '30 × 30', d: 'The commitment: 30 % of the land protected. Today 9.8 %, plus 6.8 % of looser conservation areas.' },
];

export interface Prov { k: string; name: string; game: number | null; prot: number | null; col: number; row: number; pidwa?: boolean }
/** Tiles laid out roughly like the map. game = % of the province under fenced game ranches (2014, exempt farms), prot = % protected (2020). */
export const PROVINCES: Prov[] = [
  { k: 'LP', name: 'Limpopo', game: 44, prot: 19, col: 2, row: 1, pidwa: true },
  { k: 'NW', name: 'North West', game: 12, prot: null, col: 1, row: 2 },
  { k: 'GP', name: 'Gauteng', game: 5, prot: null, col: 2, row: 2 },
  { k: 'MP', name: 'Mpumalanga', game: 11, prot: 22, col: 3, row: 2 },
  { k: 'NC', name: 'Northern Cape', game: 8, prot: 5.5, col: 1, row: 3 },
  { k: 'FS', name: 'Free State', game: 3, prot: null, col: 2, row: 3 },
  { k: 'KZN', name: 'KwaZulu-Natal', game: 5, prot: null, col: 3, row: 3 },
  { k: 'WC', name: 'Western Cape', game: 5, prot: null, col: 1, row: 4 },
  { k: 'EC', name: 'Eastern Cape', game: 4, prot: null, col: 2, row: 4 },
];

export const LAND_SOURCES = [
  { t: 'South African National Land Cover 2020 (DFFE), national shares via Stats SA natural capital accounts', url: 'https://www.statssa.gov.za/documents/NCA2022/Accounts_for_SWSAs_1990_2020_Luvuyo_Kani.pdf' },
  { t: 'Stats SA, Accounts for Protected Areas 1900–2020', url: 'https://www.statssa.gov.za/documents/NCA2022/Accounts_for_protected_areas1900_2020_Nokuthula_Mahlangu.pdf' },
  { t: 'Taylor, Lindsey & Davies-Mostert 2016, the wildlife ranching industry (EWT)', url: 'https://wildlifeeconomy.info/sites/default/files/2015-AssessmentWildlifeRanchingSouthAfrica_0.pdf' },
  { t: 'Taylor et al. 2020, jobs and land use on wildlife ranches, Biological Conservation', url: 'https://repository.up.ac.za/bitstream/2263/78945/1/Taylor_Jobs_2020.pdf' },
  { t: 'Land Audit Report 2017 (DRDLR), summarised by Africa Check', url: 'https://africacheck.org/fact-checks/factsheets/frequently-asked-questions-about-land-ownership-and-demand-south-africa' },
  { t: 'Land reform figures 1994–2024, Kirsten & Sihlobo', url: 'https://www.agribook.co.za/this-is-how-president-ramaphosa-got-to-the-25-figure-of-progress-in-land-reform-in-south-africa/' },
  { t: 'Professional hunting statistics 2023 (DFFE registers, via Conservation Action Trust)', url: 'https://www.conservationaction.co.za/dead-wild-animals-by-numbers-professional-hunters-association-stats-tell-a-grim-tale/' },
  { t: 'Van der Merwe & Saayman 2025, the economic value of hunting, Wildlife Research', url: 'https://www.publish.csiro.au/wr/Fulltext/WR24192' },
  { t: 'Hunting and export quotas 2026–27 (DFFE)', url: 'https://www.acts.co.za/news/blog/2026/02/hunting-trophy-quotas-2026-27-gazetted' },
  { t: 'DFFE on the 30×30 gap, Daily Maverick 2023', url: 'https://www.dailymaverick.co.za/article/2023-06-07-sa-needs-to-preserve-the-equivalent-of-kruger-park-each-year-to-meet-un-goals/' },
  { t: 'Private Rhino Owners Association figures, Daily Maverick 2024', url: 'https://www.dailymaverick.co.za/article/2024-02-27-two-out-of-three-sa-white-rhinos-now-in-private-hands-while-poachers-decimate-kzn-herds/' },
];
