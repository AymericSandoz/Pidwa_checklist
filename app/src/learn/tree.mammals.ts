// Family tree of the Pidwa mammals, for the Tree guide. The shape (which branch is closest to which) follows the dated
// mammal phylogeny of Upham, Esselstyn & Jetz 2019; the ages are rounded medians from TimeTree 5 (Kumar et al. 2022) and
// differ by several million years between studies. Inside the antelopes the order of the tribes is still debated: they
// are shown side by side. Leaves are scientific names of the checklist.
import type { TaxNode } from './tree';

const N = (name: string, en: string, rank: TaxNode['rank'], ma: number | null, text: string, kids: (TaxNode | string)[]): TaxNode =>
  ({ name, en, rank, ma, text, kids });

export const MAMMAL_TREE: TaxNode = N('Placentalia', 'Placental mammals', 'clade', 100,
  'Mammals whose young grow inside the mother, fed through a placenta, and are born well formed. About 6,000 of the 6,700 living mammals. ' +
  'The two other branches, the marsupials (kangaroos, opossums) and the egg-laying monotremes (platypus, echidnas), do not live in Africa. ' +
  'The big branches below split some 100 to 80 million years ago, as the continents drifted apart; most orders then spread fast after the dinosaurs died out, 66 million years ago.', [

  N('Afrotheria', 'African mammals', 'clade', 75,
    'A branch born in Africa when it was an island continent, recognised only from DNA in the late 1990s: nothing in their looks says that elephants, hyraxes, the aardvark, ' +
    'elephant shrews, golden moles and sea cows are one family. A few shared hints: extra vertebrae in the back, testes that stay inside the body, adult teeth that come in late.', [
    N('Tubulidentata', 'Aardvark', 'order', null,
      'The only living species of its order, alone on its branch for tens of millions of years. Its teeth have no enamel and are bundles of tiny tubes of dentine, hence "tube-teeth". ' +
      'Digs faster than a team of men with spades; a sticky tongue up to 30 cm long laps up termites and ants at night. Its old burrows shelter warthogs, hyenas, porcupines, mongooses and pythons.', [
      N('Orycteropodidae', 'Aardvark', 'family', null, '', ['Orycteropus afer'])]),
    N('Paenungulata', 'Elephants, hyraxes & sea cows', 'clade', 64,
      'Elephants, hyraxes and sea cows (dugongs, manatees) share an ancestor. The hyrax shows it: toes ending in small hoof-like nails, and upper incisors that grow into little tusks.', [
      N('Hyracoidea', 'Hyraxes', 'order', null,
        'Rabbit-sized cousins of the elephants: five species, in Africa and the Middle East. Rubbery soles kept moist by sweat grip bare rock like suction pads. ' +
        'Poor at keeping warm, they sunbathe in heaps in the morning. Their latrines, used for thousands of years, build up into "hyraceum", which records past climates.', [
        N('Procaviidae', 'Hyraxes', 'family', null, '', ['Procavia capensis'])]),
      N('Proboscidea', 'Elephants', 'order', null,
        'The largest land animals. The trunk is nose and upper lip fused, with tens of thousands of muscle bundles; the tusks are upper incisors that keep growing. ' +
        'Molars come one after another, six sets in a lifetime, moving forward like a conveyor belt. Three living species (African savanna, African forest, Asian), the last of a large group with the mammoths and mastodons.', [
        N('Elephantidae', 'Elephants', 'family', null, '', ['Loxodonta africana'])]),
    ]),
  ]),

  N('Boreoeutheria', 'Northern placentals', 'clade', 92,
    'The branch that grew on the northern continents: on one side primates, rodents and hares, on the other bats, carnivores, pangolins and hoofed mammals. Most of the mammals of the world, and of Pidwa.', [

    N('Euarchontoglires', 'Primates, rodents & hares', 'clade', 87,
      'A surprising group, again shown by DNA: monkeys are closer to squirrels and hares than to antelopes or dogs.', [
      N('Primates', 'Primates', 'order', 70,
        'Hands and feet that grasp, flat nails instead of claws, eyes facing forward to judge distances, a big brain and a long childhood. ' +
        'Two branches here: the "wet-nosed" galagos, close to the lemurs of Madagascar, and the monkeys, on our own side of the tree.', [
        N('Galagidae', 'Galagos (bushbabies)', 'family', null,
          'Small night primates of Africa. Huge eyes that shine in torchlight, big ears that fold away, long hind legs for leaps of several metres. ' +
          'They eat insects and tree gum, and mark their paths with urine rubbed on hands and feet. The wailing calls of the greater galago gave them their name.',
          ['Galago moholi', 'Otolemur crassicaudatus']),
        N('Cercopithecidae', 'Old World monkeys', 'family', 11,
          'A tail that never grasps, cheek pouches to stuff food away, hard sitting pads on the bottom. They live in troops with a strict ranking. ' +
          'Our closest relatives at Pidwa: their branch and that of the apes split about 30 million years ago.',
          ['Papio ursinus', 'Chlorocebus pygerythrus']),
      ]),
      N('Glires', 'Rodents & hares', 'clade', 82,
        'Gnawing front teeth that grow all life long and must be worn down by use.', [
        N('Lagomorpha', 'Hares & rabbits', 'order', null,
          'A second, small pair of upper incisors behind the first (rodents have one). They eat their own soft droppings to digest the grass a second time. ' +
          'Hares are born furred and eyes open in a simple scrape, ready to run; rabbits are born naked in burrows.', [
          N('Leporidae', 'Hares & rabbits', 'family', null, '', ['Lepus saxatilis'])]),
        N('Rodentia', 'Rodents', 'order', 70,
          'The largest order of mammals, some 2,500 species, four mammals in ten. One pair of incisors top and bottom, with enamel on the front only, so they wear to a chisel edge. ' +
          'Many more live at Pidwa than the three here: rats, mice, gerbils and dormice, mostly at night.', [
          N('Sciuridae', 'Squirrels', 'family', null,
            'Bushy tail, sharp claws, active by day. Tree squirrels mob snakes and birds of prey with loud chattering and tail flicks: a good alarm to follow.',
            ['Paraxerus cepapi']),
          N('Hystricognathi', 'Porcupines, cane rats & allies', 'clade', 40,
            'Rodents with a particular jaw: in Africa porcupines, cane rats and mole-rats; in South America guinea pigs and capybaras, whose ancestors crossed the young Atlantic from Africa, probably on rafts of vegetation, some 40 million years ago.', [
            N('Hystricidae', 'Old World porcupines', 'family', null,
              'Hairs turned into quills up to 50 cm long, loosely attached. A threatened porcupine raises them, rattles its hollow tail quills and runs backwards into the enemy; lions and leopards are sometimes badly hurt. ' +
              'Gnaws bones for calcium, and rings the bark of trees.', ['Hystrix africaeaustralis']),
            N('Thryonomyidae', 'Cane rats', 'family', null,
              'Two species of big grass-eating rodents, up to 5 kg, in reedbeds and tall grass near water. Thump the ground with their hind feet when alarmed.',
              ['Thryonomys swinderianus']),
          ]),
        ]),
      ]),
    ]),

    N('Laurasiatheria', 'Bats, carnivores & hoofed mammals', 'clade', 80,
      'The most varied branch of mammals, from 5-gram bats to the whales, which belong to it as well.', [
      N('Chiroptera', 'Bats', 'order', 60,
        'The only mammals that truly fly, on wings of skin stretched between very long fingers. About 1,500 species, one mammal in five. ' +
        'Two branches: the fruit bats, which mostly use eyes and smell, and the rest, which hunt insects by echolocation. Probably 25 to 35 species live around Pidwa.', [
        N('Pteropodidae', 'Fruit bats', 'family', null,
          'Big eyes, dog-like face, no echolocation by voice. They eat fruit and nectar, spread seeds and pollinate trees such as baobabs and sausage trees. ' +
          'Male epauletted fruit bats call all night with a ringing "ping" and show white tufts on their shoulders.', ['Epomophorus wahlbergi']),
        N('Emballonuridae', 'Sheath-tailed bats', 'family', null,
          'The tip of the tail pokes out of the skin between the legs. Fast fliers of the open air; by day they rest flat on tree trunks and walls, well camouflaged, and scuttle round when approached.',
          ['Taphozous mauritianus']),
      ]),
      N('Fereuungulata', 'Carnivores, pangolins & hoofed mammals', 'clade', 78, '', [
        N('Ferae', 'Carnivores & pangolins', 'clade', 70,
          'An odd couple shown by DNA: pangolins lost their teeth and grew scales, but share an ancestor with cats and dogs.', [
          N('Pholidota', 'Pangolins', 'order', null,
            'The only mammals covered in scales, made of keratin like our nails. No teeth: ants and termites are ground in a muscular stomach with swallowed grit. They roll into a ball. ' +
            'Eight species, the most trafficked mammals in the world; Temminck\'s is the only one in southern Africa.', [
            N('Manidae', 'Pangolins', 'family', null, '', ['Smutsia temminckii'])]),
          N('Carnivora', 'Carnivores', 'order', 50,
            'A pair of shearing cheek teeth, the carnassials, that slice meat like scissors. Not all eat only meat: the aardwolf eats termites, the honey badger nearly anything. ' +
            'Two branches: cat-like and dog-like.', [
            N('Feliformia', 'Cat-like carnivores', 'clade', 35,
              'Cats, genets, civets, mongooses and hyenas: a bony ear capsule divided in two chambers. Mostly in the Old World, and Africa has the richest set.', [
              N('Felidae', 'Cats', 'family', 11,
                'The most strictly meat-eating carnivores: short face, few teeth, claws that retract (only partly in the cheetah), a rasping tongue. They ambush or stalk. ' +
                'All 40 species are recent: the family spread in the last 11 million years. The big cats (lion, leopard) roar; the small ones purr.',
                ['Panthera leo', 'Panthera pardus', 'Acinonyx jubatus', 'Caracal caracal', 'Leptailurus serval', 'Felis lybica']),
              N('Viverroidea', 'Civets, genets, mongooses & hyenas', 'clade', 30,
                'Hyenas are closest to the mongooses, not to dogs, despite their looks.', [
                N('Viverridae', 'Civets & genets', 'family', null,
                  'Long body, short legs, long ringed tail, spotted coat; active at night. Glands under the tail make a musk once used in perfume. Civets drop their dung in latrines on paths, the "civetries".',
                  ['Civettictis civetta', 'Genetta tigrina', 'Genetta genetta']),
                N('Herpestoidea', 'Hyenas & mongooses', 'clade', 28, '', [
                  N('Hyaenidae', 'Hyenas', 'family', 10,
                    'Four species. Front legs longer than hind legs, powerful jaws and bone-cracking teeth: a spotted hyena digests bone, and its droppings turn white. ' +
                    'The aardwolf is the odd one: a hyena with tiny teeth that eats only termites, up to 300,000 in a night.',
                    ['Proteles cristatus', 'Crocuta crocuta', 'Parahyaena brunnea']),
                  N('Herpestidae', 'Mongooses', 'family', null,
                    'Small, quick hunters of insects, rodents, eggs and snakes, partly resistant to snake venom. Some live alone (slender, white-tailed, water mongoose), ' +
                    'others in noisy groups (banded, dwarf) that guard and babysit the young together.',
                    ['Mungos mungo', 'Helogale parvula', 'Herpestes sanguineus', 'Atilax paludinosus', 'Ichneumia albicauda']),
                ]),
              ]),
            ]),
            N('Caniformia', 'Dog-like carnivores', 'clade', 45,
              'Dogs, and on the other side bears, seals, weasels and otters.', [
              N('Canidae', 'Dogs & jackals', 'family', null,
                'Long legs for running far, claws that do not retract, a long muzzle and a keen nose. Wild dogs are the most social, hunting in packs and feeding the pups by regurgitation; jackals live in pairs for life.',
                ['Lycaon pictus', 'Lupulella mesomelas', 'Lupulella adusta']),
              N('Mustelidae', 'Weasels, otters & badgers', 'family', null,
                'Long body, short legs, strong scent glands; the largest family of carnivores, about 60 species. The honey badger has thick loose skin and fears nothing; ' +
                'the clawless otter has hands without claws, to feel for crabs and frogs under stones.',
                ['Mellivora capensis', 'Aonyx capensis']),
            ]),
          ]),
        ]),
        N('Euungulata', 'Hoofed mammals', 'clade', 75,
          'They walk on the tips of their toes, protected by hooves. Two orders that went separate ways early: the odd-toed and the even-toed.', [
          N('Perissodactyla', 'Odd-toed hoofed mammals', 'order', 56,
            'The weight rests on the middle toe. Only 17 species are left: horses and zebras, rhinos, tapirs. They digest grass in a large hind gut, less thoroughly than cattle, so they eat more of it.', [
            N('Equidae', 'Horses & zebras', 'family', null,
              'A single toe on each foot. The stripes of zebras seem to put off biting flies. Plains zebras often travel with wildebeest.', ['Equus quagga']),
            N('Rhinocerotidae', 'Rhinos', 'family', null,
              'Horns of keratin, like hair and nails, on the nose. Five species, all hunted for their horn. The white rhino grazes with a wide square lip; the black rhino browses with a pointed, hooked one.',
              ['Ceratotherium simum', 'Diceros bicornis']),
          ]),
          N('Artiodactyla', 'Even-toed hoofed mammals', 'order', 62,
            'The weight rests between the third and fourth toes: a cloven hoof. An ankle bone with a pulley at both ends marks them all, and the whales descend from them.', [
            N('Suidae', 'Pigs', 'family', null,
              'A mobile snout ending in a disc, for digging; canines grown into tusks that curve up. Warthogs kneel to graze and run with their tails straight up; bushpigs live in groups and come out at night.',
              ['Phacochoerus africanus', 'Potamochoerus larvatus']),
            N('Cetruminantia', 'Hippos, whales & ruminants', 'clade', 60, '', [
              N('Hippopotamidae', 'Hippos', 'family', null,
                'The closest living relatives of the whales. They spend the day in water and graze at night, sometimes kilometres away. Their skin oozes a reddish fluid that protects from the sun. ' +
                'They do not really swim: they walk or bounce along the bottom.', ['Hippopotamus amphibius']),
              N('Pecora', 'Horned ruminants', 'clade', 25,
                'Ruminants with horns: a four-chambered stomach, chewing the cud, and a hard pad in place of upper front teeth.', [
                N('Giraffidae', 'Giraffes', 'family', null,
                  'Giraffes and the okapi: horns ("ossicones") covered in skin. The same seven neck vertebrae as us, each up to 25 cm long; a huge heart pushes the blood up two metres to the brain.',
                  ['Giraffa giraffa']),
                N('Bovidae', 'Antelopes & buffalo', 'family', 18,
                  'Horns that are never shed: a bony core in a sheath of keratin. About 140 species, most of them in Africa. Two branches: buffaloes and spiral-horned antelopes, and all the other antelopes.', [
                  N('Bovinae', 'Buffalo & spiral-horned antelopes', 'subfamily', null,
                    'Buffaloes and cattle, and the spiral-horned antelopes (kudu, nyala, bushbuck, eland): twisted horns, white stripes and spots, mostly browsers.',
                    ['Syncerus caffer', 'Taurotragus oryx', 'Tragelaphus strepsiceros', 'Tragelaphus angasii', 'Tragelaphus sylvaticus']),
                  N('Antilopinae', 'Other antelopes', 'subfamily', null,
                    'Grazers like the wildebeest and tsessebe, the waterbuck and reedbucks near water, the sable, and the small ones: duiker, steenbok, grysbok, klipspringer. The impala is alone in its own tribe.', [
                    N('Alcelaphini', 'Wildebeest & tsessebe', 'tribe', null,
                      'Long face, high shoulders and a back sloping down to the rump: grazers built for long trips at a canter.', ['Connochaetes taurinus', 'Damaliscus lunatus']),
                    N('Hippotragini', 'Horse antelopes', 'tribe', null,
                      'Big antelopes with long, curved horns in both sexes and bold face masks: sable, roan, oryx.', ['Hippotragus niger']),
                    N('Reduncini', 'Waterbuck & reedbucks', 'tribe', null,
                      'Antelopes of wet ground and tall grass; only the males have horns, curved forward.', ['Kobus ellipsiprymnus', 'Redunca arundinum']),
                    N('Aepycerotini', 'Impala', 'tribe', null,
                      'One species in its own tribe. Black tufts above the hind hooves; a herd in alarm explodes in high leaps.', ['Aepyceros melampus']),
                    N('Cephalophini', 'Duikers', 'tribe', null,
                      'Small, shy antelopes with short spiky horns; "duiker" is Afrikaans for "diver", for the way they dive into cover.', ['Sylvicapra grimmia']),
                    N('Oreotragini', 'Klipspringer', 'tribe', null,
                      'Stands on the tips of its rubbery, cylindrical hooves, like a ballerina, and jumps from rock to rock.', ['Oreotragus oreotragus']),
                    N('Raphicerini', 'Steenbok & grysboks', 'tribe', null,
                      'Small antelopes that live alone or in pairs and lie still when danger comes, then bolt.', ['Raphicerus campestris', 'Raphicerus sharpei']),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ]),
]);

export const MAMMAL_TREE_SOURCES = [
  'Upham, Esselstyn & Jetz 2019. Inferring the mammal tree. PLoS Biology 17: e3000494',
  'Kumar et al. 2022. TimeTree 5. Molecular Biology and Evolution 39: msac174 (timetree.org)',
  'Mammal Diversity Database (mammaldiversity.org)',
];
