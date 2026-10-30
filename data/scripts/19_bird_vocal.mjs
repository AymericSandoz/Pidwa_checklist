// Step 19: how often a bird is heard, for the "Most heard" sort and the levels of the sound quiz; plus a few voice texts.
// "vocal" is hand-assessed from the voice notes (not measured): 3 loud and calls all the time, 2 regular (default),
// 1 quiet or mostly silent at Pidwa, 0 practically silent. The app multiplies it by the atlas rate.
import { readFileSync, writeFileSync } from 'node:fs';
const file = new URL('../../app/src/learn/birds.data.json', import.meta.url);
const birds = JSON.parse(readFileSync(file, 'utf8'));

const V3 = `dicrurus-adsimilis streptopelia-capicola halcyon-senegalensis dryoscopus-cubla tockus-leucomelas turtur-chalcospilos crinifer-concolor batis-molitor spilopelia-senegalensis pternistis-natalensis oriolus-larvatus halcyon-albiventris tockus-rufirostris vanellus-armatus cisticola-chiniana turdoides-jardineii ortygornis-sephaena chrysococcyx-caprius cercotrichas-leucophrys prinia-subflava merops-apiaster trachyphonus-vaillantii malaconotus-blanchoti bostrychia-hagedash lophoceros-nasutus lybius-torquatus numida-meleagris chlorophoneus-sulfureopectus haliaeetus-vocifer centropus-burchellii phoeniculus-purpureus tchagra-australis tchagra-senegalus terpsiphone-viridis nilaus-afer streptopelia-semitorquata burhinus-vermiculatus burhinus-capensis cuculus-solitarius cuculus-clamosus clamator-jacobinus chrysococcyx-klaas pternistis-swainsonii caprimulgus-pectoralis glaucidium-perlatum pogoniulus-chrysoconus otus-senegalensis pycnonotus-tricolor cossypha-heuglini andropadus-importunus laniarius-ferrugineus bucorvus-leadbeateri calamonastes-stierlingi sylvietta-rufescens gallirex-porphyreolophus lophotis-ruficrista dendrocygna-viduata`.split(' ');
const V1 = `hirundo-rustica lanius-collurio lanius-minor coracias-garrulus muscicapa-striata buteo-buteo terathopius-ecaudatus circaetus-cinereus circaetus-pectoralis aquila-rapax aquila-spilogaster polemaetus-bellicosus polyboroides-typus milvus-aegyptius falco-amurensis falco-peregrinus falco-subbuteo accipiter-badius accipiter-minullus micronisus-gabar clanga-pomarina elanus-caeruleus ardea-cinerea ardea-purpurea ardea-goliath ardeola-ralloides melaenornis-pammelaina agricola-pallidus merops-pusillus corythornis-cristatus ispidina-picta apus-caffer caprimulgus-europaeus cinnyricinclus-leucogaster hedydipna-collaris campephaga-flava ceblepyris-pectoralis anthoscopus-caroli oriolus-oriolus pytilia-melba lagonosticta-senegala kaupifalco-monogrammicus melierax-metabates`.split(' ');
const V0 = `gyps-africanus gyps-coprotheres necrosyrtes-monachus torgos-tracheliotos trigonoceps-occipitalis mycteria-ibis ciconia-nigra ciconia-ciconia ciconia-microscelis ciconia-abdimii leptoptilos-crumenifer ephippiorhynchus-senegalensis anastomus-lamelligerus platalea-alba anhinga-rufa ardea-alba egretta-garzetta bubulcus-ibis microcarbo-africanus sarkidiornis-melanotos plectropterus-gambensis butorides-striata ixobrychus-sturmii rostratula-benghalensis netta-erythrophthalma`.split(' ');

const byId = new Map(birds.map((b) => [b.id, b]));
for (const id of [...V3, ...V1, ...V0]) if (!byId.has(id)) throw new Error('unknown bird ' + id);
for (const b of birds) b.vocal = V3.includes(b.id) ? 3 : V1.includes(b.id) ? 1 : V0.includes(b.id) ? 0 : 2;

// sayings confirmed in a source; added once (the sources are appended to the species' list)
const add = (id, text, src) => {
  const b = byId.get(id);
  if (!b.voice.includes(text)) b.voice += ' ' + text;
  if (!b.sources.includes(src)) b.sources.push(src);
};
add('turtur-chalcospilos', 'Sometimes heard as “My mother is dead… dead… another… brother is dead, oh boohoohohoho!”', 'https://www.mpalalive.org/field_guide/view/emerald-spotted-wood-dove');
add('bucorvus-leadbeateri', 'An old edition of Roberts gives an indigenous reading of the duet: she says “I\'m going, I\'m going, I\'m going home to my relations”, he answers “You can go, you can go, you can go home to your relations!”', 'https://mostlybirding.com/2015/09/30/southern-ground-hornbil/');
for (const id of ['hedydipna-collaris', 'chlorocichla-flaviventris']) byId.get(id).voice = byId.get(id).voice.replace(/; no widely used mnemonic/, '');

writeFileSync(file, JSON.stringify(birds, null, 2) + '\n');
