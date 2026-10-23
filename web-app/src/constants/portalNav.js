import {
  FolderKanban,
  Globe,
  Users,
  ShieldAlert,
  DollarSign,
  FileText,
  Car,
  Truck,
  AlertTriangle,
  Compass,
  Navigation,
  LayoutDashboard,
  UserCheck,
  BarChart3
} from 'lucide-react';
import { MOVEMENT_CENTER, MOVEMENT_OFFICER_LEGACY } from './roles.js';

export const WEB_PORTAL_ROLES = [
  'SYSTEM_ADMIN',
  'MASTER_PERSON',
  'LOGISTICS_COORDINATOR',
  MOVEMENT_CENTER,
  MOVEMENT_OFFICER_LEGACY
];

export const MOBILE_APP_ROLES = ['STAFF', 'DRIVER'];

export function isWebPortalRole(role) {
  return WEB_PORTAL_ROLES.includes(role);
}

export function isMobileAppRole(role) {
  return MOBILE_APP_ROLES.includes(role);
}

const ADMIN_NAV = [
  { id: 'rides', label: 'Trips', icon: Car },
  { id: 'projects', label: 'Projects & Masters', icon: FolderKanban },
  { id: 'personal-fuel', label: 'Personal Fuel', icon: DollarSign },
  { id: 'policies', label: 'Fleet Policies', icon: FileText },
  { id: 'users', label: 'All Workers', icon: Users },
  { id: 'audit', label: 'Audit Logs', icon: ShieldAlert }
];

/** Role 3 — fleet & transport resources (no dispatch console) */
const LOGISTICS_COORDINATOR_NAV = [
  { id: 'map', label: 'Live Map', icon: Car },
  { id: 'rides', label: 'Trips', icon: Navigation },
  { id: 'vehicles', label: 'Fleet Inventory', icon: Truck },
  { id: 'workers', label: 'Staff & drivers', icon: UserCheck },
  { id: 'drivers', label: 'Driver shifts', icon: Users },
  { id: 'accidents', label: 'Accidents', icon: AlertTriangle },
  { id: 'expenses', label: 'Expenses', icon: DollarSign }
];

/** Role 4 — dispatch & live map only (fleet registration stays with Logistics Coordinator). */
const MOVEMENT_CENTER_NAV = [
  { id: 'dispatch', label: 'Movement center', icon: Compass },
  { id: 'map', label: 'Live map', icon: Car }
];

export const PORTAL_NAV_BY_ROLE = {
  SYSTEM_ADMIN: ADMIN_NAV,
  MASTER_PERSON: [
    { id: 'overview', label: 'Overview', icon: UserCheck },
    { id: 'rides', label: 'Trips', icon: Car },
    { id: 'workers', label: 'Project workers', icon: Users },
    { id: 'fleet', label: 'Fleet', icon: Truck },
    { id: 'accidents', label: 'Accidents', icon: AlertTriangle },
    { id: 'personal-fuel', label: 'Personal Fuel', icon: DollarSign }
  ],
  LOGISTICS_COORDINATOR: LOGISTICS_COORDINATOR_NAV,
  MOVEMENT_CENTER: MOVEMENT_CENTER_NAV,
  MOVEMENT_OFFICER: MOVEMENT_CENTER_NAV
};

export function getPortalNavItems(role) {
  return PORTAL_NAV_BY_ROLE[role] || PORTAL_NAV_BY_ROLE[MOVEMENT_OFFICER_LEGACY] || [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard }
  ];
}

export function getDefaultPortalSection(role) {
  return getPortalNavItems(role)[0]?.id || 'overview';
}
