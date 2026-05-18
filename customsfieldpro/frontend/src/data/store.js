// CustomsFieldPro — localStorage data store
// All reads/writes go through these functions.

const KEYS = {
  clients:        'ff_clients',
  jobs:           'ff_jobs',
  invoices:       'ff_invoices',
  quotes:         'ff_quotes',
  requests:       'ff_requests',
  maintenance:    'ff_maintenance_plans',
  inventory:      'ff_inventory',
  stockMoves:     'ff_stock_moves',
  purchaseOrders: 'ff_purchase_orders',
}

// ─── Sample seed data ───────────────────────────────────────────────────────

const SAMPLE_CLIENTS = [
  { id:1, firstName:'Martha',       lastName:'Reynolds',  name:'Martha Reynolds',     phone:'(555) 214-7830', email:'martha.reynolds@email.com',  address:'142 Elm St',      city:'Springfield', state:'VA', zip:'22150', type:'Residential', balance:0,    since:'Mar 2023', property:{sqft:1850, year:1998,stories:2}, equipment:[{type:'AC Unit',brand:'Carrier',model:'24ACC636A003',installed:'2019',nextService:'Jul 2026'},{type:'Furnace',brand:'Carrier',model:'CH96',installed:'2019',nextService:'Oct 2026'}], jobs:[{id:'JOB-1042',type:'HVAC Repair',status:'In Progress',date:'Apr 1, 2026'}],  invoices:[{id:'INV-2048',amount:'$380.00', status:'Sent',   due:'Apr 15, 2026'}], notes:'Prefers morning appointments. Has a dog — ring doorbell. Gate code: 4421.' },
  { id:2, firstName:'Sunrise',      lastName:'Apartments',name:'Sunrise Apartments',  phone:'(555) 480-2291', email:'mgmt@sunriseapts.com',        address:'88 Lakewood Dr',  city:'Riverside',   state:'VA', zip:'20150', type:'Commercial', balance:1240, since:'Jan 2022', property:{sqft:24000,year:1985,stories:4}, equipment:[{type:'Rooftop Unit',brand:'Trane',model:'RTU-5T',installed:'2018',nextService:'May 2026'},{type:'Boiler',brand:'Weil-McLain',model:'CGa-8',installed:'2015',nextService:'Sep 2026'}], jobs:[{id:'JOB-1041',type:'Plumbing',status:'Scheduled',date:'Apr 1, 2026'}],     invoices:[{id:'INV-2047',amount:'$1,240.00',status:'Draft', due:'Apr 16, 2026'}], notes:'Contact PM Diane ext 204. 24hr notice required for unit access.' },
  { id:3, firstName:'Green Valley', lastName:'School',    name:'Green Valley School', phone:'(555) 667-3344', email:'facilities@greenvalley.edu',  address:'900 Valley Rd',   city:'Greenfield',  state:'VA', zip:'20152', type:'Commercial', balance:0,    since:'Aug 2021', property:{sqft:48000,year:1972,stories:2}, equipment:[{type:'Chiller',brand:'York',model:'YCAL0014',installed:'2020',nextService:'Jun 2026'}], jobs:[{id:'JOB-1040',type:'Electrical',status:'Completed',date:'Mar 31, 2026'}],   invoices:[{id:'INV-2046',amount:'$520.00', status:'Paid',  due:'Apr 14, 2026'}], notes:'Work must be before 7am or after 4pm on school days.' },
  { id:4, firstName:'Frank',        lastName:'Holloway',  name:'Frank Holloway',      phone:'(555) 391-0012', email:'frank.holloway@gmail.com',    address:'77 Oak Lane',     city:'Hillside',    state:'VA', zip:'20151', type:'Residential', balance:320,  since:'Nov 2023', property:{sqft:2200, year:2004,stories:2}, equipment:[{type:'Furnace',brand:'Lennox',model:'SLP98',installed:'2021',nextService:'Oct 2026'},{type:'AC Unit',brand:'Lennox',model:'XC21',installed:'2021',nextService:'Apr 2026'}], jobs:[{id:'JOB-1039',type:'Furnace Service',status:'Completed',date:'Mar 30, 2026'}], invoices:[{id:'INV-2045',amount:'$185.00', status:'Paid',  due:'Apr 13, 2026'}], notes:'On service plan. Sends check by mail.' },
  { id:5, firstName:'Harbor',       lastName:'Clinic',    name:'Harbor Clinic',       phone:'(555) 822-5599', email:'ops@harborclinic.com',        address:'301 Harbor Blvd', city:'Portview',    state:'VA', zip:'20153', type:'Commercial', balance:3810, since:'Feb 2020', property:{sqft:12000,year:2001,stories:1}, equipment:[{type:'HVAC System',brand:'Daikin',model:'DZ20VC',installed:'2022',nextService:'Mar 2026'}], jobs:[{id:'JOB-1038',type:'HVAC Repair',status:'In Progress',date:'Mar 30, 2026'}],  invoices:[{id:'INV-2044',amount:'$640.00', status:'Overdue',due:'Mar 30, 2026'}], notes:'Medical facility — HVAC must stay operational. Emergency: (555) 822-9911.' },
  { id:6, firstName:'Tom',          lastName:'Nguyen',    name:'Tom Nguyen',          phone:'(555) 103-4421', email:'tnguyen@protonmail.com',      address:'55 Pine Ave',     city:'Lakewood',    state:'VA', zip:'20154', type:'Residential', balance:0,    since:'Jan 2024', property:{sqft:1600, year:2010,stories:1}, equipment:[{type:'Water Heater',brand:'AO Smith',model:'ProMax 40G',installed:'2018',nextService:'Apr 2026'}], jobs:[{id:'JOB-1037',type:'Plumbing',status:'Scheduled',date:'Apr 2, 2026'}],      invoices:[{id:'INV-2042',amount:'$920.00', status:'Draft', due:'Apr 17, 2026'}], notes:'' },
  { id:7, firstName:'City Hall',    lastName:'Complex',   name:'City Hall Complex',   phone:'(555) 700-0001', email:'facilities@cityof.gov',       address:'1 Government Pl', city:'Midtown',     state:'VA', zip:'20155', type:'Municipal',  balance:7500, since:'May 2019', property:{sqft:85000,year:1962,stories:6}, equipment:[{type:'Elec. Panel',brand:'Siemens',model:'200A Service',installed:'2023',nextService:'Mar 2027'}], jobs:[{id:'JOB-1035',type:'Electrical',status:'In Progress',date:'Mar 28, 2026'}],  invoices:[{id:'INV-2043',amount:'$4,200.00',status:'Overdue',due:'Mar 28, 2026'}], notes:'PO required for all work. Billing: A. Mitchell x301.' },
  { id:8, firstName:'Rosa',         lastName:'Delgado',   name:'Rosa Delgado',        phone:'(555) 298-6677', email:'rosita.delgado@yahoo.com',   address:'23 Birch Ct',     city:'Eastside',    state:'VA', zip:'20156', type:'Residential', balance:150,  since:'Jul 2024', property:{sqft:1100, year:1995,stories:1}, equipment:[], jobs:[{id:'JOB-1036',type:'Drain',status:'Cancelled',date:'Mar 29, 2026'}],         invoices:[{id:'INV-2041',amount:'$150.00', status:'Sent',  due:'Apr 12, 2026'}], notes:'New customer. Spanish-speaking household.' },
]

const SAMPLE_JOBS = [
  {id:'JOB-1042',clientId:1,clientName:'Martha Reynolds',   clientPhone:'(555) 214-7830',clientEmail:'martha.reynolds@email.com',  clientAddress:'142 Elm St, Springfield, VA',    type:'HVAC',        title:'AC Unit Refrigerant Check',      techName:'D. Moore',   technicianId:'moore',  status:'In Progress',priority:'High',  date:'2026-04-01',time:'08:00',duration:'2 hrs',   lineItems:[{id:1,description:'Service Call Fee',qty:1,unit:75,total:75},{id:2,description:'Labor - Diagnostic (2hr)',qty:2,unit:80,total:160},{id:3,description:'Refrigerant R-410A (1.5lb)',qty:1,unit:95,total:95},{id:4,description:'Freon Handling Fee',qty:1,unit:50,total:50}],subtotal:380,taxRate:0,total:380,  notes:'AC unit not cooling below 75°F. Check refrigerant levels and condenser coils.'},
  {id:'JOB-1041',clientId:2,clientName:'Sunrise Apartments',clientPhone:'(555) 480-2291',clientEmail:'mgmt@sunriseapts.com',        clientAddress:'88 Lakewood Dr, Riverside, VA',  type:'Plumbing',    title:'Sink Fixture Install Units 4-6', techName:'A. Torres',  technicianId:'torres', status:'Scheduled',  priority:'Normal',date:'2026-04-01',time:'10:30',duration:'4 hrs',   lineItems:[{id:1,description:'Labor - Plumbing Install (4hr)',qty:4,unit:110,total:440},{id:2,description:'PEX Fittings & Hardware',qty:1,unit:280,total:280},{id:3,description:'Fixture Units (3)',qty:3,unit:120,total:360},{id:4,description:'Permit Fee',qty:1,unit:160,total:160}],subtotal:1240,taxRate:0,total:1240,notes:'Install 3 new sink fixtures in units 4, 5, 6. Coordinate access with PM Diane.'},
  {id:'JOB-1040',clientId:3,clientName:'Green Valley School',clientPhone:'(555) 667-3344',clientEmail:'facilities@greenvalley.edu',clientAddress:'900 Valley Rd, Greenfield, VA',  type:'Electrical',  title:'Annual Panel Inspection',        techName:'R. Singh',   technicianId:'singh',  status:'Completed',  priority:'Normal',date:'2026-03-31',time:'07:00',duration:'2 hrs',   lineItems:[{id:1,description:'Electrical Inspection Fee',qty:1,unit:200,total:200},{id:2,description:'Labor (2hr)',qty:2,unit:110,total:220},{id:3,description:'Panel Safety Test',qty:1,unit:100,total:100}],subtotal:520,taxRate:0,total:520,  notes:'Annual safety inspection. All panels passed. No issues found.'},
  {id:'JOB-1039',clientId:4,clientName:'Frank Holloway',    clientPhone:'(555) 391-0012',clientEmail:'frank.holloway@gmail.com',    clientAddress:'77 Oak Lane, Hillside, VA',      type:'HVAC',        title:'Furnace Seasonal Tune-Up',       techName:'D. Moore',   technicianId:'moore',  status:'Completed',  priority:'Low',   date:'2026-03-30',time:'09:00',duration:'1 hr',    lineItems:[{id:1,description:'Furnace Tune-Up (standard)',qty:1,unit:145,total:145},{id:2,description:'Filter Replacement',qty:1,unit:40,total:40}],subtotal:185,taxRate:0,total:185,  notes:'Seasonal maintenance complete. Filter replaced. Next service Oct 2026.'},
  {id:'JOB-1038',clientId:5,clientName:'Harbor Clinic',     clientPhone:'(555) 822-5599',clientEmail:'ops@harborclinic.com',        clientAddress:'301 Harbor Blvd, Portview, VA',  type:'HVAC',        title:'HVAC Quarterly Maintenance',     techName:'K. Patel',   technicianId:'patel',  status:'In Progress',priority:'Urgent',date:'2026-03-30',time:'08:00',duration:'4 hrs',   lineItems:[{id:1,description:'HVAC Maintenance Contract Q1',qty:1,unit:450,total:450},{id:2,description:'Coil Cleaning',qty:1,unit:120,total:120},{id:3,description:'Refrigerant Top-Up',qty:1,unit:70,total:70}],subtotal:640,taxRate:0,total:640,  notes:'Quarterly system inspection and coil cleaning.'},
  {id:'JOB-1037',clientId:6,clientName:'Tom Nguyen',        clientPhone:'(555) 103-4421',clientEmail:'tnguyen@protonmail.com',      clientAddress:'55 Pine Ave, Lakewood, VA',      type:'Plumbing',    title:'Water Heater Replacement',       techName:'R. Singh',   technicianId:'singh',  status:'Scheduled',  priority:'Normal',date:'2026-04-02',time:'09:00',duration:'2 hrs',   lineItems:[{id:1,description:'Water Heater 40gal',qty:1,unit:650,total:650},{id:2,description:'Labor - Installation (2hr)',qty:2,unit:120,total:240},{id:3,description:'Disposal Fee',qty:1,unit:30,total:30}],subtotal:920,taxRate:0,total:920,  notes:'Replace old 40-gallon tank. Old unit showing corrosion.'},
  {id:'JOB-1036',clientId:8,clientName:'Rosa Delgado',      clientPhone:'(555) 298-6677',clientEmail:'rosita.delgado@yahoo.com',   clientAddress:'23 Birch Ct, Eastside, VA',      type:'Plumbing',    title:'Kitchen Drain Blockage',         techName:'A. Torres',  technicianId:'torres', status:'Cancelled',  priority:'Normal',date:'2026-03-29',time:'13:00',duration:'1 hr',    lineItems:[{id:1,description:'Drain Cleaning Service',qty:1,unit:120,total:120},{id:2,description:'Emergency Call Fee',qty:1,unit:30,total:30}],subtotal:150,taxRate:0,total:150,  notes:'Customer cancelled day of appointment.'},
  {id:'JOB-1035',clientId:7,clientName:'City Hall Complex', clientPhone:'(555) 700-0001',clientEmail:'facilities@cityof.gov',       clientAddress:'1 Government Pl, Midtown, VA',   type:'Electrical',  title:'200A Service Panel Upgrade',     techName:'R. Singh',   technicianId:'singh',  status:'In Progress',priority:'High',  date:'2026-03-28',time:'07:00',duration:'Full Day', lineItems:[{id:1,description:'Electrical Service Upgrade',qty:1,unit:2500,total:2500},{id:2,description:'Panel Replacement (200A)',qty:1,unit:1200,total:1200},{id:3,description:'Wiring & Materials',qty:1,unit:350,total:350},{id:4,description:'Permit',qty:1,unit:150,total:150}],subtotal:4200,taxRate:0,total:4200,notes:'Full panel upgrade. Requires PO from city procurement.'},
]

const SAMPLE_INVOICES = [
  {id:'INV-2048',clientId:1,clientName:'Martha Reynolds',   clientPhone:'(555) 214-7830',clientEmail:'martha.reynolds@email.com',  clientAddress:'142 Elm St, Springfield, VA',    jobRef:'JOB-1042',issued:'2026-04-01',due:'2026-04-15',status:'Sent',    lineItems:[{id:1,description:'Service Call Fee',qty:1,unit:75,total:75},{id:2,description:'Labor - Diagnostic (2hr)',qty:2,unit:80,total:160},{id:3,description:'Refrigerant R-410A (1.5lb)',qty:1,unit:95,total:95},{id:4,description:'Freon Handling Fee',qty:1,unit:50,total:50}],subtotal:380,taxRate:0,total:380,notes:'Thank you for choosing CustomsFieldPro services.'},
  {id:'INV-2047',clientId:2,clientName:'Sunrise Apartments',clientPhone:'(555) 480-2291',clientEmail:'mgmt@sunriseapts.com',        clientAddress:'88 Lakewood Dr, Riverside, VA',  jobRef:'JOB-1041',issued:'2026-04-01',due:'2026-04-16',status:'Draft',   lineItems:[{id:1,description:'Labor - Plumbing Install (4hr)',qty:4,unit:110,total:440},{id:2,description:'PEX Fittings & Hardware',qty:1,unit:280,total:280},{id:3,description:'Fixture Units (3)',qty:3,unit:120,total:360},{id:4,description:'Permit Fee',qty:1,unit:160,total:160}],subtotal:1240,taxRate:0,total:1240,notes:''},
  {id:'INV-2046',clientId:3,clientName:'Green Valley School',clientPhone:'(555) 667-3344',clientEmail:'facilities@greenvalley.edu',clientAddress:'900 Valley Rd, Greenfield, VA',  jobRef:'JOB-1040',issued:'2026-03-31',due:'2026-04-14',status:'Paid',    lineItems:[{id:1,description:'Electrical Inspection Fee',qty:1,unit:200,total:200},{id:2,description:'Labor (2hr)',qty:2,unit:110,total:220},{id:3,description:'Panel Safety Test',qty:1,unit:100,total:100}],subtotal:520,taxRate:0,total:520,notes:''},
  {id:'INV-2045',clientId:4,clientName:'Frank Holloway',    clientPhone:'(555) 391-0012',clientEmail:'frank.holloway@gmail.com',    clientAddress:'77 Oak Lane, Hillside, VA',      jobRef:'JOB-1039',issued:'2026-03-30',due:'2026-04-13',status:'Paid',    lineItems:[{id:1,description:'Furnace Tune-Up (standard)',qty:1,unit:145,total:145},{id:2,description:'Filter Replacement',qty:1,unit:40,total:40}],subtotal:185,taxRate:0,total:185,notes:''},
  {id:'INV-2044',clientId:5,clientName:'Harbor Clinic',     clientPhone:'(555) 822-5599',clientEmail:'ops@harborclinic.com',        clientAddress:'301 Harbor Blvd, Portview, VA',  jobRef:'JOB-1038',issued:'2026-03-30',due:'2026-03-30',status:'Overdue', lineItems:[{id:1,description:'HVAC Maintenance Contract Q1',qty:1,unit:450,total:450},{id:2,description:'Coil Cleaning',qty:1,unit:120,total:120},{id:3,description:'Refrigerant Top-Up',qty:1,unit:70,total:70}],subtotal:640,taxRate:0,total:640,notes:''},
  {id:'INV-2043',clientId:7,clientName:'City Hall Complex', clientPhone:'(555) 700-0001',clientEmail:'facilities@cityof.gov',       clientAddress:'1 Government Pl, Midtown, VA',   jobRef:'JOB-1035',issued:'2026-03-28',due:'2026-03-28',status:'Overdue', lineItems:[{id:1,description:'Electrical Service Upgrade',qty:1,unit:2500,total:2500},{id:2,description:'Panel Replacement (200A)',qty:1,unit:1200,total:1200},{id:3,description:'Wiring & Materials',qty:1,unit:350,total:350},{id:4,description:'Permit',qty:1,unit:150,total:150}],subtotal:4200,taxRate:0,total:4200,notes:'Requires PO# from city procurement.'},
  {id:'INV-2042',clientId:6,clientName:'Tom Nguyen',        clientPhone:'(555) 103-4421',clientEmail:'tnguyen@protonmail.com',      clientAddress:'55 Pine Ave, Lakewood, VA',      jobRef:'JOB-1037',issued:'2026-04-02',due:'2026-04-17',status:'Draft',   lineItems:[{id:1,description:'Water Heater 40gal',qty:1,unit:650,total:650},{id:2,description:'Labor - Installation (2hr)',qty:2,unit:120,total:240},{id:3,description:'Disposal Fee',qty:1,unit:30,total:30}],subtotal:920,taxRate:0,total:920,notes:''},
  {id:'INV-2041',clientId:8,clientName:'Rosa Delgado',      clientPhone:'(555) 298-6677',clientEmail:'rosita.delgado@yahoo.com',   clientAddress:'23 Birch Ct, Eastside, VA',      jobRef:'JOB-1036',issued:'2026-03-29',due:'2026-04-12',status:'Sent',    lineItems:[{id:1,description:'Drain Cleaning Service',qty:1,unit:120,total:120},{id:2,description:'Emergency Call Fee',qty:1,unit:30,total:30}],subtotal:150,taxRate:0,total:150,notes:''},
]

const SAMPLE_QUOTES = [
  {id:'QUO-509',clientId:5,clientName:'Harbor Clinic',       clientPhone:'(555) 822-5599',clientEmail:'ops@harborclinic.com',      type:'HVAC System Replace',description:'Full rooftop unit replacement, 5-ton commercial', created:'2026-03-28',expires:'2026-04-27',status:'Sent',     lineItems:[{id:1,description:'Rooftop HVAC Unit (5-ton)',qty:1,unit:13500,total:13500},{id:2,description:'Labor - Remove & Install (10hr)',qty:10,unit:150,total:1500},{id:3,description:'Crane Rental',qty:1,unit:900,total:900},{id:4,description:'Electrical Connections',qty:1,unit:750,total:750},{id:5,description:'Permits & Inspections',qty:1,unit:400,total:400},{id:6,description:'Disposal & Haul Away',qty:1,unit:300,total:300},{id:7,description:'Commissioning',qty:1,unit:500,total:500},{id:8,description:'Warranty (1yr parts & labor)',qty:1,unit:550,total:550}],total:18400,notes:'Price valid 30 days. Lead time 2 weeks on equipment.'},
  {id:'QUO-508',clientId:2,clientName:'Sunrise Apartments',  clientPhone:'(555) 480-2291',clientEmail:'mgmt@sunriseapts.com',      type:'Plumbing Overhaul',  description:'Re-pipe units 1–12 with PEX',                   created:'2026-03-25',expires:'2026-04-24',status:'Approved', lineItems:[{id:1,description:'Re-piping Materials PEX (12 units)',qty:1,unit:3200,total:3200},{id:2,description:'Labor (32hr)',qty:32,unit:120,total:3840},{id:3,description:'Fittings & Valves',qty:1,unit:850,total:850},{id:4,description:'Water Heater Replacement (2)',qty:2,unit:600,total:1200},{id:5,description:'Permits',qty:1,unit:450,total:450},{id:6,description:'Testing & Inspection',qty:1,unit:210,total:210}],total:9750,notes:'Scheduling requires 2-week notice for unit access.'},
  {id:'QUO-507',clientId:4,clientName:'Frank Holloway',       clientPhone:'(555) 391-0012',clientEmail:'frank.holloway@gmail.com', type:'HVAC Install',       description:'Mini-split system 2-zone install',               created:'2026-03-22',expires:'2026-04-21',status:'Declined', lineItems:[{id:1,description:'Mini-Split System (2-zone)',qty:1,unit:2800,total:2800},{id:2,description:'Installation Labor (6hr)',qty:6,unit:150,total:900},{id:3,description:'Electrical Connections',qty:1,unit:300,total:300},{id:4,description:'Line Set & Materials',qty:1,unit:200,total:200}],total:4200,notes:'Customer requested pricing for next season.'},
  {id:'QUO-506',clientId:7,clientName:'City Hall Complex',    clientPhone:'(555) 700-0001',clientEmail:'facilities@cityof.gov',    type:'Generator Install',  description:'Standby 50kW generator with transfer switch',    created:'2026-03-20',expires:'2026-04-19',status:'Sent',     lineItems:[{id:1,description:'50kW Standby Generator (Generac)',qty:1,unit:14000,total:14000},{id:2,description:'Installation Labor (16hr)',qty:16,unit:150,total:2400},{id:3,description:'Transfer Switch',qty:1,unit:2200,total:2200},{id:4,description:'Electrical Work',qty:1,unit:1800,total:1800},{id:5,description:'Concrete Pad',qty:1,unit:800,total:800},{id:6,description:'Permits & Inspections',qty:1,unit:800,total:800}],total:22000,notes:'PO required before scheduling.'},
  {id:'QUO-505',clientId:3,clientName:'Green Valley School',  clientPhone:'(555) 667-3344',clientEmail:'facilities@greenvalley.edu',type:'LED Retrofit',      description:'Gym and hallway LED lighting upgrade',           created:'2026-03-18',expires:'2026-04-17',status:'Approved', lineItems:[{id:1,description:'LED Fixtures (48 units)',qty:48,unit:70,total:3360},{id:2,description:'Labor (16hr)',qty:16,unit:110,total:1760},{id:3,description:'Control Systems',qty:1,unit:880,total:880},{id:4,description:'Permits',qty:1,unit:500,total:500}],total:6500,notes:'Install before summer break.'},
  {id:'QUO-504',clientId:8,clientName:'Rosa Delgado',         clientPhone:'(555) 298-6677',clientEmail:'rosita.delgado@yahoo.com', type:'Plumbing',          description:'Shower, vanity, and toilet plumbing remodel',    created:'2026-03-15',expires:'2026-04-14',status:'Declined', lineItems:[{id:1,description:'Shower Installation',qty:1,unit:1200,total:1200},{id:2,description:'Vanity & Sink',qty:1,unit:600,total:600},{id:3,description:'Toilet Replacement',qty:1,unit:400,total:400},{id:4,description:'Labor (8hr)',qty:8,unit:100,total:800},{id:5,description:'Materials & Supplies',qty:1,unit:100,total:100}],total:3100,notes:''},
  {id:'QUO-503',clientId:6,clientName:'Tom Nguyen',           clientPhone:'(555) 103-4421',clientEmail:'tnguyen@protonmail.com',   type:'Plumbing',          description:'Navien 240A install with gas line upgrade',      created:'2026-03-10',expires:'2026-04-09',status:'Sent',     lineItems:[{id:1,description:'Navien 240A Tankless Heater',qty:1,unit:1800,total:1800},{id:2,description:'Installation Labor (4hr)',qty:4,unit:150,total:600},{id:3,description:'Gas Line Upgrade',qty:1,unit:400,total:400}],total:2800,notes:''},
]

const SAMPLE_REQUESTS = [
  {id:'REQ-088',clientId:5,clientName:'Harbor Clinic',       clientPhone:'(555) 822-5599',type:'HVAC Repair',    description:'Rooftop unit down, no cooling in main wing. Patients complaining. Respond ASAP.',received:'Apr 1, 2026 9:14 AM', priority:'Urgent',status:'Open',     preferredDate:'2026-04-01',preferredTime:'As soon as possible',internalNotes:''},
  {id:'REQ-087',clientId:1,clientName:'Martha Reynolds',     clientPhone:'(555) 214-7830',type:'Plumbing',       description:'Slow leak under kitchen sink, possible pipe joint failure.',                     received:'Apr 1, 2026 7:52 AM', priority:'Normal',status:'Open',     preferredDate:'2026-04-02',preferredTime:'Morning 8am-12pm',    internalNotes:''},
  {id:'REQ-086',clientId:0,clientName:'James Park (New)',    clientPhone:'(555) 310-0044',type:'Furnace Service', description:'Looking to replace old furnace, wants estimate for new unit.',                    received:'Mar 31, 2026 4:30 PM',priority:'Low',   status:'Open',     preferredDate:'2026-04-05',preferredTime:'Afternoon 12pm-5pm', internalNotes:'Potential new customer. Follow up with quote.'},
  {id:'REQ-085',clientId:2,clientName:'Sunrise Apartments',  clientPhone:'(555) 480-2291',type:'Electrical',     description:'Breaker keeps tripping in unit 7, multiple appliances affected.',                 received:'Mar 31, 2026 2:10 PM',priority:'Urgent',status:'Converted',preferredDate:'2026-03-31',preferredTime:'Any Time',            internalNotes:'Converted to JOB-1041.'},
  {id:'REQ-084',clientId:7,clientName:'City Hall Complex',   clientPhone:'(555) 700-0001',type:'Generator',      description:'Annual maintenance due on standby generator. PO attached.',                       received:'Mar 30, 2026 11:00 AM',priority:'Normal',status:'Converted',preferredDate:'2026-04-03',preferredTime:'Morning 8am-12pm',    internalNotes:'Converted to QUO-506.'},
  {id:'REQ-083',clientId:8,clientName:'Rosa Delgado',        clientPhone:'(555) 298-6677',type:'Drain',          description:'Bathroom drain fully blocked, water backing up into tub.',                       received:'Mar 30, 2026 8:45 AM', priority:'Urgent',status:'Open',     preferredDate:'2026-03-30',preferredTime:'As soon as possible',internalNotes:''},
]

// ─── Low-level helpers ───────────────────────────────────────────────────────

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function persist(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ─── Seed on first load ──────────────────────────────────────────────────────

function seedAll() {
  if (!localStorage.getItem(KEYS.clients))  persist(KEYS.clients,  SAMPLE_CLIENTS)
  if (!localStorage.getItem(KEYS.jobs))     persist(KEYS.jobs,     SAMPLE_JOBS)
  if (!localStorage.getItem(KEYS.invoices)) persist(KEYS.invoices, SAMPLE_INVOICES)
  if (!localStorage.getItem(KEYS.quotes))   persist(KEYS.quotes,   SAMPLE_QUOTES)
  if (!localStorage.getItem(KEYS.requests)) persist(KEYS.requests, SAMPLE_REQUESTS)
}
seedAll()

// ─── Clients ─────────────────────────────────────────────────────────────────

export function getClients() {
  return load(KEYS.clients) || SAMPLE_CLIENTS
}

export function saveClients(arr) {
  persist(KEYS.clients, arr)
}

// Upsert: if client.id exists, update; otherwise prepend
export function saveClient(client) {
  const all = getClients()
  const exists = all.some(c => c.id === client.id)
  const updated = exists
    ? all.map(c => c.id === client.id ? client : c)
    : [...all, client]
  persist(KEYS.clients, updated)
  return updated
}

export function deleteClient(id) {
  const updated = getClients().filter(c => c.id !== id)
  persist(KEYS.clients, updated)
  return updated
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export function getJobs() {
  return load(KEYS.jobs) || SAMPLE_JOBS
}

export function saveJobs(arr) {
  persist(KEYS.jobs, arr)
}

export function saveJob(job) {
  const all = getJobs()
  const exists = all.some(j => j.id === job.id)
  const updated = exists
    ? all.map(j => j.id === job.id ? job : j)
    : [job, ...all]
  persist(KEYS.jobs, updated)
  return updated
}

export function deleteJob(id) {
  const updated = getJobs().filter(j => j.id !== id)
  persist(KEYS.jobs, updated)
  return updated
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export function getInvoices() {
  return load(KEYS.invoices) || SAMPLE_INVOICES
}

export function saveInvoices(arr) {
  persist(KEYS.invoices, arr)
}

export function saveInvoice(inv) {
  const all = getInvoices()
  const exists = all.some(i => i.id === inv.id)
  const updated = exists
    ? all.map(i => i.id === inv.id ? inv : i)
    : [inv, ...all]
  persist(KEYS.invoices, updated)
  return updated
}

export function deleteInvoice(id) {
  const updated = getInvoices().filter(i => i.id !== id)
  persist(KEYS.invoices, updated)
  return updated
}

// ─── Quotes ──────────────────────────────────────────────────────────────────

export function getQuotes() {
  return load(KEYS.quotes) || SAMPLE_QUOTES
}

export function saveQuotes(arr) {
  persist(KEYS.quotes, arr)
}

export function saveQuote(quote) {
  const all = getQuotes()
  const exists = all.some(q => q.id === quote.id)
  const updated = exists
    ? all.map(q => q.id === quote.id ? quote : q)
    : [quote, ...all]
  persist(KEYS.quotes, updated)
  return updated
}

export function deleteQuote(id) {
  const updated = getQuotes().filter(q => q.id !== id)
  persist(KEYS.quotes, updated)
  return updated
}

// ─── Requests ────────────────────────────────────────────────────────────────

export function getRequests() {
  return load(KEYS.requests) || SAMPLE_REQUESTS
}

export function saveRequests(arr) {
  persist(KEYS.requests, arr)
}

export function saveRequest(req) {
  const all = getRequests()
  const exists = all.some(r => r.id === req.id)
  const updated = exists
    ? all.map(r => r.id === req.id ? req : r)
    : [req, ...all]
  persist(KEYS.requests, updated)
  return updated
}

export function deleteRequest(id) {
  const updated = getRequests().filter(r => r.id !== id)
  persist(KEYS.requests, updated)
  return updated
}

// ─── Settings ────────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'customsfieldpro_settings'

const DEFAULT_SETTINGS = {
  company: {
    name:     'CustomsFieldPro Services',
    address:  '100 Main St',
    city:     'Springfield',
    zip:      '22150',
    phone:    '(555) 800-0000',
    email:    'info@customsfieldprocrm.com',
    website:  'www.customsfieldprocrm.com',
    taxRate:  0,
    currency: 'USD',
  },
  technicians: [
    { id: 'moore',  name: 'D. Moore',  email: 'moore@customsfieldpro.com',  phone: '(555) 101-0001', specialty: 'HVAC',            color: '#2563eb' },
    { id: 'torres', name: 'A. Torres', email: 'torres@customsfieldpro.com', phone: '(555) 101-0002', specialty: 'Plumbing',        color: '#16a34a' },
    { id: 'singh',  name: 'R. Singh',  email: 'singh@customsfieldpro.com',  phone: '(555) 101-0003', specialty: 'Electrical',      color: '#d97706' },
    { id: 'patel',  name: 'K. Patel',  email: 'patel@customsfieldpro.com',  phone: '(555) 101-0004', specialty: 'HVAC',            color: '#7c3aed' },
  ],
  services: [
    { id: 'svc-1', name: 'HVAC',            rate: 150 },
    { id: 'svc-2', name: 'Plumbing',        rate: 130 },
    { id: 'svc-3', name: 'Electrical',      rate: 140 },
    { id: 'svc-4', name: 'Appliance Repair', rate: 120 },
  ],
  notifications: {
    emailOnNewRequest:    true,
    emailOnJobAssignment: false,
    emailOnJobCompletion: true,
    emailOnInvoiceSent:   false,
    emailOnQuoteSent:     false,
    smsOnJobAssignment:   false,
  },
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS))
      return DEFAULT_SETTINGS
    }
    // Deep-merge so new keys added in DEFAULT_SETTINGS always exist
    const saved = JSON.parse(raw)
    return {
      company:       { ...DEFAULT_SETTINGS.company,       ...saved.company },
      technicians:   saved.technicians   ?? DEFAULT_SETTINGS.technicians,
      services:      saved.services      ?? DEFAULT_SETTINGS.services,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...saved.notifications },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// ─── Maintenance Plans ────────────────────────────────────────────────────────

export function getMaintenancePlans() {
  try {
    const raw = localStorage.getItem(KEYS.maintenance)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveMaintenancePlans(arr) {
  localStorage.setItem(KEYS.maintenance, JSON.stringify(arr))
}

export function saveMaintenancePlan(plan) {
  const all = getMaintenancePlans()
  const idx = all.findIndex(p => p.id === plan.id)
  if (idx >= 0) all[idx] = plan
  else all.unshift(plan)
  saveMaintenancePlans(all)
}

export function deleteMaintenancePlan(id) {
  saveMaintenancePlans(getMaintenancePlans().filter(p => p.id !== id))
}

// ─── Inventory ───────────────────────────────────────────────────────────────

const SAMPLE_PARTS = [
  { id:'part-001', name:'AC Filter 16x20x1',         sku:'ACF-1620',    category:'HVAC Parts',       description:'Standard pleated AC/furnace filter',       inStock:24, minStock:10, unitCost:4.50,  sellingPrice:11.25,  supplier:'HVAC Supply Co',         supplierContact:'(555) 100-2000', notes:'' },
  { id:'part-002', name:'Refrigerant R-410A (25lb)', sku:'REF-410-25',  category:'HVAC Parts',       description:'R-410A refrigerant canister 25lb',          inStock:3,  minStock:2,  unitCost:85,    sellingPrice:212.50, supplier:'HVAC Supply Co',         supplierContact:'(555) 100-2000', notes:'Requires EPA 608 certification' },
  { id:'part-003', name:'Thermostat (Programmable)', sku:'THERM-PRG',   category:'HVAC Parts',       description:'7-day programmable digital thermostat',     inStock:8,  minStock:5,  unitCost:28,    sellingPrice:70,     supplier:'HVAC Supply Co',         supplierContact:'(555) 100-2000', notes:'' },
  { id:'part-004', name:'PEX Pipe 1/2" (100ft)',     sku:'PEX-05-100',  category:'Plumbing Parts',   description:'PEX-A flexible water supply pipe roll',     inStock:2,  minStock:4,  unitCost:32,    sellingPrice:80,     supplier:'Plumbing Depot',         supplierContact:'(555) 200-3000', notes:'' },
  { id:'part-005', name:'Ball Valve 3/4"',           sku:'BV-075',      category:'Plumbing Parts',   description:'Full-port brass ball valve',                inStock:15, minStock:8,  unitCost:8.50,  sellingPrice:21.25,  supplier:'Plumbing Depot',         supplierContact:'(555) 200-3000', notes:'' },
  { id:'part-006', name:'Circuit Breaker 20A',       sku:'CB-20A',      category:'Electrical Parts', description:'Single-pole 20A residential breaker',       inStock:1,  minStock:5,  unitCost:6,     sellingPrice:15,     supplier:'Electric Wholesale',     supplierContact:'(555) 300-4000', notes:'' },
  { id:'part-007', name:'Wire Nuts (Box 100)',        sku:'WN-100',      category:'Electrical Parts', description:'Assorted wire connectors, 100-pack',        inStock:12, minStock:3,  unitCost:7,     sellingPrice:17.50,  supplier:'Electric Wholesale',     supplierContact:'(555) 300-4000', notes:'' },
  { id:'part-008', name:'Dryer Belt Universal',      sku:'DRY-BELT-U',  category:'Appliance Parts',  description:'Universal drum drive belt for most dryers', inStock:6,  minStock:4,  unitCost:9,     sellingPrice:22.50,  supplier:'Appliance Parts Direct', supplierContact:'(555) 400-5000', notes:'' },
  { id:'part-009', name:'Refrigerator Water Filter', sku:'FRIDGE-WF',   category:'Appliance Parts',  description:'Universal refrigerator inline water filter', inStock:0,  minStock:5,  unitCost:12,    sellingPrice:30,     supplier:'Appliance Parts Direct', supplierContact:'(555) 400-5000', notes:'' },
  { id:'part-010', name:'Duct Tape (Pro Grade)',     sku:'DUCT-PRO',    category:'Consumables',      description:'Heavy-duty professional duct tape roll',     inStock:20, minStock:8,  unitCost:5.50,  sellingPrice:13.75,  supplier:'Pro Tools Supply',       supplierContact:'(555) 500-6000', notes:'' },
  { id:'part-011', name:'Pipe Thread Sealant',       sku:'PTS-180',     category:'Consumables',      description:'PTFE thread sealant 180ml',                 inStock:8,  minStock:6,  unitCost:4,     sellingPrice:10,     supplier:'Plumbing Depot',         supplierContact:'(555) 200-3000', notes:'' },
  { id:'part-012', name:'Clamp Multimeter',          sku:'MMC-200',     category:'Tools & Equipment', description:'Digital clamp multimeter, auto-ranging',   inStock:3,  minStock:1,  unitCost:45,    sellingPrice:112.50, supplier:'Electric Wholesale',     supplierContact:'(555) 300-4000', notes:'' },
]

const _now = Date.now()
const SAMPLE_MOVES = [
  { id:'move-001', partId:'part-001', partName:'AC Filter 16x20x1',         type:'STOCK_ADDED',   quantity:30,  jobId:'',       jobNumber:'',       technicianId:'',      notes:'Initial stock purchase',              timestamp: _now - 30*86400000 },
  { id:'move-002', partId:'part-001', partName:'AC Filter 16x20x1',         type:'USED_ON_JOB',   quantity:-2,  jobId:'JOB-1039', jobNumber:'JOB-1039', technicianId:'moore', notes:'Filter replacement',               timestamp: _now - 5*86400000 },
  { id:'move-003', partId:'part-002', partName:'Refrigerant R-410A (25lb)', type:'STOCK_ADDED',   quantity:5,   jobId:'',       jobNumber:'',       technicianId:'',      notes:'Monthly reorder',                     timestamp: _now - 20*86400000 },
  { id:'move-004', partId:'part-002', partName:'Refrigerant R-410A (25lb)', type:'USED_ON_JOB',   quantity:-2,  jobId:'JOB-1042', jobNumber:'JOB-1042', technicianId:'moore', notes:'Refrigerant top-up',               timestamp: _now - 3*86400000 },
  { id:'move-005', partId:'part-004', partName:'PEX Pipe 1/2" (100ft)',     type:'STOCK_ADDED',   quantity:6,   jobId:'',       jobNumber:'',       technicianId:'',      notes:'Initial stock',                       timestamp: _now - 25*86400000 },
  { id:'move-006', partId:'part-004', partName:'PEX Pipe 1/2" (100ft)',     type:'USED_ON_JOB',   quantity:-4,  jobId:'JOB-1041', jobNumber:'JOB-1041', technicianId:'torres', notes:'Re-pipe units 4-6',              timestamp: _now - 2*86400000 },
  { id:'move-007', partId:'part-006', partName:'Circuit Breaker 20A',       type:'STOCK_ADDED',   quantity:10,  jobId:'',       jobNumber:'',       technicianId:'',      notes:'Initial stock',                       timestamp: _now - 28*86400000 },
  { id:'move-008', partId:'part-006', partName:'Circuit Breaker 20A',       type:'USED_ON_JOB',   quantity:-9,  jobId:'JOB-1035', jobNumber:'JOB-1035', technicianId:'singh', notes:'Panel upgrade breakers',           timestamp: _now - 7*86400000 },
  { id:'move-009', partId:'part-009', partName:'Refrigerator Water Filter', type:'STOCK_ADDED',   quantity:8,   jobId:'',       jobNumber:'',       technicianId:'',      notes:'Initial stock',                       timestamp: _now - 15*86400000 },
  { id:'move-010', partId:'part-009', partName:'Refrigerator Water Filter', type:'USED_ON_JOB',   quantity:-8,  jobId:'JOB-1038', jobNumber:'JOB-1038', technicianId:'patel', notes:'Quarterly maintenance',            timestamp: _now - 4*86400000 },
  { id:'move-011', partId:'part-003', partName:'Thermostat (Programmable)', type:'STOCK_ADDED',   quantity:10,  jobId:'',       jobNumber:'',       technicianId:'',      notes:'Restock order',                       timestamp: _now - 18*86400000 },
  { id:'move-012', partId:'part-003', partName:'Thermostat (Programmable)', type:'USED_ON_JOB',   quantity:-2,  jobId:'JOB-1042', jobNumber:'JOB-1042', technicianId:'moore', notes:'Thermostat replacement',          timestamp: _now - 3*86400000 },
]

const SAMPLE_POS = [
  {
    id:'PO-2026-001', supplier:'Plumbing Depot', supplierContact:'(555) 200-3000',
    orderDate:'2026-03-20', expectedDelivery:'2026-03-27', status:'Received',
    lineItems:[
      { partId:'part-004', partName:'PEX Pipe 1/2" (100ft)',  sku:'PEX-05-100', qty:6,  unitCost:32,   total:192 },
      { partId:'part-005', partName:'Ball Valve 3/4"',        sku:'BV-075',     qty:20, unitCost:8.50, total:170 },
    ],
    total:362, notes:'', receivedAt:'2026-03-27',
  },
  {
    id:'PO-2026-002', supplier:'Electric Wholesale', supplierContact:'(555) 300-4000',
    orderDate:'2026-04-01', expectedDelivery:'2026-04-05', status:'Sent',
    lineItems:[
      { partId:'part-006', partName:'Circuit Breaker 20A', sku:'CB-20A', qty:15, unitCost:6,  total:90 },
      { partId:'part-007', partName:'Wire Nuts (Box 100)',  sku:'WN-100', qty:5,  unitCost:7,  total:35 },
    ],
    total:125, notes:'Urgent — low stock on breakers', receivedAt:null,
  },
  {
    id:'PO-2026-003', supplier:'Appliance Parts Direct', supplierContact:'(555) 400-5000',
    orderDate:'2026-04-02', expectedDelivery:'2026-04-08', status:'Draft',
    lineItems:[
      { partId:'part-009', partName:'Refrigerator Water Filter', sku:'FRIDGE-WF', qty:10, unitCost:12, total:120 },
      { partId:'part-008', partName:'Dryer Belt Universal',      sku:'DRY-BELT-U',qty:6,  unitCost:9,  total:54  },
    ],
    total:174, notes:'', receivedAt:null,
  },
]

export function getParts()         { return load(KEYS.inventory)      || SAMPLE_PARTS }
export function saveParts(arr)     { persist(KEYS.inventory, arr) }
export function savePart(part) {
  const arr  = getParts()
  const idx  = arr.findIndex(p => p.id === part.id)
  const next = idx >= 0 ? arr.map(p => p.id === part.id ? part : p) : [part, ...arr]
  persist(KEYS.inventory, next)
  return next
}
export function deletePart(id) {
  const next = getParts().filter(p => p.id !== id)
  persist(KEYS.inventory, next)
  return next
}
export function getLowStockCount() {
  return getParts().filter(p => p.inStock <= p.minStock).length
}

export function getStockMoves()        { return load(KEYS.stockMoves)     || SAMPLE_MOVES }
export function saveStockMoves(arr)    { persist(KEYS.stockMoves, arr) }
export function addStockMove(move) {
  const arr  = getStockMoves()
  const next = [move, ...arr]
  persist(KEYS.stockMoves, next)
  // Apply qty change to part
  const parts = getParts()
  const pNext = parts.map(p => p.id === move.partId ? { ...p, inStock: Math.max(0, p.inStock + move.quantity) } : p)
  persist(KEYS.inventory, pNext)
  return next
}

export function getPurchaseOrders()      { return load(KEYS.purchaseOrders) || SAMPLE_POS }
export function savePurchaseOrders(arr)  { persist(KEYS.purchaseOrders, arr) }
export function savePurchaseOrder(po) {
  const arr  = getPurchaseOrders()
  const idx  = arr.findIndex(p => p.id === po.id)
  const next = idx >= 0 ? arr.map(p => p.id === po.id ? po : p) : [po, ...arr]
  persist(KEYS.purchaseOrders, next)
  return next
}

// ─── Time Entries (stored on job records) ────────────────────────────────────

/** Returns all time entries across all jobs, each annotated with jobId, clientName, jobType, jobDate */
export function getAllTimeEntries() {
  return getJobs().flatMap(job =>
    (job.timeEntries || []).map(entry => ({
      ...entry,
      jobId:      job.id,
      jobNumber:  job.id,
      clientName: job.clientName,
      jobType:    job.type,
      jobDate:    job.date || job.startDate || '',
    }))
  )
}

/** Upserts a single time entry on a job record */
export function saveTimeEntry(jobId, entry) {
  const all = getJobs()
  const idx = all.findIndex(j => j.id === jobId)
  if (idx < 0) return
  const job     = all[idx]
  const entries = [...(job.timeEntries || [])]
  const eIdx    = entries.findIndex(e => e.id === entry.id)
  if (eIdx >= 0) entries[eIdx] = entry
  else entries.push(entry)
  all[idx] = { ...job, timeEntries: entries }
  saveJobs(all)
}

// ─── Reset ───────────────────────────────────────────────────────────────────

export function clearAllData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
  localStorage.removeItem(SETTINGS_KEY)
  localStorage.removeItem('ff_flagged_reviews')
  localStorage.removeItem('ff_maintenance_reminder_last_run')
  seedAll()
}
