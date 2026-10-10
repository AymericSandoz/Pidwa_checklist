// "How many are left?": Africa-wide numbers for nine of Pidwa's big animals.
// Today's figures and country splits come from the latest IUCN or national counts (compiled 2026-10-10, sources below).
// The c.1800 figures are OUR order-of-magnitude estimate (historic range × density, 25 % prime habitat), never a published count.
// Timelines are continental; years with no decent estimate are simply absent.

export interface Country { name: string; n: number; note?: string }
export interface Source { t: string; url?: string }
export interface Point { y: number; n: number; note?: string }
export interface Pop {
  id: string;                 // species id in species.json
  name: string;
  sci: string;
  short: string;              // label in the small multiples
  today: { n: number; year: string; by: string };
  tags: { t: string; tone?: 'bad' | 'ok' | '' }[];
  est1800?: { lo: number; mid: number; hi: number; how: string };
  timeline: Point[];          // measured or published estimates only
  countries?: Country[];      // southern + eastern Africa, plus a rest-of-range line
  countryYear?: string;       // heading for the country table when it differs from today.year (mixed years)
  countryNote?: string;
  sources: Source[];
}

const M = 1_000_000, k = 1000;

export const POPS: Pop[] = [
  {
    id: 'loxodonta-africana', name: 'Savanna elephant', sci: 'Loxodonta africana', short: 'Elephant',
    today: { n: 415_000, year: '2016', by: 'African Elephant Status Report (both species)' },
    tags: [{ t: '−30 % in 7 years on surveyed sites (2007–2014)', tone: 'bad' }, { t: 'Kruger: 10 seen in 1905, ~30 000 today', tone: 'ok' }],
    est1800: { lo: 13.5 * M, mid: 20 * M, hi: 27 * M, how: 'Published model (Milner-Gulland & Beddington 1993): carrying capacity c.1814 ≈ 27 M, real number nearer 20 M. The authors call it crude.' },
    timeline: [{ y: 1900, n: 5 * M, note: 'model, ~75 % of 1814 lost' }, { y: 1979, n: 1.34 * M, note: 'first continental survey' }, { y: 1987, n: 760 * k }, { y: 1989, n: 609 * k, note: 'ivory ban' }, { y: 1995, n: 580 * k }, { y: 2007, n: 555 * k }, { y: 2016, n: 415 * k }],
    countryYear: 'latest surveys, 2015–2025',
    countries: [
      { name: 'Botswana', n: 131_909, note: 'KAZA survey 2022' }, { name: 'Zimbabwe', n: 65_028, note: 'KAZA part only, 2022; ZimParks claims 84 000' }, { name: 'Tanzania', n: 66_714, note: '2024-25 census' },
      { name: 'South Africa', n: 43_681, note: 'end 2023, 9 700 on private land' }, { name: 'Kenya', n: 36_280, note: '2021 census' }, { name: 'Namibia', n: 24_000, note: '2022' }, { name: 'Mozambique', n: 22_718, note: '2025 census, up from 9 114 in 2018' },
      { name: 'Zambia', n: 21_760, note: 'last survey 2015' }, { name: 'Uganda', n: 6_352, note: '2023-25' }, { name: 'Angola', n: 5_983, note: 'KAZA 2022' }, { name: 'Malawi and rest of range', n: 8_000, note: 'old data' },
    ],
    countryNote: 'Country figures are from different years and methods; they add up to more than the 2016 continental total, which is the last published one. A new savanna-elephant report is due in 2026.',
    sources: [
      { t: 'African Elephant Status Report 2016, IUCN', url: 'https://africanelephantdatabase.org/report/2016/Africa' },
      { t: 'Great Elephant Census 2014-15, Chase et al. 2016', url: 'https://peerj.com/articles/2354' },
      { t: 'KAZA Elephant Survey 2022', url: 'https://kavangozambezi.org/kaza-launches-its-2022-kaza-elephant-survey-results/' },
      { t: 'Milner-Gulland & Beddington 1993, Pachyderm reprint', url: 'https://pachydermjournal.org/index.php/pachyderm/article/download/786/765/1844' },
    ],
  },
  {
    id: 'syncerus-caffer', name: 'African buffalo', sci: 'Syncerus caffer', short: 'Buffalo',
    today: { n: 564_000, year: '2022', by: 'Cornélis et al. 2023, savanna buffalo, wild herds' },
    tags: [{ t: 'Stable since 1998', tone: 'ok' }, { t: 'Rinderpest 1889–97 killed 90–95 %', tone: 'bad' }],
    est1800: { lo: 4.6 * M, mid: 9.5 * M, hi: 15.8 * M, how: 'Our estimate: 10–12 M km² of savanna × 150–300 per 100 km² on a quarter of it, 20–60 elsewhere. Before rinderpest; by 1900 there were probably fewer than today.' },
    timeline: [{ y: 1998, n: 625 * k, note: 'East 1999' }, { y: 2014, n: 487 * k }, { y: 2022, n: 564 * k }],
    countryYear: 'latest counts, 2011–2025',
    countries: [
      { name: 'Tanzania', n: 328_000, note: '2024-25 census; 240 000 in the 2023 synthesis' }, { name: 'South Africa', n: 46_000, note: 'wild herds; +75 000 on private farms' }, { name: 'Mozambique', n: 45_000 }, { name: 'Kenya', n: 41_659, note: '2021 census' },
      { name: 'Uganda', n: 41_548, note: '2023-25' }, { name: 'Zambia', n: 40_000 }, { name: 'Zimbabwe', n: 32_000, note: '30–35 000' }, { name: 'Botswana', n: 29_000, note: '2018' }, { name: 'Namibia', n: 9_000 }, { name: 'Malawi', n: 3_000 }, { name: 'Angola', n: 500 }, { name: 'Central and West Africa', n: 55_000 },
    ],
    countryNote: 'Mostly park-level aerial counts of different years (2011–2022). Order of magnitude only.',
    sources: [
      { t: 'Cornélis et al. 2023, Ecology and Management of the African Buffalo (Cambridge)', url: 'https://www.cambridge.org/core/product/58648D0BC4289CF73EFE574AF5EB7EF0' },
      { t: 'IUCN Red List 2019: Near Threatened', url: 'https://www.iucnredlist.org/species/21251/50195031' },
    ],
  },
  {
    id: 'giraffa-giraffa', name: 'Giraffe, four species', sci: 'Giraffa spp.', short: 'Giraffe',
    today: { n: 140_701, year: '2025', by: 'Giraffe Conservation Foundation, State of Giraffe' },
    tags: [{ t: 'Southern giraffe (Pidwa) 68 800, +117 % since 1995', tone: 'ok' }, { t: 'Northern giraffe 7 000, −70 %', tone: 'bad' }],
    est1800: { lo: 0.7 * M, mid: 1.9 * M, hi: 3.7 * M, how: 'Our estimate: 7–10 M km² historic range × 40–100 per 100 km² on a quarter of it, 3–10 elsewhere. GCF says "probably at least a million".' },
    timeline: [{ y: 1985, n: 158 * k, note: 'IUCN baseline, data 1960–90' }, { y: 1995, n: 164 * k }, { y: 2015, n: 97.6 * k }, { y: 2020, n: 117 * k }, { y: 2025, n: 140.7 * k }],
    countryYear: '2025',
    countries: [
      { name: 'Kenya', n: 36_206, note: 'reticulated 20 746, Masai 14 179, Nubian 1 281' }, { name: 'South Africa', n: 29_536, note: 'southern; Kruger 12 270' }, { name: 'Tanzania', n: 28_820, note: 'Masai; surveys ~10 years old' }, { name: 'Namibia', n: 14_095 },
      { name: 'Botswana', n: 13_064 }, { name: 'Zimbabwe', n: 9_201 }, { name: 'Uganda', n: 1_986, note: 'Nubian' }, { name: 'Zambia', n: 1_616 }, { name: 'Mozambique', n: 1_108 }, { name: 'Chad, Niger, Cameroon, Ethiopia, rest', n: 5_000 },
    ],
    countryNote: 'Much of the recent rise is better coverage of private land, not only real growth.',
    sources: [
      { t: 'GCF State of Giraffe 2025', url: 'https://giraffeconservation.org/wp-content/uploads/2025/06/State-of-Giraffe-2025-Report-v5.pdf' },
      { t: 'IUCN Red List 2016 assessment (−36 to −40 % since 1985)', url: 'https://www.iucnredlist.org/species/pdf/136266699' },
    ],
  },
  {
    id: 'panthera-leo', name: 'Lion', sci: 'Panthera leo', short: 'Lion',
    today: { n: 23_000, year: '2023', by: 'IUCN Red List, wild lions' },
    tags: [{ t: '−75 % since 1970', tone: 'bad' }, { t: 'South Africa: ~3 000 wild, 7 800 captive-bred (not counted)', tone: '' }],
    est1800: { lo: 175 * k, mid: 340 * k, hi: 550 * k, how: 'Our estimate: 12.5–13.5 M km² historic range × 5–10 per 100 km² on a quarter of it, 0.5–1.5 elsewhere. The famous "200 000" is a 1975 magazine figure with no data behind it.' },
    timeline: [{ y: 1970, n: 92 * k, note: 'Loveridge et al. 2022, retrospective model' }, { y: 2002, n: 31 * k, note: '23 000–39 000' }, { y: 2013, n: 33 * k, note: 'Riggio, considered high' }, { y: 2023, n: 23 * k }],
    countryYear: 'latest estimates, 2021–2025',
    countries: [
      { name: 'Tanzania', n: 11_000, note: '5 360 (conservative) to 17 200 (2024-25 census)' }, { name: 'South Africa', n: 3_200, note: 'wild and managed reserves; captive-bred excluded' }, { name: 'Botswana', n: 2_200, note: '1 450–3 060' }, { name: 'Kenya', n: 2_000, note: '1 560–2 590' },
      { name: 'Zambia', n: 1_800, note: '1 160–2 500' }, { name: 'Mozambique', n: 1_380, note: '1 290–1 475' }, { name: 'Zimbabwe', n: 1_100, note: '800–1 400' }, { name: 'Namibia', n: 800 }, { name: 'Uganda', n: 291, note: '2024' }, { name: 'Ethiopia, Angola, Malawi, West and Central Africa', n: 1_300 },
    ],
    countryNote: 'National figures vary two- to threefold between sources; the midpoints shown are ours.',
    sources: [
      { t: 'IUCN Red List 2023 (Nicholson et al.)', url: 'https://www.iucnredlist.org/species/15951/231696234' },
      { t: 'Loveridge et al. 2022, lions in 1970', url: 'https://ora.ox.ac.uk/objects/uuid:7f845e00-5447-4106-b165-5f41a75f56c1/files/r6h440t21m' },
      { t: 'LionAid 2025 country synthesis', url: 'https://lionaid.org/news/2025/07/a-2025-synthesis-of-lion-numbers-in-africa-and-range-states-capabilities-to-conserve-their-lion-populations.htm' },
      { t: 'South Africa captive lion audit (7 838)', url: 'https://www.sanews.gov.za/node/61175' },
    ],
  },
  {
    id: 'acinonyx-jubatus', name: 'Cheetah', sci: 'Acinonyx jubatus', short: 'Cheetah',
    today: { n: 7_100, year: '2017', by: 'Durant et al., PNAS; 6 500 mature (IUCN 2021)' },
    tags: [{ t: 'Only 9 % of historic range left', tone: 'bad' }, { t: 'Namibia and Botswana hold half of them', tone: '' }],
    est1800: { lo: 48 * k, mid: 100 * k, hi: 165 * k, how: 'Our estimate: 20–25 M km² historic range × 0.8–1.5 per 100 km² on a quarter of it, 0.1–0.3 elsewhere.' },
    timeline: [{ y: 1975, n: 15 * k, note: 'Myers, questionnaire survey' }, { y: 1995, n: 10.5 * k, note: '9 000–12 000' }, { y: 2008, n: 7.5 * k }, { y: 2017, n: 7.1 * k }],
    countryYear: 'latest counts, 2021–2024',
    countries: [
      { name: 'Botswana', n: 1_700 }, { name: 'Namibia', n: 1_500 }, { name: 'South Africa', n: 1_400, note: '600+ Kruger and Kgalagadi, 455 in managed reserves, 350–400 on farms' }, { name: 'Kenya', n: 1_160, note: '2021 census' },
      { name: 'Tanzania', n: 800, note: 'no national total; shares 1 250 with Kenya' }, { name: 'Zimbabwe', n: 150, note: '85–90 % lost since 1999' }, { name: 'Zambia', n: 80 }, { name: 'Ethiopia', n: 150 }, { name: 'Mozambique, Angola, Uganda, Sahara', n: 300 },
    ],
    sources: [
      { t: 'Durant et al. 2017, PNAS', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5255576/' },
      { t: 'IUCN Red List 2021 assessment', url: 'https://www.cms.int/sites/default/files/document/cites-cms_aci2_inf.10_cheetah-iucn-red-list_e.pdf' },
    ],
  },
  {
    id: 'lycaon-pictus', name: 'African wild dog', sci: 'Lycaon pictus', short: 'Wild dog',
    today: { n: 6_600, year: '2012', by: 'IUCN, adults and yearlings; 1 400 mature' },
    tags: [{ t: 'Gone from 25 of 39 countries', tone: 'bad' }, { t: 'Kruger: 350–450 in the 1990s, ~125 today', tone: 'bad' }],
    est1800: { lo: 65 * k, mid: 130 * k, hi: 220 * k, how: 'Our estimate: 12–16 M km² historic range × 1.5–3 per 100 km² on a quarter of it, 0.3–0.7 elsewhere. The "500 000" seen online has no scientific origin.' },
    timeline: [{ y: 1988, n: 5 * k, note: 'first pan-African survey: "not more than 5 000"' }, { y: 1997, n: 4.2 * k, note: '3 000–5 500' }, { y: 2012, n: 6.6 * k, note: 'more area surveyed, not growth' }],
    countryYear: 'mostly 2015 estimates',
    countries: [
      { name: 'Botswana', n: 1_000, note: '700–1 310' }, { name: 'Tanzania', n: 1_100, note: 'no total; Ruaha-Katavi and Selous at least' }, { name: 'Kenya', n: 865, note: '2021 census, 59 packs' }, { name: 'Mozambique', n: 700, note: '600–780' },
      { name: 'Zimbabwe', n: 660, note: '2015 estimate' }, { name: 'Namibia', n: 545, note: '2015, density-based' }, { name: 'Zambia', n: 460 }, { name: 'Angola', n: 350 }, { name: 'South Africa', n: 295, note: '2025: Kruger 125, managed reserves 150, free 20' }, { name: 'Ethiopia, Malawi, rest', n: 250 },
    ],
    countryNote: 'Mostly 2015 expert estimates; only Kenya and South Africa have recent monitored numbers. Pups are never counted.',
    sources: [
      { t: 'IUCN Red List 2020 (2012 data)', url: 'https://www.cms.int/sites/default/files/document/cites-cms_aci2_inf.11_iucn-african-wild-dog_e.pdf' },
      { t: 'IUCN regional strategy, southern Africa 2015', url: 'https://saiga.cms.int/sites/default/files/document/cites-cms_aci2_inf.9_regional-conservation-strategy-southern-africa_e.pdf' },
      { t: 'IUCN Action Plan 1997', url: 'https://portals.iucn.org/LIBRARY/sites/library/files/documents/1997-052.pdf' },
    ],
  },
  {
    id: 'diceros-bicornis', name: 'Black rhinoceros', sci: 'Diceros bicornis', short: 'Black rhino',
    today: { n: 6_788, year: 'end 2024', by: 'IUCN African Rhino Specialist Group' },
    tags: [{ t: '×2.8 since the 1995 low', tone: 'ok' }, { t: '÷27 between 1970 and 1995', tone: 'bad' }],
    est1800: { lo: 0.5 * M, mid: 1 * M, hi: 1.75 * M, how: 'Our estimate: 11–14 M km² historic range × 15–30 per 100 km² on a quarter of it, 2–5 elsewhere. IUCN says "several hundred thousand"; the "850 000" has no derivation.' },
    timeline: [{ y: 1970, n: 65 * k, note: 'expert guess' }, { y: 1980, n: 14_785, note: 'first compilation' }, { y: 1987, n: 3_665 }, { y: 1995, n: 2_410, note: 'low point' }, { y: 2005, n: 3_726 }, { y: 2010, n: 4_880 }, { y: 2017, n: 5_495 }, { y: 2024, n: 6_788 }],
    countries: [
      { name: 'South Africa', n: 2_307, note: '≥ 2 565 at end 2025' }, { name: 'Namibia', n: 2_098 }, { name: 'Kenya', n: 1_059, note: '1 147 at end 2025' }, { name: 'Zimbabwe', n: 784 }, { name: 'Tanzania', n: 268 },
      { name: 'Malawi', n: 66 }, { name: 'Eswatini', n: 62 }, { name: 'Zambia', n: 60 }, { name: 'Rwanda', n: 34 }, { name: 'Botswana', n: 25 }, { name: 'Mozambique', n: 18 }, { name: 'Chad', n: 7 },
    ],
    countryNote: 'Poaching: 2.15 % of rhinos in 2024, the lowest rate since 2011.',
    sources: [
      { t: 'IUCN/TRAFFIC rhino report to CITES CoP20 (2025), table 3', url: 'https://rhinoresourcecenter.com/wp-content/uploads/2025/10/2025-iucn-traffic-rhino-report.pdf' },
      { t: 'Emslie & Brooks 1999, African Rhino Status Survey', url: 'https://portals.iucn.org/library/efiles/documents/1999-049.pdf' },
    ],
  },
  {
    id: 'ceratotherium-simum', name: 'White rhinoceros', sci: 'Ceratotherium simum', short: 'White rhino',
    today: { n: 15_752, year: 'end 2024', by: 'IUCN African Rhino Specialist Group' },
    tags: [{ t: '−25 % since the 2012 peak', tone: 'bad' }, { t: '61 % on private land in South Africa', tone: '' }],
    est1800: { lo: 280 * k, mid: 600 * k, hi: 1 * M, how: 'Our estimate, the weakest of the set: 2–2.8 M km² historic range (south of the Zambezi plus the northern belt) × 50–100 per 100 km² on a quarter of it, 5–10 elsewhere.' },
    timeline: [{ y: 1895, n: 200, note: 'Umfolozi; the old figure of 20 is contested' }, { y: 1929, n: 150 }, { y: 1948, n: 550 }, { y: 1968, n: 1_800 }, { y: 1984, n: 3_800 }, { y: 1995, n: 7_530 }, { y: 2001, n: 11_640 }, { y: 2010, n: 20_160 }, { y: 2012, n: 20_424, note: 'peak' }, { y: 2017, n: 18_064 }, { y: 2024, n: 15_752 }],
    countries: [
      { name: 'South Africa', n: 12_082, note: '39 % state land, 61 % private; ≥ 12 531 at end 2025' }, { name: 'Namibia', n: 1_500 }, { name: 'Kenya', n: 1_043, note: 'incl. the last 2 northern white rhinos' }, { name: 'Zimbabwe', n: 536 },
      { name: 'Botswana', n: 320 }, { name: 'Eswatini', n: 62 }, { name: 'Zambia', n: 54 }, { name: 'Uganda', n: 43 }, { name: 'Mozambique', n: 40 }, { name: 'Rwanda', n: 37 }, { name: 'DRC, Côte d\'Ivoire, Senegal', n: 35 },
    ],
    countryNote: 'The 2024 drop in South Africa is partly a statistical correction of earlier over-estimates.',
    sources: [
      { t: 'IUCN/TRAFFIC rhino report to CITES CoP20 (2025)', url: 'https://rhinoresourcecenter.com/wp-content/uploads/2025/10/2025-iucn-traffic-rhino-report.pdf' },
      { t: 'SANBI white rhino factsheet, Oct 2024', url: 'https://www.sanbi.org/wp-content/uploads/2025/07/White-rhino_Oct-2024.pdf' },
      { t: 'Rookmaaker 2002, how many survived in 1895', url: 'https://pachydermjournal.org/index.php/pachyderm/article/download/1082/1061/2140' },
    ],
  },
  {
    id: 'panthera-pardus', name: 'Leopard', sci: 'Panthera pardus', short: 'Leopard',
    today: { n: 80_000, year: '2026', by: 'Patowary et al., model: 44 800 to 142 600' },
    tags: [{ t: 'No reliable count before 2026', tone: '' }, { t: '−30 % over three generations (IUCN)', tone: 'bad' }],
    timeline: [{ y: 2026, n: 80 * k, note: 'first defensible continental figure' }],
    countryYear: 'models, 2016–2019',
    countries: [
      { name: 'Namibia', n: 11_700, note: 'model, 2019' }, { name: 'South Africa', n: 4_500, note: 'model: 2 800 to 11 600' },
    ],
    countryNote: 'No other country has a usable estimate. The "700 000" of 1988 is rejected by every study since 1990 but still underpins CITES hunting quotas.',
    sources: [
      { t: 'Patowary et al. 2026, Journal of Applied Ecology', url: 'https://besjournals.onlinelibrary.wiley.com/doi/10.1111/1365-2664.70447' },
      { t: 'Jacobson et al. 2016, range loss', url: 'https://peerj.com/articles/1974/' },
      { t: 'South Africa Red List 2016', url: 'https://speciesstatus.sanbi.org/assessment/last-assessment/2172/' },
    ],
  },
];

export const popById = new Map(POPS.map((p) => [p.id, p]));

/** 415 000 → "415 k", 20 000 000 → "20 M", 23 000 → "23 000". */
export function fmtN(n: number, _approx = false): string {
  const s = n >= M ? (n / M).toFixed(n % M === 0 || n >= 10 * M ? 0 : 1).replace(/\.0$/, '') + ' M'
    : n >= 100 * k ? Math.round(n / k) + ' k'
    : n.toLocaleString('fr-FR').replace(/ | /g, ' ');
  return s;
}
