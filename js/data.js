// Single source of truth for portfolio data. Edit values here; the Update modal
// only stores dated overrides that win while they are newer than DATA_AS_OF.
export const DATA_AS_OF = '2026-10-15';
export const CAS_AS_OF  = '2026-08-18';
export const TARGET_NET_WORTH = 100_000_000;

export const ASSET_CLASSES = {
  mf:        { label: 'Mutual Funds',     short: 'MF',        color: '#3b82f6', icon: 'pie',      liquidity: 'liquid',   tax: 'equity'   },
  fd:        { label: 'Fixed Deposits',   short: 'FD',        color: '#22c55e', icon: 'bank',     liquidity: 'liquid',   tax: 'slab'     },
  sgb:       { label: 'Sovereign Gold',   short: 'SGB',       color: '#f59e0b', icon: 'sparkle',  liquidity: 'locked',   tax: 'sgb'      },
  pms:       { label: 'PMS',              short: 'PMS',       color: '#8b5cf6', icon: 'briefcase',liquidity: 'locked',   tax: 'equity'   },
  aif:       { label: 'AIF',              short: 'AIF',       color: '#f97316', icon: 'layers',   liquidity: 'locked',   tax: 'aif'      },
  stocks:    { label: 'Stocks & ETFs',    short: 'Stocks',    color: '#14b8a6', icon: 'trend',    liquidity: 'semi',     tax: 'equity'   },
  reit:      { label: 'REIT & InvIT',     short: 'REIT',      color: '#06b6d4', icon: 'building', liquidity: 'semi',     tax: 'equity'   },
  unlisted:  { label: 'Unlisted Shares',  short: 'Unlisted',  color: '#d946ef', icon: 'unlock',   liquidity: 'semi',     tax: 'unlisted' },
  coin:      { label: 'Gold & Silver',    short: 'Coins',     color: '#eab308', icon: 'coins',    liquidity: 'semi',     tax: 'metal'    },
  ssy:       { label: 'SSY',              short: 'SSY',       color: '#f43f5e', icon: 'users',    liquidity: 'locked',   tax: 'free'     },
  insurance: { label: 'Insurance',        short: 'Insurance', color: '#6366f1', icon: 'shield',   liquidity: 'locked',   tax: 'free'     },
  nps:       { label: 'NPS',              short: 'NPS',       color: '#84cc16', icon: 'landmark', liquidity: 'locked',   tax: 'nps'      },
  crypto:    { label: 'Crypto',           short: 'Crypto',    color: '#ec4899', icon: 'bitcoin',  liquidity: 'liquid',   tax: 'crypto'   },
  savings:   { label: 'Savings',          short: 'Savings',   color: '#64748b', icon: 'wallet',   liquidity: 'liquid',   tax: 'slab'     },
};

export const OWNERS = {
  Yuvan:  { color: '#3b82f6', note: '' },
  Ramyaa: { color: '#8b5cf6', note: '' },
  Sana:   { color: '#22c55e', note: 'SSY · born Apr 2017' },
  Tara:   { color: '#f97316', note: 'SSY + Insurance · born Jan 2020' },
};

// Priced holdings carry qty + price (value = qty × price); others carry value.
export const HOLDINGS = [
  // Deposits
  { id: 'fd-icici1', cls: 'fd', owner: 'Yuvan',  account: 'ICICI', name: 'Fixed Deposit', value: 2519467, cost: 2519467, since: '2023-01-01' },
  { id: 'fd-icici2', cls: 'fd', owner: 'Ramyaa', account: 'ICICI', name: 'Fixed Deposit', value: 0,       cost: 0,       since: '2023-01-01' },
  { id: 'fd-hdfc',   cls: 'fd', owner: 'Ramyaa', account: 'HDFC',  name: 'Fixed Deposit', value: 500000,  cost: 500000,  since: '2023-06-01' },
  { id: 'fd-sbi',    cls: 'fd', owner: 'Yuvan',  account: 'SBI',   name: 'Fixed Deposit', value: 340026,  cost: 340026,  since: '2023-03-01' },
  { id: 'fd-hdfc2',  cls: 'fd', owner: 'Yuvan',  account: 'HDFC',  name: 'Fixed Deposit', value: 3500000, cost: 3500000, since: '2024-01-01' },
  // Children
  { id: 'ssy-sana',  cls: 'ssy', owner: 'Sana', account: 'ICICI', name: 'Sukanya Samriddhi', value: 873501, cost: 873501, since: '2017-04-17' },
  { id: 'ssy-tara',  cls: 'ssy', owner: 'Tara', account: 'ICICI', name: 'Sukanya Samriddhi', value: 873501, cost: 873501, since: '2020-01-11' },
  // Insurance
  { id: 'ins-sbi',   cls: 'insurance', owner: 'Yuvan', account: 'SBI Life', name: 'ULIP 1K365542004', value: 344340, cost: 200000, since: '2018-01-01' },
  { id: 'ins-icici', cls: 'insurance', owner: 'Tara',  account: 'ICICI Pru', name: 'Policy A3067570',  value: 918076, cost: 500000, since: '2021-01-11' },
  // Managed
  { id: 'pms-icici', cls: 'pms', owner: 'Yuvan', account: 'ICICI',  name: 'Portfolio Management', value: 5976000, cost: 5000000, since: '2022-04-01' },
  { id: 'nps-icici', cls: 'nps', owner: 'Yuvan', account: 'ICICI',  name: 'National Pension',     value: 375819,  cost: 200000,  since: '2018-01-01' },
  { id: 'aif-360one',cls: 'aif', owner: 'Yuvan', account: '360ONE', name: 'Alternative Fund',     value: 3678000, cost: 5000000, since: '2022-01-01' },
  // Sovereign Gold Bonds — price is gold ₹/g
  { id: 'sgb-1', cls: 'sgb', owner: 'Yuvan', account: 'ICICI', name: 'SGB 2019-20 Series III', qty: 70,  unit: 'g', price: 14826, cost: 244930, since: '2019-08-14', maturity: '2027-08-14' },
  { id: 'sgb-2', cls: 'sgb', owner: 'Yuvan', account: 'ICICI', name: 'SGB 2019-20 Series VII', qty: 50,  unit: 'g', price: 14826, cost: 189750, since: '2019-12-10', maturity: '2027-12-10' },
  { id: 'sgb-3', cls: 'sgb', owner: 'Yuvan', account: 'ICICI', name: 'SGB 2020-21 Series VI',  qty: 100, unit: 'g', price: 14826, cost: 511700, since: '2020-09-08', maturity: '2028-09-08' },
  { id: 'sgb-4', cls: 'sgb', owner: 'Yuvan', account: 'ICICI', name: 'SGB 2020-21 Series IX',  qty: 30,  unit: 'g', price: 14826, cost: 150000, since: '2021-01-05', maturity: '2029-01-05' },
  { id: 'sgb-5', cls: 'sgb', owner: 'Yuvan', account: 'ICICI', name: 'SGB 2020-21 Series X',   qty: 50,  unit: 'g', price: 14826, cost: 252700, since: '2021-01-19', maturity: '2029-01-19' },
  { id: 'sgb-6', cls: 'sgb', owner: 'Yuvan', account: 'ICICI', name: 'SGB 2020-21 Series XII', qty: 100, unit: 'g', price: 14826, cost: 461200, since: '2021-03-09', maturity: '2029-03-09' },
  { id: 'sgb-7', cls: 'sgb', owner: 'Yuvan', account: 'ICICI', name: 'SGB 2021-22 Series I',   qty: 100, unit: 'g', price: 14826, cost: 472700, since: '2021-05-25', maturity: '2029-05-25' },
  // Mutual funds — value and cost come from MF_SCHEMES
  { id: 'mf-yuvan',  cls: 'mf', owner: 'Yuvan',  account: 'CAMS + KFin', name: 'Mutual Funds', mf: 'Yuvan',  since: '2019-01-01' },
  { id: 'mf-ramyaa', cls: 'mf', owner: 'Ramyaa', account: 'CAMS + KFin', name: 'Mutual Funds', mf: 'Ramyaa', since: '2021-01-01' },
  // Listed stocks
  { id: 'listed-gail',     cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'GAIL India',          qty: 6500, unit: 'sh', price: 167.15,  cost: 1118000, since: '2024-01-01' },
  { id: 'listed-hdfcbank', cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'HDFC Bank',           qty: 250,  unit: 'sh', price: 710.70,  cost: 181750,  since: '2024-01-01' },
  { id: 'listed-infy',     cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'Infosys',             qty: 110,  unit: 'sh', price: 1088,    cost: 125840,  since: '2024-01-01' },
  { id: 'listed-powgri',   cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'Power Grid',          qty: 900,  unit: 'sh', price: 248.95,  cost: 241200,  since: '2024-01-01' },
  { id: 'listed-relind',   cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'Reliance Industries', qty: 60,   unit: 'sh', price: 1174.60, cost: 78600,   since: '2024-01-01' },
  { id: 'listed-tatmot',   cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'Tata Motors',         qty: 250,  unit: 'sh', price: 415.25,  cost: 82750,   since: '2024-01-01' },
  { id: 'listed-bhaair',   cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'Bharti Airtel',       qty: 250,  unit: 'sh', price: 1794.60, cost: 498000,  since: '2024-01-01' },
  { id: 'listed-sbifun',   cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'SBI Funds Mgmt',      qty: 26,   unit: 'sh', price: 519.55,  cost: 14404,   since: '2024-01-01' },
  { id: 'listed-tatcov',   cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'Tata Motors PV',      qty: 250,  unit: 'sh', price: 283.40,  cost: 92750,   since: '2024-01-01' },
  { id: 'unl-nse',         cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'NSE',                 qty: 500,  unit: 'sh', price: 1762.60, cost: 975000,  since: '2025-11-20' },
  // ETFs
  { id: 'etf-ici500', cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'ICICI BSE 500 ETF',      qty: 1500, unit: 'sh', price: 37.17,  cost: 54000,  since: '2024-01-01' },
  { id: 'etf-ici100', cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'ICICI Nifty 100 ETF',    qty: 5000, unit: 'sh', price: 26.79,  cost: 145000, since: '2024-01-01' },
  { id: 'etf-rel150', cls: 'stocks', owner: 'Yuvan', account: 'ICICI', name: 'Nippon Midcap 150 ETF',  qty: 400,  unit: 'sh', price: 224.19, cost: 97200,  since: '2024-01-01' },
  { id: 'kite-zerodha', cls: 'stocks', owner: 'Yuvan', account: 'Zerodha', name: 'Mixed shares', value: 0, cost: 300000, since: '2021-01-01' },
  // InvITs & REITs
  { id: 'invit-indgri', cls: 'reit', owner: 'Yuvan', account: 'ICICI', name: 'IndiGrid InvIT',        qty: 6500,  unit: 'sh', price: 168.27, cost: 1163500, since: '2024-01-01' },
  { id: 'invit-irbinv', cls: 'reit', owner: 'Yuvan', account: 'ICICI', name: 'IRB InvIT',             qty: 2500,  unit: 'sh', price: 63.35,  cost: 160000,  since: '2024-01-01' },
  { id: 'invit-powinf', cls: 'reit', owner: 'Yuvan', account: 'ICICI', name: 'PowerGrid InvIT',       qty: 10000, unit: 'sh', price: 103.80, cost: 1000000, since: '2024-01-01' },
  { id: 'reit-broind',  cls: 'reit', owner: 'Yuvan', account: 'ICICI', name: 'Brookfield India REIT', qty: 600,   unit: 'sh', price: 322.94, cost: 207000,  since: '2024-01-01' },
  { id: 'reit-minbus',  cls: 'reit', owner: 'Yuvan', account: 'ICICI', name: 'Mindspace REIT',        qty: 550,   unit: 'sh', price: 494.98, cost: 273350,  since: '2024-01-01' },
  { id: 'reit-nexsel',  cls: 'reit', owner: 'Yuvan', account: 'ICICI', name: 'Nexus Select Trust',    qty: 1000,  unit: 'sh', price: 164.84, cost: 165000,  since: '2024-01-01' },
  { id: 'reit-icici',   cls: 'reit', owner: 'Yuvan', account: 'ICICI', name: 'Embassy Office Parks',  qty: 1000,  unit: 'sh', price: 430.52, cost: 439000,  since: '2021-01-01' },
  // Unlisted — fetchKey matches the proxy's /unlisted-prices result keys
  { id: 'unl-sunday',     cls: 'unlisted', owner: 'Yuvan', account: 'ICICI', name: 'Sunday Protech', qty: 100000, unit: 'sh', price: 20.75,   cost: 2075000, since: '2025-11-24', fetchKey: 'sunday' },
  { id: 'unl-oyo',        cls: 'unlisted', owner: 'Yuvan', account: 'ICICI', name: 'OYO',            qty: 26316,  unit: 'sh', price: 28,      cost: 736848,  since: '2025-12-04', fetchKey: 'oyo' },
  { id: 'unl-ecosure',    cls: 'unlisted', owner: 'Yuvan', account: 'ICICI', name: 'Ecosure',        qty: 15000,  unit: 'sh', price: 37,      cost: 555000,  since: '2025-12-08', fetchKey: 'ecosure' },
  { id: 'unl-avpl',       cls: 'unlisted', owner: 'Yuvan', account: 'ICICI', name: 'AVPL Drone',     qty: 5000,   unit: 'sh', price: 48,      cost: 240000,  since: '2026-01-14', fetchKey: 'avpl' },
  { id: 'unl-deltagalaxy',cls: 'unlisted', owner: 'Yuvan', account: 'ICICI', name: 'Delta Galaxy',   qty: 10000,  unit: 'sh', price: 33,      cost: 330000,  since: '2026-04-25', fetchKey: 'deltagalaxy' },
  { id: 'unl-msei',       cls: 'unlisted', owner: 'Yuvan', account: 'ICICI', name: 'MSEI',           qty: 40000,  unit: 'sh', price: 6.3,     cost: 252000,  since: '2026-04-07', fetchKey: 'msei' },
  { id: 'unl-zepto',      cls: 'unlisted', owner: 'Yuvan', account: 'ICICI', name: 'Zepto',          qty: 10000,  unit: 'sh', price: 39.5,    cost: 395000,  since: '2026-06-02', fetchKey: 'zepto' },
  { id: 'unl-pharmeasy',  cls: 'unlisted', owner: 'Yuvan', account: 'ICICI', name: 'Pharmeasy',      qty: 20000,  unit: 'sh', price: 6.2,     cost: 124000,  since: '2026-09-03' },
  // Other
  { id: 'crypto-btc', cls: 'crypto', owner: 'Yuvan', account: 'Exchange', name: 'Crypto portfolio', value: 100000, cost: 100000, since: '2021-01-01' },
  { id: 'coin-au',    cls: 'coin',   owner: 'Yuvan', account: 'Physical', name: 'Gold coins',   qty: 124,  unit: 'g', price: 14826, cost: 868000, since: '2020-01-01' },
  { id: 'coin-ag',    cls: 'coin',   owner: 'Yuvan', account: 'Physical', name: 'Silver coins', qty: 1500, unit: 'g', price: 235,   cost: 140000, since: '2021-01-01' },
];

export const SNAPSHOTS = [
  { date: '2024-04-10', value: 32550000 },
  { date: '2024-05-10', value: 39605000 },
  { date: '2024-06-21', value: 40906091 },
  { date: '2024-08-29', value: 43633812 },
  { date: '2024-09-03', value: 42584362 },
  { date: '2024-11-28', value: 49125944 },
  { date: '2025-05-27', value: 52557538 },
  { date: '2025-09-16', value: 60029917 },
  { date: '2025-12-13', value: 67974466 },
  { date: '2026-09-04', value: 70118797 },
  { date: '2026-10-15', value: 69599403 },
];

// From CAS statements (Yuvan 18-Aug-2026, Ramyaa 19-Mar-2026).
// units + code let Fetch Prices refresh a scheme's value from MFAPI.
export const MF_SCHEMES = [
  { house: 'Axis',     scheme: 'NIFTY Next 50 Index Fund Direct Growth',        cat: 'Index',       cost: 250000,  value: 255258,  reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Axis',     scheme: 'Global Equity Alpha Fund of Fund Direct Growth', cat: 'FOF',         cost: 300000,  value: 363405,  reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Axis',     scheme: 'Greater China Equity FOF Direct Growth',         cat: 'FOF',         cost: 100000,  value: 146560,  reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Bajaj',    scheme: 'Consumption Fund Regular Growth',                cat: 'Thematic',    cost: 1082957, value: 1091092, reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Bajaj',    scheme: 'Flexi Cap Fund Regular Growth',                  cat: 'Flexi Cap',   cost: 100000,  value: 112898,  reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Bandhan',  scheme: 'Large & Mid Cap Fund Regular Growth',            cat: 'Large & Mid', cost: 1253982, value: 1339420, reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'Franklin', scheme: 'Small Cap Fund Growth',                          cat: 'Small Cap',   cost: 100000,  value: 123821,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'Franklin', scheme: 'Focused Equity Fund Growth',                     cat: 'Focused',     cost: 200000,  value: 186710,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'Franklin', scheme: 'Flexi Cap Fund Growth',                          cat: 'Flexi Cap',   cost: 275000,  value: 272312,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'HDFC',     scheme: 'Silver ETF Fund of Fund Regular Growth',         cat: 'Commodity',   cost: 200000,  value: 502364,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'HDFC',     scheme: 'Large and Mid Cap Fund Regular Growth',          cat: 'Large & Mid', cost: 325000,  value: 416036,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'HDFC',     scheme: 'Focused Fund Regular Growth',                    cat: 'Focused',     cost: 50000,   value: 89538,   reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'HDFC',     scheme: 'Flexi Cap Fund Regular Growth (F1)',             cat: 'Flexi Cap',   cost: 75000,   value: 98422,   reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'HDFC',     scheme: 'Banking & Financial Services Regular Growth',    cat: 'Sectoral',    cost: 25000,   value: 32002,   reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'HDFC',     scheme: 'Flexi Cap Fund Regular Growth (F2)',             cat: 'Flexi Cap',   cost: 75000,   value: 97429,   reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'HDFC',     scheme: 'Pharma and Healthcare Regular Growth',           cat: 'Sectoral',    cost: 575000,  value: 747700,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'HSBC',     scheme: 'Multi Cap Fund Regular Growth (F1)',             cat: 'Multi Cap',   cost: 50000,   value: 65802,   reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'HSBC',     scheme: 'Multi Cap Fund Regular Growth (F2)',             cat: 'Multi Cap',   cost: 50000,   value: 65802,   reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'ICICI',    scheme: 'Business Cycle Fund Growth (F1)',                cat: 'Thematic',    cost: 300000,  value: 387532,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'ICICI',    scheme: 'Manufacturing Fund Growth',                      cat: 'Thematic',    cost: 500000,  value: 584108,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'ICICI',    scheme: 'Thematic Advantage FOF Growth',                  cat: 'FOF',         cost: 2011685, value: 2050188, reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'ICICI',    scheme: 'Multi-Asset Fund Growth (F1)',                   cat: 'Multi Asset', cost: 800000,  value: 1064378, reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'ICICI',    scheme: 'Large & Mid Cap Fund Growth (F1)',               cat: 'Large & Mid', cost: 425000,  value: 545198,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'ICICI',    scheme: 'Dynamic Asset Allocation Active FOF Growth',     cat: 'FOF',         cost: 4000000, value: 4455258, reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'ICICI',    scheme: 'Business Cycle Fund Growth (F2)',                cat: 'Thematic',    cost: 500000,  value: 627762,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'ICICI',    scheme: 'Multi-Asset Fund Growth (F2)',                   cat: 'Multi Asset', cost: 700000,  value: 922558,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'ICICI',    scheme: 'Large & Mid Cap Fund Growth (F2)',               cat: 'Large & Mid', cost: 75000,   value: 96902,   reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'ICICI',    scheme: 'Balanced Advantage Fund Growth',                 cat: 'Hybrid',      cost: 210160,  value: 230734,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'ICICI',    scheme: 'Multi-Asset Fund Growth (F3)',                   cat: 'Multi Asset', cost: 750000,  value: 929306,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'Invesco',  scheme: 'Business Cycle Fund Regular Growth',             cat: 'Thematic',    cost: 600000,  value: 857957,  reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Invesco',  scheme: 'Flexi Cap Fund Regular Growth',                  cat: 'Flexi Cap',   cost: 898450,  value: 944519,  reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Invesco',  scheme: 'Large & Mid Cap Fund Regular Growth',            cat: 'Large & Mid', cost: 1000000, value: 1127212, reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Kotak',    scheme: 'Midcap Fund Growth Regular',                     cat: 'Mid Cap',     cost: 150000,  value: 288483,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'Kotak',    scheme: 'Large Cap Fund Growth Regular',                  cat: 'Large Cap',   cost: 50000,   value: 73625,   reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'Kotak',    scheme: 'Large & Midcap Fund Growth Regular',             cat: 'Large & Mid', cost: 75000,   value: 94728,   reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'Motilal',  scheme: 'Midcap Fund Regular Growth (F1)',                cat: 'Mid Cap',     cost: 100000,  value: 138709,  reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Motilal',  scheme: 'Large and Midcap Fund Regular Growth',           cat: 'Large & Mid', cost: 501030,  value: 534571,  reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Motilal',  scheme: 'Midcap Fund Regular Growth (F2)',                cat: 'Mid Cap',     cost: 825000,  value: 867625,  reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Motilal',  scheme: 'Gold and Silver Passive FOF Direct Growth',      cat: 'Commodity',   cost: 300000,  value: 303621,  reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Nippon',   scheme: 'Multi Cap Fund Growth (F1)',                     cat: 'Multi Cap',   cost: 75000,   value: 95393,   reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Nippon',   scheme: 'Large Cap Fund Direct Growth',                   cat: 'Large Cap',   cost: 2115941, value: 2183183, reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Nippon',   scheme: 'Banking & Financial Services Fund Growth',       cat: 'Sectoral',    cost: 200000,  value: 230940,  reg: 'KFintech', owner: 'Yuvan' },
  { house: 'Nippon',   scheme: 'Multi Cap Fund Growth (F2)',                     cat: 'Multi Cap',   cost: 875000,  value: 897132,  reg: 'KFintech', owner: 'Yuvan' },
  { house: 'SBI',      scheme: 'Multi Asset Allocation Fund Regular Growth',     cat: 'Multi Asset', cost: 500000,  value: 590416,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'SBI',      scheme: 'Contra Fund Regular Growth',                     cat: 'Contra',      cost: 750000,  value: 797425,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'SBI',      scheme: 'Large & Midcap Fund Regular Growth',             cat: 'Large & Mid', cost: 100000,  value: 168033,  reg: 'CAMS',     owner: 'Yuvan' },
  { house: 'ICICI',    scheme: 'Thematic Advantage FOF Growth',                  cat: 'FOF',         cost: 100000,  value: 95657,   reg: 'CAMS',     owner: 'Ramyaa', units: 449.123,   code: '101026' },
  { house: 'Invesco',  scheme: 'Flexi Cap Fund Regular Growth',                  cat: 'Flexi Cap',   cost: 300000,  value: 271821,  reg: 'KFintech', owner: 'Ramyaa', units: 16093.616, code: '145255' },
];

export const MF_HOUSE_COLORS = {
  ICICI: '#3b82f6', SBI: '#22c55e', Nippon: '#f43f5e', Motilal: '#8b5cf6', HDFC: '#f59e0b',
  Invesco: '#14b8a6', Bajaj: '#f97316', Kotak: '#06b6d4', Franklin: '#d946ef', Axis: '#eab308',
  Bandhan: '#6366f1', HSBC: '#84cc16',
};
export const MF_CAT_COLORS = {
  FOF: '#3b82f6', 'Multi Asset': '#f59e0b', Thematic: '#f97316', 'Large & Mid': '#22c55e',
  'Flexi Cap': '#8b5cf6', Sectoral: '#f43f5e', 'Mid Cap': '#14b8a6', 'Multi Cap': '#06b6d4',
  'Large Cap': '#eab308', Commodity: '#d946ef', Index: '#6366f1', Hybrid: '#84cc16',
  Focused: '#ec4899', 'Small Cap': '#64748b', Contra: '#0ea5e9',
};

export const DEFAULT_TARGETS = {
  mf: 38, fd: 10, sgb: 12, pms: 8, aif: 7, stocks: 5, unlisted: 4, reit: 5, coin: 3,
  ssy: 3, insurance: 2, savings: 1, nps: 1, crypto: 1,
};

export const TAX_RULES = [
  { asset: 'Equity MF / Stocks / ETF', period: '1 year',  ltcg: '12.5%',             stcg: '20%',  note: 'LTCG above ₹1.25L per year is taxed' },
  { asset: 'SGB held to maturity',     period: '8 years', ltcg: 'Tax free',           stcg: 'Slab', note: 'Only on RBI redemption; early exit is taxed' },
  { asset: 'Gold / Silver (physical)', period: '2 years', ltcg: '12.5%',             stcg: 'Slab', note: 'Rule since July 2024 budget' },
  { asset: 'REIT / InvIT',             period: '1 year',  ltcg: '12.5%',             stcg: '20%',  note: 'Distributions partially taxable' },
  { asset: 'Unlisted shares',          period: '2 years', ltcg: '12.5%',             stcg: 'Slab', note: 'No indexation since July 2024' },
  { asset: 'Fixed Deposit',            period: '—',       ltcg: 'Slab',              stcg: 'Slab', note: 'Interest taxed as income each year' },
  { asset: 'AIF (Category III)',       period: '—',       ltcg: 'Taxed at fund level', stcg: '—',  note: 'Depends on category and structure' },
  { asset: 'NPS',                      period: '—',       ltcg: '60% tax free at 60', stcg: '—',  note: '40% must buy an annuity' },
  { asset: 'ULIP / Insurance',         period: '—',       ltcg: 'Exempt if premium ≤ ₹2.5L/yr', stcg: '—', note: 'Sum assured must be ≥ 10× premium' },
  { asset: 'Crypto',                   period: '—',       ltcg: '30% flat',          stcg: '30%',  note: 'Plus 1% TDS; losses cannot be set off' },
];
