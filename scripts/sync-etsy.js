const fs = require('fs');
const path = require('path');

const ETSY_API_KEY = process.env.ETSY_API_KEY ? process.env.ETSY_API_KEY.trim() : '';
const ETSY_SHARED_SECRET = process.env.ETSY_SHARED_SECRET ? process.env.ETSY_SHARED_SECRET.trim() : '';
const ETSY_SHOP_ID = process.env.ETSY_SHOP_ID ? process.env.ETSY_SHOP_ID.trim() : '';
const MERCH_FILE = path.join(__dirname, '../data/merch.json');

// Exact display order matching your updated Etsy arrangement
const FEATURED_ORDER = [
  "Shuck Around and Find Out T-shirt",
  "Women's Ideal Racerback Tank - Shuck",
  "Unisex Shuck Around and Find Out Hoo",
  "The Damp Clam Trucker Mesh Hat",
  "The Damp Clam ceramic coaster",
  "The Damp Clam Poker Playing Cards",
  "The Damp Clam Signature Shell Bikini",
  "Shucked daily, Loved nightly women's b",
  "The Damp Clam logo seashell, Swim Sh",
  "If you can read this, Take me to The Da",
  "Liquor Down Below Baseball Top",
  "The Damp Clam Sipper Glass, 16oz",
  "Spiral Notebook - Ruled Line",
  "The Damp Clam Phone Tough Cases"
];

async function syncMerch() {
  if (!ETSY_API_KEY || !ETSY_SHOP_ID) {
    console.error('Missing ETSY_API_KEY or ETSY_SHOP_ID secret.');
    process.exit(1);
  }

  const apiKeyHeader = ETSY_SHARED_SECRET 
    ? `${ETSY_API_KEY}:${ETSY_SHARED_SECRET}` 
    : ETSY_API_KEY;

  console.log(`Querying Etsy Open API v3 for Shop ID: ${ETSY_SHOP_ID}...`);
  const url = `https://openapi.etsy.com/v3/application/shops/${ETSY_SHOP_ID}/listings/active?limit=100`;
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKeyHeader,
        'Accept': 'application/json',
        'User-Agent': 'TheDampClamMenuSync/1.0'
      }
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Etsy API Error (${res.status} ${res.statusText}):\n${errorBody}`);
      process.exit(1);
    }

    const data = await res.json();
    const listings = data.results || [];
    console.log(`Found ${listings.length} active listings on Etsy.`);

    let items = listings.map(listing => {
      const priceAmount = listing.price ? (listing.price.amount / listing.price.divisor).toFixed(2) : '0.00';
      const cleanDesc = listing.description ? listing.description.split('\n')[0].replace(/[\r\n]+/g, ' ').trim() : '';

      return {
        name: listing.title,
        category: "Merchandise",
        desc: cleanDesc,
        price: `$${priceAmount}`,
        etsyUrl: listing.url,
        inStock: listing.state === 'active' && listing.quantity > 0
      };
    });

    // Sort strictly by the defined FEATURED_ORDER list
    items.sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();

      const aIndex = FEATURED_ORDER.findIndex(phrase => aName.includes(phrase.toLowerCase()));
      const bIndex = FEATURED_ORDER.findIndex(phrase => bName.includes(phrase.toLowerCase()));

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      return aName.localeCompare(bName);
    });

    const payload = { items };
    fs.writeFileSync(MERCH_FILE, JSON.stringify(payload, null, 2));
    console.log(`✓ Updated data/merch.json with ${items.length} items in specified order.`);
  } catch (err) {
    console.error('Fatal execution error:', err);
    process.exit(1);
  }
}

syncMerch();
