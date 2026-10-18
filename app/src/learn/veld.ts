// "Reading the grass": Decreasers and Increasers, what they say about how a patch of veld has been used, who eats what at Pidwa, and Trollope's Kruger method. Compiled 2026-10-13.

export type Grp = 'd' | 'i1' | 'i2' | 'i3';

export const INTRO = 'Decreaser and Increaser are labels stuck on grass species, the way a bird is a migrant or a resident. They are not places. Any patch of veld holds a mix of species; what you read is which label most of the tufts carry. That tells you how the patch has been grazed over the last few years.';

/** Bare soil never stays bare: the three stages a patch goes through if left alone. */
export const STAGES = [
  { t: 'Pioneers', d: 'The first grasses on bare soil after a hot fire, trampling or a plough. Small, often annual: they sprout, seed and die within weeks. Poor food, but they cover the ground.' },
  { t: 'Subclimax', d: 'Once the soil is shaded and holds a little water, tougher perennial grasses move in and push the pioneers out.' },
  { t: 'Climax', d: 'Left alone long enough, the patch ends up with big tufted perennials on deep roots. This is the stable stage: it stays that way until something disturbs it.' },
];

/** Why grazing changes the mix. */
export const CHOICE = 'A grazer does not mow. It picks: the good grass first, the rest later or never. A tuft that is eaten again before it has regrown runs out of reserves and dies. The tuft next to it that nobody touched takes the space. So every species ends up sorted by two questions: do animals like it, and can it cope with being eaten often?';

export const GROUPS: { g: Grp; name: string; when: string; d: string; look: string }[] = [
  { g: 'd', name: 'Decreaser', when: 'goes down when the veld is misused, either way',
    d: 'Liked by animals, but cannot be eaten non-stop. Grazed and then left alone for a few weeks, it grows back fully. Grazed again and again, it wears out. Not grazed at all, it chokes under its own dead leaves. It only dominates in between.',
    look: 'Tall, leafy, soft grass. A patch that is grazed, but not hammered.' },
  { g: 'i1', name: 'Increaser I', when: 'goes up when the veld is not grazed enough',
    d: 'Big, coarse climax grasses that do best when left in peace. With few animals and no fire, everything grows tall and old, and these out-shade the rest.',
    look: 'Tall, stiff tufts in a sea of tall, untouched grass.' },
  { g: 'i2', name: 'Increaser II', when: 'goes up when the veld is grazed too hard',
    d: 'Grasses built to survive constant grazing: low, creeping, or quick annuals that seed in a few weeks. They are mostly pioneers and subclimax species, back because the soil has been opened up.',
    look: 'Short grass with bare soil showing. Short twice over: mown all the time, and small by nature.' },
  { g: 'i3', name: 'Increaser III', when: 'goes up when animals pick around it',
    d: 'Hard, wiry or bitter climax grasses that grazers avoid. The animals keep eating the good grass around them until it gives up, and these fill the gap.',
    look: 'Tall, stiff tufts with the grass between them grazed short.' },
];

/** Increaser I against Increaser III: same look, opposite cause. Start from one patch with mostly good grass and a few hard tufts. */
export const TWO_STORIES = [
  { g: 'i1' as Grp, t: 'Story 1: the animals are taken away', d: 'Nothing is eaten any more. The good grasses are not grazed, so their old dead leaves pile up on the tuft and shade it. They slowly choke. Some big coarse grasses cope well with that and grow even larger.', why: 'The good grass dies because it is no longer eaten at all.' },
  { g: 'i3' as Grp, t: 'Story 2: animals are there, with too much choice', d: 'They walk through, eat the good grasses and leave the hard ones. Three weeks later they are back on the same good tufts, which have not had time to recover. After a few years those die of exhaustion, and the hard tufts nobody ever touched spread into the gaps.', why: 'The good grass dies because it is eaten too often.' },
];
export const TWO_STORIES_END = 'Both end with hard grass winning, for opposite reasons, and they are not the same species. Increaser III is about sorting, not numbers: on a large block where a few animals always have the choice, the good tufts get overgrazed one by one while the block as a whole does not.';
export const FIELD_TIP = 'In the field, look between the hard tufts. Tall and untouched: closer to Increaser I. Grazed short: closer to Increaser III.';

export const READING: { g: Grp; t: string; d: string }[] = [
  { g: 'd', t: 'Mostly Decreasers', d: 'used well: grazed, then rested' },
  { g: 'i1', t: 'Mostly Increaser I', d: 'not grazed enough, or not burnt for too long' },
  { g: 'i2', t: 'Mostly Increaser II', d: 'grazed too hard, everywhere' },
  { g: 'i3', t: 'Mostly Increaser III', d: 'picked over for years: good grass eaten, bad grass left' },
];
export const READING_NOTE = 'A "veld condition score" is this count turned into a number: note the nearest grass at 100 or 200 points, add up the share of each group, and weight it. Common weights are 10 for Decreasers, 7 for Increaser I, 4 for Increaser II and 1 for Increaser III. These are tendencies, not laws: rain and soil change how tall anything grows.';

/** Who eats what at Pidwa. Ids are species ids of the checklist. */
export const DIETS: { t: string; d: string; ids: string[] }[] = [
  { t: 'Grass, in bulk', d: 'Huge amounts, not much sorting. Buffalo and zebra take tall, coarse grass and open it up for others. White rhino and hippo also eat in bulk but prefer it short, and keep their favourite patches mown into lawns.', ids: ['syncerus-caffer', 'equus-quagga', 'ceratotherium-simum', 'hippopotamus-amphibius'] },
  { t: 'Grass, short and green', d: 'Wildebeest follow the short green flush. Warthog graze on their knees and dig up roots and rhizomes in the dry season.', ids: ['connochaetes-taurinus', 'phacochoerus-africanus'] },
  { t: 'Grass, but picky', d: 'They choose the good grasses of medium to tall height. The first to suffer when the veld goes downhill.', ids: ['hippotragus-niger', 'damaliscus-lunatus', 'kobus-ellipsiprymnus', 'redunca-arundinum'] },
  { t: 'Leaves', d: 'Browsers: leaves, shoots, pods and fruit, hardly any grass. The black rhino is the browsing rhino, with the pointed lip.', ids: ['giraffa-giraffa', 'diceros-bicornis', 'tragelaphus-strepsiceros', 'tragelaphus-sylvaticus', 'sylvicapra-grimmia', 'oreotragus-oreotragus', 'raphicerus-sharpei'] },
  { t: 'Both', d: 'Mixed feeders: green grass in the rains, leaves when it dries. Eland and steenbok lean towards leaves.', ids: ['aepyceros-melampus', 'loxodonta-africana', 'tragelaphus-angasii', 'taurotragus-oryx', 'raphicerus-campestris'] },
];
export const DIETS_NOTE = 'The grass labels only matter to the first three groups, and to the mixed feeders in the rains. The browsers are the other half of the story: trees and shrubs.';

/** Three looks a patch can have, the labels usually found there, and who needs it. */
export const MOSAIC: { g: Grp; t: string; who: string }[] = [
  { g: 'i2', t: 'Short lawn, mostly Increaser II', who: 'Wildebeest, white rhino, warthog, impala. Without lawns they leave or decline.' },
  { g: 'd', t: 'Tall soft grass, mostly Decreasers', who: 'Sable, tsessebe, buffalo, zebra.' },
  { g: 'i1', t: 'Tall hard tufts, mostly Increaser I or III', who: 'Hardly eaten, but it hides young antelope, holds ground nests, carries a fire and keeps the soil in place.' },
];
export const HUMAN = [
  { t: 'Where the bias comes from', d: 'The labels were invented for cattle farmers, in the United States in 1949 and in Natal in 1978. "Good grass" meant grass that fattens a cow. A veld of nothing but Decreasers is the perfect pasture for one species of grazer.' },
  { t: 'What a reserve wants', d: 'A mosaic: the three looks above side by side, in patches, because each herbivore needs a different one. Short-grass grazers make and keep their own lawns. That is gardening, not damage.' },
  { t: 'What stays true', d: 'Decreasers are not only a farmer\'s taste. They are deep-rooted perennials that cover the soil all year and come back after a drought. Most of the surface under Decreasers is a good sign for any ecosystem.' },
  { t: 'The real alarm', d: 'Not "there are Increasers". Large areas of bare soil with only annuals: the soil goes with the first big storm, and it does not come back on its own.' },
];

/** Trollope, Potgieter & Zambatis 1989: the Kruger method. */
export const TROLLOPE_WHO = 'Winston Trollope was a fire and grass scientist at the University of Fort Hare. In the 1980s, with two Kruger scientists, Potgieter and Zambatis, he wanted a way for rangers, not botanists, to judge the grass. They went back through 550 grass surveys made in the park between 1954 and 1975 and looked for the species that explained most of the difference between good and poor veld. Out of 93 grasses, 14 did more than 90 % of the work. Four more were added from field experience: 18 key grasses.';

export const TROLLOPE_HOW = [
  { t: 'One plot', d: 'A site of 50 by 100 m in a uniform piece of veld.' },
  { t: 'A hundred points', d: 'Two lines of 50 points. At each one, write down the nearest key grass. Any other grass is "other". Nothing within 25 cm is "bare ground".' },
  { t: 'Two scores', d: 'Each key grass has a weight for food and one for fuel. Multiply by how often it turned up and add. Under 200 is very low, 200 to 300 low, 300 to 400 medium, 400 to 500 high, over 500 very high.' },
  { t: 'A trend', d: 'Add up the share of Decreasers, Increaser I and Increaser II. Whichever leads tells you whether the patch is used moderately, too little or too much.' },
];

export const TROLLOPE_THREE = [
  { n: 'Food', l: 'for bulk grazers', s: 'rated for buffalo, zebra and elephant, not for cattle alone' },
  { n: 'Fuel', l: 'to carry a fire', s: 'below a fuel score of 250 a fire does not spread; below 400 it is too cool to push back bush' },
  { n: 'Soil', l: 'held against erosion', s: 'read from the share of bare ground; goes hand in hand with the two others' },
  { n: '2 000 kg/ha', l: 'of grass to carry a fire', s: '4 000 kg/ha for one hot enough to control bush encroachment' },
];

/** Table 1 of the paper: Gomondwane Bush, Acacia welwitschii thickets, 23 July 1987. Share of the 100 points. */
export const SHEET = { site: 'Gomondwane, southern Kruger, July 1987', parts: [{ g: 'd' as Grp, n: 11 }, { g: 'i2' as Grp, n: 62 }], other: 27, forage: 267, fuel: 211, verdict: 'Low food, low fuel, Increaser II in front: overgrazed.' };

export const TROLLOPE_FIX = [
  { t: 'Too much Increaser I', d: 'Burn more often, every two to three years. Fresh regrowth is tasty, animals come back, and Decreasers return. In Kruger this only happens in the two wet corners, Pretoriuskop and Punda Maria; everywhere else it is too dry for these grasses to take over.' },
  { t: 'Too much Increaser II', d: 'Burn less often, every five to six years, so the grass gets old and the grazers move elsewhere. Or close a water point for a year in three. Near rivers, where the water cannot be switched off, only removing animals works.' },
];
export const TROLLOPE_NOTE = 'Kruger uses three groups only. There is no Increaser III on its sheet: the fourth group comes from cattle country further south.';

/** The 18 key grasses of Kruger, with the group Trollope gave them. Common names as used in South African field guides. */
export const KEY_GRASSES: { g: Grp; sci: string; en: string }[] = [
  { g: 'd', sci: 'Themeda triandra', en: 'Red grass' },
  { g: 'd', sci: 'Panicum maximum', en: 'Guinea grass' },
  { g: 'd', sci: 'Panicum coloratum', en: 'Small buffalo grass' },
  { g: 'd', sci: 'Digitaria eriantha', en: 'Common finger grass' },
  { g: 'd', sci: 'Cenchrus ciliaris', en: 'Foxtail buffalo grass' },
  { g: 'd', sci: 'Setaria incrassata', en: 'Vlei bristle grass' },
  { g: 'd', sci: 'Setaria flabellata', en: 'Bristle grass' },
  { g: 'i1', sci: 'Hyperthelia dissoluta', en: 'Yellow thatching grass' },
  { g: 'i1', sci: 'Hyparrhenia filipendula', en: 'Fine thatching grass' },
  { g: 'i2', sci: 'Urochloa mosambicensis', en: 'Bushveld signal grass' },
  { g: 'i2', sci: 'Bothriochloa radicans', en: 'Stinking grass' },
  { g: 'i2', sci: 'Heteropogon contortus', en: 'Spear grass' },
  { g: 'i2', sci: 'Eragrostis rigidior', en: 'Curly leaf' },
  { g: 'i2', sci: 'Schmidtia pappophoroides', en: 'Sand quick' },
  { g: 'i2', sci: 'Pogonarthria squarrosa', en: 'Herringbone grass' },
  { g: 'i2', sci: 'Enneapogon cenchroides', en: 'Nine-awned grass' },
  { g: 'i2', sci: 'Aristida congesta', en: 'Tassel three-awn' },
  { g: 'i2', sci: 'Tragus berteronianus', en: 'Carrot-seed grass' },
];
export const KEY_NOTE = 'Increaser II does not mean bad to eat. Bushveld signal grass is tasty and still sits there: the label says when a grass spreads, not how it tastes.';

export const SWEET_SOUR = [
  { t: 'Sweetveld', d: 'Low rainfall, mild winters, soil that has kept its minerals. The grass stays nutritious when it dries, so animals can live on it all winter. The dry Lowveld is sweetveld country.' },
  { t: 'Sourveld', d: 'High rainfall has washed the soil out. The grass grows tall and plentiful but loses its value as it matures: good in summer, straw in winter.' },
  { t: 'Mixed veld', d: 'In between. Often sweet on the low, sheltered ground and along rivers, sour on the open slopes.' },
];

export const LIMITS = [
  'The same species can change group from one region to the next, so a list made for the Highveld does not hold in the Lowveld.',
  'Two grasses in the same group can react quite differently to being cut. Several studies call the fixed groups an over-simplification.',
  'The model assumes one ideal end state. Since 1989 ecologists prefer to describe dry rangelands as having several stable states, with thresholds that are hard to cross back.',
  'Sources disagree on Increaser III: some say "overgrazed", Tainton says "selectively grazed". This chapter follows Tainton.',
];

export const VELD_SOURCES: { t: string; url?: string }[] = [
  { t: 'Trollope, Potgieter & Zambatis 1989, assessing veld condition in Kruger using key grass species, Koedoe 32', url: 'https://koedoe.co.za/index.php/koedoe/article/view/465' },
  { t: 'Trollope 1990, the technique behind the key grasses, Journal of the Grassland Society of Southern Africa', url: 'https://www.nisc.co.za/products/abstracts/1207/journals/development-of-a-technique-for-assessing-veld-condition-in-the-kruger-national-park-using-key-grass-species' },
  { t: 'Foran, Tainton & Booysen 1978, the Natal method: Decreaser, Increaser I, Increaser II', url: 'https://ajol.info/index.php/ajrfs/article/view/1044' },
  { t: 'Increaser III and the usual weights (Tainton 1999, cited in a 2023 veld survey)', url: 'https://www.sciencedirect.com/science/article/pii/S0254629923004453' },
  { t: 'Vorster 1982, the Karoo method with Increaser IIa, IIb, IIc', url: 'https://nisc.com/products/abstracts/913/the-development-of-the-ecological-index-method-for-assessing-veld-condition-in-the-karoo' },
  { t: 'Themeda as a Decreaser, Sporobolus as an Increaser II, Eastern Cape', url: 'https://ajol.info/index.php/ajrfs/article/view/790' },
  { t: 'Do the groups predict how a grass reacts to cutting? UKZN thesis, 2018', url: 'https://ukzn-dspace.ukzn.ac.za/items/3734e654-51a9-4b2b-939b-e66197dcc8f8/full' },
  { t: 'Standard groupings criticised, Highland Sourveld', url: 'https://ajol.info/index.php/ajrfs/article/view/940' },
  { t: 'Westoby, Walker & Noy-Meir 1989, rangelands not at equilibrium', url: 'https://journals.uair.arizona.edu/index.php/jrm/article/viewFile/8380/7992' },
  { t: 'Waldram, Bond & Stock 2008, white rhino and grazing lawns, Ecosystems', url: 'https://doi.org/10.1007/s10021-007-9109-9' },
  { t: 'Grazing ungulates, sward height and veld condition', url: 'https://www.nisc.co.za/products/abstracts/1202/habitat-use-by-indigenous-grazing-ungulates-in-relation-to-sward-structure-and-veld-condition' },
  { t: 'Gagnon & Chew 2000, what African bovids eat, Journal of Mammalogy', url: 'https://doi.org/10.1644/1545-1542(2000)081%3C0490:DPIEAB%3E2.0.CO;2' },
  { t: 'Sweetveld, sourveld and mixed veld, Agribook', url: 'https://www.agribook.co.za/rangeland-veld/' },
  { t: 'Common names of grasses: Van Oudtshoorn, Guide to Grasses of Southern Africa (Briza)' },
];
