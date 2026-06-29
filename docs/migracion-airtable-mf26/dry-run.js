// Dry-run: arma los patches sin escribir nada.
// Match por startup_name. Solo llena campos vacíos. Skip campos inexistentes.
require('dotenv').config({ path: '.env.local' });
const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT })
  .base(process.env.AIRTABLE_BASE_ID);

// Fuente: 8 filas extraídas del CSV original (mojibake ya limpio en lectura).
const SOURCE = [
  { name: 'Kawesqar Travels / Intelligence Hub', startupId: 'recl2pTOqJwQDxzmj',
    website: 'www.kawesqartravels.com', country: 'Chile (CL)', verticals: 'TravelTech',
    roundTickets: '1200000', roundStage: 'Seed', roundAmount: 1200000,
    pitch: 'Infraestructura tecnológica triple stack para la Patagonia que combina sensores de biodiversidad, blockchain y turismo de ultralujo para créditos de carbono.',
    mrr: 0, sales12m: 6000000, valuation: null,
    deck: 'https://docs.google.com/document/d/1SlPe9thcbIpBuN0l--gbGLgPvt-5V2H8neQHTkIiD4M/edit',
    founder: { first: 'Miguel Ángel', last: 'Valdés', email: 'kawesqar.travel@gmail.com' },
  },
  { name: 'PIXLAB CLASS', startupId: 'reca4xbmMQAHCQasL',
    website: 'https://www.pixlabclass.com/', country: 'Costa Rica (CO)', verticals: 'EdTech',
    roundAmount: 1000000,
    pitch: 'Startup rentable que ofrece tecnología aplicada al sistema educativo y/o creativo con facturación anual cercana a US$400k.',
    mrr: 33333, sales12m: null, valuation: null,
    deck: 'https://docs.google.com/document/d/1dTGCqv9McdDmbu6ME8RDObuQ9i0motlbckHoO0-he1k/edit',
    founder: { first: 'Xavier Alejandro', last: 'Rubio', email: 'xavier@pixdea.com' },
  },
  { name: 'Maity', startupId: 'recskoKoXauXAXJeg',
    website: 'maity.cloud', country: 'Mexico (MX)', verticals: 'EdTech,HRTech',
    roundAmount: 100000,
    pitch: null, mrr: null, sales12m: null, valuation: null,
    deck: 'https://docs.google.com/document/d/1zb1b-iiAI9k1DbUm9JVvRT_mhUNUQ09gOZGv-7v-LV4/edit',
    founder: { first: 'Alfonso', last: 'Robles', email: 'direccion@maity.cloud' },
  },
  { name: 'Zeii', startupId: 'rec4Vxld2XgNEfdgi',
    website: 'Https://zeii.com', country: 'Uruguay (UY)', verticals: 'Other',
    roundTickets: '200000', roundAmount: 200000,
    pitch: 'Startup con MVP para gestionar datos de microemprendimientos, seleccionada por IC Ventures para un desafío de IA.',
    mrr: 0, sales12m: null, valuation: null,
    deck: 'https://docs.google.com/document/d/10C4xfqLrink5OGru7IhIlv-LYkh37JtrigHe4H6hZOI/edit',
    founder: { first: 'Leonardo', last: 'Arroyo', email: 'leonardo.arroyo@zeii.com' },
  },
  { name: 'LEAF', startupId: 'recftnlzi1BfkwvY6',
    website: 'https://leaf-si.com', country: 'Argentina (AR)', verticals: 'ClimaTech',
    roundAmount: 500,
    pitch: null, mrr: null, sales12m: null, valuation: null,
    deck: null,
    founder: { first: 'Ignacio', last: 'Barutta', email: 'ibarutta@leaf-si.com' },
  },
  { name: 'Aventia Solutions', startupId: 'recbGAU4iuqJWUWvg',
    website: 'www.aventiasolutions.com', country: 'Chile (CL)', verticals: 'HealthTech',
    roundAmount: 300000,
    pitch: null, mrr: null, sales12m: null, valuation: null,
    deck: null,
    founder: { first: 'Patricio', last: 'Duran', email: 'patricio@aventiasolutions.com' },
  },
  { name: 'Finsphera', startupId: 'recAFuBPuirWpGxRU',
    website: 'https://www.finsphera.ai/', country: 'Mexico (MX)', verticals: 'FinTech,CleanTech',
    roundAmount: 10000000,
    pitch: null, mrr: null, sales12m: null, valuation: null,
    deck: null,
    founder: { first: 'Mario Adrian', last: 'Cruz Espindola', email: 'adrian@finsphera.com' },
  },
  { name: 'Antü', startupId: 'rec8rMr8fr6yWLDMs',
    website: 'www.antuenergia.cl', country: 'Chile (CL)', verticals: 'EnergyTech,ClimaTech',
    roundAmount: 2,
    pitch: 'Fintech de condominio solar que permite copropiedad de paneles solares y generó 220 millones en ingresos el último año.',
    mrr: 18333, sales12m: 5000000, valuation: null,
    deck: 'https://docs.google.com/document/d/1nADyIZ4mev2koLII9F5b26U7r7w9n0Jjwok4FQc2XMA/edit',
    founder: { first: 'Manuel', last: 'Mata', email: 'manuel.mata@antuenergia.cl' },
  },
];

// Mapeo de fuente → campo destino en Startups MF26
const startupFieldMap = {
  website: 'startup_website',
  country: 'startup_country_ops',
  verticals: 'startup_industries',
  pitch: 'startup_description',
  mrr: 'startup_mrr',
  sales12m: 'startup_sales_12m',
  valuation: 'startup_valuation',
  roundAmount: 'round_size',
  roundStage: 'round_series',
  roundTickets: 'round_tickets',
  deck: 'deck_url',
};
const founderFieldMap = {
  first: 'first_name',
  last: 'last_name',
  email: 'email',
};

function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

(async () => {
  const report = [];
  for (const src of SOURCE) {
    const startup = await base('Startups MF26').find(src.startupId);
    const founderIds = startup.fields['Founders'] || [];
    // Match founder by email entre los linkados
    let founder = null;
    for (const fid of founderIds) {
      const f = await base('Founders MF26').find(fid);
      if ((f.fields.email || '').toLowerCase() === src.founder.email.toLowerCase()) {
        founder = f; break;
      }
    }
    if (!founder && founderIds.length === 1) {
      // Si solo hay 1 founder linkado, asumimos que es ese
      founder = await base('Founders MF26').find(founderIds[0]);
    }

    const startupPatch = {};
    for (const [srcKey, dstField] of Object.entries(startupFieldMap)) {
      const newVal = src[srcKey];
      if (isEmpty(newVal)) continue;
      if (!isEmpty(startup.fields[dstField])) continue; // Solo llena vacíos
      startupPatch[dstField] = newVal;
    }

    const founderPatch = {};
    if (founder) {
      for (const [srcKey, dstField] of Object.entries(founderFieldMap)) {
        const newVal = src.founder[srcKey];
        if (isEmpty(newVal)) continue;
        if (!isEmpty(founder.fields[dstField])) continue;
        founderPatch[dstField] = newVal;
      }
    }

    report.push({
      name: src.name,
      startupId: startup.id,
      startupPatch,
      founderId: founder ? founder.id : null,
      founderEmailFound: founder ? founder.fields.email : null,
      founderPatch,
    });
  }

  fs.writeFileSync(
    path.join(__dirname, 'dry-run-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n=== DRY-RUN REPORT ===');
  for (const r of report) {
    const sKeys = Object.keys(r.startupPatch);
    const fKeys = Object.keys(r.founderPatch);
    console.log(`\n• ${r.name} (${r.startupId})`);
    if (sKeys.length === 0) console.log('   Startup: (sin cambios — todo ya tiene valor o fuente vacía)');
    else sKeys.forEach(k => console.log(`   Startup.${k} ← ${JSON.stringify(r.startupPatch[k]).slice(0,100)}`));
    if (!r.founderId) {
      console.log('   Founder: NO ENCONTRADO');
    } else if (fKeys.length === 0) {
      console.log(`   Founder ${r.founderEmailFound} (${r.founderId}): sin cambios`);
    } else {
      console.log(`   Founder ${r.founderEmailFound} (${r.founderId}):`);
      fKeys.forEach(k => console.log(`     .${k} ← ${JSON.stringify(r.founderPatch[k])}`));
    }
  }
  console.log('\nReport saved to docs/migracion-airtable-mf26/dry-run-report.json');
})().catch(e => { console.error(e); process.exit(1); });
