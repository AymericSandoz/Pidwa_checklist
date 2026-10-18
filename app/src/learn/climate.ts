// "Climate change": what is known for southern Africa, the 2015-16 Kruger drought in detail, and how plants and animals respond. Compiled 2026-10-13.

export const INTRO = 'Southern Africa is heating about twice as fast as the world as a whole, and its droughts are getting hotter. Animals rarely die of heat itself. They lose hours of feeding, fail to breed, and then a drought finishes the job. The best picture of what that looks like is a drought that has already happened: Kruger, 2015 and 2016.';

export const KNOWN = [
  { n: '3.8 %', l: 'of world climate research money', s: 'at most, goes to African subjects, 1990 to 2020' },
  { n: '78 %', l: 'of that goes to Europe and North America', s: '14.5 % reaches African institutions' },
  { n: 'Since 1960', l: 'daily weather at Skukuza', s: 'South Africa, and Kruger above all, is the well-studied exception' },
  { n: 'One site, one species', l: 'is the usual field study', s: 'the rest is models: good on climate, shakier on animals' },
];

export const ALREADY = [
  { n: '2 times', l: 'the world\'s rate of warming', s: 'southern Africa in recent decades' },
  { n: '+1.0 to 1.4 °C', l: 'from 1961 to 2015', s: 'annual average over southern Africa' },
  { n: 'Less rain', l: 'since the 1980s', s: 'over most of the region, except the north-west' },
  { n: '2 to 4, 4 to 8, 8 to 12', l: 'heatwaves a year', s: 'at 1.5, 2 and 3 °C of global warming' },
];
export const ALREADY_NOTE = 'The region as a whole is expected to get drier, with more frequent droughts even at 1.5 °C. South Africa\'s own projections add a nuance for the north-east, the Lowveld included: slightly more rain there, a strong drying in the south-west, and hotter everywhere. Kruger\'s scientists expect about 3 °C more by mid-century, rain in shorter, more violent bursts, and days above 40 °C in double figures every year.';

/** The 2015-16 drought in Kruger. */
export const DROUGHT_WHAT = [
  { t: 'An El Niño drought, with heat on top', d: 'Two poor rainy seasons in a row. What set it apart from earlier droughts was the temperature: 2015 and 2016 were the two hottest years then recorded worldwide, and stations all over South Africa broke monthly records.' },
  { t: 'Skukuza', d: 'The hottest summer since records began there in 1960. In the first months of 2016 almost no rain fell, and the Sabie River shrank to a trickle.' },
  { t: 'A grass drought, not a tree drought', d: 'Trees and shrubs kept their leaves. The grass almost vanished. So the animals that died were grazers; browsers got through.' },
  { t: 'One rain that changed the outcome', d: 'A big fall in March 2016, then showers in late summer and early winter, gave short flushes of green grass. Researchers think that is what carried many impala, kudu and warthog through the winter.' },
];

export const HOT_DAYS = [{ l: '1991 drought', n: 8 }, { l: 'July 2015 to June 2016', n: 28 }];

/** Change in numbers over each drought, in percent. Negative is a loss. */
export const TOLL = [
  { l: 'Buffalo, 1991 to 1993', n: -48, note: 'about 16 000 dead' },
  { l: 'Buffalo, 2015 to 2017', n: -26, note: 'from a record of about 47 000' },
  { l: 'Hippo, 2015 to 2017', n: -45, note: 'on the four big rivers' },
  { l: 'Elephant, 2015 to 2017', n: 13, note: 'they went up' },
];
export const TOLL_TILES = [
  { n: '375 to 15', l: 'hippos on the Nwanetsi', s: 'counted before and after: a hippo cannot walk away from its pool' },
  { n: 'Almost none', l: 'buffalo calves born in 2016', s: 'reported by Kruger scientists' },
  { n: 'Over 75 %', l: 'of herbivores dead in one small fenced reserve', s: 'neighbouring reserves open to Kruger lost far fewer' },
  { n: '33 %', l: 'of cattle dead around Giyani', s: 'communal land next door, in Limpopo' },
];

export const CHANGED_SINCE = 'In 1991 Kruger was a managed park: hundreds of boreholes and dams, a fence on every side, and buffalo, hippo and elephant culled each year to hold their numbers. After that drought the policy was turned around. Many artificial waterholes were closed. The fences with the private reserves to the west came down. Culling stopped. So in 2015 the park went into the drought with more animals than ever, and lost a smaller share of them.';
export const WHY_FEWER = [
  { t: 'Grass was left where there was no water', d: 'With fewer waterholes, large areas far from water had hardly been grazed. That grass was the reserve.' },
  { t: 'Buffalo could walk to it', d: 'The drought was milder in the north and rivers there are further apart. Herds moved up from the south. In the old days they had declined most where waterholes were densest and the grass around them was eaten out.' },
  { t: 'Hippo could not', d: 'A hippo grazes within walking distance of its river at night. Once that ring was bare there was nowhere to go.' },
];

export const DURING = [
  { t: 'Limited intervention', ok: true, d: 'The rule in Kruger is limited intervention: nature takes its course. The drought was not fought with feed or new water.' },
  { t: 'River water negotiated', ok: true, d: 'The park worked with farms and towns upstream, on the Sabie among others, so that everyone cut their use and some water kept reaching the park.' },
  { t: 'Some hippo and buffalo shot', ok: false, d: 'In 2016 the park announced it would take off about 350 animals. In the end 105 buffalo and 52 hippo were shot, and the meat went to communities on the boundary that had lost two maize harvests. The reason given was food, not water: "we still have plenty of water, the problem is food".' },
  { t: 'And then more', ok: false, d: 'For 2017 the plan grew to 300 or 400 buffalo and 200 hippo, with the Skukuza abattoir reopened. Critics asked how a few hundred carcasses would feed two million neighbours, and whether meat had overtaken science as the motive. The park called it "a process of continually learning".' },
];

export const AFTER = [
  { t: 'Grass', d: 'Back within a year. Near Satara, where the drought was hardest, production was close to normal by 2016-17, and the mix had shifted towards tastier species: the tough perennials had died and better grasses took their place.' },
  { t: 'Trees', d: 'Patchy. No die-off across the park, but up to 40 % of trees and shrubs dead at a few sites in the south, where some open savanna turned to grassland. Some big trees only died two or three years later, as groundwater dropped and termites stripped their bark.' },
  { t: 'Small things', d: 'Insects, reptiles and other small animals collapsed and took years to recover. Then came the booms: rodents, red-billed queleas, some insects.' },
  { t: 'Disease', d: 'Animals crowded at the last water passed infections on. The first tuberculosis in white rhino and in wild elephants was recorded, and distemper in wild dogs.' },
  { t: 'The verdict', d: 'Not a catastrophe. Losses were severe for a few species only, and worse on heavily stocked farms and small reserves than in the big park.' },
];

export const LESSONS = [
  'Room to move matters more than water points. The reserve that could not let its animals leave lost three quarters of them.',
  'Artificial water keeps animals alive in good years and kills them in bad ones, by letting them eat the grass they will need.',
  'Rain in the right month counts for more than the yearly total.',
  'The heat is the new part. What set this drought apart was temperature, and the next one will be hotter.',
];

/** Plants. */
export const PLANTS = [
  { t: 'More CO2 helps trees against grass', d: 'A tree needs far more carbon than a grass to build itself, so extra CO2 helps it more. Models that run to 2100 keep the bush thickening across Africa; switch the CO2 effect off in the model and most of that disappears.' },
  { t: 'Not "savanna becomes forest"', d: 'What is expected is thicker savanna and more thicket. Maps of which biome ends up where change a lot from one scenario to the next.' },
  { t: 'Baobabs', d: 'Nine of the thirteen oldest baobabs in southern Africa died, wholly or in part, within twelve years. The cause is not settled: the authors suspect the climate, but these trees have lived through worse droughts. Around Kruger, 6 % of 501 baobabs died in fifteen years.' },
];

/** Animals, with species ids where the checklist has them. */
export const ANIMALS: { t: string; id?: string; d: string }[] = [
  { t: 'Wild dog', id: 'lycaon-pictus', d: 'On hot days packs hunt less. They make up some of it at night, mostly under a moon, and hardly at all while raising pups. In Botswana, as the pup-rearing season warmed by about 1 °C, the pups surviving per pack fell from five to three. 73 packs, three countries.' },
  { t: 'Southern yellow-billed hornbill', id: 'tockus-leucomelas', d: 'In the Kalahari, from 2008 to 2019, occupied nest boxes fell from 52 % to 12 % and successful nests from 58 % to 17 %. Every attempt failed when the daily maximum averaged 35.7 °C or more. At the present rate the whole breeding season there passes that line around 2027.' },
  { t: 'Nile crocodile', d: 'The temperature of the nest decides the sex of the hatchlings, and half a degree to one degree is enough to change the ratio sharply. The only field data, from the Okavango, are twenty years old.' },
  { t: 'Hippo and buffalo', d: 'The two big losers of 2015-16, and the two that do badly in every future the park\'s scientists have modelled.' },
];

export const UNKNOWN = [
  'How many very hot days the Lowveld will have in 2050: the published figures are for provinces, not for a reserve.',
  'Whether a drought leaves a wave of tree seedlings behind it, which would feed bush encroachment.',
  'How much disease adds to drought deaths.',
  'What happens to most species: nearly all the detailed work is on a handful of large mammals and a few birds.',
];

export const CLIMATE_SOURCES: { t: string; url?: string }[] = [
  { t: 'Swemmer et al. 2018, the ecology of drought: a workshop report, South African Journal of Science', url: 'https://doi.org/10.17159/sajs.2018/5098' },
  { t: 'Smit & Bond, the 2015-16 drought in Kruger National Park', url: 'https://tfcaportal.org/repository/the-2015-16-drought-in-kruger-national-park' },
  { t: 'Megaherbivore response to droughts under different management regimes, Kruger', url: 'https://www.nisc.co.za/products/abstracts/31617/journals/megaherbivore-response-to-droughts-under-different-management-regimes-lessons-from-a-large-african-savanna' },
  { t: 'Iconic Kruger game park faces bleak climate future, Climate Home News 2016', url: 'https://www.climatechangenews.com/2016/12/12/iconic-kruger-game-park-faces-bleak-climate-future/' },
  { t: 'South African park kills 350 hippos, buffalos amid drought, AP 2016', url: 'https://www.cbc.ca/news/science/south-africa-park-kills-hippos-buffalos-drought-1.3762117' },
  { t: 'More questions than answers as Kruger continues shooting buffalo, 2017', url: 'https://www.conservationaction.co.za/questions-answers-kruger-park-continues-shooting-buffalo/' },
  { t: 'Southern African Wildlife College, climate predictions', url: 'https://wildlifecollege.org.za/climate-predictions/' },
  { t: 'What the IPCC\'s sixth report says for southern Africa, South African Journal of Science', url: 'https://sajs.co.za/article/view/12679/17742' },
  { t: 'Fact sheet: the IPCC sixth assessment and southern Africa, weADAPT', url: 'https://weadapt.org/knowledge-base/fact-sheet-what-the-ipccs-sixth-assessment-report-means-for-southern-africa/' },
  { t: 'National Climate Change Information System, projections for South Africa', url: 'https://nccis.environment.gov.za/climate-services/climate-projections' },
  { t: 'Funding flows for climate change research on Africa', url: 'https://www.nupi.no/en/publications/cristin-pub/funding-flows-for-climate-change-research-on-africa-where-do-they-come-from-and-where-do-they-go' },
  { t: 'The surprising role of CO2 in changes on the African savanna, Yale e360', url: 'https://e360.yale.edu/features/the_surprising_role_of_co2_in_changes_on_the_african_savanna' },
  { t: 'African vegetation to 2100 with and without the CO2 effect, Global Change Biology', url: 'https://publikationen.ub.uni-frankfurt.de/files/56900/gcb.15390.pdf' },
  { t: 'Africa\'s oldest baobabs are dying, National Geographic on Patrut et al. 2018', url: 'https://www.nationalgeographic.com/science/article/oldest-tress-africa-baobabs-dead-climate-science' },
  { t: 'Woodroffe et al., hot dogs: wild dogs and high temperatures, Journal of Animal Ecology', url: 'https://discovery.ucl.ac.uk/id/eprint/10067607/' },
  { t: 'Pattinson et al. 2022, collapse of breeding success in desert hornbills', url: 'https://repository.up.ac.za/handle/2263/86427' },
  { t: 'Nile crocodile nests on the Okavango (Stellenbosch thesis)', url: 'https://scholar.sun.ac.za/items/da74dd66-58e2-46fc-978b-f42e20ce4e5d/full' },
];
