/** Roles that can have a dedicated policy document in the admin portal. */
export const POLICY_ROLE_TARGETS = [
  { role: 'DRIVER', label: 'Driver' },
  { role: 'STAFF', label: 'Staff' },
  { role: 'LOGISTICS_COORDINATOR', label: 'Logistics coordinator' },
  { role: 'MOVEMENT_CENTER', label: 'Movement center' },
  { role: 'MASTER_PERSON', label: 'Master person' }
];

export const POLICY_ROLE_LABELS = Object.fromEntries(
  POLICY_ROLE_TARGETS.map((r) => [r.role, r.label])
);
