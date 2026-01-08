import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

interface Partner {
  id: string;
  name: string;
  wallet_address: string;
  tier: string;
  twitter?: string;
  website?: string;
  description?: string;
  revenue_share: number;
  total_earnings: number;
  total_volume: number;
  status: string;
  created_at: string;
}

interface Earning {
  id: string;
  partner_id: string;
  amount_ustx: number;
  endpoint: string;
  tx_id?: string;
  timestamp: string;
}

const app = new Hono<{ Bindings: Bindings }>();
app.use('*', cors());

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// Format STX from microSTX
const formatSTX = (ustx: number) => (ustx / 1_000_000).toFixed(6);

// Partner tiers with colors
const TIERS: Record<string, { label: string; color: string; badge: string }> = {
  defi: { label: 'DeFi Protocol', color: '#8b5cf6', badge: '🏦' },
  ai: { label: 'AI Agent', color: '#06b6d4', badge: '🤖' },
  infra: { label: 'Infrastructure', color: '#f59e0b', badge: '🔧' },
  security: { label: 'Security', color: '#ef4444', badge: '🛡️' },
  builder: { label: 'Builder', color: '#10b981', badge: '👷' },
  exchange: { label: 'Exchange', color: '#3b82f6', badge: '📊' },
};

// Priority targets: AI inference, verification, trust, content gen, tooling
// Filtered to services providing proprietary data, heavy compute, or gated APIs
const PROSPECTS = [
  // AI Agents & Inference (6)
  { name: 'HeyElsa AI', twitter: 'HeyElsaAI', tier: 'ai', desc: 'Crypto AI agent - autonomous payments + thesis exploration' },
  { name: 'Daydreams', twitter: 'daydreamsagents', tier: 'ai', desc: 'Autonomous agents - omnichain AI inference on x402 rails' },
  { name: 'Heurist AI', twitter: 'heurist_ai', tier: 'ai', desc: 'ZK-secured AI infrastructure - pay-per-use inference' },
  { name: 'Gaianet AI', twitter: 'Gaianet_AI', tier: 'ai', desc: 'Decentralized AI nodes - self-hosted x402 facilitators' },
  { name: 'CreatorBuddy', twitter: 'CreatorBuddyX', tier: 'ai', desc: 'AI content generation - viral post creation endpoints' },
  { name: 'Dexter AI', twitter: 'dexteraisol', tier: 'ai', desc: 'x402 agents + SDK - cross-chain bridging automation' },
  // Security & Trust (2)
  { name: 'Zauth', twitter: 'zauthx402', tier: 'security', desc: 'Trust infrastructure - endpoint verification for agents' },
  { name: 'Cybercentry', twitter: 'cybercentry', tier: 'security', desc: 'Security verification - low-cost scans via micropayments' },
  // Infrastructure & Tooling (5)
  { name: 'Bluepay x402', twitter: 'bluepayx402', tier: 'infra', desc: 'Machine commerce builder - instant sBTC settlements' },
  { name: 'rawgroundbeef', twitter: 'rawgroundbeef', tier: 'builder', desc: 'openfacilitator + x402jobs - non-custodial micropayments' },
  { name: 'Noble', twitter: 'noble_xyz', tier: 'infra', desc: 'Stablecoin issuer - x402 micropayments + volume growth' },
  { name: 'Cashie CARV', twitter: 'CashieCARV', tier: 'infra', desc: 'Giveaway + payment tool - ERC-8004 reward distribution' },
  { name: 'Cronos', twitter: 'cronos_chain', tier: 'infra', desc: 'x402 hackathon host - driving cross-chain adoption' },
];

// ==================== HTML TEMPLATES ====================

const baseStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0a1628 100%);
    color: #e0e0e0;
    min-height: 100vh;
  }
  .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
  .header {
    text-align: center;
    padding: 60px 20px 40px;
    background: radial-gradient(ellipse at top, rgba(139, 92, 246, 0.15) 0%, transparent 60%);
  }
  .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
  .header p { color: #a0a0a0; font-size: 1.1rem; }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin: 30px 0;
  }
  .stat-card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  }
  .stat-value { font-size: 2rem; font-weight: bold; color: #8b5cf6; }
  .stat-label { color: #888; font-size: 0.9rem; margin-top: 5px; }
  .card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
  }
  .card h2 { margin-bottom: 20px; color: #fff; }
  .btn {
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
  }
  .btn:hover { opacity: 0.9; }
  .btn-secondary {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
  }
  input, select, textarea {
    width: 100%;
    padding: 12px;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px;
    color: #fff;
    font-size: 1rem;
    margin-bottom: 15px;
  }
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #8b5cf6;
  }
  label { display: block; margin-bottom: 5px; color: #aaa; font-size: 0.9rem; }
  .partner-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }
  .partner-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s;
  }
  .partner-card:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(139, 92, 246, 0.3);
  }
  .partner-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .partner-badge { font-size: 1.5rem; }
  .partner-name { font-size: 1.1rem; font-weight: 600; }
  .partner-tier {
    font-size: 0.75rem;
    padding: 3px 8px;
    border-radius: 4px;
    margin-left: auto;
  }
  .partner-desc { color: #888; font-size: 0.9rem; margin-bottom: 12px; }
  .partner-stats { display: flex; gap: 20px; font-size: 0.85rem; color: #666; }
  .earnings-table {
    width: 100%;
    border-collapse: collapse;
  }
  .earnings-table th, .earnings-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .earnings-table th { color: #888; font-weight: 500; }
  .nav {
    display: flex;
    gap: 20px;
    padding: 20px;
    background: rgba(0,0,0,0.3);
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .nav a { color: #aaa; text-decoration: none; }
  .nav a:hover { color: #fff; }
  .prospect-card {
    background: rgba(255,255,255,0.02);
    border: 1px dashed rgba(255,255,255,0.15);
    border-radius: 12px;
    padding: 16px;
    opacity: 0.7;
  }
  .prospect-card:hover { opacity: 1; border-style: solid; }
  .success { color: #10b981; }
  .error { color: #ef4444; }
  .tab-nav { display: flex; gap: 10px; margin-bottom: 20px; }
  .tab-btn {
    padding: 10px 20px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: #aaa;
    cursor: pointer;
  }
  .tab-btn.active { background: #8b5cf6; color: white; border-color: #8b5cf6; }
`;

const renderPage = (title: string, content: string, nav = true) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | x402 Partners</title>
  <style>${baseStyles}</style>
</head>
<body>
  ${nav ? `
  <nav class="nav">
    <a href="/"><strong>x402 Partners</strong></a>
    <a href="/">Home</a>
    <a href="/onboard">Join Program</a>
    <a href="/leaderboard">Leaderboard</a>
    <a href="/admin">Admin</a>
  </nav>
  ` : ''}
  ${content}
</body>
</html>
`;

// ==================== ROUTES ====================

// Landing page
app.get('/', async (c) => {
  const partners = await c.env.DB.prepare(
    'SELECT * FROM partners WHERE status = ? ORDER BY total_earnings DESC'
  ).bind('active').all<Partner>();

  const totalEarnings = partners.results?.reduce((sum, p) => sum + p.total_earnings, 0) || 0;
  const totalVolume = partners.results?.reduce((sum, p) => sum + p.total_volume, 0) || 0;
  const activePartners = partners.results?.length || 0;

  const partnerCards = partners.results?.map(p => {
    const tier = TIERS[p.tier] || TIERS.builder;
    return `
      <a href="/partners/${p.id}" class="partner-card" style="text-decoration: none; color: inherit;">
        <div class="partner-header">
          <span class="partner-badge">${tier.badge}</span>
          <span class="partner-name">${p.name}</span>
          <span class="partner-tier" style="background: ${tier.color}20; color: ${tier.color}">${tier.label}</span>
        </div>
        <div class="partner-desc">${p.description || 'x402 ecosystem partner'}</div>
        <div class="partner-stats">
          <span>Earned: ${formatSTX(p.total_earnings)} STX</span>
          <span>Volume: ${formatSTX(p.total_volume)} STX</span>
        </div>
      </a>
    `;
  }).join('') || '';

  const prospectCards = PROSPECTS.slice(0, 12).map(p => {
    const tier = TIERS[p.tier] || TIERS.builder;
    return `
      <div class="prospect-card">
        <div class="partner-header">
          <span class="partner-badge">${tier.badge}</span>
          <span class="partner-name">${p.name}</span>
          <span class="partner-tier" style="background: ${tier.color}20; color: ${tier.color}">${tier.label}</span>
        </div>
        <div class="partner-desc">${p.desc}</div>
        <div class="partner-stats">
          <span>@${p.twitter}</span>
          <a href="/onboard?name=${encodeURIComponent(p.name)}&twitter=${p.twitter}&tier=${p.tier}" class="btn" style="padding: 6px 12px; font-size: 0.8rem; margin-left: auto;">Onboard</a>
        </div>
      </div>
    `;
  }).join('');

  const html = renderPage('Partner Program', `
    <div class="header">
      <h1>x402 Partner Program</h1>
      <p>Earn sBTC/STX by integrating x402 endpoints. Code as BD.</p>
    </div>

    <div class="container">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${activePartners}</div>
          <div class="stat-label">Active Partners</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatSTX(totalEarnings)}</div>
          <div class="stat-label">Total Earned (STX)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatSTX(totalVolume)}</div>
          <div class="stat-label">Total Volume (STX)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${PROSPECTS.length}</div>
          <div class="stat-label">Target Partners</div>
        </div>
      </div>

      ${activePartners > 0 ? `
      <div class="card">
        <h2>Active Partners</h2>
        <div class="partner-grid">${partnerCards}</div>
      </div>
      ` : ''}

      <div class="card">
        <h2>Partner Pipeline</h2>
        <p style="color: #888; margin-bottom: 20px;">Target partners for x402 integration. Click "Onboard" to set them up.</p>
        <div class="partner-grid">${prospectCards}</div>
      </div>

      <div class="card" style="text-align: center;">
        <h2>Want to Join?</h2>
        <p style="color: #888; margin-bottom: 20px;">Set up your wallet and start earning from x402 payments today.</p>
        <a href="/onboard" class="btn">Join Partner Program</a>
      </div>
    </div>
  `);

  return c.html(html);
});

// Onboard form
app.get('/onboard', async (c) => {
  const prefill = {
    name: c.req.query('name') || '',
    twitter: c.req.query('twitter') || '',
    tier: c.req.query('tier') || 'builder',
  };

  const tierOptions = Object.entries(TIERS).map(([key, val]) =>
    `<option value="${key}" ${prefill.tier === key ? 'selected' : ''}>${val.badge} ${val.label}</option>`
  ).join('');

  const html = renderPage('Join Program', `
    <div class="header">
      <h1>Join x402 Partners</h1>
      <p>Set up your wallet and start earning from ecosystem payments</p>
    </div>

    <div class="container">
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <h2>Partner Registration</h2>
        <form action="/api/partners" method="POST" id="onboard-form">
          <label>Partner Name *</label>
          <input type="text" name="name" value="${prefill.name}" placeholder="Your project or company name" required />

          <label>STX Wallet Address *</label>
          <input type="text" name="wallet_address" placeholder="SP... or SM..." required pattern="^S[PM][A-Z0-9]{38,40}$" />

          <label>Partner Tier</label>
          <select name="tier">${tierOptions}</select>

          <label>Twitter Handle</label>
          <input type="text" name="twitter" value="${prefill.twitter}" placeholder="@handle (without @)" />

          <label>Website</label>
          <input type="url" name="website" placeholder="https://..." />

          <label>Description</label>
          <textarea name="description" rows="3" placeholder="Brief description of your project and how you'll use x402"></textarea>

          <label>Revenue Share % (default 10%)</label>
          <input type="number" name="revenue_share" value="10" min="1" max="50" />

          <button type="submit" class="btn" style="width: 100%; margin-top: 10px;">Register Partner</button>
        </form>

        <div id="result" style="margin-top: 20px;"></div>
      </div>
    </div>

    <script>
      document.getElementById('onboard-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const data = Object.fromEntries(new FormData(form));

        try {
          const res = await fetch('/api/partners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          const result = await res.json();

          if (result.success) {
            document.getElementById('result').innerHTML =
              '<p class="success">Partner registered! Redirecting to dashboard...</p>';
            setTimeout(() => window.location.href = '/partners/' + result.partner.id, 1500);
          } else {
            document.getElementById('result').innerHTML =
              '<p class="error">Error: ' + result.error + '</p>';
          }
        } catch (err) {
          document.getElementById('result').innerHTML =
            '<p class="error">Error: ' + err.message + '</p>';
        }
      });
    </script>
  `);

  return c.html(html);
});

// Partner dashboard
app.get('/partners/:id', async (c) => {
  const id = c.req.param('id');

  const partner = await c.env.DB.prepare(
    'SELECT * FROM partners WHERE id = ?'
  ).bind(id).first<Partner>();

  if (!partner) {
    return c.html(renderPage('Not Found', `
      <div class="container" style="text-align: center; padding: 100px 20px;">
        <h1>Partner Not Found</h1>
        <p style="color: #888;">This partner doesn't exist or has been removed.</p>
        <a href="/" class="btn" style="margin-top: 20px;">Back to Home</a>
      </div>
    `));
  }

  const earnings = await c.env.DB.prepare(
    'SELECT * FROM earnings WHERE partner_id = ? ORDER BY timestamp DESC LIMIT 50'
  ).bind(id).all<Earning>();

  const endpoints = await c.env.DB.prepare(
    'SELECT * FROM partner_endpoints WHERE partner_id = ? ORDER BY created_at DESC'
  ).bind(id).all();

  const tier = TIERS[partner.tier] || TIERS.builder;

  const earningsRows = earnings.results?.map(e => `
    <tr>
      <td>${new Date(e.timestamp).toLocaleString()}</td>
      <td>${e.endpoint || '-'}</td>
      <td>${formatSTX(e.amount_ustx)} STX</td>
      <td>${e.tx_id ? `<a href="https://explorer.hiro.so/txid/${e.tx_id}" target="_blank" style="color: #8b5cf6;">${e.tx_id.slice(0,8)}...</a>` : '-'}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" style="text-align: center; color: #666;">No earnings yet</td></tr>';

  const html = renderPage(partner.name, `
    <div class="header">
      <div style="font-size: 3rem; margin-bottom: 10px;">${tier.badge}</div>
      <h1>${partner.name}</h1>
      <p style="color: ${tier.color}">${tier.label}</p>
    </div>

    <div class="container">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${formatSTX(partner.total_earnings)}</div>
          <div class="stat-label">Total Earned (STX)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatSTX(partner.total_volume)}</div>
          <div class="stat-label">Total Volume (STX)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${partner.revenue_share}%</div>
          <div class="stat-label">Revenue Share</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${endpoints.results?.length || 0}</div>
          <div class="stat-label">Endpoints</div>
        </div>
      </div>

      <div class="card">
        <h2>Partner Details</h2>
        <p><strong>Wallet:</strong> <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">${partner.wallet_address}</code></p>
        ${partner.twitter ? `<p><strong>Twitter:</strong> <a href="https://twitter.com/${partner.twitter}" target="_blank" style="color: #8b5cf6;">@${partner.twitter}</a></p>` : ''}
        ${partner.website ? `<p><strong>Website:</strong> <a href="${partner.website}" target="_blank" style="color: #8b5cf6;">${partner.website}</a></p>` : ''}
        ${partner.description ? `<p><strong>Description:</strong> ${partner.description}</p>` : ''}
        <p><strong>Status:</strong> <span style="color: ${partner.status === 'active' ? '#10b981' : '#ef4444'}">${partner.status}</span></p>
        <p><strong>Joined:</strong> ${new Date(partner.created_at).toLocaleDateString()}</p>
      </div>

      <div class="card">
        <h2>Embed Widget</h2>
        <p style="color: #888; margin-bottom: 15px;">Add this to your site to show your x402 earnings:</p>
        <textarea readonly style="font-family: monospace; font-size: 0.85rem;" rows="3">&lt;iframe src="https://partners.pbtc21.dev/embed/${partner.id}" width="300" height="150" frameborder="0"&gt;&lt;/iframe&gt;</textarea>
      </div>

      <div class="card">
        <h2>Recent Earnings</h2>
        <table class="earnings-table">
          <thead>
            <tr><th>Time</th><th>Endpoint</th><th>Amount</th><th>Transaction</th></tr>
          </thead>
          <tbody>${earningsRows}</tbody>
        </table>
      </div>
    </div>
  `);

  return c.html(html);
});

// Embed widget
app.get('/embed/:id', async (c) => {
  const id = c.req.param('id');

  const partner = await c.env.DB.prepare(
    'SELECT * FROM partners WHERE id = ?'
  ).bind(id).first<Partner>();

  if (!partner) {
    return c.html('<div style="padding: 20px; text-align: center; color: #888;">Partner not found</div>');
  }

  const tier = TIERS[partner.tier] || TIERS.builder;

  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, sans-serif;
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          color: #fff;
          padding: 15px;
          min-height: 100%;
        }
        .header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
        .badge { font-size: 1.5rem; }
        .name { font-size: 1rem; font-weight: 600; }
        .stats { display: flex; gap: 20px; }
        .stat-value { font-size: 1.2rem; font-weight: bold; color: #8b5cf6; }
        .stat-label { font-size: 0.7rem; color: #888; }
        .powered { font-size: 0.65rem; color: #666; margin-top: 10px; text-align: right; }
        .powered a { color: #8b5cf6; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="header">
        <span class="badge">${tier.badge}</span>
        <span class="name">${partner.name}</span>
      </div>
      <div class="stats">
        <div>
          <div class="stat-value">${formatSTX(partner.total_earnings)}</div>
          <div class="stat-label">STX Earned</div>
        </div>
        <div>
          <div class="stat-value">${formatSTX(partner.total_volume)}</div>
          <div class="stat-label">Volume</div>
        </div>
      </div>
      <div class="powered">Powered by <a href="https://partners.pbtc21.dev" target="_blank">x402</a></div>
    </body>
    </html>
  `);
});

// Leaderboard
app.get('/leaderboard', async (c) => {
  const partners = await c.env.DB.prepare(
    'SELECT * FROM partners WHERE status = ? ORDER BY total_earnings DESC LIMIT 50'
  ).bind('active').all<Partner>();

  const rows = partners.results?.map((p, i) => {
    const tier = TIERS[p.tier] || TIERS.builder;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    return `
      <tr>
        <td style="font-size: 1.2rem;">${medal}</td>
        <td>
          <a href="/partners/${p.id}" style="color: #fff; text-decoration: none;">
            ${tier.badge} ${p.name}
          </a>
        </td>
        <td><span style="background: ${tier.color}20; color: ${tier.color}; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">${tier.label}</span></td>
        <td style="color: #8b5cf6; font-weight: bold;">${formatSTX(p.total_earnings)} STX</td>
        <td>${formatSTX(p.total_volume)} STX</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="5" style="text-align: center; color: #666;">No partners yet</td></tr>';

  const html = renderPage('Leaderboard', `
    <div class="header">
      <h1>Partner Leaderboard</h1>
      <p>Top earning partners in the x402 ecosystem</p>
    </div>

    <div class="container">
      <div class="card">
        <table class="earnings-table">
          <thead>
            <tr><th>Rank</th><th>Partner</th><th>Tier</th><th>Earnings</th><th>Volume</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `);

  return c.html(html);
});

// Admin dashboard
app.get('/admin', async (c) => {
  const partners = await c.env.DB.prepare(
    'SELECT * FROM partners ORDER BY created_at DESC'
  ).all<Partner>();

  const recentEarnings = await c.env.DB.prepare(
    'SELECT e.*, p.name as partner_name FROM earnings e JOIN partners p ON e.partner_id = p.id ORDER BY e.timestamp DESC LIMIT 20'
  ).all();

  const totalEarnings = partners.results?.reduce((sum, p) => sum + p.total_earnings, 0) || 0;
  const totalVolume = partners.results?.reduce((sum, p) => sum + p.total_volume, 0) || 0;

  const partnerRows = partners.results?.map(p => {
    const tier = TIERS[p.tier] || TIERS.builder;
    return `
      <tr>
        <td><a href="/partners/${p.id}" style="color: #8b5cf6;">${tier.badge} ${p.name}</a></td>
        <td><code style="font-size: 0.75rem;">${p.wallet_address.slice(0, 10)}...</code></td>
        <td>${tier.label}</td>
        <td>${formatSTX(p.total_earnings)}</td>
        <td><span style="color: ${p.status === 'active' ? '#10b981' : '#ef4444'}">${p.status}</span></td>
        <td>
          <button onclick="recordEarning('${p.id}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;">+ Earning</button>
        </td>
      </tr>
    `;
  }).join('') || '';

  const html = renderPage('Admin', `
    <div class="header">
      <h1>Admin Dashboard</h1>
      <p>Manage partners and track ecosystem earnings</p>
    </div>

    <div class="container">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${partners.results?.length || 0}</div>
          <div class="stat-label">Total Partners</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatSTX(totalEarnings)}</div>
          <div class="stat-label">Total Earnings</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatSTX(totalVolume)}</div>
          <div class="stat-label">Total Volume</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${PROSPECTS.length}</div>
          <div class="stat-label">Pipeline Targets</div>
        </div>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2>All Partners</h2>
          <a href="/onboard" class="btn">+ Add Partner</a>
        </div>
        <table class="earnings-table">
          <thead>
            <tr><th>Partner</th><th>Wallet</th><th>Tier</th><th>Earnings</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>${partnerRows}</tbody>
        </table>
      </div>

      <div class="card">
        <h2>Quick Actions</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button onclick="seedProspects()" class="btn btn-secondary">Seed Prospect Partners</button>
          <button onclick="simulateEarnings()" class="btn btn-secondary">Simulate Earnings</button>
        </div>
      </div>
    </div>

    <script>
      async function recordEarning(partnerId) {
        const amount = prompt('Enter earning amount in microSTX:');
        if (!amount) return;

        const res = await fetch('/api/earnings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partner_id: partnerId, amount_ustx: parseInt(amount), endpoint: 'manual' })
        });
        const result = await res.json();
        if (result.success) {
          alert('Earning recorded!');
          location.reload();
        } else {
          alert('Error: ' + result.error);
        }
      }

      async function seedProspects() {
        if (!confirm('This will create partner records for all prospects. Continue?')) return;

        const res = await fetch('/api/seed-prospects', { method: 'POST' });
        const result = await res.json();
        alert(result.message || 'Done!');
        location.reload();
      }

      async function simulateEarnings() {
        const res = await fetch('/api/simulate-earnings', { method: 'POST' });
        const result = await res.json();
        alert(result.message || 'Simulated!');
        location.reload();
      }
    </script>
  `);

  return c.html(html);
});

// ==================== API ROUTES ====================

// Create partner
app.post('/api/partners', async (c) => {
  try {
    const body = await c.req.json();
    const { name, wallet_address, tier, twitter, website, description, revenue_share } = body;

    if (!name || !wallet_address) {
      return c.json({ success: false, error: 'Name and wallet address required' }, 400);
    }

    // Validate wallet address format
    if (!/^S[PM][A-Z0-9]{38,40}$/.test(wallet_address)) {
      return c.json({ success: false, error: 'Invalid Stacks wallet address' }, 400);
    }

    const id = generateId();

    await c.env.DB.prepare(`
      INSERT INTO partners (id, name, wallet_address, tier, twitter, website, description, revenue_share)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      name,
      wallet_address,
      tier || 'builder',
      twitter || null,
      website || null,
      description || null,
      revenue_share || 10
    ).run();

    const partner = await c.env.DB.prepare('SELECT * FROM partners WHERE id = ?').bind(id).first<Partner>();

    return c.json({ success: true, partner });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// List partners
app.get('/api/partners', async (c) => {
  const partners = await c.env.DB.prepare(
    'SELECT * FROM partners ORDER BY total_earnings DESC'
  ).all<Partner>();

  return c.json({ success: true, partners: partners.results });
});

// Get partner
app.get('/api/partners/:id', async (c) => {
  const id = c.req.param('id');
  const partner = await c.env.DB.prepare('SELECT * FROM partners WHERE id = ?').bind(id).first<Partner>();

  if (!partner) {
    return c.json({ success: false, error: 'Partner not found' }, 404);
  }

  return c.json({ success: true, partner });
});

// Record earning
app.post('/api/earnings', async (c) => {
  try {
    const body = await c.req.json();
    const { partner_id, amount_ustx, endpoint, tx_id } = body;

    if (!partner_id || !amount_ustx) {
      return c.json({ success: false, error: 'partner_id and amount_ustx required' }, 400);
    }

    const id = generateId();

    await c.env.DB.prepare(`
      INSERT INTO earnings (id, partner_id, amount_ustx, endpoint, tx_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, partner_id, amount_ustx, endpoint || null, tx_id || null).run();

    // Update partner totals
    await c.env.DB.prepare(`
      UPDATE partners
      SET total_earnings = total_earnings + ?, total_volume = total_volume + ?
      WHERE id = ?
    `).bind(amount_ustx, amount_ustx, partner_id).run();

    return c.json({ success: true, earning_id: id });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// Seed prospects as partners (for demo)
app.post('/api/seed-prospects', async (c) => {
  try {
    let created = 0;
    for (const p of PROSPECTS) {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM partners WHERE name = ?'
      ).bind(p.name).first();

      if (!existing) {
        const id = generateId();
        // Generate a placeholder wallet (in production, they'd provide their own)
        const placeholderWallet = 'SP' + Math.random().toString(36).substring(2, 40).toUpperCase();

        await c.env.DB.prepare(`
          INSERT INTO partners (id, name, wallet_address, tier, twitter, description, status)
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `).bind(id, p.name, placeholderWallet, p.tier, p.twitter, p.desc).run();
        created++;
      }
    }
    return c.json({ success: true, message: `Created ${created} prospect partners` });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// Simulate earnings (for demo)
app.post('/api/simulate-earnings', async (c) => {
  try {
    const partners = await c.env.DB.prepare(
      'SELECT id FROM partners WHERE status = ?'
    ).bind('active').all<{ id: string }>();

    for (const p of partners.results || []) {
      const amount = Math.floor(Math.random() * 100000) + 1000; // 1000-100000 uSTX
      const id = generateId();

      await c.env.DB.prepare(`
        INSERT INTO earnings (id, partner_id, amount_ustx, endpoint)
        VALUES (?, ?, ?, 'simulated')
      `).bind(id, p.id, amount).run();

      await c.env.DB.prepare(`
        UPDATE partners SET total_earnings = total_earnings + ?, total_volume = total_volume + ?
        WHERE id = ?
      `).bind(amount, amount * 10, p.id).run();
    }

    return c.json({ success: true, message: `Simulated earnings for ${partners.results?.length || 0} partners` });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'x402-partners' }));

// API info
app.get('/api', (c) => c.json({
  service: 'x402 Partner Program',
  version: '1.0.0',
  endpoints: {
    'GET /': 'Landing page',
    'GET /onboard': 'Partner registration form',
    'GET /partners/:id': 'Partner dashboard',
    'GET /embed/:id': 'Embeddable widget',
    'GET /leaderboard': 'Partner leaderboard',
    'GET /admin': 'Admin dashboard',
    'POST /api/partners': 'Create partner',
    'GET /api/partners': 'List partners',
    'GET /api/partners/:id': 'Get partner',
    'POST /api/earnings': 'Record earning',
  }
}));

export default app;
