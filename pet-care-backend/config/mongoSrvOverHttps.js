const https = require('https');

/**
 * When mongodb+srv fails with querySrv ECONNREFUSED (common on Windows),
 * resolve SRV + TXT via HTTPS DNS (bypasses broken OS resolver for SRV).
 */

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: { accept: 'application/dns-json' },
        timeout: 12000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => {
          body += c;
        });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`DoH HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('DoH timeout'));
    });
  });
}

function dohUrl(name, type) {
  return `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
}

function parseSrvUri(uri) {
  if (!uri.startsWith('mongodb+srv://')) return null;
  let s = uri.slice('mongodb+srv://'.length);

  let user = '';
  let pass = '';
  if (s.includes('@')) {
    const at = s.indexOf('@');
    const ui = s.slice(0, at);
    s = s.slice(at + 1);
    const colon = ui.indexOf(':');
    if (colon === -1) {
      user = decodeURIComponent(ui);
    } else {
      user = decodeURIComponent(ui.slice(0, colon));
      pass = decodeURIComponent(ui.slice(colon + 1));
    }
  }

  let hostname = s;
  let path = '/';
  let query = '';

  const slash = hostname.indexOf('/');
  const qInHost = hostname.indexOf('?');
  if (slash !== -1 && (qInHost === -1 || slash < qInHost)) {
    path = hostname.slice(slash);
    hostname = hostname.slice(0, slash);
    const q = path.indexOf('?');
    if (q !== -1) {
      query = path.slice(q + 1);
      path = path.slice(0, q);
    }
  } else if (qInHost !== -1) {
    query = hostname.slice(qInHost + 1);
    hostname = hostname.slice(0, qInHost);
  }

  if (!path) path = '/';

  return { user, pass, hostname, path, query };
}

async function fetchSrv(hostname) {
  const name = `_mongodb._tcp.${hostname.replace(/\.$/, '')}`;
  const json = await httpsGetJson(dohUrl(name, 'SRV'));
  if (json.Status !== 0 || !Array.isArray(json.Answer)) return [];

  const out = [];
  for (const ans of json.Answer) {
    if (ans.type !== 33) continue;
    let raw = ans.data;
    if (raw && typeof raw === 'object' && raw.target) {
      raw = `${raw.priority} ${raw.weight} ${raw.port} ${raw.target}`;
    }
    const parts = String(raw).trim().split(/\s+/);
    if (parts.length < 4) continue;
    const priority = parseInt(parts[0], 10);
    const weight = parseInt(parts[1], 10);
    const port = parseInt(parts[2], 10);
    const target = parts.slice(3).join(' ').replace(/\.$/, '');
    if (!Number.isFinite(port) || !target) continue;
    out.push({ priority, weight, port, target });
  }
  out.sort((a, b) => a.priority - b.priority || b.weight - a.weight);
  return out;
}

async function fetchTxt(hostname) {
  const name = `_mongodb._tcp.${hostname.replace(/\.$/, '')}`;
  const json = await httpsGetJson(dohUrl(name, 'TXT'));
  if (json.Status !== 0 || !Array.isArray(json.Answer)) return '';

  const chunks = [];
  for (const ans of json.Answer) {
    if (ans.type !== 16) continue;
    let t = ans.data;
    if (Array.isArray(t)) {
      chunks.push(t.map((x) => String(x).replace(/^"(.*)"$/, '$1')).join(''));
      continue;
    }
    t = String(t);
    if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1);
    chunks.push(t);
  }
  return chunks.join('');
}

/**
 * @returns {Promise<string|null>} direct mongodb:// URI or null
 */
async function srvUriToDirectMongoUri(srvUri) {
  const parsed = parseSrvUri(srvUri);
  if (!parsed) return null;

  const { user, pass, hostname, path, query } = parsed;
  const srv = await fetchSrv(hostname);
  if (!srv.length) return null;

  const hosts = srv.map((r) => `${r.target}:${r.port}`).join(',');

  const params = new URLSearchParams(query);
  const txt = await fetchTxt(hostname);
  if (txt) {
    const fromTxt = new URLSearchParams(txt.replace(/^\?/, ''));
    for (const [k, v] of fromTxt.entries()) {
      if (!params.has(k)) params.set(k, v);
    }
  }

  if (![...params.keys()].some((k) => k.toLowerCase() === 'tls' || k.toLowerCase() === 'ssl')) {
    params.set('tls', 'true');
  }

  const qs = params.toString();
  const tail = qs ? `${path}?${qs}` : path;

  if (user) {
    const u = encodeURIComponent(user);
    const p = encodeURIComponent(pass || '');
    return `mongodb://${u}:${p}@${hosts}${tail}`;
  }

  return `mongodb://${hosts}${tail}`;
}

module.exports = { srvUriToDirectMongoUri, parseSrvUri };
