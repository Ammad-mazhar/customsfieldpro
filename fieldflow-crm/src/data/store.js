// FieldFlow CRM — localStorage data store
// All reads/writes go through these functions.
import { initCounters } from '../utils/numberGenerator'

const KEYS = {
  clients:        'ff_clients',
  jobs:           'ff_jobs',
  invoices:       'ff_invoices',
  quotes:         'ff_quotes',
  requests:       'ff_requests',
  serviceCalls:   'ff_service_calls',
  maintenance:    'ff_maintenance_plans',
  inventory:      'ff_inventory',
  stockMoves:     'ff_stock_moves',
  purchaseOrders: 'ff_purchase_orders',
}

// ─── Sample seed data ───────────────────────────────────────────────────────

const SAMPLE_CLIENTS = [
  { id:'CLT-0001', firstName:'Martha',       lastName:'Reynolds',  name:'Martha Reynolds',     phone:'(555) 214-7830', email:'martha.reynolds@email.com',  address:'142 Elm St',      city:'Springfield', state:'VA', zip:'22150', type:'Residential', balance:0,    since:'Mar 2023', property:{sqft:1850, year:1998,stories:2}, equipment:[{type:'AC Unit',brand:'Carrier',model:'24ACC636A003',installed:'2019',nextService:'Jul 2026'},{type:'Furnace',brand:'Carrier',model:'CH96',installed:'2019',nextService:'Oct 2026'}], jobs:[{id:'JOB-0001',type:'HVAC Repair',status:'In Progress',date:'Apr 1, 2026'}],  invoices:[{id:'INV-0001',amount:'$380.00', status:'Sent',   due:'Apr 15, 2026'}], notes:'Prefers morning appointments. Has a dog — ring doorbell. Gate code: 4421.' },
  { id:'CLT-0002', firstName:'Sunrise',      lastName:'Apartments',name:'Sunrise Apartments',  phone:'(555) 480-2291', email:'mgmt@sunriseapts.com',        address:'88 Lakewood Dr',  city:'Riverside',   state:'VA', zip:'20150', type:'Commercial', balance:1240, since:'Jan 2022', property:{sqft:24000,year:1985,stories:4}, equipment:[{type:'Rooftop Unit',brand:'Trane',model:'RTU-5T',installed:'2018',nextService:'May 2026'},{type:'Boiler',brand:'Weil-McLain',model:'CGa-8',installed:'2015',nextService:'Sep 2026'}], jobs:[{id:'JOB-0002',type:'Plumbing',status:'Scheduled',date:'Apr 1, 2026'}],     invoices:[{id:'INV-0002',amount:'$1,240.00',status:'Draft', due:'Apr 16, 2026'}], notes:'Contact PM Diane ext 204. 24hr notice required for unit access.' },
  { id:'CLT-0003', firstName:'Green Valley', lastName:'School',    name:'Green Valley School', phone:'(555) 667-3344', email:'facilities@greenvalley.edu',  address:'900 Valley Rd',   city:'Greenfield',  state:'VA', zip:'20152', type:'Commercial', balance:0,    since:'Aug 2021', property:{sqft:48000,year:1972,stories:2}, equipment:[{type:'Chiller',brand:'York',model:'YCAL0014',installed:'2020',nextService:'Jun 2026'}], jobs:[{id:'JOB-0003',type:'Electrical',status:'Completed',date:'Mar 31, 2026'}],   invoices:[{id:'INV-0003',amount:'$520.00', status:'Paid',  due:'Apr 14, 2026'}], notes:'Work must be before 7am or after 4pm on school days.' },
  { id:'CLT-0004', firstName:'Frank',        lastName:'Holloway',  name:'Frank Holloway',      phone:'(555) 391-0012', email:'frank.holloway@gmail.com',    address:'77 Oak Lane',     city:'Hillside',    state:'VA', zip:'20151', type:'Residential', balance:320,  since:'Nov 2023', property:{sqft:2200, year:2004,stories:2}, equipment:[{type:'Furnace',brand:'Lennox',model:'SLP98',installed:'2021',nextService:'Oct 2026'},{type:'AC Unit',brand:'Lennox',model:'XC21',installed:'2021',nextService:'Apr 2026'}], jobs:[{id:'JOB-0004',type:'Furnace Service',status:'Completed',date:'Mar 30, 2026'}], invoices:[{id:'INV-0004',amount:'$185.00', status:'Paid',  due:'Apr 13, 2026'}], notes:'On service plan. Sends check by mail.' },
  { id:'CLT-0005', firstName:'Harbor',       lastName:'Clinic',    name:'Harbor Clinic',       phone:'(555) 822-5599', email:'ops@harborclinic.com',        address:'301 Harbor Blvd', city:'Portview',    state:'VA', zip:'20153', type:'Commercial', balance:3810, since:'Feb 2020', property:{sqft:12000,year:2001,stories:1}, equipment:[{type:'HVAC System',brand:'Daikin',model:'DZ20VC',installed:'2022',nextService:'Mar 2026'}], jobs:[{id:'JOB-0005',type:'HVAC Repair',status:'In Progress',date:'Mar 30, 2026'}],  invoices:[{id:'INV-0005',amount:'$640.00', status:'Overdue',due:'Mar 30, 2026'}], notes:'Medical facility — HVAC must stay operational. Emergency: (555) 822-9911.' },
  { id:'CLT-0006', firstName:'Tom',          lastName:'Nguyen',    name:'Tom Nguyen',          phone:'(555) 103-4421', email:'tnguyen@protonmail.com',      address:'55 Pine Ave',     city:'Lakewood',    state:'VA', zip:'20154', type:'Residential', balance:0,    since:'Jan 2024', property:{sqft:1600, year:2010,stories:1}, equipment:[{type:'Water Heater',brand:'AO Smith',model:'ProMax 40G',installed:'2018',nextService:'Apr 2026'}], jobs:[{id:'JOB-0006',type:'Plumbing',status:'Scheduled',date:'Apr 2, 2026'}],      invoices:[{id:'INV-0007',amount:'$920.00', status:'Draft', due:'Apr 17, 2026'}], notes:'' },
  { id:'CLT-0007', firstName:'City Hall',    lastName:'Complex',   name:'City Hall Complex',   phone:'(555) 700-0001', email:'facilities@cityof.gov',       address:'1 Government Pl', city:'Midtown',     state:'VA', zip:'20155', type:'Municipal',  balance:7500, since:'May 2019', property:{sqft:85000,year:1962,stories:6}, equipment:[{type:'Elec. Panel',brand:'Siemens',model:'200A Service',installed:'2023',nextService:'Mar 2027'}], jobs:[{id:'JOB-0008',type:'Electrical',status:'In Progress',date:'Mar 28, 2026'}],  invoices:[{id:'INV-0006',amount:'$4,200.00',status:'Overdue',due:'Mar 28, 2026'}], notes:'PO required for all work. Billing: A. Mitchell x301.' },
  { id:'CLT-0008', firstName:'Rosa',         lastName:'Delgado',   name:'Rosa Delgado',        phone:'(555) 298-6677', email:'rosita.delgado@yahoo.com',   address:'23 Birch Ct',     city:'Eastside',    state:'VA', zip:'20156', type:'Residential', balance:150,  since:'Jul 2024', property:{sqft:1100, year:1995,stories:1}, equipment:[], jobs:[{id:'JOB-0007',type:'Drain',status:'Cancelled',date:'Mar 29, 2026'}],         invoices:[{id:'INV-0008',amount:'$150.00', status:'Sent',  due:'Apr 12, 2026'}], notes:'New customer. Spanish-speaking household.' },
]

const SAMPLE_JOBS = [
  {id:'JOB-0001',clientId:'CLT-0001',clientName:'Martha Reynolds',   clientPhone:'(555) 214-7830',clientEmail:'martha.reynolds@email.com',  clientAddress:'142 Elm St, Springfield, VA',    type:'HVAC',        title:'AC Unit Refrigerant Check',      techName:'D. Moore',   technicianId:'moore',  status:'In Progress',priority:'High',  date:'2026-04-01',time:'08:00',duration:'2 hrs',   lineItems:[{id:1,description:'Service Call Fee',qty:1,unit:75,total:75},{id:2,description:'Labor - Diagnostic (2hr)',qty:2,unit:80,total:160},{id:3,description:'Refrigerant R-410A (1.5lb)',qty:1,unit:95,total:95},{id:4,description:'Freon Handling Fee',qty:1,unit:50,total:50}],subtotal:380,taxRate:0,total:380,  linkedQuoteNumber:null,linkedQuoteId:null,linkedInvoiceNumbers:['INV-0001'],linkedInvoiceIds:['INV-0001'],notes:'AC unit not cooling below 75°F. Check refrigerant levels and condenser coils.'},
  {id:'JOB-0002',clientId:'CLT-0002',clientName:'Sunrise Apartments',clientPhone:'(555) 480-2291',clientEmail:'mgmt@sunriseapts.com',        clientAddress:'88 Lakewood Dr, Riverside, VA',  type:'Plumbing',    title:'Sink Fixture Install Units 4-6', techName:'A. Torres',  technicianId:'torres', status:'Scheduled',  priority:'Normal',date:'2026-04-01',time:'10:30',duration:'4 hrs',   lineItems:[{id:1,description:'Labor - Plumbing Install (4hr)',qty:4,unit:110,total:440},{id:2,description:'PEX Fittings & Hardware',qty:1,unit:280,total:280},{id:3,description:'Fixture Units (3)',qty:3,unit:120,total:360},{id:4,description:'Permit Fee',qty:1,unit:160,total:160}],subtotal:1240,taxRate:0,total:1240,linkedQuoteNumber:'QT-0002',linkedQuoteId:'QT-0002',linkedInvoiceNumbers:['INV-0002'],linkedInvoiceIds:['INV-0002'],notes:'Install 3 new sink fixtures in units 4, 5, 6. Coordinate access with PM Diane.'},
  {id:'JOB-0003',clientId:'CLT-0003',clientName:'Green Valley School',clientPhone:'(555) 667-3344',clientEmail:'facilities@greenvalley.edu',clientAddress:'900 Valley Rd, Greenfield, VA',  type:'Electrical',  title:'Annual Panel Inspection',        techName:'R. Singh',   technicianId:'singh',  status:'Completed',  priority:'Normal',date:'2026-03-31',time:'07:00',duration:'2 hrs',   lineItems:[{id:1,description:'Electrical Inspection Fee',qty:1,unit:200,total:200},{id:2,description:'Labor (2hr)',qty:2,unit:110,total:220},{id:3,description:'Panel Safety Test',qty:1,unit:100,total:100}],subtotal:520,taxRate:0,total:520,  linkedQuoteNumber:null,linkedQuoteId:null,linkedInvoiceNumbers:['INV-0003'],linkedInvoiceIds:['INV-0003'],notes:'Annual safety inspection. All panels passed. No issues found.'},
  {id:'JOB-0004',clientId:'CLT-0004',clientName:'Frank Holloway',    clientPhone:'(555) 391-0012',clientEmail:'frank.holloway@gmail.com',    clientAddress:'77 Oak Lane, Hillside, VA',      type:'HVAC',        title:'Furnace Seasonal Tune-Up',       techName:'D. Moore',   technicianId:'moore',  status:'Completed',  priority:'Low',   date:'2026-03-30',time:'09:00',duration:'1 hr',    lineItems:[{id:1,description:'Furnace Tune-Up (standard)',qty:1,unit:145,total:145},{id:2,description:'Filter Replacement',qty:1,unit:40,total:40}],subtotal:185,taxRate:0,total:185,  linkedQuoteNumber:null,linkedQuoteId:null,linkedInvoiceNumbers:['INV-0004'],linkedInvoiceIds:['INV-0004'],notes:'Seasonal maintenance complete. Filter replaced. Next service Oct 2026.'},
  {id:'JOB-0005',clientId:'CLT-0005',clientName:'Harbor Clinic',     clientPhone:'(555) 822-5599',clientEmail:'ops@harborclinic.com',        clientAddress:'301 Harbor Blvd, Portview, VA',  type:'HVAC',        title:'HVAC Quarterly Maintenance',     techName:'K. Patel',   technicianId:'patel',  status:'In Progress',priority:'Urgent',date:'2026-03-30',time:'08:00',duration:'4 hrs',   lineItems:[{id:1,description:'HVAC Maintenance Contract Q1',qty:1,unit:450,total:450},{id:2,description:'Coil Cleaning',qty:1,unit:120,total:120},{id:3,description:'Refrigerant Top-Up',qty:1,unit:70,total:70}],subtotal:640,taxRate:0,total:640,  linkedQuoteNumber:'QT-0001',linkedQuoteId:'QT-0001',linkedInvoiceNumbers:['INV-0005'],linkedInvoiceIds:['INV-0005'],notes:'Quarterly system inspection and coil cleaning.'},
  {id:'JOB-0006',clientId:'CLT-0006',clientName:'Tom Nguyen',        clientPhone:'(555) 103-4421',clientEmail:'tnguyen@protonmail.com',      clientAddress:'55 Pine Ave, Lakewood, VA',      type:'Plumbing',    title:'Water Heater Replacement',       techName:'R. Singh',   technicianId:'singh',  status:'Scheduled',  priority:'Normal',date:'2026-04-02',time:'09:00',duration:'2 hrs',   lineItems:[{id:1,description:'Water Heater 40gal',qty:1,unit:650,total:650},{id:2,description:'Labor - Installation (2hr)',qty:2,unit:120,total:240},{id:3,description:'Disposal Fee',qty:1,unit:30,total:30}],subtotal:920,taxRate:0,total:920,  linkedQuoteNumber:'QT-0007',linkedQuoteId:'QT-0007',linkedInvoiceNumbers:['INV-0007'],linkedInvoiceIds:['INV-0007'],notes:'Replace old 40-gallon tank. Old unit showing corrosion.'},
  {id:'JOB-0007',clientId:'CLT-0008',clientName:'Rosa Delgado',      clientPhone:'(555) 298-6677',clientEmail:'rosita.delgado@yahoo.com',   clientAddress:'23 Birch Ct, Eastside, VA',      type:'Plumbing',    title:'Kitchen Drain Blockage',         techName:'A. Torres',  technicianId:'torres', status:'Cancelled',  priority:'Normal',date:'2026-03-29',time:'13:00',duration:'1 hr',    lineItems:[{id:1,description:'Drain Cleaning Service',qty:1,unit:120,total:120},{id:2,description:'Emergency Call Fee',qty:1,unit:30,total:30}],subtotal:150,taxRate:0,total:150,  linkedQuoteNumber:null,linkedQuoteId:null,linkedInvoiceNumbers:['INV-0008'],linkedInvoiceIds:['INV-0008'],notes:'Customer cancelled day of appointment.'},
  {id:'JOB-0008',clientId:'CLT-0007',clientName:'City Hall Complex', clientPhone:'(555) 700-0001',clientEmail:'facilities@cityof.gov',       clientAddress:'1 Government Pl, Midtown, VA',   type:'Electrical',  title:'200A Service Panel Upgrade',     techName:'R. Singh',   technicianId:'singh',  status:'In Progress',priority:'High',  date:'2026-03-28',time:'07:00',duration:'Full Day', lineItems:[{id:1,description:'Electrical Service Upgrade',qty:1,unit:2500,total:2500},{id:2,description:'Panel Replacement (200A)',qty:1,unit:1200,total:1200},{id:3,description:'Wiring & Materials',qty:1,unit:350,total:350},{id:4,description:'Permit',qty:1,unit:150,total:150}],subtotal:4200,taxRate:0,total:4200,linkedQuoteNumber:'QT-0004',linkedQuoteId:'QT-0004',linkedInvoiceNumbers:['INV-0006'],linkedInvoiceIds:['INV-0006'],notes:'Full panel upgrade. Requires PO from city procurement.'},
]

const SAMPLE_INVOICES = [
  {id:'INV-0001',clientId:'CLT-0001',clientName:'Martha Reynolds',   clientPhone:'(555) 214-7830',clientEmail:'martha.reynolds@email.com',  clientAddress:'142 Elm St, Springfield, VA',    jobRef:'JOB-0001',linkedJobId:'JOB-0001',linkedQuoteNumber:null,linkedQuoteId:null,issued:'2026-04-01',due:'2026-04-15',status:'Sent',    lineItems:[{id:1,description:'Service Call Fee',qty:1,unit:75,total:75},{id:2,description:'Labor - Diagnostic (2hr)',qty:2,unit:80,total:160},{id:3,description:'Refrigerant R-410A (1.5lb)',qty:1,unit:95,total:95},{id:4,description:'Freon Handling Fee',qty:1,unit:50,total:50}],subtotal:380,taxRate:0,total:380,notes:'Thank you for choosing FieldFlow services.'},
  {id:'INV-0002',clientId:'CLT-0002',clientName:'Sunrise Apartments',clientPhone:'(555) 480-2291',clientEmail:'mgmt@sunriseapts.com',        clientAddress:'88 Lakewood Dr, Riverside, VA',  jobRef:'JOB-0002',linkedJobId:'JOB-0002',linkedQuoteNumber:'QT-0002',linkedQuoteId:'QT-0002',issued:'2026-04-01',due:'2026-04-16',status:'Draft',   lineItems:[{id:1,description:'Labor - Plumbing Install (4hr)',qty:4,unit:110,total:440},{id:2,description:'PEX Fittings & Hardware',qty:1,unit:280,total:280},{id:3,description:'Fixture Units (3)',qty:3,unit:120,total:360},{id:4,description:'Permit Fee',qty:1,unit:160,total:160}],subtotal:1240,taxRate:0,total:1240,notes:''},
  {id:'INV-0003',clientId:'CLT-0003',clientName:'Green Valley School',clientPhone:'(555) 667-3344',clientEmail:'facilities@greenvalley.edu',clientAddress:'900 Valley Rd, Greenfield, VA',  jobRef:'JOB-0003',linkedJobId:'JOB-0003',linkedQuoteNumber:null,linkedQuoteId:null,issued:'2026-03-31',due:'2026-04-14',status:'Paid',    lineItems:[{id:1,description:'Electrical Inspection Fee',qty:1,unit:200,total:200},{id:2,description:'Labor (2hr)',qty:2,unit:110,total:220},{id:3,description:'Panel Safety Test',qty:1,unit:100,total:100}],subtotal:520,taxRate:0,total:520,notes:''},
  {id:'INV-0004',clientId:'CLT-0004',clientName:'Frank Holloway',    clientPhone:'(555) 391-0012',clientEmail:'frank.holloway@gmail.com',    clientAddress:'77 Oak Lane, Hillside, VA',      jobRef:'JOB-0004',linkedJobId:'JOB-0004',linkedQuoteNumber:null,linkedQuoteId:null,issued:'2026-03-30',due:'2026-04-13',status:'Paid',    lineItems:[{id:1,description:'Furnace Tune-Up (standard)',qty:1,unit:145,total:145},{id:2,description:'Filter Replacement',qty:1,unit:40,total:40}],subtotal:185,taxRate:0,total:185,notes:''},
  {id:'INV-0005',clientId:'CLT-0005',clientName:'Harbor Clinic',     clientPhone:'(555) 822-5599',clientEmail:'ops@harborclinic.com',        clientAddress:'301 Harbor Blvd, Portview, VA',  jobRef:'JOB-0005',linkedJobId:'JOB-0005',linkedQuoteNumber:'QT-0001',linkedQuoteId:'QT-0001',issued:'2026-03-30',due:'2026-03-30',status:'Overdue', lineItems:[{id:1,description:'HVAC Maintenance Contract Q1',qty:1,unit:450,total:450},{id:2,description:'Coil Cleaning',qty:1,unit:120,total:120},{id:3,description:'Refrigerant Top-Up',qty:1,unit:70,total:70}],subtotal:640,taxRate:0,total:640,notes:''},
  {id:'INV-0006',clientId:'CLT-0007',clientName:'City Hall Complex', clientPhone:'(555) 700-0001',clientEmail:'facilities@cityof.gov',       clientAddress:'1 Government Pl, Midtown, VA',   jobRef:'JOB-0008',linkedJobId:'JOB-0008',linkedQuoteNumber:'QT-0004',linkedQuoteId:'QT-0004',issued:'2026-03-28',due:'2026-03-28',status:'Overdue', lineItems:[{id:1,description:'Electrical Service Upgrade',qty:1,unit:2500,total:2500},{id:2,description:'Panel Replacement (200A)',qty:1,unit:1200,total:1200},{id:3,description:'Wiring & Materials',qty:1,unit:350,total:350},{id:4,description:'Permit',qty:1,unit:150,total:150}],subtotal:4200,taxRate:0,total:4200,notes:'Requires PO# from city procurement.'},
  {id:'INV-0007',clientId:'CLT-0006',clientName:'Tom Nguyen',        clientPhone:'(555) 103-4421',clientEmail:'tnguyen@protonmail.com',      clientAddress:'55 Pine Ave, Lakewood, VA',      jobRef:'JOB-0006',linkedJobId:'JOB-0006',linkedQuoteNumber:'QT-0007',linkedQuoteId:'QT-0007',issued:'2026-04-02',due:'2026-04-17',status:'Draft',   lineItems:[{id:1,description:'Water Heater 40gal',qty:1,unit:650,total:650},{id:2,description:'Labor - Installation (2hr)',qty:2,unit:120,total:240},{id:3,description:'Disposal Fee',qty:1,unit:30,total:30}],subtotal:920,taxRate:0,total:920,notes:''},
  {id:'INV-0008',clientId:'CLT-0008',clientName:'Rosa Delgado',      clientPhone:'(555) 298-6677',clientEmail:'rosita.delgado@yahoo.com',   clientAddress:'23 Birch Ct, Eastside, VA',      jobRef:'JOB-0007',linkedJobId:'JOB-0007',linkedQuoteNumber:null,linkedQuoteId:null,issued:'2026-03-29',due:'2026-04-12',status:'Sent',    lineItems:[{id:1,description:'Drain Cleaning Service',qty:1,unit:120,total:120},{id:2,description:'Emergency Call Fee',qty:1,unit:30,total:30}],subtotal:150,taxRate:0,total:150,notes:''},
]

const SAMPLE_QUOTES = [
  {id:'QT-0001',clientId:'CLT-0005',clientName:'Harbor Clinic',       clientPhone:'(555) 822-5599',clientEmail:'ops@harborclinic.com',      type:'HVAC System Replace',description:'Full rooftop unit replacement, 5-ton commercial', created:'2026-03-28',expires:'2026-04-27',status:'Sent',     linkedJobId:'JOB-0005',linkedJobNumber:'JOB-0005',linkedInvoiceId:'INV-0005',linkedInvoiceNumber:'INV-0005',lineItems:[{id:1,description:'Rooftop HVAC Unit (5-ton)',qty:1,unit:13500,total:13500},{id:2,description:'Labor - Remove & Install (10hr)',qty:10,unit:150,total:1500},{id:3,description:'Crane Rental',qty:1,unit:900,total:900},{id:4,description:'Electrical Connections',qty:1,unit:750,total:750},{id:5,description:'Permits & Inspections',qty:1,unit:400,total:400},{id:6,description:'Disposal & Haul Away',qty:1,unit:300,total:300},{id:7,description:'Commissioning',qty:1,unit:500,total:500},{id:8,description:'Warranty (1yr parts & labor)',qty:1,unit:550,total:550}],total:18400,notes:'Price valid 30 days. Lead time 2 weeks on equipment.'},
  {id:'QT-0002',clientId:'CLT-0002',clientName:'Sunrise Apartments',  clientPhone:'(555) 480-2291',clientEmail:'mgmt@sunriseapts.com',      type:'Plumbing Overhaul',  description:'Re-pipe units 1–12 with PEX',                   created:'2026-03-25',expires:'2026-04-24',status:'Approved', linkedJobId:'JOB-0002',linkedJobNumber:'JOB-0002',linkedInvoiceId:'INV-0002',linkedInvoiceNumber:'INV-0002',lineItems:[{id:1,description:'Re-piping Materials PEX (12 units)',qty:1,unit:3200,total:3200},{id:2,description:'Labor (32hr)',qty:32,unit:120,total:3840},{id:3,description:'Fittings & Valves',qty:1,unit:850,total:850},{id:4,description:'Water Heater Replacement (2)',qty:2,unit:600,total:1200},{id:5,description:'Permits',qty:1,unit:450,total:450},{id:6,description:'Testing & Inspection',qty:1,unit:210,total:210}],total:9750,notes:'Scheduling requires 2-week notice for unit access.'},
  {id:'QT-0003',clientId:'CLT-0004',clientName:'Frank Holloway',       clientPhone:'(555) 391-0012',clientEmail:'frank.holloway@gmail.com', type:'HVAC Install',       description:'Mini-split system 2-zone install',               created:'2026-03-22',expires:'2026-04-21',status:'Declined', linkedJobId:null,linkedJobNumber:null,linkedInvoiceId:null,linkedInvoiceNumber:null,lineItems:[{id:1,description:'Mini-Split System (2-zone)',qty:1,unit:2800,total:2800},{id:2,description:'Installation Labor (6hr)',qty:6,unit:150,total:900},{id:3,description:'Electrical Connections',qty:1,unit:300,total:300},{id:4,description:'Line Set & Materials',qty:1,unit:200,total:200}],total:4200,notes:'Customer requested pricing for next season.'},
  {id:'QT-0004',clientId:'CLT-0007',clientName:'City Hall Complex',    clientPhone:'(555) 700-0001',clientEmail:'facilities@cityof.gov',    type:'Generator Install',  description:'Standby 50kW generator with transfer switch',    created:'2026-03-20',expires:'2026-04-19',status:'Sent',     linkedJobId:'JOB-0008',linkedJobNumber:'JOB-0008',linkedInvoiceId:'INV-0006',linkedInvoiceNumber:'INV-0006',lineItems:[{id:1,description:'50kW Standby Generator (Generac)',qty:1,unit:14000,total:14000},{id:2,description:'Installation Labor (16hr)',qty:16,unit:150,total:2400},{id:3,description:'Transfer Switch',qty:1,unit:2200,total:2200},{id:4,description:'Electrical Work',qty:1,unit:1800,total:1800},{id:5,description:'Concrete Pad',qty:1,unit:800,total:800},{id:6,description:'Permits & Inspections',qty:1,unit:800,total:800}],total:22000,notes:'PO required before scheduling.'},
  {id:'QT-0005',clientId:'CLT-0003',clientName:'Green Valley School',  clientPhone:'(555) 667-3344',clientEmail:'facilities@greenvalley.edu',type:'LED Retrofit',      description:'Gym and hallway LED lighting upgrade',           created:'2026-03-18',expires:'2026-04-17',status:'Approved', linkedJobId:null,linkedJobNumber:null,linkedInvoiceId:null,linkedInvoiceNumber:null,lineItems:[{id:1,description:'LED Fixtures (48 units)',qty:48,unit:70,total:3360},{id:2,description:'Labor (16hr)',qty:16,unit:110,total:1760},{id:3,description:'Control Systems',qty:1,unit:880,total:880},{id:4,description:'Permits',qty:1,unit:500,total:500}],total:6500,notes:'Install before summer break.'},
  {id:'QT-0006',clientId:'CLT-0008',clientName:'Rosa Delgado',         clientPhone:'(555) 298-6677',clientEmail:'rosita.delgado@yahoo.com', type:'Plumbing',          description:'Shower, vanity, and toilet plumbing remodel',    created:'2026-03-15',expires:'2026-04-14',status:'Declined', linkedJobId:null,linkedJobNumber:null,linkedInvoiceId:null,linkedInvoiceNumber:null,lineItems:[{id:1,description:'Shower Installation',qty:1,unit:1200,total:1200},{id:2,description:'Vanity & Sink',qty:1,unit:600,total:600},{id:3,description:'Toilet Replacement',qty:1,unit:400,total:400},{id:4,description:'Labor (8hr)',qty:8,unit:100,total:800},{id:5,description:'Materials & Supplies',qty:1,unit:100,total:100}],total:3100,notes:''},
  {id:'QT-0007',clientId:'CLT-0006',clientName:'Tom Nguyen',           clientPhone:'(555) 103-4421',clientEmail:'tnguyen@protonmail.com',   type:'Plumbing',          description:'Navien 240A install with gas line upgrade',      created:'2026-03-10',expires:'2026-04-09',status:'Sent',     linkedJobId:'JOB-0006',linkedJobNumber:'JOB-0006',linkedInvoiceId:'INV-0007',linkedInvoiceNumber:'INV-0007',lineItems:[{id:1,description:'Navien 240A Tankless Heater',qty:1,unit:1800,total:1800},{id:2,description:'Installation Labor (4hr)',qty:4,unit:150,total:600},{id:3,description:'Gas Line Upgrade',qty:1,unit:400,total:400}],total:2800,notes:''},
]

const SAMPLE_REQUESTS = [
  {id:'REQ-088',clientId:'CLT-0005',clientName:'Harbor Clinic',       clientPhone:'(555) 822-5599',type:'HVAC Repair',    description:'Rooftop unit down, no cooling in main wing. Patients complaining. Respond ASAP.',received:'Apr 1, 2026 9:14 AM', priority:'Urgent',status:'Open',     preferredDate:'2026-04-01',preferredTime:'As soon as possible',internalNotes:''},
  {id:'REQ-087',clientId:'CLT-0001',clientName:'Martha Reynolds',     clientPhone:'(555) 214-7830',type:'Plumbing',       description:'Slow leak under kitchen sink, possible pipe joint failure.',                     received:'Apr 1, 2026 7:52 AM', priority:'Normal',status:'Open',     preferredDate:'2026-04-02',preferredTime:'Morning 8am-12pm',    internalNotes:''},
  {id:'REQ-086',clientId:null,      clientName:'James Park (New)',    clientPhone:'(555) 310-0044',type:'Furnace Service', description:'Looking to replace old furnace, wants estimate for new unit.',                    received:'Mar 31, 2026 4:30 PM',priority:'Low',   status:'Open',     preferredDate:'2026-04-05',preferredTime:'Afternoon 12pm-5pm', internalNotes:'Potential new customer. Follow up with quote.'},
  {id:'REQ-085',clientId:'CLT-0002',clientName:'Sunrise Apartments',  clientPhone:'(555) 480-2291',type:'Electrical',     description:'Breaker keeps tripping in unit 7, multiple appliances affected.',                 received:'Mar 31, 2026 2:10 PM',priority:'Urgent',status:'Converted',preferredDate:'2026-03-31',preferredTime:'Any Time',            internalNotes:'Converted to JOB-0002.'},
  {id:'REQ-084',clientId:'CLT-0007',clientName:'City Hall Complex',   clientPhone:'(555) 700-0001',type:'Generator',      description:'Annual maintenance due on standby generator. PO attached.',                       received:'Mar 30, 2026 11:00 AM',priority:'Normal',status:'Converted',preferredDate:'2026-04-03',preferredTime:'Morning 8am-12pm',    internalNotes:'Converted to QT-0004.'},
  {id:'REQ-083',clientId:'CLT-0008',clientName:'Rosa Delgado',        clientPhone:'(555) 298-6677',type:'Drain',          description:'Bathroom drain fully blocked, water backing up into tub.',                       received:'Mar 30, 2026 8:45 AM', priority:'Urgent',status:'Open',     preferredDate:'2026-03-30',preferredTime:'As soon as possible',internalNotes:''},
]

// ─── Low-level helpers ───────────────────────────────────────────────────────

// Current data version — bump when sample data format changes to force a reseed
const DATA_VERSION = '5'
const VERSION_KEY  = 'ff_data_version'

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

// ─── Seed / migrate on load ───────────────────────────────────────────────────

function seedAll() {
  // If data version changed (e.g. client ID format upgrade), wipe and reseed
  const storedVersion = localStorage.getItem(VERSION_KEY)
  if (storedVersion !== DATA_VERSION) {
    ;[KEYS.clients, KEYS.jobs, KEYS.invoices, KEYS.quotes, KEYS.requests, KEYS.serviceCalls].forEach(k =>
      localStorage.removeItem(k)
    )
    localStorage.setItem(VERSION_KEY, DATA_VERSION)
  }
  if (!localStorage.getItem(KEYS.clients))  persist(KEYS.clients,  SAMPLE_CLIENTS)
  if (!localStorage.getItem(KEYS.jobs))     persist(KEYS.jobs,     SAMPLE_JOBS)
  if (!localStorage.getItem(KEYS.invoices)) persist(KEYS.invoices, SAMPLE_INVOICES)
  if (!localStorage.getItem(KEYS.quotes))   persist(KEYS.quotes,   SAMPLE_QUOTES)
  if (!localStorage.getItem(KEYS.requests)) persist(KEYS.requests, SAMPLE_REQUESTS)
  if (!localStorage.getItem('fieldflow_users')) {
    persist('fieldflow_users', [
      { id: 'user-1', email: 'admin@fieldflow.com', password: 'admin123', name: 'Admin User', role: 'admin', technicianId: null, status: 'active' },
      { id: 'user-2', email: 'moore@fieldflow.com', password: 'staff123', name: 'D. Moore', role: 'staff', technicianId: 'tech-1', status: 'active' },
      { id: 'user-3', email: 'torres@fieldflow.com', password: 'staff123', name: 'A. Torres', role: 'staff', technicianId: 'tech-2', status: 'active' },
      { id: 'user-4', email: 'singh@fieldflow.com', password: 'staff123', name: 'R. Singh', role: 'staff', technicianId: 'tech-3', status: 'active' },
    ])
  }
  // Initialize sequential number counters (only sets if missing)
  initCounters()
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

export function generateClientId() {
  const clients = getClients()
  const max = clients.reduce((m, c) => {
    const n = parseInt(String(c.id).replace('CLT-', ''), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 0)
  return `CLT-${String(max + 1).padStart(4, '0')}`
}

export function deleteClient(id) {
  const updated = getClients().filter(c => c.id !== id)
  persist(KEYS.clients, updated)
  return updated
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export function getJobs() {
  const jobs = load(KEYS.jobs) || SAMPLE_JOBS
  // Ensure all jobs have the pipeline schema fields (backwards-compatible)
  return jobs.map(j => ({
    diagnosisReports: [],
    statusHistory: [],
    partsRequired: [],
    ...j,
  }))
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

// ─── Service Calls ───────────────────────────────────────────────────────────

const _ts = (daysAgo, h, m = 0) => {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h, m, 0, 0); return d.getTime()
}
const _today = new Date().toISOString().split('T')[0]
const _yday  = new Date(Date.now() - 86400000).toISOString().split('T')[0]
const _2days = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]

const SAMPLE_SERVICE_CALLS = [
  {
    callId: '103727', id: '103727',
    customer: 'INSIGHT FM-SM, MILAN LASER HAIR REMOVAL',
    clientName: 'INSIGHT FM-SM, MILAN LASER HAIR REMOVAL', clientId: null,
    clientPhone: '(555) 900-0001', clientEmail: 'facilities@milanfm.com',
    propertyAddress: '4521 Corporate Dr, McLean, VA 22102',
    description: 'Washer not draining properly. Water pooling at bottom of drum after cycle.',
    equipmentBrand: 'Unknown', equipmentType: 'Washer',
    equipModel: '', equipSerial: '', warrantyStatus: 'Unknown',
    techId: 4, techName: 'Imran', technicianId: 'imran',
    createdDate: '04/07/2026', scheduledDate: '04/08/2026',
    status: '02', csr: 'Fakhar Rajpoot', csrId: 'user-1',
    dispatchNumber: '402115', priority: 'Normal',
    lineItems: [], subtotal: 0, taxRate: 0, total: 0,
    communicationLog: [
      { id: 'cl-103727-1', type: 'status_change', message: 'Service call created — 01 New Call', author: 'Fakhar Rajpoot', timestamp: _ts(7, 9) },
      { id: 'cl-103727-2', type: 'status_change', message: 'Status changed to 02 Dispatched — Imran assigned', author: 'Fakhar Rajpoot', timestamp: _ts(6, 14) },
    ],
    createdAt: _ts(7, 9), completedAt: null, paidAt: null,
  },
  {
    callId: '103726', id: '103726',
    customer: 'INSIGHT FM-SM, MADISON REED',
    clientName: 'INSIGHT FM-SM, MADISON REED', clientId: null,
    clientPhone: '(555) 900-0002', clientEmail: 'facilities@madisonreed.com',
    propertyAddress: '8900 Fenton St, Silver Spring, MD 20910',
    description: 'Commercial dryer not heating. Drum spins but no heat. Possible element or thermostat failure.',
    equipmentBrand: 'Unknown', equipmentType: 'Dryer',
    equipModel: '', equipSerial: '', warrantyStatus: 'Unknown',
    techId: 4, techName: 'Imran', technicianId: 'imran',
    createdDate: '04/06/2026', scheduledDate: '04/07/2026',
    status: '02B', csr: 'Fakhar Rajpoot', csrId: 'user-1',
    dispatchNumber: '401728', priority: 'Normal',
    lineItems: [
      { id: 1, description: 'Service Call Fee', qty: 1, unit: 150, cost: 0, total: 150 },
      { id: 2, description: 'Labor — Diagnostic (1hr)', qty: 1, unit: 110, cost: 0, total: 110 },
    ],
    subtotal: 260, taxRate: 0, total: 260,
    communicationLog: [
      { id: 'cl-103726-1', type: 'status_change', message: 'Service call created — 01 New Call', author: 'Fakhar Rajpoot', timestamp: _ts(8, 10) },
      { id: 'cl-103726-2', type: 'status_change', message: 'Status changed to 02 Dispatched — Imran assigned', author: 'Fakhar Rajpoot', timestamp: _ts(7, 9) },
      { id: 'cl-103726-3', type: 'status_change', message: 'Status changed to 02A Parts Research — part sourcing in progress', author: 'Imran', timestamp: _ts(7, 14) },
      { id: 'cl-103726-4', type: 'status_change', message: 'Status changed to 02B Submitted — warranty claim submitted to manufacturer', author: 'Fakhar Rajpoot', timestamp: _ts(6, 11) },
      { id: 'cl-103726-5', type: 'note', message: 'Submitted claim to Alliance Laundry warranty portal. Claim #WC-2026-4412.', author: 'Fakhar Rajpoot', timestamp: _ts(6, 11, 5) },
    ],
    createdAt: _ts(8, 10), completedAt: null, paidAt: null,
  },
  {
    callId: '103695', id: '103695',
    customer: 'INSIGHT FM-SM, MADISON REED',
    clientName: 'INSIGHT FM-SM, MADISON REED', clientId: null,
    clientPhone: '(555) 900-0002', clientEmail: 'facilities@madisonreed.com',
    propertyAddress: '8900 Fenton St, Silver Spring, MD 20910',
    description: 'Alliance Laundry dryer drum belt snapped. Unit inoperable.',
    equipmentBrand: 'Alliance Laundry', equipmentType: 'Dryer',
    equipModel: 'DR 3.5CF', equipSerial: 'AL-DR-20934', warrantyStatus: 'Under Warranty',
    techId: 4, techName: 'Imran', technicianId: 'imran',
    createdDate: '02/23/2026', scheduledDate: '04/07/2026',
    status: '04A', csr: 'Fakhar Rajpoot', csrId: 'user-1',
    dispatchNumber: '398298', priority: 'Normal',
    lineItems: [
      { id: 1, description: 'Service Call Fee', qty: 1, unit: 150, cost: 0, total: 150 },
      { id: 2, description: 'Alliance Laundry Drum Belt (warranty)', qty: 1, unit: 0, cost: 0, total: 0 },
      { id: 3, description: 'Labor — Belt Replacement (1.5hr)', qty: 1, unit: 165, cost: 0, total: 165 },
    ],
    subtotal: 315, taxRate: 0, total: 315,
    communicationLog: [
      { id: 'cl-103695-1', type: 'status_change', message: 'Service call created — 01 New Call', author: 'Fakhar Rajpoot', timestamp: _ts(50, 9) },
      { id: 'cl-103695-2', type: 'status_change', message: 'Status changed to 02 Dispatched', author: 'Fakhar Rajpoot', timestamp: _ts(49, 9) },
      { id: 'cl-103695-3', type: 'status_change', message: 'Status changed to 02C Parts Ordered — warranty part ordered from Alliance Laundry', author: 'Imran', timestamp: _ts(48, 11) },
      { id: 'cl-103695-4', type: 'status_change', message: 'Status changed to 02D Parts Received', author: 'Fakhar Rajpoot', timestamp: _ts(7, 10) },
      { id: 'cl-103695-5', type: 'status_change', message: 'Status changed to 03A Repair Scheduled', author: 'Fakhar Rajpoot', timestamp: _ts(7, 10, 30) },
      { id: 'cl-103695-6', type: 'status_change', message: 'Status changed to 04 Repair Complete', author: 'Imran', timestamp: _ts(0, 11) },
      { id: 'cl-103695-7', type: 'status_change', message: 'Status changed to 04A Ready to Bill', author: 'Fakhar Rajpoot', timestamp: _ts(0, 14) },
    ],
    createdAt: _ts(50, 9), completedAt: _ts(0, 11), paidAt: null,
  },
  {
    callId: '103724', id: '103724',
    customer: 'INSIGHT FM-SM, PETCO',
    clientName: 'INSIGHT FM-SM, PETCO', clientId: null,
    clientPhone: '(555) 900-0003', clientEmail: 'facilities@petco.com',
    propertyAddress: '12501 Fair Lakes Pkwy, Fairfax, VA 22033',
    description: 'Alliance Laundry commercial dryer overheating and shutting off mid-cycle. Possible blocked exhaust or faulty thermal limiter.',
    equipmentBrand: 'Alliance Laundry', equipmentType: 'Dryer',
    equipModel: 'DR 3.5CF', equipSerial: 'AL-DR-18821', warrantyStatus: 'Under Warranty',
    techId: 4, techName: 'Imran', technicianId: 'imran',
    createdDate: '04/03/2026', scheduledDate: '04/03/2026',
    status: '02B', csr: 'Fakhar Rajpoot', csrId: 'user-1',
    dispatchNumber: '401887', priority: 'Urgent',
    lineItems: [
      { id: 1, description: 'Service Call Fee', qty: 1, unit: 150, cost: 0, total: 150 },
      { id: 2, description: 'Labor — Diagnostic (2hr)', qty: 2, unit: 110, cost: 0, total: 220 },
    ],
    subtotal: 370, taxRate: 0, total: 370,
    communicationLog: [
      { id: 'cl-103724-1', type: 'status_change', message: 'Service call created — 01 New Call', author: 'Fakhar Rajpoot', timestamp: _ts(11, 9) },
      { id: 'cl-103724-2', type: 'status_change', message: 'Status changed to 02 Dispatched — Imran assigned', author: 'Fakhar Rajpoot', timestamp: _ts(11, 9, 30) },
      { id: 'cl-103724-3', type: 'status_change', message: 'Status changed to 02A Parts Research', author: 'Imran', timestamp: _ts(11, 14) },
      { id: 'cl-103724-4', type: 'status_change', message: 'Status changed to 02B Submitted — warranty claim submitted', author: 'Fakhar Rajpoot', timestamp: _ts(9, 10) },
    ],
    createdAt: _ts(11, 9), completedAt: null, paidAt: null,
  },
  {
    callId: '103723', id: '103723',
    customer: 'INSIGHT FM-SM, ULTA',
    clientName: 'INSIGHT FM-SM, ULTA', clientId: null,
    clientPhone: '(555) 900-0004', clientEmail: 'facilities@ulta.com',
    propertyAddress: '15001 Shady Grove Rd, Rockville, MD 20850',
    description: 'Whirlpool washer leaking from door seal. Water on floor during spin cycle. Seal appears cracked.',
    equipmentBrand: 'WHIRLPOOL', equipmentType: 'Washer',
    equipModel: 'WTW5000DW', equipSerial: 'WP-WSH-29944', warrantyStatus: 'Expired',
    techId: 4, techName: 'Imran', technicianId: 'imran',
    createdDate: '03/31/2026', scheduledDate: '04/02/2026',
    status: '04C', csr: 'Fakhar Rajpoot', csrId: 'user-1',
    dispatchNumber: '401382', priority: 'Normal',
    lineItems: [
      { id: 1, description: 'Service Call Fee', qty: 1, unit: 150, cost: 0, total: 150 },
      { id: 2, description: 'Whirlpool Door Seal / Boot', qty: 1, unit: 85, cost: 42, total: 85 },
      { id: 3, description: 'Labor — Door Seal Replacement (1.5hr)', qty: 1, unit: 165, cost: 0, total: 165 },
    ],
    subtotal: 400, taxRate: 0, total: 400,
    communicationLog: [
      { id: 'cl-103723-1', type: 'status_change', message: 'Service call created — 01 New Call', author: 'Fakhar Rajpoot', timestamp: _ts(14, 10) },
      { id: 'cl-103723-2', type: 'status_change', message: 'Status changed to 01A Scheduled', author: 'Fakhar Rajpoot', timestamp: _ts(14, 10, 30) },
      { id: 'cl-103723-3', type: 'status_change', message: 'Status changed to 02 Dispatched — Imran assigned', author: 'Fakhar Rajpoot', timestamp: _ts(12, 9) },
      { id: 'cl-103723-4', type: 'status_change', message: 'Status changed to 04 Repair Complete', author: 'Imran', timestamp: _ts(12, 12) },
      { id: 'cl-103723-5', type: 'status_change', message: 'Status changed to 04A Ready to Bill', author: 'Fakhar Rajpoot', timestamp: _ts(12, 14) },
      { id: 'cl-103723-6', type: 'status_change', message: 'Status changed to 04B Invoice Sent', author: 'Fakhar Rajpoot', timestamp: _ts(11, 9) },
      { id: 'cl-103723-7', type: 'email', message: 'Invoice emailed to facilities@ulta.com', author: 'Fakhar Rajpoot', timestamp: _ts(11, 9, 5) },
      { id: 'cl-103723-8', type: 'status_change', message: 'Status changed to 04C Billed — payment received', author: 'Fakhar Rajpoot', timestamp: _ts(7, 11) },
    ],
    createdAt: _ts(14, 10), completedAt: _ts(12, 12), paidAt: _ts(7, 11),
  },
  {
    callId: '103722', id: '103722',
    customer: 'MAZHAR, AMMAD',
    clientName: 'MAZHAR, AMMAD', clientId: null,
    clientPhone: '(555) 100-0001', clientEmail: 'ammad@example.com',
    propertyAddress: '1234 Main St, Centreville, VA 20120',
    description: 'Admiral dryer not heating. Runs but no heat output. Test call.',
    equipmentBrand: 'ADMIRAL', equipmentType: 'Dryer',
    equipModel: 'AED4675YQ', equipSerial: 'ADM-TEST-001', warrantyStatus: 'Unknown',
    techId: 7, techName: 'Ali', technicianId: 'ali',
    createdDate: '03/31/2026', scheduledDate: '03/31/2026',
    status: '02', csr: 'Fakhar Rajpoot', csrId: 'user-1',
    dispatchNumber: 'TEST CALL', priority: 'Normal',
    lineItems: [], subtotal: 0, taxRate: 0, total: 0,
    communicationLog: [
      { id: 'cl-103722-1', type: 'status_change', message: 'Service call created — TEST CALL', author: 'Fakhar Rajpoot', timestamp: _ts(14, 10) },
      { id: 'cl-103722-2', type: 'status_change', message: 'Status changed to 02 Dispatched — Ali assigned', author: 'Fakhar Rajpoot', timestamp: _ts(14, 10, 30) },
    ],
    createdAt: _ts(14, 10), completedAt: null, paidAt: null,
  },
  {
    callId: '103721', id: '103721',
    customer: 'SUNRISE APARTMENTS',
    clientName: 'SUNRISE APARTMENTS', clientId: 'CLT-0002',
    clientPhone: '(555) 480-2291', clientEmail: 'mgmt@sunriseapts.com',
    propertyAddress: '88 Lakewood Dr, Riverside, VA 20150',
    description: 'Breaker keeps tripping in unit 7. Multiple appliances affected. Tenant reports burning smell.',
    equipmentBrand: 'Square D', equipmentType: 'HVAC',
    equipModel: '200A Panel', equipSerial: '', warrantyStatus: 'Unknown',
    techId: 3, techName: 'Singh', technicianId: 'singh',
    createdDate: '04/13/2026', scheduledDate: '04/14/2026',
    status: '02', csr: 'Admin', csrId: 'user-1',
    dispatchNumber: '402201', priority: 'Urgent',
    lineItems: [
      { id: 1, description: 'Emergency Service Call Fee', qty: 1, unit: 150, cost: 0, total: 150 },
      { id: 2, description: 'Labor — Electrical Diagnostic (2hr)', qty: 2, unit: 110, cost: 0, total: 220 },
    ],
    subtotal: 370, taxRate: 0, total: 370,
    communicationLog: [
      { id: 'cl-103721-1', type: 'status_change', message: 'Service call created — 01 New Call', author: 'Admin', timestamp: _ts(1, 10) },
      { id: 'cl-103721-2', type: 'status_change', message: 'Status changed to 02 Dispatched — R. Singh assigned', author: 'Admin', timestamp: _ts(0, 10) },
    ],
    createdAt: _ts(1, 10), completedAt: null, paidAt: null,
  },
  {
    callId: '103720', id: '103720',
    customer: 'HARBOR CLINIC',
    clientName: 'HARBOR CLINIC', clientId: 'CLT-0005',
    clientPhone: '(555) 822-5599', clientEmail: 'ops@harborclinic.com',
    propertyAddress: '301 Harbor Blvd, Portview, VA 20153',
    description: 'HVAC Q1 quarterly maintenance contract. Coil cleaning, filter replacement, refrigerant check.',
    equipmentBrand: 'Daikin', equipmentType: 'HVAC',
    equipModel: 'DZ20VC', equipSerial: 'D20-2022-HC', warrantyStatus: 'Under Warranty',
    techId: 1, techName: 'Moore', technicianId: 'moore',
    createdDate: '04/06/2026', scheduledDate: '04/10/2026',
    status: '04C', csr: 'Admin', csrId: 'user-1',
    dispatchNumber: '402110', priority: 'Normal',
    lineItems: [
      { id: 1, description: 'HVAC Maintenance Contract Q2', qty: 1, unit: 450, cost: 100, total: 450 },
      { id: 2, description: 'Coil Cleaning', qty: 1, unit: 120, cost: 40, total: 120 },
      { id: 3, description: 'Refrigerant Top-Up', qty: 1, unit: 70, cost: 30, total: 70 },
    ],
    subtotal: 640, taxRate: 0, total: 640,
    communicationLog: [
      { id: 'cl-103720-1', type: 'status_change', message: 'Service call created — recurring maintenance contract', author: 'System', timestamp: _ts(8, 8) },
      { id: 'cl-103720-2', type: 'status_change', message: 'Status changed to 04 Repair Complete', author: 'Moore', timestamp: _ts(4, 12) },
      { id: 'cl-103720-3', type: 'status_change', message: 'Status changed to 04C Billed — payment received', author: 'Admin', timestamp: _ts(2, 10) },
    ],
    createdAt: _ts(8, 8), completedAt: _ts(4, 12), paidAt: _ts(2, 10),
  },
]

export function getServiceCalls() {
  const calls = load(KEYS.serviceCalls) || SAMPLE_SERVICE_CALLS
  // Normalize all records to ensure new Walkabout fields exist (backward compat)
  return calls.map(c => ({
    callId: c.id,
    customer: c.clientName || '',
    equipmentBrand: 'Unknown',
    equipmentType: '',
    techId: null,
    techName: '',
    createdDate: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US') : '',
    scheduledDate: '',
    status: '01',
    csr: 'Admin',
    csrId: 'user-1',
    dispatchNumber: '',
    communicationLog: [],
    lineItems: [],
    subtotal: 0, taxRate: 0, total: 0,
    completedAt: null, paidAt: null,
    ...c,
  }))
}

export function saveServiceCalls(arr) {
  persist(KEYS.serviceCalls, arr)
}

export function saveServiceCall(call) {
  const all = getServiceCalls()
  const callId = call.callId || call.id
  const exists = all.some(c => (c.callId || c.id) === callId)
  const updated = exists
    ? all.map(c => (c.callId || c.id) === callId ? call : c)
    : [call, ...all]
  persist(KEYS.serviceCalls, updated)
  return updated
}

export function generateServiceCallId() {
  // Returns next 6-digit Walkabout-style ID
  const calls = getServiceCalls()
  const max = calls.reduce((m, c) => {
    const n = parseInt(String(c.callId || c.id), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 103730)
  return String(max + 1)
}

// ─── Settings ────────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'fieldflow_settings'

const DEFAULT_SETTINGS = {
  company: {
    name:     'FieldFlow Services',
    address:  '100 Main St',
    city:     'Springfield',
    zip:      '22150',
    phone:    '(555) 800-0000',
    email:    'info@fieldflowcrm.com',
    website:  'www.fieldflowcrm.com',
    taxRate:  0,
    currency: 'USD',
  },
  technicians: [
    { id: 'moore',  name: 'D. Moore',  email: 'moore@fieldflow.com',  phone: '(555) 101-0001', specialty: 'HVAC',       color: '#2563EB', colorLight: '#EFF6FF', colorName: 'Ocean Blue' },
    { id: 'torres', name: 'A. Torres', email: 'torres@fieldflow.com', phone: '(555) 101-0002', specialty: 'Plumbing',   color: '#16A34A', colorLight: '#F0FDF4', colorName: 'Forest Green' },
    { id: 'singh',  name: 'R. Singh',  email: 'singh@fieldflow.com',  phone: '(555) 101-0003', specialty: 'Electrical', color: '#D97706', colorLight: '#FFFBEB', colorName: 'Golden Amber' },
    { id: 'patel',  name: 'K. Patel',  email: 'patel@fieldflow.com',  phone: '(555) 101-0004', specialty: 'HVAC',       color: '#7C3AED', colorLight: '#F5F3FF', colorName: 'Royal Purple' },
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
  reviews: {
    enabled:          true,
    googleReviewUrl:  '',
    sendViaSMS:       true,
    sendViaEmail:     true,
    sendAfter:        '1hour',
    onlyHighRatings:  true,
    minRatingToSend:  4,
    skipIfRecentDays: 90,
    smsTemplate:      `Hi {{client_name}}, thank you for choosing {{company_name}}!\nWe hope {{tech_name}} took great care of you today.\nIf you're happy with the service, we'd love a quick Google review:\n{{review_link}}\nIt only takes 30 seconds and means the world to us! 🌟`,
    emailSubject:     `How did we do, {{client_name}}? ⭐`,
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
      reviews:       { ...DEFAULT_SETTINGS.reviews,       ...saved.reviews },
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

// ─── Equipment ───────────────────────────────────────────────────────────────

const EQ_KEY = 'ff_equipment'

const _day = (n) => Date.now() - n * 86400000

const SAMPLE_EQUIPMENT = [
  {
    id: 'eq-001', equipmentId: 'EQ-0001',
    customerId: null, customerName: 'MAZHAR, AMMAD',
    propertyAddress: '1234 Main St, Centreville, VA 20120',
    type: 'Washer', typeAbbrev: 'WSH',
    brand: 'WHIRLPOOL', model: 'WTW5000DW', serialNumber: 'C82374821',
    color: 'White',
    installDate: _day(365 * 2),
    purchasePrice: 649, purchasedFrom: 'Home Depot',
    warrantyType: 'none', warrantyProvider: '', warrantyStart: null, warrantyEnd: null,
    warrantyCoverage: '', condition: 'fair',
    conditionHistory: [
      { condition: 'good', note: 'New install', changedBy: 'Admin', changedAt: _day(365 * 2) },
      { condition: 'fair', note: 'Showing wear — drum bearing noisy', changedBy: 'D. Moore', changedAt: _day(45) },
    ],
    serviceCallIds: ['103722'],
    partsHistory: [
      { partName: 'Drive Belt', partNumber: 'WP8066065', date: _day(120), cost: 22, techName: 'D. Moore', note: 'Belt snapped' },
    ],
    documents: [], notes: 'Customer prefers morning appointments.', isFlagged: false, flagReason: '',
    createdAt: _day(365 * 2), updatedAt: _day(45),
  },
  {
    id: 'eq-002', equipmentId: 'EQ-0002',
    customerId: null, customerName: 'INSIGHT FM-SM, PETCO',
    propertyAddress: '12501 Fair Lakes Pkwy, Fairfax, VA 22033',
    type: 'Dryer', typeAbbrev: 'DR',
    brand: 'ALLIANCE', model: 'AWN432SP', serialNumber: 'D91823742',
    color: 'White',
    installDate: _day(365 * 3),
    purchasePrice: 1100, purchasedFrom: 'Alliance Laundry Systems',
    warrantyType: 'manufacturer', warrantyProvider: 'Alliance Laundry',
    warrantyStart: _day(365 * 3), warrantyEnd: _day(-180),
    warrantyCoverage: 'Parts and labor for 3 years on commercial units',
    condition: 'good',
    conditionHistory: [
      { condition: 'good', note: 'New install', changedBy: 'Admin', changedAt: _day(365 * 3) },
    ],
    serviceCallIds: ['103724', '103727'],
    partsHistory: [
      { partName: 'Thermal Limiter', partNumber: 'AL-TL-100', date: _day(200), cost: 0, techName: 'Imran', note: 'Warranty replacement' },
    ],
    documents: [], notes: 'Commercial unit — on-site contact: store manager.', isFlagged: false, flagReason: '',
    createdAt: _day(365 * 3), updatedAt: _day(11),
  },
  {
    id: 'eq-003', equipmentId: 'EQ-0003',
    customerId: 'CLT-0001', customerName: 'Martha Reynolds',
    propertyAddress: '142 Elm St, Springfield, VA 22150',
    type: 'HVAC', typeAbbrev: 'HVAC',
    brand: 'CARRIER', model: '24ACC636A003', serialNumber: 'XYZ123456',
    color: 'Gray',
    installDate: _day(365 * 7),
    purchasePrice: 3200, purchasedFrom: 'HVAC Wholesale',
    warrantyType: 'extended', warrantyProvider: 'SquareTrade',
    warrantyStart: _day(365 * 5), warrantyEnd: _day(365 * 2 - 400),
    warrantyCoverage: '5-year extended coverage on parts',
    condition: 'poor',
    conditionHistory: [
      { condition: 'good', note: 'New install', changedBy: 'Admin', changedAt: _day(365 * 7) },
      { condition: 'fair', note: 'Minor refrigerant leak detected', changedBy: 'D. Moore', changedAt: _day(180) },
      { condition: 'poor', note: 'Compressor showing signs of failure', changedBy: 'D. Moore', changedAt: _day(14) },
    ],
    serviceCallIds: ['103720'],
    partsHistory: [
      { partName: 'Capacitor Start/Run', partNumber: 'CAP-35-5-440', date: _day(300), cost: 45, techName: 'D. Moore', note: 'Failed capacitor' },
      { partName: 'R-410A Refrigerant 2.5lb', partNumber: 'REFR-410A', date: _day(180), cost: 120, techName: 'D. Moore', note: 'Refrigerant top-up' },
      { partName: 'R-410A Refrigerant 2.5lb', partNumber: 'REFR-410A', date: _day(14), cost: 120, techName: 'D. Moore', note: 'Refrigerant top-up (2nd time)' },
    ],
    documents: [], notes: 'Unit 7 years old — consider replacement at next major repair.', isFlagged: false, flagReason: '',
    createdAt: _day(365 * 7), updatedAt: _day(14),
  },
  {
    id: 'eq-004', equipmentId: 'EQ-0004',
    customerId: null, customerName: 'MAZHAR, AMMAD',
    propertyAddress: '1234 Main St, Centreville, VA 20120',
    type: 'Dryer', typeAbbrev: 'DR',
    brand: 'ADMIRAL', model: 'ADE7005AZW', serialNumber: 'E77234981',
    color: 'White',
    installDate: _day(365 * 10),
    purchasePrice: 350, purchasedFrom: 'Sears',
    warrantyType: 'none', warrantyProvider: '', warrantyStart: null, warrantyEnd: null,
    warrantyCoverage: '',
    condition: 'critical',
    conditionHistory: [
      { condition: 'good', note: 'New install', changedBy: 'Admin', changedAt: _day(365 * 10) },
      { condition: 'fair', note: 'Heating element replaced', changedBy: 'Ali', changedAt: _day(400) },
      { condition: 'poor', note: 'Motor bearing worn', changedBy: 'Ali', changedAt: _day(200) },
      { condition: 'critical', note: 'Multiple component failures — recommend replacement', changedBy: 'Ali', changedAt: _day(14) },
    ],
    serviceCallIds: ['103722'],
    partsHistory: [
      { partName: 'Heating Element', partNumber: 'WP33001777', date: _day(400), cost: 35, techName: 'Ali', note: 'No heat' },
      { partName: 'Drive Motor', partNumber: 'WP8066065M', date: _day(200), cost: 85, techName: 'Ali', note: 'Motor seized' },
      { partName: 'Idler Pulley', partNumber: 'WP691366', date: _day(200), cost: 18, techName: 'Ali', note: 'Worn' },
      { partName: 'Heating Element', partNumber: 'WP33001777', date: _day(14), cost: 35, techName: 'Ali', note: 'Element failed again' },
    ],
    documents: [], notes: 'Unit is 10 years old. Total repairs exceed unit value. Flagged for replacement.', isFlagged: true, flagReason: 'Total repair costs exceed unit purchase price. Recommend replacement.',
    createdAt: _day(365 * 10), updatedAt: _day(14),
  },
]

export function getEquipment() {
  return load(EQ_KEY) || SAMPLE_EQUIPMENT
}
export function saveEquipmentList(arr) { persist(EQ_KEY, arr) }
export function saveEquipmentItem(eq) {
  const all = getEquipment()
  const exists = all.some(e => e.id === eq.id)
  const updated = exists ? all.map(e => e.id === eq.id ? eq : e) : [eq, ...all]
  persist(EQ_KEY, updated)
  return updated
}
export function deleteEquipmentItem(id) {
  const updated = getEquipment().filter(e => e.id !== id)
  persist(EQ_KEY, updated)
  return updated
}
export function generateEquipmentId() {
  const all = getEquipment()
  const max = all.reduce((m, e) => {
    const n = parseInt(String(e.equipmentId).replace('EQ-', ''), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 4)
  return `EQ-${String(max + 1).padStart(4, '0')}`
}

// ─── Warranty Claims ──────────────────────────────────────────────────────────

const WC_KEY = 'ff_warranty_claims'
const WP_KEY = 'ff_warranty_providers'

const SAMPLE_WARRANTY_CLAIMS = [
  {
    id: 'wc-001', claimNumber: 'WC-0001',
    serviceCallId: '103726', serviceCallNumber: '103726',
    customerId: null, customerName: 'INSIGHT FM-SM, MADISON REED',
    equipmentId: 'eq-002', equipmentBrand: 'Alliance Laundry', equipmentModel: 'AWN432SP',
    serialNumber: 'D91823742',
    warrantyProvider: 'Alliance Laundry', warrantyType: 'manufacturer',
    contractNumber: 'AL-WARRANTY-2023',
    claimType: 'Parts + Labor',
    failureDescription: 'Commercial dryer not heating. Drum spins but no heat. Thermal limiter failed.',
    causeOfFailure: 'Component failure',
    dateOfFailure: '2026-04-06', dateOfRepair: '2026-04-07',
    laborHours: 1.5, laborRate: 110, laborTotal: 165,
    tripCharge: 0,
    parts: [
      { partNumber: 'AL-TL-100', description: 'Thermal Limiter', qty: 1, unitCost: 42, total: 42 },
    ],
    partsTotal: 42,
    totalClaimed: 207,
    totalApproved: null,
    status: 'submitted',
    submittedDate: '2026-04-08',
    responseDate: null,
    rejectionReason: '',
    authNumber: '',
    paymentReference: '',
    notes: 'Claim #WC-2026-4412 submitted via Alliance warranty portal.',
    activityLog: [
      { action: 'Claim created', by: 'Fakhar Rajpoot', at: _day(6) },
      { action: 'Status → Submitted', by: 'Fakhar Rajpoot', at: _day(6) },
    ],
    createdAt: _day(6), updatedAt: _day(6),
  },
  {
    id: 'wc-002', claimNumber: 'WC-0002',
    serviceCallId: '103695', serviceCallNumber: '103695',
    customerId: null, customerName: 'INSIGHT FM-SM, MADISON REED',
    equipmentId: 'eq-002', equipmentBrand: 'Alliance Laundry', equipmentModel: 'DR 3.5CF',
    serialNumber: 'AL-DR-20934',
    warrantyProvider: 'Alliance Laundry', warrantyType: 'manufacturer',
    contractNumber: 'AL-WARRANTY-2022',
    claimType: 'Parts Only',
    failureDescription: 'Drum belt snapped. Unit inoperable. Warranty part ordered and replaced.',
    causeOfFailure: 'Normal wear — within warranty',
    dateOfFailure: '2026-02-23', dateOfRepair: '2026-04-07',
    laborHours: 1.5, laborRate: 110, laborTotal: 165,
    tripCharge: 0,
    parts: [
      { partNumber: 'AL-BELT-3.5', description: 'Alliance Laundry Drum Belt', qty: 1, unitCost: 0, total: 0 },
    ],
    partsTotal: 0,
    totalClaimed: 165,
    totalApproved: 165,
    status: 'approved',
    submittedDate: '2026-03-01',
    responseDate: '2026-03-15',
    rejectionReason: '',
    authNumber: 'AUTH-39221',
    paymentReference: 'PAY-2026-0312',
    notes: 'Approved. Belt covered under warranty. Labor reimbursed at standard rate.',
    activityLog: [
      { action: 'Claim created', by: 'Fakhar Rajpoot', at: _day(50) },
      { action: 'Status → Submitted', by: 'Fakhar Rajpoot', at: _day(44) },
      { action: 'Status → Approved — Auth #AUTH-39221', by: 'System', at: _day(30) },
    ],
    createdAt: _day(50), updatedAt: _day(30),
  },
]

const SAMPLE_WARRANTY_PROVIDERS = [
  {
    id: 'wp-001', name: 'Alliance Laundry', contactPerson: 'Warranty Dept',
    phone: '1-800-555-0100', email: 'warranty@alliancelaundry.com',
    submissionMethod: 'Portal', portalUrl: 'https://warranty.alliancelaundry.com',
    accountNumber: 'FF-2023-ALL', standardLaborRate: 110, standardTripCharge: 0,
    avgApprovalDays: 10, approvalRate: 88,
    notes: 'Submit via portal within 30 days of repair.',
  },
  {
    id: 'wp-002', name: 'Whirlpool', contactPerson: 'Service Dept',
    phone: '1-800-555-0200', email: 'warranty@whirlpool.com',
    submissionMethod: 'Email', portalUrl: '',
    accountNumber: 'FF-2023-WP', standardLaborRate: 100, standardTripCharge: 35,
    avgApprovalDays: 14, approvalRate: 82,
    notes: 'Email claim form with photos within 45 days.',
  },
  {
    id: 'wp-003', name: 'SquareTrade', contactPerson: 'Claims',
    phone: '1-877-555-0300', email: 'claims@squaretrade.com',
    submissionMethod: 'Portal', portalUrl: 'https://claims.squaretrade.com',
    accountNumber: 'FF-ST-4421', standardLaborRate: 95, standardTripCharge: 40,
    avgApprovalDays: 7, approvalRate: 75,
    notes: 'Pre-authorization required for repairs over $200.',
  },
]

export function getWarrantyClaims() { return load(WC_KEY) || SAMPLE_WARRANTY_CLAIMS }
export function saveWarrantyClaims(arr) { persist(WC_KEY, arr) }
export function saveWarrantyClaim(claim) {
  const all = getWarrantyClaims()
  const exists = all.some(c => c.id === claim.id)
  const updated = exists ? all.map(c => c.id === claim.id ? claim : c) : [claim, ...all]
  persist(WC_KEY, updated)
  return updated
}
export function generateWarrantyClaimNumber() {
  const all = getWarrantyClaims()
  const max = all.reduce((m, c) => {
    const n = parseInt(String(c.claimNumber).replace('WC-', ''), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 2)
  return `WC-${String(max + 1).padStart(4, '0')}`
}

export function getWarrantyProviders() { return load(WP_KEY) || SAMPLE_WARRANTY_PROVIDERS }
export function saveWarrantyProviders(arr) { persist(WP_KEY, arr) }
export function saveWarrantyProvider(p) {
  const all = getWarrantyProviders()
  const exists = all.some(x => x.id === p.id)
  const updated = exists ? all.map(x => x.id === p.id ? p : x) : [p, ...all]
  persist(WP_KEY, updated)
  return updated
}

// ─── Leads ────────────────────────────────────────────────────────────────────

const LEADS_KEY = 'ff_leads'

const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)

const SAMPLE_LEADS = [
  {
    id: 'lead-001', leadNumber: 'LD-0001',
    firstName: 'Sarah', lastName: 'Johnson', company: '',
    phone: '(703) 555-0412', email: 'sarah.johnson@email.com',
    address: '44 Willow Way, Centreville, VA 20120',
    serviceInterested: 'HVAC', equipmentType: 'AC Unit',
    problemDescription: 'AC unit not cooling properly. House stays warm even with AC running all day.',
    potentialValue: 2500, source: 'website', referralSource: '',
    stage: 'contacted',
    assignedTo: 'user-1', assignedToName: 'Admin User',
    nextFollowUp: tomorrow.getTime(),
    quoteId: null, quoteNumber: null,
    convertedToClientId: null, convertedAt: null, lostReason: null,
    activityLog: [
      { id: 'al-001-1', type: 'note', description: 'Lead created via website form', by: 'System', at: _day(3) },
      { id: 'al-001-2', type: 'phone', description: 'Called Sarah — she described AC issue. Interested in getting a quote. Set follow-up for tomorrow.', outcome: 'Callback requested', by: 'Admin User', at: _day(2) },
    ],
    notes: [{ id: 'n-001-1', text: 'Very interested. Budget around $2,500. Wants to avoid full replacement if possible.', by: 'Admin User', at: _day(2) }],
    createdBy: 'user-1', createdAt: _day(3), updatedAt: _day(2),
  },
  {
    id: 'lead-002', leadNumber: 'LD-0002',
    firstName: 'Marco', lastName: 'Delgado', company: '',
    phone: '(703) 555-0284', email: 'marco.d@gmail.com',
    address: '77 Elm Ave, Fairfax, VA 22030',
    serviceInterested: 'Plumbing', equipmentType: 'Water Heater',
    problemDescription: 'Water heater leaking from bottom. 10 years old. Wants replacement quote.',
    potentialValue: 1800, source: 'phone', referralSource: '',
    stage: 'quote_sent',
    assignedTo: 'user-1', assignedToName: 'Admin User',
    nextFollowUp: Date.now(),
    quoteId: null, quoteNumber: 'QT-DRAFT-001',
    convertedToClientId: null, convertedAt: null, lostReason: null,
    activityLog: [
      { id: 'al-002-1', type: 'note', description: 'Lead created — inbound call', by: 'Admin User', at: _day(7) },
      { id: 'al-002-2', type: 'phone', description: 'Discussed issue. Quoted $1,600–$2,000 for WH replacement.', outcome: 'Interested', by: 'Admin User', at: _day(6) },
      { id: 'al-002-3', type: 'email', description: 'Sent formal quote QT-DRAFT-001 via email.', outcome: 'Quote sent', by: 'Admin User', at: _day(5) },
    ],
    notes: [{ id: 'n-002-1', text: 'Wants AO Smith or Rheem. No Whirlpool.', by: 'Admin User', at: _day(6) }],
    createdBy: 'user-1', createdAt: _day(7), updatedAt: _day(5),
  },
  {
    id: 'lead-003', leadNumber: 'LD-0003',
    firstName: 'Lisa', lastName: 'Chen', company: '',
    phone: '(703) 555-0391', email: 'lisa.chen@work.com',
    address: '201 Corporate Blvd, Reston, VA 20190',
    serviceInterested: 'Electrical', equipmentType: 'Elec. Panel',
    problemDescription: 'Office panel needs upgrade to 200A service for new equipment.',
    potentialValue: 3400, source: 'referral', referralSource: 'Tom Nguyen',
    stage: 'new',
    assignedTo: 'user-1', assignedToName: 'Admin User',
    nextFollowUp: null,
    quoteId: null, quoteNumber: null,
    convertedToClientId: null, convertedAt: null, lostReason: null,
    activityLog: [
      { id: 'al-003-1', type: 'note', description: 'Lead created — referral from Tom Nguyen', by: 'Admin User', at: _day(1) },
    ],
    notes: [],
    createdBy: 'user-1', createdAt: _day(1), updatedAt: _day(1),
  },
  {
    id: 'lead-004', leadNumber: 'LD-0004',
    firstName: 'PETCO', lastName: 'Store #42', company: 'PETCO Store #42',
    phone: '(703) 555-0500', email: 'store42.mgr@petco.com',
    address: '12501 Fair Lakes Pkwy, Fairfax, VA 22033',
    serviceInterested: 'HVAC', equipmentType: 'HVAC System',
    problemDescription: 'Full HVAC system replacement for commercial space. 3 rooftop units.',
    potentialValue: 8000, source: 'website', referralSource: '',
    stage: 'follow_up',
    assignedTo: 'user-1', assignedToName: 'Admin User',
    nextFollowUp: yesterday.getTime(),
    quoteId: null, quoteNumber: null,
    convertedToClientId: null, convertedAt: null, lostReason: null,
    activityLog: [
      { id: 'al-004-1', type: 'note', description: 'Lead created via website form', by: 'System', at: _day(14) },
      { id: 'al-004-2', type: 'phone', description: 'Initial call — very interested. Needs site visit for accurate quote.', outcome: 'Interested', by: 'Admin User', at: _day(12) },
      { id: 'al-004-3', type: 'meeting', description: 'Site visit completed. Measured all 3 units. Quote in progress.', outcome: 'Site visit done', by: 'Admin User', at: _day(9) },
    ],
    notes: [{ id: 'n-004-1', text: 'High-value lead. Budget $8k-$12k. Decision by end of month.', by: 'Admin User', at: _day(12) }],
    createdBy: 'user-1', createdAt: _day(14), updatedAt: _day(9),
  },
  {
    id: 'lead-005', leadNumber: 'LD-0005',
    firstName: 'Robert', lastName: 'Kim', company: '',
    phone: '(703) 555-0621', email: 'rob.kim@gmail.com',
    address: '88 Maple Dr, Herndon, VA 20170',
    serviceInterested: 'Plumbing', equipmentType: 'Drain',
    problemDescription: 'Main drain backing up. Needs camera inspection + cleaning.',
    potentialValue: 650, source: 'phone', referralSource: '',
    stage: 'won',
    assignedTo: 'user-1', assignedToName: 'Admin User',
    nextFollowUp: null,
    quoteId: 'QT-0006', quoteNumber: 'QT-0006',
    convertedToClientId: 'CLT-NEW-001', convertedAt: _day(1),
    lostReason: null,
    activityLog: [
      { id: 'al-005-1', type: 'note', description: 'Lead created — inbound call', by: 'Admin User', at: _day(5) },
      { id: 'al-005-2', type: 'phone', description: 'Booked job. Sent confirmation.', outcome: 'Booked', by: 'Admin User', at: _day(4) },
      { id: 'al-005-3', type: 'note', description: 'Lead converted to client. Service call opened.', by: 'Admin User', at: _day(1) },
    ],
    notes: [],
    createdBy: 'user-1', createdAt: _day(5), updatedAt: _day(1),
  },
]

export function getLeads() { return load(LEADS_KEY) || SAMPLE_LEADS }
export function saveLeads(arr) { persist(LEADS_KEY, arr) }
export function saveLead(lead) {
  const all = getLeads()
  const exists = all.some(l => l.id === lead.id)
  const updated = exists ? all.map(l => l.id === lead.id ? lead : l) : [lead, ...all]
  persist(LEADS_KEY, updated)
  return updated
}
export function deleteLead(id) {
  const updated = getLeads().filter(l => l.id !== id)
  persist(LEADS_KEY, updated)
  return updated
}
export function generateLeadNumber() {
  const all = getLeads()
  const max = all.reduce((m, l) => {
    const n = parseInt(String(l.leadNumber).replace('LD-', ''), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 5)
  return `LD-${String(max + 1).padStart(4, '0')}`
}

// ─── Billing ─────────────────────────────────────────────────────────────────

const BILLING_KEY = 'ff_billing'

const _m = (n) => Date.now() - n * 30 * 86400000  // months ago

const DEFAULT_BILLING = {
  plan: 'professional',
  subscriptionStatus: 'active',
  billingCycle: 'monthly',
  stripeCustomerId: 'cus_demo_fieldflow',
  stripeSubscriptionId: 'sub_demo_fieldflow',
  currentPeriodStart: new Date(Date.now() - 14 * 86400000).toISOString(),
  currentPeriodEnd: new Date(Date.now() + 16 * 86400000).toISOString(),
  cancelAtPeriodEnd: false,
  trialEndsAt: null,
  cardBrand: 'Visa',
  cardLast4: '4242',
  cardExpMonth: 12,
  cardExpYear: 2027,
  billingEmail: 'admin@fieldflow.com',
}

const SAMPLE_BILLING_HISTORY = [
  { id: 'inv_001', date: _m(0), description: 'FieldFlow Professional — Monthly', amount: 9900, status: 'paid', invoiceUrl: '#' },
  { id: 'inv_002', date: _m(1), description: 'FieldFlow Professional — Monthly', amount: 9900, status: 'paid', invoiceUrl: '#' },
  { id: 'inv_003', date: _m(2), description: 'FieldFlow Professional — Monthly', amount: 9900, status: 'paid', invoiceUrl: '#' },
  { id: 'inv_004', date: _m(3), description: 'FieldFlow Professional — Monthly', amount: 9900, status: 'paid', invoiceUrl: '#' },
  { id: 'inv_005', date: _m(4), description: 'FieldFlow Professional — Monthly', amount: 9900, status: 'paid', invoiceUrl: '#' },
  { id: 'inv_006', date: _m(5), description: 'FieldFlow Starter — Monthly',       amount: 4900, status: 'paid', invoiceUrl: '#' },
]

export function getBilling() {
  try {
    const raw = localStorage.getItem(BILLING_KEY)
    return raw ? { ...DEFAULT_BILLING, ...JSON.parse(raw) } : DEFAULT_BILLING
  } catch { return DEFAULT_BILLING }
}
export function saveBilling(data) {
  localStorage.setItem(BILLING_KEY, JSON.stringify({ ...getBilling(), ...data }))
}
export function getBillingHistory() { return SAMPLE_BILLING_HISTORY }

// ─── Inbox ────────────────────────────────────────────────────────────────────

const INBOX_KEY = 'fieldflow_inbox'

const _h = (daysAgo, hoursAgo = 0, minsAgo = 0) =>
  new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000 - minsAgo * 60000).toISOString()

const SAMPLE_MESSAGES = [
  // Martha Reynolds (CLT-0001)
  {
    id: 'msg-001', clientId: 'CLT-0001', clientName: 'Martha Reynolds',
    direction: 'outgoing', channel: 'sms', subject: '',
    body: 'Hi Martha, your technician D. Moore is on the way. ETA 30 minutes.',
    attachments: [], linkedJobId: 'JOB-0001', linkedJobNumber: 'JOB-0001',
    sentBy: 'user-1', sentByName: 'Admin User', isRead: true, isInternal: false,
    status: 'delivered', createdAt: _h(0, 5, 30),
  },
  {
    id: 'msg-002', clientId: 'CLT-0001', clientName: 'Martha Reynolds',
    direction: 'incoming', channel: 'sms', subject: '',
    body: 'Thank you! Will the parts arrive today?',
    attachments: [], linkedJobId: 'JOB-0001', linkedJobNumber: 'JOB-0001',
    sentBy: null, sentByName: null, isRead: true, isInternal: false,
    status: 'read', createdAt: _h(0, 5, 25),
  },
  {
    id: 'msg-003', clientId: 'CLT-0001', clientName: 'Martha Reynolds',
    direction: 'outgoing', channel: 'sms', subject: '',
    body: 'Yes, parts expected by 2pm. Tech will call before arriving.',
    attachments: [], linkedJobId: 'JOB-0001', linkedJobNumber: 'JOB-0001',
    sentBy: 'user-1', sentByName: 'Admin User', isRead: true, isInternal: false,
    status: 'delivered', createdAt: _h(0, 5, 22),
  },
  {
    id: 'msg-004', clientId: 'CLT-0001', clientName: 'Martha Reynolds',
    direction: 'system', channel: 'system', subject: '',
    body: 'Invoice INV-0001 sent to martha.reynolds@email.com',
    attachments: [], linkedJobId: 'JOB-0001', linkedJobNumber: 'JOB-0001',
    sentBy: null, sentByName: null, isRead: true, isInternal: false,
    status: 'sent', createdAt: _h(1, 0, 30),
  },
  {
    id: 'msg-005', clientId: 'CLT-0001', clientName: 'Martha Reynolds',
    direction: 'note', channel: 'note', subject: '',
    body: 'Client mentioned dog is in backyard — call before entering gate.',
    attachments: [], linkedJobId: 'JOB-0001', linkedJobNumber: 'JOB-0001',
    sentBy: 'user-2', sentByName: 'D. Moore', isRead: true, isInternal: true,
    status: 'sent', createdAt: _h(1, 3, 0),
  },
  {
    id: 'msg-006', clientId: 'CLT-0001', clientName: 'Martha Reynolds',
    direction: 'incoming', channel: 'sms', subject: '',
    body: 'Parts arrived! Great, thank you so much.',
    attachments: [], linkedJobId: 'JOB-0001', linkedJobNumber: 'JOB-0001',
    sentBy: null, sentByName: null, isRead: false, isInternal: false,
    status: 'read', createdAt: _h(0, 2, 10),
  },
  // Sunrise Apartments (CLT-0002)
  {
    id: 'msg-010', clientId: 'CLT-0002', clientName: 'Sunrise Apartments',
    direction: 'outgoing', channel: 'email',
    subject: 'Quote QT-0002 from FieldFlow CRM',
    body: 'Hi, please find attached Quote QT-0002 for the re-piping project. Total: $9,750. Valid for 30 days.',
    attachments: [{ name: 'QT-0002.pdf', size: '142KB' }],
    linkedJobId: 'JOB-0002', linkedJobNumber: 'JOB-0002',
    sentBy: 'user-1', sentByName: 'Admin User', isRead: true, isInternal: false,
    status: 'read', createdAt: _h(3, 2, 0),
  },
  {
    id: 'msg-011', clientId: 'CLT-0002', clientName: 'Sunrise Apartments',
    direction: 'incoming', channel: 'email',
    subject: 'Re: Quote QT-0002 from FieldFlow CRM',
    body: 'Quote looks good. We approve. Please schedule for next week. Contact PM Diane at 555-480-2291.',
    attachments: [], linkedJobId: 'JOB-0002', linkedJobNumber: 'JOB-0002',
    sentBy: null, sentByName: null, isRead: true, isInternal: false,
    status: 'read', createdAt: _h(2, 6, 0),
  },
  {
    id: 'msg-012', clientId: 'CLT-0002', clientName: 'Sunrise Apartments',
    direction: 'system', channel: 'system', subject: '',
    body: 'Job JOB-0002 scheduled for Apr 1, 2026 at 10:30 AM — A. Torres assigned.',
    attachments: [], linkedJobId: 'JOB-0002', linkedJobNumber: 'JOB-0002',
    sentBy: null, sentByName: null, isRead: true, isInternal: false,
    status: 'sent', createdAt: _h(2, 5, 0),
  },
  // Harbor Clinic (CLT-0005)
  {
    id: 'msg-020', clientId: 'CLT-0005', clientName: 'Harbor Clinic',
    direction: 'outgoing', channel: 'sms', subject: '',
    body: 'Hi, this is FieldFlow CRM. Your tech R. Singh is en route for the quarterly HVAC maintenance. ETA 20 min.',
    attachments: [], linkedJobId: 'JOB-0005', linkedJobNumber: 'JOB-0005',
    sentBy: 'user-1', sentByName: 'Admin User', isRead: true, isInternal: false,
    status: 'delivered', createdAt: _h(0, 8, 0),
  },
  {
    id: 'msg-021', clientId: 'CLT-0005', clientName: 'Harbor Clinic',
    direction: 'outgoing', channel: 'email',
    subject: 'Invoice INV-0005 — OVERDUE',
    body: 'Hi, this is a reminder that Invoice INV-0005 for $640 is now overdue. Please remit payment at your earliest convenience.',
    attachments: [], linkedJobId: 'JOB-0005', linkedJobNumber: 'JOB-0005',
    sentBy: 'user-1', sentByName: 'Admin User', isRead: true, isInternal: false,
    status: 'delivered', createdAt: _h(1, 0, 0),
  },
  {
    id: 'msg-022', clientId: 'CLT-0005', clientName: 'Harbor Clinic',
    direction: 'incoming', channel: 'sms', subject: '',
    body: 'We will process payment by Friday. Sorry for the delay.',
    attachments: [], linkedJobId: null, linkedJobNumber: null,
    sentBy: null, sentByName: null, isRead: false, isInternal: false,
    status: 'read', createdAt: _h(0, 4, 0),
  },
  // Tom Nguyen (CLT-0006)
  {
    id: 'msg-030', clientId: 'CLT-0006', clientName: 'Tom Nguyen',
    direction: 'outgoing', channel: 'email',
    subject: 'Quote QT-0007 — Tankless Water Heater Installation',
    body: 'Hi Tom, please see attached quote for the Navien 240A installation. Total: $2,800. Good for 30 days.',
    attachments: [{ name: 'QT-0007.pdf', size: '98KB' }],
    linkedJobId: 'JOB-0006', linkedJobNumber: 'JOB-0006',
    sentBy: 'user-1', sentByName: 'Admin User', isRead: true, isInternal: false,
    status: 'read', createdAt: _h(4, 0, 0),
  },
  {
    id: 'msg-031', clientId: 'CLT-0006', clientName: 'Tom Nguyen',
    direction: 'incoming', channel: 'email',
    subject: 'Re: Quote QT-0007 — Tankless Water Heater Installation',
    body: 'Looks good! When can you schedule this? I\'m flexible next week.',
    attachments: [], linkedJobId: 'JOB-0006', linkedJobNumber: 'JOB-0006',
    sentBy: null, sentByName: null, isRead: true, isInternal: false,
    status: 'read', createdAt: _h(3, 18, 0),
  },
  {
    id: 'msg-032', clientId: 'CLT-0006', clientName: 'Tom Nguyen',
    direction: 'system', channel: 'system', subject: '',
    body: '💰 Payment received $920 for INV-0007',
    attachments: [], linkedJobId: 'JOB-0006', linkedJobNumber: 'JOB-0006',
    sentBy: null, sentByName: null, isRead: true, isInternal: false,
    status: 'sent', createdAt: _h(2, 0, 0),
  },
  // City Hall Complex (CLT-0007)
  {
    id: 'msg-040', clientId: 'CLT-0007', clientName: 'City Hall Complex',
    direction: 'outgoing', channel: 'email',
    subject: 'Quote QT-0004 — Generator Installation Requires PO',
    body: 'Good morning, as discussed, Quote QT-0004 for the 50kW generator installation totals $22,000. Please provide a PO number before we can schedule.',
    attachments: [{ name: 'QT-0004.pdf', size: '211KB' }],
    linkedJobId: 'JOB-0008', linkedJobNumber: 'JOB-0008',
    sentBy: 'user-1', sentByName: 'Admin User', isRead: true, isInternal: false,
    status: 'read', createdAt: _h(5, 0, 0),
  },
  {
    id: 'msg-041', clientId: 'CLT-0007', clientName: 'City Hall Complex',
    direction: 'note', channel: 'note', subject: '',
    body: 'Spoke with procurement — PO expected within 2 weeks. Contact: Linda Moss ext. 204.',
    attachments: [], linkedJobId: 'JOB-0008', linkedJobNumber: 'JOB-0008',
    sentBy: 'user-1', sentByName: 'Admin User', isRead: true, isInternal: true,
    status: 'sent', createdAt: _h(4, 2, 0),
  },
  // Frank Holloway (CLT-0004)
  {
    id: 'msg-050', clientId: 'CLT-0004', clientName: 'Frank Holloway',
    direction: 'outgoing', channel: 'sms', subject: '',
    body: 'Hi Frank, this is FieldFlow. Your furnace tune-up is scheduled for tomorrow at 9 AM. Reply YES to confirm.',
    attachments: [], linkedJobId: 'JOB-0004', linkedJobNumber: 'JOB-0004',
    sentBy: 'user-1', sentByName: 'Admin User', isRead: true, isInternal: false,
    status: 'delivered', createdAt: _h(2, 12, 0),
  },
  {
    id: 'msg-051', clientId: 'CLT-0004', clientName: 'Frank Holloway',
    direction: 'incoming', channel: 'sms', subject: '',
    body: 'YES confirmed. See you then!',
    attachments: [], linkedJobId: 'JOB-0004', linkedJobNumber: 'JOB-0004',
    sentBy: null, sentByName: null, isRead: true, isInternal: false,
    status: 'read', createdAt: _h(2, 11, 45),
  },
  {
    id: 'msg-052', clientId: 'CLT-0004', clientName: 'Frank Holloway',
    direction: 'system', channel: 'system', subject: '',
    body: '💰 Payment received $185 for INV-0004 — Thank you!',
    attachments: [], linkedJobId: 'JOB-0004', linkedJobNumber: 'JOB-0004',
    sentBy: null, sentByName: null, isRead: true, isInternal: false,
    status: 'sent', createdAt: _h(1, 8, 0),
  },
]

export function getInboxMessages() {
  try {
    const raw = localStorage.getItem(INBOX_KEY)
    return raw ? JSON.parse(raw) : SAMPLE_MESSAGES
  } catch { return SAMPLE_MESSAGES }
}

export function saveInboxMessages(messages) {
  localStorage.setItem(INBOX_KEY, JSON.stringify(messages))
}

export function addInboxMessage(msg) {
  const all = getInboxMessages()
  const newMsg = {
    id: `msg-${Date.now()}`,
    createdAt: new Date().toISOString(),
    attachments: [],
    isRead: false,
    isInternal: false,
    status: 'sent',
    ...msg,
  }
  const updated = [newMsg, ...all]
  saveInboxMessages(updated)
  return newMsg
}

export function markConversationRead(clientId) {
  const all = getInboxMessages()
  const updated = all.map(m => m.clientId === clientId ? { ...m, isRead: true } : m)
  saveInboxMessages(updated)
}

export function getUnreadCount() {
  const all = getInboxMessages()
  return all.filter(m => !m.isRead && m.direction === 'incoming').length
}

export function getConversations() {
  const all = getInboxMessages()
  // Group by clientId, find latest message per client
  const map = {}
  all.forEach(m => {
    if (!map[m.clientId]) {
      map[m.clientId] = { clientId: m.clientId, clientName: m.clientName, messages: [], unread: 0 }
    }
    map[m.clientId].messages.push(m)
    if (!m.isRead && m.direction === 'incoming') map[m.clientId].unread++
  })
  return Object.values(map).map(c => ({
    ...c,
    lastMessage: c.messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0],
    messages: undefined,
  })).sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt))
}

export function getClientMessages(clientId) {
  return getInboxMessages()
    .filter(m => m.clientId === clientId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

// ─── Reset ───────────────────────────────────────────────────────────────────

export function clearAllData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
  localStorage.removeItem(SETTINGS_KEY)
  localStorage.removeItem(EQ_KEY)
  localStorage.removeItem(WC_KEY)
  localStorage.removeItem(WP_KEY)
  localStorage.removeItem(LEADS_KEY)
  localStorage.removeItem(BILLING_KEY)
  localStorage.removeItem(INBOX_KEY)
  localStorage.removeItem('ff_flagged_reviews')
  localStorage.removeItem('ff_maintenance_reminder_last_run')
  seedAll()
}
