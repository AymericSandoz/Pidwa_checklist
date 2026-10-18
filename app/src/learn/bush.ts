// "Bush encroachment": why savanna thickens, the argument over the causes, the elephant paradox, and what can be done. Compiled 2026-10-13.

export const INTRO = 'A savanna is grass and trees competing for the same ground, and neither wins for good. Bush encroachment is what happens when the woody side wins: open savanna turns into dense thicket, often of one or two thorny species, and the grass under it disappears.';

/** What keeps the trees in check in a healthy savanna. */
export const BRAKES = [
  { t: 'Grass', d: 'It drinks the water near the surface before a seedling can, and shades it. A tree seedling in thick grass has a hard start.' },
  { t: 'Fire', d: 'Dry grass burns, and the flames kill everything a young tree has above ground. It resprouts from the base, grows for a year or two, and is burnt back again. It can stay knee-high for years. This is the fire trap: only a sapling that gets its crown above the flames escapes and becomes a tree.' },
  { t: 'Browsers', d: 'Kudu, impala, giraffe and black rhino eat the shoots. Elephants break and push over trees. Together they slow the saplings down, which keeps them in the fire trap longer.' },
];

/** How a savanna tips over, step by step. */
export const TIPPING = [
  'Too many grazers, for too long, eat the grass down.',
  'Less grass means less competition for seedlings, and above all less fuel.',
  'Fire no longer passes, or passes too cool to burn the saplings back.',
  'The saplings grow out of the fire trap, all at once.',
  'Once they shade the ground, the grass does not come back, and without grass there is no fire to undo it.',
];
export const TIPPING_NOTE = 'This is where the grass chapter and this one meet. A veld of Increaser II, short with bare soil, cannot carry a fire. Trollope put the bar at 4 000 kg of grass per hectare for a fire hot enough to push bush back.';

/** The causes people argue about. */
export const CAUSES = [
  { t: 'Overgrazing', d: 'The story above, and the oldest explanation: cattle, then too many grazers behind fences.' },
  { t: 'Fire kept out', d: 'For much of the twentieth century, fires were fought and put out on farms and in parks alike.' },
  { t: 'More CO2 in the air', d: 'Trees use the extra carbon to grow faster and to rebuild faster after a fire, so they leave the fire trap sooner. Grown in a glasshouse at different CO2 levels, thorn tree seedlings grew markedly more at higher levels, and more still after being cut to imitate a fire.' },
  { t: 'Fewer big animals', d: 'Elephants and browsers were shot out of most of the country a century ago. Where they are few, nothing breaks the bush.' },
  { t: 'Rain', d: 'With fire kept out, bush thickens faster the more it rains.' },
];

export const EVERYWHERE = [
  { n: '3 continents', l: 'Africa, Australia, South America', s: 'savannas are thickening on all three, and it began before the 1980s' },
  { n: '2.5 times', l: 'faster in Africa than in Australia', s: 'under every kind of land use, and speeding up' },
  { n: 'up to 1.3 %', l: 'more woody cover per year', s: 'across 23 southern African studies; a few sites lost cover' },
  { n: 'Slowest', l: 'where big herbivores still roam', s: 'fastest in small protected areas, then commercial farms, then communal land' },
];
export const EVERYWHERE_NOTE = 'That is the case for CO2: if bush thickens in parks, on farms and on communal land at once, the farmer\'s cattle cannot be the whole story. Many savanna ecologists now see a global push, CO2, on top of local causes that decide how fast it goes.';

/** Pidwa, as taught on the Askari course. */
export const PIDWA = [
  { t: 'A lot of it', d: 'Large parts of the reserve are thick bush.' },
  { t: 'Why here', d: 'Two reasons given on the reserve: few elephants for the size of the land, and ground that was overgrazed in the past.' },
  { t: 'What is done', d: 'Some clearing by machine, and now and then a burn. Burns are very rare; the reserve would like to burn more often.' },
  { t: 'The catch', d: 'More elephants would open the bush. But elephants also strip the bark of marula and knob thorn, the big trees the reserve most wants to keep.' },
];

/** Too many bushes and too few big trees, at the same time. */
export const PARADOX_INTRO = 'It sounds like a contradiction: too much bush, and yet a worry about losing trees. It is not. The bush that spreads is shrubs and saplings, thousands to the hectare. The trees being lost are the big old ones, a handful to the hectare, and each takes a human lifetime to replace.';
export const RINGBARK = 'An elephant pulls bark off in long strips with its tusks and trunk, mostly in the dry season when there is little else worth eating. The living layer just under the bark is what carries sugar from the leaves down to the roots. A strip missing is a wound. A ring missing all the way round cuts the roots off from their food, and the tree dies slowly, standing up.';
export const ELEPHANT_FACTS = [
  { n: '1 100 to 8 500', l: 'elephants in Kruger, 1960 to 1970', s: 'the start of the worry about big trees' },
  { n: 'almost half', l: 'of Kruger marulas damaged by elephants', s: 'bark stripping and felling; 7 % dead, mostly from a broken main stem' },
  { n: '24 % fewer', l: 'marulas on a reserve next to Kruger', s: 'Jejane, after elephants arrived in 2013; trees of 5 to 11 m hit hardest' },
  { n: 'More, not less', l: 'woody cover in Kruger, 2007 to 2022', s: 'seen from satellite; elephant losses are local, along rivers and on rich soils' },
];
export const PROTECT = [
  { t: 'Wire netting', ok: true, d: 'Chicken mesh wrapped around the trunk. Over nine years it clearly raised survival, for big marulas more than for knob thorns. It stops bark stripping, not pushing over. A fifth of the nets were torn or had fallen: replace about every four years.' },
  { t: 'Rock or concrete pyramids', ok: true, d: 'Sharp blocks packed around the base so an elephant cannot stand close. They work when the ring is more than 1.5 m wide.' },
  { t: 'Beehives', ok: true, d: 'Hung in the tree: elephants avoid bees. The most expensive method per tree, partly paid back in honey.' },
  { t: 'Creosote jars', ok: false, d: 'Meant to repel by smell. They made no difference.' },
];

/** Who else but the elephant? Browsers work on the young plants, not on standing thicket. */
export const OTHERS_INTRO = 'No other animal undoes a thicket that is already there: only an elephant breaks or pushes over a grown shrub. The others work earlier, on seedlings and saplings, and some of them are very good at it.';
export const OTHERS = [
  { t: 'Impala', d: 'Probably the one that counts most, by sheer numbers. In iMfolozi, places with many impala had clearly fewer tree seedlings than places with few. On short-grass lawns, where impala and steenbok like to browse, two seedlings out of three died.' },
  { t: 'Impala and nyala again: the browse trap', d: 'Fence the medium-sized browsers out for ten years and the young trees grow bigger, even with more grass and hotter fires around them. Let the browsers back in and the trees keep their lead. A sapling eaten again and again stays small, just as one burnt again and again does.' },
  { t: 'Black rhino', d: 'Sickle bush and thorn trees are the bulk of its diet in several reserves, and almost all of what it eats is below 2.5 m: it prunes exactly the bush that is spreading. Strong per animal, but there are too few of them to shape a whole reserve.' },
  { t: 'Kudu and the small browsers', d: 'In an Eastern Cape trial, kudu and impala killed nearly half the thorn tree seedlings; the smaller browsers killed fewer but kept the survivors from growing.' },
  { t: 'Goats, outside reserves', d: 'The farmer\'s tool. After a stand of sweet thorn was chopped, goats held the regrowth down and killed many trees; sheep hardly slowed it. After a burn, a light stocking of goats kept the resprouts in check without hurting the grass.' },
];
export const STAGES_WHO = [
  { t: 'Seedling', d: 'impala, steenbok, duiker, fire' },
  { t: 'Sapling', d: 'kudu, nyala, black rhino, fire' },
  { t: 'Grown shrub, thicket', d: 'elephant, machine' },
];
export const OTHERS_NOTE = 'Browsers prevent and delay; they do not cure. In one long experiment, neither fire alone nor browsing alone stopped trees from getting denser: only the two together did. And there is a catch with impala: they eat grass too, and grass is the fuel. So no single species is the answer: each one works on a different age of tree, and what holds the balance is some of every kind, none in excess.';

export const EFFECTS = [
  { t: 'Less grass', d: 'so fewer grazers: wildebeest, zebra, white rhino, sable.' },
  { t: 'Other birds', d: 'Birds of open country give way to birds of thicket. Over 22 years on one site the number of species went up, but they were not the same species.' },
  { t: 'Harder hunting in the open', d: 'A cheetah needs room to run and to see. So do guests on a game drive.' },
  { t: 'Not all bad', d: 'Thicket is cover and food for kudu, nyala, bushbuck and black rhino, and it stores carbon.' },
];

export const CURES = [
  { t: 'Fire', d: 'The cheap tool, if there is grass to burn. A ten-year trial of very hot fires in Kruger opened the bush at first; after ten years the effect had gone. Fire holds saplings back. It rarely removes bush that has already escaped.' },
  { t: 'Cutting', d: 'By hand or by machine. Every encroaching species tested grew back from the stump. In Namibia thinned plots were on course to look like the uncleared ones again after 14 to 15 years. Cutting buys time; something has to follow it.' },
  { t: 'Poison on the stump', d: 'Herbicide painted on the cut clearly reduces regrowth. It costs money and care, one stem at a time.' },
  { t: 'Browsers afterwards', d: 'Regrowth is soft and low: exactly what browsers eat. Keeping them on a cleared patch slows the comeback.' },
  { t: 'Rest the grass', d: 'None of the above lasts if the grass does not return to compete and to carry the next fire.' },
];
export const SICKLE = 'Sickle bush, Dichrostachys cinerea, is the classic Lowveld encroacher and shows why this is hard. Cut it and it resprouts. Burn it and it comes back from ground level. It also spreads underground: on one site more than half the small plants were suckers from the roots of older bushes, not seedlings, and they kept coming even under yearly fires.';

/** The wider argument: should Africa plant trees? */
export const TREES = 'While reserves fight bush, tree-planting programmes aim to "restore" 1 million km² of Africa by 2030, most of it savanna and grassland mapped as lost forest. Savanna ecologists answer that these open landscapes are millions of years old, not degraded forest, and that planting them trades a living ecosystem for a small carbon gain. They are all for replanting real forest where it was cut down.';

export const SCALE = [
  { n: '26 to 45 M ha', l: 'of Namibia affected', s: 'estimates have grown from 26 M in 2002 to more than 45 M' },
  { n: '≈ 20 M ha', l: 'of South Africa', s: 'a 2006 figure, a sixth of the country, and dated' },
  { n: 'US$34 M', l: 'of charcoal exported by Namibia, 2018', s: 'made from encroacher bush: a problem turned into a product' },
  { n: '14 to 15 years', l: 'for thinned bush to grow back', s: 'north-central Namibia, hand-thinned farms' },
];

export const BUSH_SOURCES: { t: string; url?: string }[] = [
  { t: 'O\'Connor, Puttick & Hoffman 2014, bush encroachment in southern Africa: changes and causes', url: 'https://agris.fao.org/search/en/providers/122535/records/65dfa7e663b8185d9cadde6a' },
  { t: 'Stevens et al. 2017, woody encroachment is widespread across three continents, Global Change Biology', url: 'https://www.research.ed.ac.uk/en/publications/ff572887-5c50-4c25-8b65-a9ce5bd8ea2a' },
  { t: 'Bond & Midgley 2012, carbon dioxide and the uneasy interactions of trees and savannah grasses', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3248705' },
  { t: 'Kgope, Bond & Midgley 2010, thorn tree seedlings along a CO2 gradient, Austral Ecology', url: 'https://www.doi.org/10.1007/S00442-009-1293-1' },
  { t: 'The fire trap: resprouting after fire, Journal of Ecology 2019', url: 'https://tpyoung.ucdavis.edu/sites/g/files/dgvnsk4821/files/inline-files/2019%20LaMalfa_JOE%20Post%20fire%20resprout.pdf' },
  { t: 'Trollope, Potgieter & Zambatis 1989, fuel loads and fire in Kruger, Koedoe', url: 'https://koedoe.co.za/index.php/koedoe/article/view/465' },
  { t: 'Ten years of high-intensity fire in Kruger, Stellenbosch University', url: 'https://www.su.ac.za/en/node/6717' },
  { t: 'Elephants, fire and Kruger\'s woody vegetation, Koedoe', url: 'https://library.aosis.co.za/index.php/record/view/1537' },
  { t: 'Tree cover increasing in Kruger despite elephant pressure, Daily Maverick 2026', url: 'https://www.dailymaverick.co.za/article/2026-06-28-tree-cover-increasing-in-kruger-park-despite-elephant-pressure-in-some-areas/' },
  { t: 'Jacobs & Biggs 2002, the impact of elephants on marula trees in Kruger', url: 'https://the-eis.com/elibrary/search/34621' },
  { t: 'Marula after a century without elephants, Jejane', url: 'https://the-eis.com/elibrary/sites/default/files/downloads/literature/Recent%20exposure%20to%20African%20elephants%20after%20a%20century%20of%20exclusion.pdf' },
  { t: 'Elephant impact on marula trees, and honeybees as mitigation (Wits)', url: 'https://wiredspace.wits.ac.za/items/510188aa-b071-4a55-8641-c0435a4c691f/full' },
  { t: 'Wire netting and tree survival, nine-year Elephants Alive survey, 2025', url: 'https://edepot.wur.nl/692207' },
  { t: 'Wire netting reduces elephant impact, Koedoe 2016', url: 'https://koedoe.co.za/index.php/koedoe/article/view/1327/1878' },
  { t: 'Pyramids, creosote, beehives and netting compared (dataset)', url: 'https://datadryad.org/dataset/doi:10.5061/dryad.h18931zsf' },
  { t: 'Impala and woody seedlings in iMfolozi, Journal of Tropical Ecology', url: 'https://resolve.cambridge.org/core/journals/journal-of-tropical-ecology/article/heavy-impact-on-seedlings-by-the-impala-suggests-a-central-role-in-woodland-dynamics/EEDE6EB952F718DA794438138CB53DCF' },
  { t: 'Browsers and the openness of grazing lawns, ten-year study', url: 'https://repository.up.ac.za/handle/2263/83595?show=full' },
  { t: 'Staver & Bond 2014, is there a browse trap?', url: 'https://collaborate.princeton.edu/en/publications/is-there-a-browse-trap-dynamics-of-herbivore-impacts-on-trees-and/' },
  { t: 'Staver et al. 2009, browsing and fire interact to suppress tree density', url: 'https://collaborate.princeton.edu/en/publications/browsing-and-fire-interact-to-suppress-tree-density-in-an-african/' },
  { t: 'Black rhino browse in Itala Game Reserve', url: 'https://www.nisc.co.za/products/abstracts/7000/utilization-of-woody-browse-and-habitat-by-the-black-rhino-diceros-bicornis-in-western-itala-game-reserve' },
  { t: 'Browsers and sweet thorn seedlings, Eastern Cape (Rhodes)', url: 'https://researchrepository.ru.ac.za/bitstreams/00cf3209-4521-445d-b9c0-cc13426f1319/download' },
  { t: 'Du Toit 1972, goats on chopped sweet thorn', url: 'https://rangelandsgateway.org/dlio/7614' },
  { t: 'Trollope 1974, fire and goats against bush', url: 'https://rangelandsgateway.org/dlio/7558' },
  { t: 'Sirami et al. 2009, bush encroachment and birds', url: 'https://rangelandsgateway.org/dlio/6678' },
  { t: 'Sibiya et al. 2025, 22 years of shrub encroachment and birds', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12671995/' },
  { t: 'Resprouting of encroachers after cutting, with and without herbicide (UKZN)', url: 'https://researchspace.ukzn.ac.za/items/18bf4ace-44a0-4ee1-934a-ba01665e3eff/full' },
  { t: 'Wakeling & Bond 2007, root suckering in sickle bush, African Journal of Range & Forage Science', url: 'https://ajol.info/index.php/ajrfs/article/view/666' },
  { t: 'Restoration thinning in north-central Namibia, Cheetah Conservation Fund', url: 'https://cheetah.org/?p=10116' },
  { t: 'A review of bush encroachment in Namibia: from a problem to an opportunity', url: 'https://oiccpress.com/jrs/article/view/2282' },
  { t: 'Fighting a bush war in Namibia, Farmer\'s Weekly', url: 'https://www.farmersweekly.co.za/bottomline/fighting-a-bush-war-in-namibia/' },
  { t: 'Bond et al. 2019, the trouble with trees: afforestation plans for Africa', url: 'https://doi.org/10.1016/j.tree.2019.08.003' },
  { t: 'Pidwa: what was taught on the Askari course, October 2026' },
];
