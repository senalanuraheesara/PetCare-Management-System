const dns = require('dns');
const mongoose = require('mongoose');
const { srvUriToDirectMongoUri } = require('./mongoSrvOverHttps');

const applySrvDnsWorkaround = (uri) => {
  if (!uri.startsWith('mongodb+srv://')) return;

  const useOsOnly =
    process.env.MONGO_USE_SYSTEM_DNS === '1' ||
    process.env.MONGO_USE_SYSTEM_DNS === 'true';

  if (useOsOnly) return;

  const custom = (process.env.MONGO_DNS_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (custom.length > 0) {
    dns.setServers(custom);
    return;
  }

  dns.setServers(['8.8.8.8', '8.8.4.4']);
};

function printAtlasSrvHints() {
  console.error(`
Atlas SRV DNS lookup failed (querySrv). This app will try HTTPS DNS (Cloudflare) next.
If that still fails:
  • VPN / firewall may block HTTPS to cloudflare-dns.com — try another network or set MONGO_SKIP_DOH_FALLBACK=1 and use Atlas "standard" mongodb:// string instead.
  • Atlas → Network Access must allow your IP.
`);
}

function printLocalMongoHints(uri) {
  console.error(`
Nothing is accepting connections on your MongoDB address (common for ${uri.includes('27017') ? 'port 27017' : 'this URI'}).

Try one of:
  1) Docker: from pet-care-backend run  npm run mongo:up   (or: docker compose up -d)
  2) Windows service: install MongoDB Community Server, then  net start MongoDB  (name may vary)
  3) Cloud: set MONGO_URI to your MongoDB Atlas connection string instead of localhost
`);
}

const connectDB = async () => {
  let uri = process.env.MONGO_URI?.trim();
  if (!uri) {
    console.error('MongoDB: MONGO_URI is missing. Set it in pet-care-backend/.env');
    process.exit(1);
  }

  if (uri.startsWith('MONGO_URI=')) {
    uri = uri.slice('MONGO_URI='.length).trim();
  }

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    console.error(
      'MongoDB: MONGO_URI must start with mongodb:// or mongodb+srv://\n' +
        'Check pet-care-backend/.env for a typo (e.g. MONGO_URI=MONGO_URI=...).'
    );
    process.exit(1);
  }

  const clientOptions = {
    serverSelectionTimeoutMS: 20000,
    family: 4,
  };

  const isQuerySrvFailure = (err) =>
    uri.startsWith('mongodb+srv://') &&
    (/querySrv|_mongodb\._tcp/i.test(err.message) || /querySrv/i.test(String(err.reason || '')));

  applySrvDnsWorkaround(uri);

  try {
    await mongoose.connect(uri, clientOptions);
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    return;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);

    const skipDoh =
      process.env.MONGO_SKIP_DOH_FALLBACK === '1' ||
      process.env.MONGO_SKIP_DOH_FALLBACK === 'true';

    if (!skipDoh && isQuerySrvFailure(error)) {
      try {
        console.warn('MongoDB: Resolving SRV via HTTPS DNS (Cloudflare DoH)...');
        const directUri = await srvUriToDirectMongoUri(uri);
        if (directUri) {
          await mongoose.disconnect().catch(() => {});
          await mongoose.connect(directUri, clientOptions);
          console.log(`MongoDB Connected: ${mongoose.connection.host} (SRV via HTTPS DNS)`);
          return;
        }
        console.error('MongoDB: HTTPS DNS fallback did not return any SRV targets.');
      } catch (dohErr) {
        console.error(`MongoDB: HTTPS DNS fallback failed: ${dohErr.message}`);
      }
    }

    if (isQuerySrvFailure(error)) {
      printAtlasSrvHints();
    }

    const isLocal =
      uri.includes('127.0.0.1') ||
      uri.includes('localhost') ||
      uri.includes('0.0.0.0');
    const refused =
      /ECONNREFUSED|ENOTFOUND/i.test(error.message) ||
      error.code === 'ECONNREFUSED';

    if (isLocal && refused) {
      printLocalMongoHints(uri);
    }

    process.exit(1);
  }
};

module.exports = connectDB;
