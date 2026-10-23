import { KimaiActivity, KimaiCustomer, KimaiProject, KimaiTimesheet, KimaiUser } from '../types/kimai';

export const MOCK_USER: KimaiUser = {
  id: 1,
  username: 'alex_developer',
  alias: 'Alex Rivera',
  title: 'Senior Software Engineer',
  email: 'alex.rivera@codetimer.dev',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  color: '#10B981',
  roles: ['ROLE_USER', 'ROLE_TEAMLEAD'],
};

export const MOCK_CUSTOMERS: KimaiCustomer[] = [
  { id: 1, name: 'Acme Cloud Solutions', number: 'CUST-001', visible: true, color: '#3B82F6' },
  { id: 2, name: 'Starlight Fintech', number: 'CUST-002', visible: true, color: '#10B981' },
  { id: 3, name: 'Internal Engineering', number: 'CUST-003', visible: true, color: '#8B5CF6' },
];

export const MOCK_PROJECTS: KimaiProject[] = [
  {
    id: 101,
    name: 'Mobile Core Redesign',
    customer: 1,
    customerName: 'Acme Cloud Solutions',
    orderNumber: 'PRJ-2026-A',
    color: '#06B6D4',
    visible: true,
  },
  {
    id: 102,
    name: 'GPS Telemetry Integration',
    customer: 2,
    customerName: 'Starlight Fintech',
    orderNumber: 'PRJ-2026-B',
    color: '#10B981',
    visible: true,
  },
  {
    id: 103,
    name: 'Auth & Kimai API Sync',
    customer: 3,
    customerName: 'Internal Engineering',
    orderNumber: 'PRJ-2026-C',
    color: '#F59E0B',
    visible: true,
  },
  {
    id: 104,
    name: 'Native Android & iOS Build',
    customer: 1,
    customerName: 'Acme Cloud Solutions',
    orderNumber: 'PRJ-2026-D',
    color: '#EC4899',
    visible: true,
  },
];

export const MOCK_ACTIVITIES: KimaiActivity[] = [
  { id: 201, name: 'Frontend Architecture & UI', project: null, color: '#06B6D4', visible: true },
  { id: 202, name: 'Backend & REST API Proxy', project: null, color: '#10B981', visible: true },
  { id: 203, name: 'GPS Sensor & Geofencing Debug', project: 102, color: '#F59E0B', visible: true },
  { id: 204, name: 'Code Review & Testing', project: null, color: '#8B5CF6', visible: true },
  { id: 205, name: 'Deployment & Mobile Packaging', project: 104, color: '#EC4899', visible: true },
];

// Active timesheet started 42 minutes ago
const now = new Date();
const activeBeginTime = new Date(now.getTime() - (42 * 60 + 18) * 1000).toISOString();

export const MOCK_ACTIVE_TIMESHEET: KimaiTimesheet = {
  id: 994,
  begin: activeBeginTime,
  end: null,
  duration: 42 * 60 + 18,
  user: { id: 1, username: 'alex_developer' },
  project: MOCK_PROJECTS[1], // GPS Telemetry Integration
  activity: MOCK_ACTIVITIES[2], // GPS Sensor & Geofencing Debug
  description: 'Optimizando captura de geolocalización y formato de campos meta para Kimai GPS plugin',
  tags: ['mobile', 'gps', 'kimai-plugin', 'v2'],
  metaFields: [
    { name: 'latitude', value: '19.432608' },
    { name: 'longitude', value: '-99.133209' },
    { name: 'accuracy', value: '8.4m' },
  ],
};

export const MOCK_PAST_TIMESHEETS: KimaiTimesheet[] = [
  {
    id: 993,
    begin: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
    end: new Date(now.getTime() - (4 * 3600 - 5400) * 1000).toISOString(),
    duration: 5400, // 1h 30m
    user: { id: 1, username: 'alex_developer' },
    project: MOCK_PROJECTS[0],
    activity: MOCK_ACTIVITIES[0],
    description: 'Implementación de modo oscuro Obsidian y paleta de contraste para pantalla OLED',
    tags: ['ui', 'dark-mode', 'tailwind'],
    metaFields: [
      { name: 'latitude', value: '19.432608' },
      { name: 'longitude', value: '-99.133209' },
    ],
  },
  {
    id: 992,
    begin: new Date(now.getTime() - 8 * 3600 * 1000).toISOString(),
    end: new Date(now.getTime() - (8 * 3600 - 7200) * 1000).toISOString(),
    duration: 7200, // 2h 00m
    user: { id: 1, username: 'alex_developer' },
    project: MOCK_PROJECTS[2],
    activity: MOCK_ACTIVITIES[1],
    description: 'Configuración de endpoints de proxy CORS y bypass de tokens X-AUTH-USER / X-AUTH-TOKEN',
    tags: ['api', 'cors', 'security'],
    metaFields: [
      { name: 'latitude', value: '19.432608' },
      { name: 'longitude', value: '-99.133209' },
    ],
  },
  {
    id: 991,
    begin: new Date(now.getTime() - 28 * 3600 * 1000).toISOString(),
    end: new Date(now.getTime() - (28 * 3600 - 9000) * 1000).toISOString(),
    duration: 9000, // 2h 30m
    user: { id: 1, username: 'alex_developer' },
    project: MOCK_PROJECTS[3],
    activity: MOCK_ACTIVITIES[4],
    description: 'Preparación de entorno Capacitor, manifiesto PWA y script de compilación APK',
    tags: ['android', 'apk', 'capacitor'],
  },
  {
    id: 990,
    begin: new Date(now.getTime() - 32 * 3600 * 1000).toISOString(),
    end: new Date(now.getTime() - (32 * 3600 - 3600) * 1000).toISOString(),
    duration: 3600, // 1h 00m
    user: { id: 1, username: 'alex_developer' },
    project: MOCK_PROJECTS[0],
    activity: MOCK_ACTIVITIES[3],
    description: 'Auditoría de performance de renderizado y animaciones Framer Motion en móvil',
    tags: ['performance', 'testing'],
  },
];
