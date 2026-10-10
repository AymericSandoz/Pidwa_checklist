// "Fences": why the bush is full of wire, what it costs, how the electricity works, and who dies on it. Compiled 2026-10-10.

export const WHY = [
  { t: 'No fence, no ownership', d: 'Since the Game Theft Act of 1991, wild animals belong to a landowner only behind an "adequate enclosure" certified by the province. That one law turned cattle farms into game ranches.' },
  { t: 'Disease', d: 'Buffalo carry foot-and-mouth for life. Kruger was fenced in 1960–61 to keep them away from cattle, and a "red line" of veterinary fences still runs along its western side. Botswana fenced the Kalahari from 1958 to protect its beef exports.' },
  { t: 'Dangerous game', d: 'Lion, elephant, buffalo, rhino, leopard, cheetah, wild dog and hyena may only be kept behind an electrified fence. Elephants: 1.8 m minimum, 6 000 V. Lions: two fences of 2.4 m, the inner one with an overhang.' },
];

export const COSTS = [
  { t: 'Migrations end', d: 'Botswana\'s wildebeest fell by 94 % between 1979 and 1994. Hundreds of thousands died against the Kuke fence on their way to water in the droughts.' },
  { t: 'Small populations', d: 'South Africa\'s lions live in 44 fenced reserves, its cheetahs on 54. To avoid inbreeding they are moved around by hand, as one metapopulation. Pidwa\'s cheetahs are part of it.' },
  { t: 'Drought', d: 'In 1965 Kruger\'s western fence cut wildebeest and zebra off from the Sabi river. Rangers cut it open and 3 000 wildebeest came through.' },
  { t: 'Animals on the wire', d: 'About 21 000 non-target animals a year die on South African electric fences, more than 30 000 reptiles by some counts. See below.' },
];

export const SPEC = [
  { k: 'Height', v: '1.8 m for plain game, 2.4 m where there are elephants, lions or buffalo' },
  { k: 'Wire', v: 'high-tensile steel strands of at least 2.24 mm, or welded mesh; strands closer together near the ground' },
  { k: 'Posts', v: 'steel straining posts every 200 m at most, wooden or steel uprights between them, thin droppers every 4 m to keep the strands apart' },
  { k: 'Live wires', v: 'at least three, on brackets that hold them 22 to 45 cm off the fence, each paired with an earth wire 10 cm inside it' },
  { k: 'Voltage', v: '6 000 to 9 000 V over the whole perimeter; the energiser must hold 6 000 V over 8 km and deliver 6 joules' },
  { k: 'Pulse', v: 'about one a second, a few ten-thousandths of a second long. High voltage, almost no energy: a kudu gets a jolt and backs off' },
];

/** How the shock works, in plain words. Each entry is one short paragraph. */
export const HOW = [
  { t: 'It is a loop, not a wire', d: 'The energiser is a pump. One terminal feeds the live wire, the other is bolted to steel spikes in the ground. Current only flows if something closes the loop between the wire and the earth. Pressure without a loop is just voltage: nothing moves, nothing hurts.' },
  { t: 'The animal is the bridge', d: 'An antelope touches the wire with its nose and the ground with its hooves: the loop closes through its body, nose to feet. A bird on the wire touches nothing else. It sits at 8 000 volts and feels nothing, because there is no way back to the earth through it.' },
  { t: 'A pulse, not a current', d: 'The energiser stores energy and releases it about once a second, for a few ten-thousandths of a second. The voltage is high so it gets through hair, dry skin and the grass touching the line; the energy is tiny, a few joules, so the heart has no time to be upset. Pain, surprise, retreat, memory. That is the whole design.' },
  { t: 'Why the earth wire', d: 'Dry sand and thick-soled feet make a poor return path, so an elephant on Kalahari sand might feel very little. The fix is to run an earth wire 10 cm from every live wire, bolted to the same spikes as the energiser. Any muzzle that touches both closes a perfect loop, whatever the soil. Touching the plain fence alone does nothing: it carries no current.' },
  { t: 'Not everywhere at full strength', d: 'Voltage drops along the line with distance and with every tuft of grass leaking a little to the ground. One energiser holds 6 000 volts over about 8 km of clean fence; a reserve the size of Pidwa runs several, in different corners, split by cut-out switches so that one failure or one fallen tree only opens one section.' },
  { t: 'Built to give way', d: 'Only the straining posts at the ends of a section are rigid. The posts in between are light, the droppers hang clear of the ground, the wire is smooth and stretches. Between two strainers the fence works like a net: a running impala bends it a metre or two and bounces off, instead of breaking a leg on a wall of wire. The low live wire is called a trip wire for the same reason: an animal charging the fence meets it first, gets the pulse and pulls up before it reaches the mesh.' },
];

/** The kit, with the words used on a reserve. */
export const GLOSSARY = [
  ['Strainer, straining post', 'the heavy steel or timber post, braced by a stay, that takes the pull of all the wires; at every corner and at most every 200 m'],
  ['Line post, standard', 'the light post between strainers, every 10 to 20 m; holds the wires at height, carries no tension'],
  ['Gum pole', 'treated eucalyptus pole, the cheap classic; termites and fire eat it'],
  ['Y-standard, star picket', 'steel post with a Y section, driven in with a post driver; wire clips into its notches'],
  ['Dropper', 'thin timber or flat-steel rod clipped to the wires every 2 to 4 m, hanging clear of the ground; keeps the strands apart so a head cannot push through'],
  ['High-tensile wire', 'smooth galvanised steel, 2.24 to 2.5 mm, pulled tight with a strainer tool and joined with crimp ferrules'],
  ['Mesh, Bonnox, Veldspan', 'welded wire mesh in one roll, small holes at the bottom, large at the top; dearer per metre, quicker to put up, better against warthog and jackal'],
  ['Offset bracket, outrigger', 'steel arm with a plastic insulator that holds a live wire 22 to 45 cm clear of the fence, so it never touches a post'],
  ['Live wire, hot wire', 'the wire connected to the energiser: usually three, at the top, at chest height and near the ground'],
  ['Earth wire, ground wire', 'the return wire, 10 cm from each live wire, bonded to the earth spikes'],
  ['Trip wire', 'the lowest live wire, 10 to 30 cm up and pushed outwards: stops diggers and crawlers, kills pangolins and tortoises if set too low'],
  ['Energiser, charger', 'the box, mains or solar, rated in joules; one pulse a second'],
  ['Earth spikes', 'galvanised rods driven into damp ground next to the energiser; a poor earth cripples the whole fence'],
  ['Cut-out switch', 'isolates one section for repairs or to find a fault'],
  ['Fence line, fence patrol', 'the cleared strip along the fence, walked or driven daily: grass off the wire, warthog holes closed, voltage checked'],
];

export const VICTIMS = [
  { n: '377 to 1 028', l: 'pangolins electrocuted a year in South Africa', s: 'peer-reviewed estimate; newer expert figures say up to 2 000' },
  { n: '1 per 11 km', l: 'of electrified fence, per year', s: 'the single biggest threat to Temminck\'s pangolin' },
  { n: '56 %', l: 'of leopard tortoise deaths in the Karoo', s: 'from the 4 % of fences that are electrified' },
  { n: '213 dead, 43 species', l: 'on one Kalahari farm, 108 km, five years', s: 'rock monitor 59, steenbok 40, pangolin 28, tent tortoise 28, kori bustard 15' },
];

export const WHY_THEY_DIE = 'The pulse is designed not to kill: an animal touches the wire, gets one shock, and leaves. A pangolin walks on its hind legs with its soft belly at 20 cm, exactly the height of the lowest live wire. Shocked, it does what pangolins do: it curls into a ball, around the wire, and takes a pulse every second until its organs fail. A tortoise pulls into its shell and stays on the wire. Snakes and monitors wrap around it.';

export const FIXES = [
  'Lowest live wire at 30 cm or more (Sabi Sand uses a single live wire at 52 cm)',
  'Live wires on brackets, away from the fence, so a climbing animal is not trapped between wire and mesh',
  'Timers that cut the current in daylight, when tortoises move, or energisers that drop a strand when something is held on it',
  'Daily patrols: a curled pangolin found in time usually survives',
];

/** The scientific argument, both sides. */
export const DEBATE = {
  intro: 'In 2013 fifty-eight lion scientists wrote that fences are the cheapest way to save lions. Fifty-five others answered that the argument "has holes". Both sides agree on one thing: the real constraint is money.',
  pro: [
    'Fenced reserves keep lions at about 80 % of what the land can carry for US$500 per km² a year; unfenced ones need four times that to reach even 50 %. Packer et al. 2013.',
    'Half of the unfenced lion populations could fall to near extinction within 20 to 40 years without a big rise in funding. Packer et al. 2013.',
    'Fewer cattle killed, fewer lions shot in revenge: human-wildlife conflict is the first reason managers give for fencing. Pekor et al. 2019, 184 reserves.',
    'A fence marks the boundary and stops encroachment; two thirds of managers of fenced reserves report strong local support. Pekor et al. 2019.',
  ],
  con: [
    'Packer measured success as how full a reserve is. By that yardstick a fenced 100 km² with its 30 lions scores 100 %, and the open Selous with 600 lions in 50 000 km² scores 15 % and "fails". But 600 lions are twenty times more lions, and most of Africa\'s lions live in such big, half-empty places. Creel et al. 2013.',
    'Many fenced populations are small and kept above capacity by hand: contraception, culling, moving animals between reserves. Correct for that and the fence effect vanishes. Creel et al. 2013.',
    'In drylands, wildlife and herders survive by moving to where the rain fell. Fences cut that, and climate change makes it worse. Durant et al. 2015.',
    'A fence costs about US$9 500 per km to build and US$500 per km a year to keep up; most reserves budget a third of that. A broken fence is worse than none, and in 37 % of fenced reserves its wire ends up as snares. Pekor et al. 2019.',
  ],
};

/** How other countries do it. v: a short verdict for the pill. */
export const COUNTRIES = [
  { c: 'South Africa', v: 'Almost everything', d: 'Every private reserve and most state parks, by law: no fence, no ownership of game, and dangerous game must be enclosed. Kruger\'s western and southern boundary alone is 750 km, fenced in 1960 against foot-and-mouth.', pidwa: true },
  { c: 'Namibia', v: 'Farms and Etosha', d: 'Freehold farms are fenced; Etosha has been fully enclosed since 1973, 850 km. The "Red Line", a 1 250 km double veterinary fence, has cut the country in two since the rinderpest of 1896.' },
  { c: 'Botswana', v: 'Parks open, country fenced', d: 'The parks themselves have no fences, but veterinary cordon fences built since 1958 to protect beef exports to Europe criss-cross the country: over 5 000 km, perhaps 10 000. They are what killed the Kalahari wildebeest.' },
  { c: 'Zimbabwe', v: 'In between', d: 'Hwange is open towards Botswana, elephants cross freely. The private conservancies are fenced: Savé Valley\'s 320 km double fence was half torn down by settlers after the 2000 land reform.' },
  { c: 'Kenya', v: 'Mostly open, closing fast', d: 'Tsavo, Amboseli and the Mara have no fences. The mountain forests do: the Aberdares were ringed by 400 km of electric fence in 2009, Mount Kenya is being ringed with 450 km. On private land around the Mara, fencing has spread at an "unprecedented and accelerating" rate since 2010 as plots are subdivided.' },
  { c: 'Tanzania', v: 'Open by policy', d: 'The Serengeti and nearly every park are unfenced, and the migration still crosses into Kenya. A few short electric fences against crop raiding exist, 33 km here, 12 km there; villagers near the Serengeti are asking for more.' },
  { c: 'Mozambique', v: 'Sanctuaries only', d: 'Limpopo National Park has no fence on its own side; of its 185 km fence with Kruger, about 57 km have been dropped. Gorongosa keeps a 62 km² fenced sanctuary inside an open park; Maputo National Park is re-electrifying 145 km to keep elephants in.' },
  { c: 'Zambia', v: 'Open', d: 'Parks have no fences and often no gates; Liuwa Plain has neither. A handful of private game ranches are fenced.' },
];

export const SCALE = [
  { n: '750 km', l: 'Kruger\'s western and southern fence', s: 'built 1960, maintained by the state' },
  { n: '1 250 km', l: 'Namibia\'s Red Line', s: 'a double fence across the whole country' },
  { n: '> 5 000 km', l: 'veterinary fences in Botswana', s: 'some sources say 10 000' },
  { n: '5 614 km', l: 'Australia\'s dingo fence, for scale', s: 'the longest fence on earth' },
  { n: '?', l: 'South Africa\'s private game fences', s: 'nobody has added them up; 9 000 ranches, 17 M ha' },
  { n: '63 of 184', l: 'reserves fenced, in a 23-country survey', s: 'a third of them in South Africa; fenced reserves are five times smaller' },
];

export const MONEY = [
  { n: 'R220 000 to R350 000', l: 'per km of 2.4 m game fence', s: '2026 provincial tenders, site clearing included' },
  { n: 'US$9 500 per km', l: 'to build, across 23 African countries', s: 'and US$500 per km a year to maintain; most reserves budget a third of that' },
  { n: 'US$4 m', l: 'to rebuild half of Savé Valley\'s fence', s: 'torn down after Zimbabwe\'s land reform' },
  { n: '25 000 ha', l: 'Greater Makalali and Pidwa, one fence', s: 'a registered protected area, not linked to Kruger' },
];

export const DOWN = [
  { y: 1993, d: 'Timbavati, Klaserie and Umbabat drop their fence with Kruger: 180 000 ha of private land join the park.' },
  { y: 2002, d: 'Great Limpopo Transfrontier Park: 50 km of the Mozambique border fence come down. Security fears have stopped the rest.' },
  { y: 2005, d: 'Balule drops 24 km of fence with Klaserie, another 35 000 ha into the open system.' },
];

export const FENCE_SOURCES = [
  { t: 'Packer et al. 2013, dollars and fence, Ecology Letters', url: 'https://biblioteca.biofund.org.mz/wp-content/uploads/2021/01/1611561357-Conserving%20large%20carnivores%20-%20Dollars%20and%20fence%20-%20Ecology%20Letters%202013.pdf' },
  { t: 'Creel et al. 2013, the argument for fences has holes', url: 'https://scholarworks.montana.edu/handle/1/9575' },
  { t: 'Pekor et al. 2019, fencing Africa\'s protected areas, Biological Conservation', url: 'https://biblioteca.biofund.org.mz/wp-content/uploads/2021/03/1614763964-2019_Fencing_protected_areas_Africa.pdf' },
  { t: 'Durant et al. 2015, fencing policies for drylands', url: 'https://discovery.ucl.ac.uk/id/eprint/1462091/' },
  { t: 'Løvschal et al. 2017, fencing in the Greater Mara', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5264596' },
  { t: 'Namibia\'s Red Line', url: 'https://www.namibian.com.na/the-infamous-redline-why-does-namibia-have-a-veterinary-cordon-fence/' },
  { t: 'Africa Geographic, Botswana and Namibia\'s veterinary fences', url: 'https://africageographic.com/stories/should-namibia-and-botswana-bring-down-their-veterinary-fences/' },
  { t: 'Game Theft Act 105 of 1991', url: 'https://laws.ewt.org.za/wp-content/uploads/2023/10/GTA-1_Game-Theft-Act-105-of-1991.pdf' },
  { t: 'National norms and standards for elephants, 2023: fence annexures', url: 'https://source.acts.co.za/national-environmental-management-biodiversity-act-2004/n3010_annexure_v__electrificat.php' },
  { t: 'Pietersen, McKechnie & Jansen 2014, threats to Temminck\'s pangolin', url: 'https://bioone.org/journals/african-journal-of-wildlife-research/volume-44/issue-2/056.044.0209/A-Review-of-the-Anthropogenic-Threats-Faced-by-Temmincks-Ground/10.3957/056.044.0209.full' },
  { t: 'Stracquadanio et al. 2024, pangolins and electric fences, African Journal of Ecology', url: 'https://doi.org/10.1111/aje.13208' },
  { t: 'Beck 2008, electrified fences and non-target wildlife (Wits)', url: 'https://wiredspace.wits.ac.za/items/252a5be8-0759-4647-aa03-8a183ed879a4' },
  { t: 'Holt et al. 2022, leopard tortoises and electrified fences, Indago', url: 'https://nationalmuseumpublications.co.za/electrified-fences-endanger-leopard-tortoise-stigmochelys-pardalis-populations-in-the-central-interior-of-south-africa/' },
  { t: 'Africa Geographic, the animal toll of electric fences (Kalahari farm study)', url: 'https://africageographic.com/stories/shock-value-the-animal-toll-of-electric-fences/' },
  { t: 'Williamson & Williamson 1984, Botswana\'s fences and Kalahari wildlife, Oryx', url: 'https://resolve.cambridge.org/core/journals/oryx/article/botswanas-fences-and-the-depletion-of-kalahari-wildlife/6CBA4E8305CEF9DF66D8A5CF49B36488' },
  { t: 'Miller et al. 2015, lions in fenced reserves as a metapopulation', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4689424/' },
  { t: 'Jori et al. 2011, the Kruger foot-and-mouth fence', url: 'https://repository.up.ac.za/bitstream/2263/16590/1/Jori_Questionnaire(2011).pdf' },
  { t: 'Kruger Park Times, Greater Kruger fence removals', url: 'https://www.krugerpark.co.za/krugerpark-times-2-2-greater-kruger-19029.html' },
];
