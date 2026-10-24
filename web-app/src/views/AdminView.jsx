import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCountries,
  fetchProjects,
  createCountry,
  createProject,
  assignMasterPerson,
  updateProjectStatus
} from '../store/slices/projectSlice.js';
import { apiRequest } from '../api/client.js';
import {
  countExternalRidesForDashboard,
  matchesExternalRideFilter,
  externalRideStatusLabel,
  externalRideDriverLine,
  isExternalRideRequest
} from '../utils/rideHelpers.js';
import {
  Globe,
  FolderKanban,
  Users,
  ShieldAlert,
  Plus,
  CheckCircle,
  XCircle,
  Search,
  Activity,
  Car,
  DollarSign,
  FileText,
  Edit,
  Save,
  Check,
  CreditCard,
  AlertCircle,
  UserCheck,
  Navigation,
  ChevronRight
} from 'lucide-react';
import { usePortalNav } from '../context/PortalNavContext.jsx';
import { StatCardsSkeleton, TableSkeleton } from '../components/ui/Skeleton.jsx';
import LoadingButton from '../components/ui/LoadingButton.jsx';
import AdminStatCard from '../components/admin/AdminStatCard.jsx';
import AdminSectionHeader from '../components/admin/AdminSectionHeader.jsx';
import PasswordField from '../components/ui/PasswordField.jsx';
import { POLICY_ROLE_TARGETS, POLICY_ROLE_LABELS } from '../constants/policyRoles.js';
import { DRIVER_SHIFT_DAY, DRIVER_SHIFT_OPTIONS } from '../constants/driverShifts.js';

const WORKER_ROLE_FILTERS = [
  { key: 'ALL', label: 'All workers', tone: 'brand', icon: Users },
  { key: 'SYSTEM_ADMIN', label: 'Platform admins', tone: 'amber', icon: ShieldAlert },
  { key: 'MASTER_PERSON', label: 'Master persons', tone: 'purple', icon: UserCheck },
  { key: 'LOGISTICS_COORDINATOR', label: 'Coordinators', tone: 'blue', icon: FolderKanban },
  { key: 'MOVEMENT_OFFICER', label: 'Movement officers', tone: 'emerald', icon: Navigation },
  { key: 'STAFF', label: 'Staff', tone: 'blue', icon: Users },
  { key: 'DRIVER', label: 'Drivers', tone: 'rose', icon: Car }
];

const ROLE_LABELS = {
  SYSTEM_ADMIN: 'Platform admin',
  MASTER_PERSON: 'Master person',
  LOGISTICS_COORDINATOR: 'Logistics coordinator',
  MOVEMENT_OFFICER: 'Movement officer',
  STAFF: 'Staff',
  DRIVER: 'Driver'
};

const ASSIGNABLE_ROLES = [
  'SYSTEM_ADMIN',
  'MASTER_PERSON',
  'LOGISTICS_COORDINATOR',
  'MOVEMENT_OFFICER',
  'STAFF',
  'DRIVER'
];

export default function AdminView() {
  const dispatch = useDispatch();
  const { countries, projects, loading: projectsLoading, saving: projectSaving } = useSelector(state => state.project);
  const { section: activeTab } = usePortalNav();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [personalFuelRecoveries, setPersonalFuelRecoveries] = useState([]);
  const [policies, setPolicies] = useState([]);

  // Modals
  const [rides, setRides] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [savingMaster, setSavingMaster] = useState(false);
  const [rideStatusFilter, setRideStatusFilter] = useState('ALL');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [showAssignMasterModal, setShowAssignMasterModal] = useState(false);
  const [assignMasterProjectId, setAssignMasterProjectId] = useState('');
  const [assignMasterUserId, setAssignMasterUserId] = useState('');
  const [createdMasterCreds, setCreatedMasterCreds] = useState(null);
  const [projectsPanel, setProjectsPanel] = useState(null);
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [fuelListFilter, setFuelListFilter] = useState('ALL');
  const [editingCountry, setEditingCountry] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectForm, setEditProjectForm] = useState({
    name: '',
    country_id: '',
    city: '',
    description: '',
    allow_vehicle_sharing: true,
    master_person_id: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [savingWorker, setSavingWorker] = useState(false);
  const [createdWorkerCreds, setCreatedWorkerCreds] = useState(null);
  const [editCountryForm, setEditCountryForm] = useState({ name: '', code: '', currency: '', is_active: true });
  const [editUserForm, setEditUserForm] = useState({
    full_name: '',
    phone_number: '',
    is_active: true,
    role: 'STAFF',
    project_id: '',
    country_id: '',
    master_project_ids: [],
    password: '',
    language_preference: 'en'
  });
  const [workerForm, setWorkerForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    role: 'STAFF',
    country_id: '',
    project_id: '',
    license_number: '',
    shift_type: DRIVER_SHIFT_DAY
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [closingProjectId, setClosingProjectId] = useState(null);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedRecovery, setSelectedRecovery] = useState(null);
  const [settleNote, setSettleNote] = useState('Paid at Finance Desk (Receipt verified)');

  // Policy Editor State
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [policyForm, setPolicyForm] = useState({
    role_target: 'DRIVER',
    title: '',
    content: '',
    isNew: true
  });

  const [countryForm, setCountryForm] = useState({ name: '', code: '', currency: 'ETB' });
  const [projectForm, setProjectForm] = useState({
    country_id: '',
    name: '',
    code: '',
    city: '',
    description: '',
    allow_vehicle_sharing: true,
    master_person_id: ''
  });

  const [masterForm, setMasterForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    country_id: '',
    project_id: ''
  });

  useEffect(() => {
    dispatch(fetchCountries());
    dispatch(fetchProjects());
    loadUsers();
    loadAudits();
    loadPersonalFuel();
    loadPolicies();
    loadRides();
  }, [dispatch]);

  useEffect(() => {
    setProjectsPanel(null);
    setUserRoleFilter('ALL');
    setFuelListFilter('ALL');
    setRideStatusFilter('ALL');
  }, [activeTab]);

  const loadRides = async () => {
    setRidesLoading(true);
    try {
      const res = await apiRequest('/requests');
      setRides(res.data || res.requests || []);
    } catch {
      setRides([]);
    } finally {
      setRidesLoading(false);
    }
  };

  const masterPersons = users.filter((u) => u.role === 'MASTER_PERSON');

  const rideStats = {
    total: rides.length,
    pending: rides.filter((r) => ['PENDING', 'APPROVED'].includes(r.status)).length,
    active: rides.filter((r) =>
      ['ASSIGNED', 'ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED', 'IN_TRANSIT', 'PASSENGER_PICKED_UP', 'EXTERNAL_AUTHORIZED'].includes(r.status)
    ).length,
    external: countExternalRidesForDashboard(rides),
    completed: rides.filter((r) => r.status === 'COMPLETED').length,
    cancelled: rides.filter((r) => ['CANCELLED', 'REJECTED'].includes(r.status)).length
  };

  const filteredRides =
    rideStatusFilter === 'ALL'
      ? rides
      : rideStatusFilter === 'ACTIVE'
        ? rides.filter((r) =>
            ['ASSIGNED', 'ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED', 'IN_TRANSIT', 'PASSENGER_PICKED_UP', 'EXTERNAL_AUTHORIZED'].includes(r.status)
          )
        : rideStatusFilter === 'EXTERNAL'
          ? rides.filter(matchesExternalRideFilter)
          : rideStatusFilter === 'PENDING'
            ? rides.filter((r) => ['PENDING', 'APPROVED'].includes(r.status))
            : rides.filter((r) => r.status === rideStatusFilter);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await apiRequest('/users');
      setUsers(res.data || []);
    } catch (e) {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAudits = async () => {
    try {
      setAuditLogs([
        { id: '1', action: 'PROJECT_CREATED', entity_type: 'PROJECT', entity_id: 'proj-eth-a', ip_address: '127.0.0.1', created_at: new Date().toISOString() },
        { id: '2', action: 'MASTER_PERSON_ASSIGNED', entity_type: 'USER', entity_id: 'usr-master-a', ip_address: '127.0.0.1', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: '3', action: 'VEHICLE_REGISTERED', entity_type: 'VEHICLE', entity_id: 'veh-01', ip_address: '127.0.0.1', created_at: new Date(Date.now() - 7200000).toISOString() }
      ]);
    } catch (e) {}
  };

  const loadPersonalFuel = async () => {
    try {
      const res = await apiRequest('/personal-fuel');
      setPersonalFuelRecoveries(res.data || []);
    } catch (e) {}
  };

  const loadPolicies = async () => {
    try {
      const res = await apiRequest('/policies');
      setPolicies(res.data || []);
    } catch (e) {}
  };

  const handleCreateCountry = async (e) => {
    e.preventDefault();
    if (!countryForm.name || !countryForm.code) return;
    await dispatch(createCountry(countryForm));
    setShowCountryModal(false);
    setCountryForm({ name: '', code: '', currency: 'ETB' });
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectForm.name || !projectForm.code || !projectForm.country_id || !projectForm.city?.trim()) return;
    const payload = {
      country_id: projectForm.country_id,
      name: projectForm.name,
      code: projectForm.code,
      city: projectForm.city.trim(),
      description: projectForm.description,
      allow_vehicle_sharing: projectForm.allow_vehicle_sharing
    };
    if (projectForm.master_person_id) {
      payload.master_person_id = projectForm.master_person_id;
    }
    await dispatch(createProject(payload));
    await dispatch(fetchProjects());
    setShowProjectModal(false);
    setProjectForm({
      country_id: '',
      name: '',
      code: '',
      description: '',
      allow_vehicle_sharing: true,
      master_person_id: ''
    });
  };

  const handleCreateMasterPerson = async (e) => {
    e.preventDefault();
    if (!masterForm.full_name || !masterForm.email || !masterForm.password) return;
    setSavingMaster(true);
    try {
      const body = {
        full_name: masterForm.full_name,
        email: masterForm.email,
        password: masterForm.password,
        phone_number: masterForm.phone_number,
        role: 'MASTER_PERSON',
        country_id: masterForm.country_id || projectForm.country_id || countries[0]?.id,
        language_preference: 'en'
      };
      const res = await apiRequest('/users', { method: 'POST', body });
      const newUser = res.data;
      if (masterForm.project_id && newUser?.id) {
        await dispatch(
          assignMasterPerson({ projectId: masterForm.project_id, userId: newUser.id })
        );
        await dispatch(fetchProjects());
      }
      setCreatedMasterCreds({
        email: masterForm.email,
        password: masterForm.password,
        name: masterForm.full_name
      });
      setMasterForm({
        full_name: '',
        email: '',
        password: '',
        phone_number: '',
        country_id: '',
        project_id: ''
      });
      loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to create master person');
    } finally {
      setSavingMaster(false);
    }
  };

  const openAssignMaster = (projectId) => {
    setAssignMasterProjectId(projectId);
    setAssignMasterUserId('');
    setShowAssignMasterModal(true);
  };

  const handleConfirmAssignMaster = async (e) => {
    e.preventDefault();
    if (!assignMasterProjectId || !assignMasterUserId) return;
    try {
      await dispatch(
        assignMasterPerson({ projectId: assignMasterProjectId, userId: assignMasterUserId })
      ).unwrap();
      await dispatch(fetchProjects());
      setShowAssignMasterModal(false);
      loadUsers();
    } catch (err) {
      alert(err.message || 'Assignment failed');
    }
  };

  const openSettleModal = (rec) => {
    setSelectedRecovery(rec);
    setSettleNote(`Paid at Finance Desk (Ref: REC-${Math.floor(10000 + Math.random() * 90000)})`);
    setShowSettleModal(true);
  };

  const handleConfirmSettle = async (e) => {
    e.preventDefault();
    if (!selectedRecovery) return;
    try {
      await apiRequest(`/personal-fuel/${selectedRecovery.id}/mark-paid`, {
        method: 'PATCH',
        body: {
          payment_reference: settleNote,
          notes: 'Settled by Platform Administrator'
        }
      });
      setShowSettleModal(false);
      setSelectedRecovery(null);
      loadPersonalFuel();
    } catch (err) {
      alert(`Settlement failed: ${err.message}`);
    }
  };

  const openPolicyEditor = (policyOrRole) => {
    if (typeof policyOrRole === 'string') {
      setEditingPolicy({ role_target: policyOrRole, isNew: true });
      setPolicyForm({
        role_target: policyOrRole,
        title: `${POLICY_ROLE_LABELS[policyOrRole] || policyOrRole} policy`,
        content: '',
        isNew: true
      });
      return;
    }
    setEditingPolicy(policyOrRole);
    setPolicyForm({
      role_target: policyOrRole.role_target,
      title: policyOrRole.title || '',
      content: policyOrRole.content || '',
      isNew: false
    });
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    try {
      if (policyForm.isNew) {
        await apiRequest('/policies', {
          method: 'POST',
          body: {
            role_target: policyForm.role_target,
            title: policyForm.title,
            content: policyForm.content
          }
        });
      } else {
        await apiRequest(`/policies/${policyForm.role_target}`, {
          method: 'PUT',
          body: { title: policyForm.title, content: policyForm.content }
        });
      }
      setEditingPolicy(null);
      loadPolicies();
    } catch (err) {
      alert(`Save policy failed: ${err.message}`);
    }
  };

  const unpaidTotal = personalFuelRecoveries
    .filter(r => r.settlement_status === 'UNPAID')
    .reduce((sum, r) => sum + (Number(r.amount_billed_etb) || 0), 0);

  const paidFuelCount = personalFuelRecoveries.filter((r) => r.settlement_status === 'PAID').length;
  const unpaidFuelCount = personalFuelRecoveries.filter((r) => r.settlement_status === 'UNPAID').length;

  const filteredUsers =
    userRoleFilter === 'ALL' ? users : users.filter((u) => u.role === userRoleFilter);

  const filteredFuel =
    fuelListFilter === 'ALL'
      ? personalFuelRecoveries
      : personalFuelRecoveries.filter((r) =>
          fuelListFilter === 'UNPAID' ? r.settlement_status === 'UNPAID' : r.settlement_status === 'PAID'
        );

  const openEditCountry = (c) => {
    setEditingCountry(c);
    setEditCountryForm({
      name: c.name,
      code: c.code,
      currency: c.currency,
      is_active: c.is_active !== false
    });
  };

  const handleCloseProject = async (projectId, projectName) => {
    if (!window.confirm(`Close project "${projectName}"? All sites and workers under it will be deactivated.`)) return;
    setClosingProjectId(projectId);
    try {
      const result = await dispatch(updateProjectStatus({ projectId, is_active: false }));
      if (updateProjectStatus.rejected.match(result)) {
        throw new Error(result.payload || 'Could not close project');
      }
      await dispatch(fetchProjects());
      loadUsers();
    } catch (err) {
      alert(err.message || 'Close project failed. Sign in as Super Admin (admin@tmlogistx.com) to close projects.');
    } finally {
      setClosingProjectId(null);
    }
  };

  const handleReopenProject = async (projectId, projectName) => {
    if (!window.confirm(`Reopen project "${projectName}"? Workers and sites stay as they were when closed — reactivate accounts manually if needed.`)) return;
    setClosingProjectId(projectId);
    try {
      const result = await dispatch(updateProjectStatus({ projectId, is_active: true }));
      if (updateProjectStatus.rejected.match(result)) {
        throw new Error(result.payload || 'Could not reopen project');
      }
      await dispatch(fetchProjects());
    } catch (err) {
      alert(err.message);
    } finally {
      setClosingProjectId(null);
    }
  };

  const handleCloseCountry = async (countryId, countryName) => {
    if (!window.confirm(`Close country "${countryName}"? All projects, sites, and workers under it will be deactivated.`)) return;
    try {
      await apiRequest(`/countries/${encodeURIComponent(countryId)}`, { method: 'PATCH', body: { is_active: false } });
      await dispatch(fetchCountries());
      await dispatch(fetchProjects());
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setEditUserForm({
      full_name: u.full_name,
      phone_number: u.phone_number || '',
      is_active: u.is_active !== false,
      role: u.role,
      project_id: u.project_id || '',
      country_id: u.country_id || '',
      master_project_ids: u.master_project_ids || [],
      password: '',
      language_preference: u.language_preference || 'en'
    });
  };

  const openEditProject = (proj) => {
    const primaryMaster = proj.masterPersons?.[0]?.id || '';
    setEditingProject(proj);
    setEditProjectForm({
      name: proj.name || '',
      country_id: proj.country_id || proj.country?.id || '',
      city: proj.city || '',
      description: proj.description || '',
      allow_vehicle_sharing: proj.allow_vehicle_sharing !== false,
      master_person_id: primaryMaster
    });
  };

  const handleSaveProjectEdit = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    setSavingEdit(true);
    try {
      await apiRequest(`/projects/${encodeURIComponent(editingProject.id)}`, {
        method: 'PATCH',
        body: editProjectForm
      });
      await dispatch(fetchProjects());
      setEditingProject(null);
    } catch (err) {
      alert(err.message || 'Could not save project');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleEditMasterProject = (projectId) => {
    setEditUserForm((prev) => {
      const set = new Set(prev.master_project_ids || []);
      if (set.has(projectId)) set.delete(projectId);
      else set.add(projectId);
      return { ...prev, master_project_ids: [...set] };
    });
  };

  const countUsersForRoleFilter = (key) =>
    key === 'ALL' ? users.length : users.filter((u) => u.role === key).length;

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    if (!workerForm.full_name || !workerForm.email || !workerForm.password) return;
    if (workerForm.role === 'DRIVER' && !workerForm.project_id) {
      alert('Select a project for the driver account.');
      return;
    }
    if (workerForm.role === 'DRIVER' && !workerForm.license_number?.trim()) {
      alert('License number is required for drivers.');
      return;
    }
    setSavingWorker(true);
    try {
      const body = {
        full_name: workerForm.full_name,
        email: workerForm.email,
        password: workerForm.password,
        phone_number: workerForm.phone_number,
        role: workerForm.role,
        country_id: workerForm.country_id || countries[0]?.id,
        project_id: workerForm.project_id || undefined,
        language_preference: 'en'
      };
      if (workerForm.role === 'DRIVER') {
        body.license_number = workerForm.license_number.trim();
        body.shift_type = workerForm.shift_type;
      }
      const res = await apiRequest('/users', { method: 'POST', body });
      const newUser = res.data;
      if (workerForm.role === 'MASTER_PERSON' && workerForm.project_id && newUser?.id) {
        await dispatch(assignMasterPerson({ projectId: workerForm.project_id, userId: newUser.id }));
        await dispatch(fetchProjects());
      }
      setCreatedWorkerCreds({
        email: workerForm.email,
        password: workerForm.password,
        name: workerForm.full_name,
        role: workerForm.role
      });
      setWorkerForm({
        full_name: '',
        email: '',
        password: '',
        phone_number: '',
        role: 'STAFF',
        country_id: '',
        project_id: '',
        license_number: '',
        shift_type: DRIVER_SHIFT_DAY
      });
      loadUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingWorker(false);
    }
  };

  const handleSaveCountryEdit = async (e) => {
    e.preventDefault();
    if (!editingCountry) return;
    setSavingEdit(true);
    try {
      await apiRequest(`/countries/${editingCountry.id}`, { method: 'PATCH', body: editCountryForm });
      await dispatch(fetchCountries());
      setEditingCountry(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      const body = { ...editUserForm };
      if (!body.password) delete body.password;
      if (editingUser.role !== 'MASTER_PERSON') delete body.master_project_ids;
      await apiRequest(`/users/${editingUser.id}`, { method: 'PATCH', body });
      loadUsers();
      await dispatch(fetchProjects());
      setEditingUser(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const projectActions = (
    <>
      <button
        type="button"
        onClick={() => {
          setCreatedMasterCreds(null);
          setShowMasterModal(true);
        }}
        className="px-4 py-2 bg-white border border-brand-200 text-brand-700 hover:bg-brand-50 rounded-xl text-xs font-semibold flex items-center gap-1.5"
      >
        <UserCheck className="w-4 h-4" /> New Master Person
      </button>
      <button
        type="button"
        onClick={() => setShowCountryModal(true)}
        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
      >
        <Plus className="w-4 h-4 text-brand-600" /> Add Country
      </button>
      <button
        type="button"
        onClick={() => setShowProjectModal(true)}
        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
      >
        <Plus className="w-4 h-4" /> Add Project
      </button>
    </>
  );

  return (
    <div className="portal-page">
      {/* Trips overview */}
      {activeTab === 'rides' && (
        <div className="space-y-4">
          <AdminSectionHeader
            icon={Navigation}
            title="Trips"
            subtitle="Platform-wide movement requests. Click a summary card to filter the detail list below."
          />
          {ridesLoading ? (
            <>
              <StatCardsSkeleton count={5} />
              <TableSkeleton rows={10} cols={8} />
            </>
          ) : (
          <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { key: 'ALL', label: 'All trips', value: rideStats.total, color: 'brand' },
              { key: 'PENDING', label: 'Pending', value: rideStats.pending, color: 'amber' },
              { key: 'ACTIVE', label: 'In progress', value: rideStats.active, color: 'blue' },
              { key: 'EXTERNAL', label: 'Uber / RIDE', value: rideStats.external, color: 'violet' },
              { key: 'COMPLETED', label: 'Completed', value: rideStats.completed, color: 'emerald' },
              { key: 'CANCELLED', label: 'Cancelled', value: rideStats.cancelled, color: 'rose' }
            ].map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => setRideStatusFilter(card.key)}
                className={`glass-panel p-4 rounded-xl text-left border transition-all ${
                  rideStatusFilter === card.key ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{card.label}</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{card.value}</div>
              </button>
            ))}
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-brand-600" /> Trip detail list
              </h2>
              <button
                type="button"
                onClick={loadRides}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Refresh
              </button>
            </div>
            <div className="portal-table-scroll overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[960px]">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Request #</th>
                    <th className="p-3.5">Project</th>
                    <th className="p-3.5">Staff</th>
                    <th className="p-3.5">Pickup</th>
                    <th className="p-3.5">Destination</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Driver / Vehicle</th>
                    <th className="p-3.5">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRides.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No rides match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRides.map((ride) => (
                      <tr key={ride.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono font-bold text-brand-700">
                          {ride.request_number || ride.id}
                        </td>
                        <td className="p-3.5">{ride.project?.name || ride.project_name || '—'}</td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-900 block">
                            {ride.staff?.full_name || '—'}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-[140px] truncate" title={ride.pickup_address || ride.pickup_location}>
                          {ride.pickup_address || ride.pickup_location || '—'}
                        </td>
                        <td className="p-3.5 max-w-[140px] truncate" title={ride.destination_address || ride.destination_location}>
                          {ride.destination_address || ride.destination_location || '—'}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            isExternalRideRequest(ride)
                              ? 'bg-violet-100 text-violet-900'
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            {isExternalRideRequest(ride) ? externalRideStatusLabel(ride) : ride.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-[11px]">
                          {isExternalRideRequest(ride) ? (
                            <>
                              <span className="font-semibold text-violet-900">
                                {externalRideDriverLine(ride)?.name || 'External taxi'}
                              </span>
                              <br />
                              <span className="text-slate-500 font-mono">
                                {externalRideDriverLine(ride)?.plate || ride.external_provider || ''}
                              </span>
                            </>
                          ) : (
                            <>
                              {ride.assignment?.driver?.full_name || '—'}
                              <br />
                              <span className="text-slate-500 font-mono">
                                {ride.assignment?.vehicle?.plate_number || ''}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">
                          {ride.created_at ? new Date(ride.created_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* Projects hub: countries, projects, master persons */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <AdminSectionHeader
            icon={FolderKanban}
            title="Projects & Master Persons"
            subtitle="Click a category to open its list. You can assign masters when creating projects or later from the project row."
            actions={projectActions}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AdminStatCard
              icon={Globe}
              label="Countries"
              value={countries.length}
              tone="purple"
              active={projectsPanel === 'countries'}
              onClick={() => setProjectsPanel('countries')}
            />
            <AdminStatCard
              icon={FolderKanban}
              label="Projects"
              value={projects.length}
              tone="blue"
              active={projectsPanel === 'projects'}
              onClick={() => setProjectsPanel('projects')}
            />
            <AdminStatCard
              icon={UserCheck}
              label="Master persons"
              value={masterPersons.length}
              tone="brand"
              active={projectsPanel === 'masters'}
              onClick={() => setProjectsPanel('masters')}
            />
          </div>

          {!projectsPanel && (
            <p className="text-sm text-slate-500 text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              Select <strong>Countries</strong>, <strong>Projects</strong>, or <strong>Master persons</strong> above to view and edit records.
            </p>
          )}

          {projectsPanel === 'countries' && (
            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Country hubs</h2>
                <span className="text-xs text-slate-400">{countries.length} countries</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Country</th>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Currency</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {countries.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900">{c.name}</td>
                      <td className="p-3.5 font-mono text-purple-600">{c.code}</td>
                      <td className="p-3.5 font-semibold text-amber-700">{c.currency}</td>
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditCountry(c)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg"
                        >
                          Edit
                        </button>
                        {c.is_active !== false && (
                          <button
                            type="button"
                            onClick={() => handleCloseCountry(c.id, c.name)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg"
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {projectsPanel === 'masters' && (
            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Master person accounts</h2>
                <span className="text-xs text-slate-400">{masterPersons.length} accounts</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Country</th>
                    <th className="p-3.5">Projects</th>
                    <th className="p-3.5">Phone</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {masterPersons.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900">{u.full_name}</td>
                      <td className="p-3.5 font-mono text-slate-500">{u.email}</td>
                      <td className="p-3.5">{u.country_name || countries.find((c) => c.id === u.country_id)?.name || '—'}</td>
                      <td className="p-3.5 text-slate-600">
                        {(u.master_project_ids || [])
                          .map((pid) => projects.find((p) => p.id === pid)?.name || pid)
                          .join(', ') || '—'}
                      </td>
                      <td className="p-3.5">{u.phone_number || '—'}</td>
                      <td className="p-3.5">
                        <span className={u.is_active ? 'badge-available' : 'badge-offline'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => openEditUser(u)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {projectsPanel === 'projects' && (
        projectsLoading && projects.length === 0 ? (
          <TableSkeleton rows={8} cols={8} />
        ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-brand-600" /> Active Projects Directory
            </h2>
            <span className="text-xs text-slate-400">{projects.length} Projects Configured</span>
          </div>
          <div className="portal-table-scroll overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Project Name</th>
                  <th className="p-3.5">Country</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Master Person(s)</th>
                  <th className="p-3.5">Fleet Size</th>
                  <th className="p-3.5">Vehicle Sharing</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-700">
                {projects.map(proj => (
                  <tr key={proj.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{proj.name}</td>
                    <td className="p-3.5">{proj.country?.name || 'Ethiopia'}</td>
                    <td className="p-3.5 font-mono text-brand-600">{proj.code}</td>
                    <td className="p-3.5">
                      {proj.masterPersons && proj.masterPersons.length > 0 ? (
                        <div className="flex flex-col">
                          {proj.masterPersons.map(mp => (
                            <span key={mp.id} className="text-emerald-600 font-medium">{mp.full_name}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-amber-700 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">{proj.vehicleCount ?? 0} vehicles</td>
                    <td className="p-3.5">
                      {proj.allow_vehicle_sharing ? (
                        <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-500/20">Enabled</span>
                      ) : (
                        <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded text-[11px]">Strict Isolation</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={proj.is_active !== false ? 'badge-available' : 'badge-offline'}>
                        {proj.is_active !== false ? 'Active' : 'Closed'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => openEditProject(proj)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openAssignMaster(proj.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100"
                      >
                        {proj.masterPersons?.length ? 'Change master' : 'Assign master'}
                      </button>
                      {proj.is_active !== false ? (
                        <button
                          type="button"
                          disabled={closingProjectId === proj.id || projectSaving}
                          onClick={() => handleCloseProject(proj.id, proj.name)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg disabled:opacity-50"
                        >
                          {closingProjectId === proj.id ? 'Closing…' : 'Close'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={closingProjectId === proj.id || projectSaving}
                          onClick={() => handleReopenProject(proj.id, proj.name)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg disabled:opacity-50"
                        >
                          {closingProjectId === proj.id ? 'Saving…' : 'Reopen'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 px-1">
            Create a project without a master, then use <strong className="text-slate-700">Assign master</strong> or create a
            master person first and link them when creating the project.
          </p>
        </div>
        )
          )}
        </div>
      )}

      {/* Tab 2: Personal Trip Fuel Recoveries */}
      {activeTab === 'personal-fuel' && (
        <div className="space-y-4">
          <AdminSectionHeader
            icon={DollarSign}
            title="Personal fuel recoveries"
            subtitle="Staff personal trip fuel billing. Click a card to filter the ledger."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AdminStatCard
              icon={AlertCircle}
              label="Unpaid records"
              value={unpaidFuelCount}
              tone="rose"
              active={fuelListFilter === 'UNPAID'}
              onClick={() => setFuelListFilter('UNPAID')}
            />
            <AdminStatCard
              icon={CheckCircle}
              label="Paid / settled"
              value={paidFuelCount}
              tone="emerald"
              active={fuelListFilter === 'PAID'}
              onClick={() => setFuelListFilter('PAID')}
            />
            <AdminStatCard
              icon={DollarSign}
              label="Outstanding debt"
              value={`${unpaidTotal.toLocaleString()} ETB`}
              tone="amber"
              active={fuelListFilter === 'ALL'}
              onClick={() => setFuelListFilter('ALL')}
              hint="View all"
            />
          </div>
          <div className="glass-panel p-4 rounded-2xl flex items-center justify-between border border-amber-200 bg-amber-50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-700" /> Staff Personal Trip Fuel Recovery Ledger
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Staff requesting fleet vehicles for personal use are billed for fuel consumed. Administrators review and mark settlements as paid.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-200">
              Outstanding Debt: {unpaidTotal.toLocaleString()} ETB
            </span>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
            {personalFuelRecoveries.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-semibold text-white">No Personal Trip Fuel Liabilities</p>
                <p className="text-slate-500">All personal vehicle trips have either been settled or none logged yet.</p>
              </div>
            ) : (
              <div className="portal-table-scroll overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[900px]">
                  <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Staff Member</th>
                      <th className="p-3.5">Vehicle Used</th>
                      <th className="p-3.5">Distance</th>
                      <th className="p-3.5">Fuel Consumed</th>
                      <th className="p-3.5">Amount Billed</th>
                      <th className="p-3.5">Settlement Status</th>
                      <th className="p-3.5 text-right">Payment Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-700">
                    {filteredFuel.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-mono text-slate-400">
                          {new Date(rec.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3.5">
                          <strong className="text-slate-900 block">{rec.staff_name || 'Staff Member'}</strong>
                          <span className="text-[10px] text-slate-500">{rec.staff_email}</span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-900">{rec.vehicle_plate || '-'}</td>
                        <td className="p-3.5 font-mono text-slate-700">{rec.distance_km} km</td>
                        <td className="p-3.5 font-mono text-amber-800">{rec.fuel_consumed_liters} L</td>
                        <td className="p-3.5 font-bold text-slate-900 font-mono">
                          {rec.amount_billed_etb?.toLocaleString()} {rec.currency || 'ETB'}
                        </td>
                        <td className="p-3.5">
                          {rec.settlement_status === 'PAID' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1 w-fit">
                              <CheckCircle className="w-3 h-3" /> Paid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit">
                              <AlertCircle className="w-3 h-3" /> Unpaid Debt
                            </span>
                          )}
                          {rec.settled_at && (
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              Paid {new Date(rec.settled_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          {rec.settlement_status === 'UNPAID' ? (
                            <button
                              onClick={() => openSettleModal(rec)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1 ml-auto"
                            >
                              <CreditCard className="w-3 h-3" /> Mark as Paid
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono italic">
                              {rec.payment_reference || 'Settled'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Fleet Policies & Agreements */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <AdminSectionHeader
            icon={FileText}
            title="Fleet policies"
            subtitle="One policy per role. Slots stay available after a database reset — create or edit content for each role."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
            <AdminStatCard
              icon={FileText}
              label="Policies published"
              value={policies.length}
              tone="emerald"
              hint={`${POLICY_ROLE_TARGETS.length} role slots`}
            />
          </div>
          <div className="glass-panel p-4 rounded-2xl flex items-center justify-between border border-blue-200 bg-blue-50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" /> Fleet Safety Policies & User Agreement Framework
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Top administrators define safety guidelines, safe path regulations, dynamic driver agreements, and personal fuel liability policies.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-700">
              {policies.length} Active Role Policy Set(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {POLICY_ROLE_TARGETS.map(({ role, label }) => {
              const pol = policies.find((p) => p.role_target === role);
              return (
                <div
                  key={role}
                  className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between min-h-[220px]"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-600 border border-brand-500/20">
                        {label}
                      </span>
                      {pol ? (
                        <span className="text-[10px] font-mono text-slate-500">v{pol.version}</span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-semibold">Not created</span>
                      )}
                    </div>
                    {pol ? (
                      <>
                        <h3 className="text-sm font-bold text-slate-900">{pol.title}</h3>
                        <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-44 overflow-y-auto whitespace-pre-line leading-relaxed font-sans">
                          {pol.content}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500 py-6">
                        No policy text yet for this role. Add safety rules and usage terms so users can accept them in the app.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-end text-xs">
                    {pol ? (
                      <button
                        type="button"
                        onClick={() => openPolicyEditor(pol)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-brand-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-300 transition-all"
                      >
                        <Edit className="w-3 h-3" /> Edit policy
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openPolicyEditor(role)}
                        className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Create policy
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Users Roster */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <AdminSectionHeader
            icon={Users}
            title="All workers"
            subtitle="Every account on the platform — admins, master persons, coordinators, movement officers, staff, and drivers. Click a role to list and edit."
            actions={
              <button
                type="button"
                onClick={() => {
                  setCreatedWorkerCreds(null);
                  setShowWorkerModal(true);
                }}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> New worker
              </button>
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {WORKER_ROLE_FILTERS.map((card) => (
              <AdminStatCard
                key={card.key}
                icon={card.icon}
                label={card.label}
                value={countUsersForRoleFilter(card.key)}
                tone={card.tone}
                active={userRoleFilter === card.key}
                onClick={() => setUserRoleFilter(card.key)}
              />
            ))}
          </div>
        {usersLoading ? (
          <TableSkeleton rows={10} cols={7} />
        ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              {userRoleFilter === 'ALL'
                ? 'All platform workers'
                : ROLE_LABELS[userRoleFilter] || userRoleFilter}
            </h2>
            <span className="text-xs text-slate-400">{filteredUsers.length} shown</span>
          </div>
          <div className="portal-table-scroll overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-slate-50 text-slate-400 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Full name</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Project</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No workers in this category yet.
                  </td>
                </tr>
              ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-900">{u.full_name}</td>
                  <td className="p-3.5 font-mono text-slate-500">{u.email}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600">{u.project_name || '—'}</td>
                  <td className="p-3.5 font-mono">{u.phone_number || '—'}</td>
                  <td className="p-3.5">
                    <span className={u.is_active !== false ? 'badge-available' : 'badge-offline'}>
                      {u.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => openEditUser(u)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg inline-flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
          </div>
        </div>
        )}
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <AdminSectionHeader
            icon={ShieldAlert}
            title="Audit logs"
            subtitle="Security and configuration events across the platform."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-xl">
            <AdminStatCard icon={Activity} label="Logged events" value={auditLogs.length} tone="rose" hint="Detail below" />
          </div>
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Security & Platform Audit Trail
            </h2>
            <span className="text-xs text-slate-400">Append-Only Immutable Log</span>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Action Event</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5">Entity ID</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-700">
              {auditLogs.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 font-mono">
                  <td className="p-3.5 text-slate-900 font-bold">{a.action}</td>
                  <td className="p-3.5 text-slate-400">{a.entity_type}</td>
                  <td className="p-3.5 text-brand-600">{a.entity_id}</td>
                  <td className="p-3.5 text-slate-500">{a.ip_address}</td>
                  <td className="p-3.5 text-slate-500">{new Date(a.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* Modal: Edit country */}
      {editingCountry && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Edit country</h3>
            <form onSubmit={handleSaveCountryEdit} className="space-y-3 text-xs">
              <input
                required
                value={editCountryForm.name}
                onChange={(e) => setEditCountryForm({ ...editCountryForm, name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                placeholder="Country name"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  value={editCountryForm.code}
                  onChange={(e) => setEditCountryForm({ ...editCountryForm, code: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 uppercase"
                  placeholder="Code"
                />
                <input
                  required
                  value={editCountryForm.currency}
                  onChange={(e) => setEditCountryForm({ ...editCountryForm, currency: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 uppercase"
                  placeholder="Currency"
                />
              </div>
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={editCountryForm.is_active}
                  onChange={(e) => setEditCountryForm({ ...editCountryForm, is_active: e.target.checked })}
                />
                Country active (uncheck to close country and cascade)
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingCountry(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold">Cancel</button>
                <LoadingButton type="submit" loading={savingEdit} loadingLabel="Saving…" className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold">Save</LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit worker */}
      {editingUser && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">
              {editingUser.role === 'MASTER_PERSON' ? 'Edit master person' : 'Edit worker'}
            </h3>
            <p className="text-xs text-slate-500 font-mono">{editingUser.email}</p>
            <form onSubmit={handleSaveUserEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Full name</label>
                <input
                  required
                  value={editUserForm.full_name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, full_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Phone</label>
                <input
                  value={editUserForm.phone_number}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone_number: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                />
              </div>
              {editingUser.role !== 'MASTER_PERSON' && (
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Role</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Country</label>
                <select
                  value={editUserForm.country_id}
                  onChange={(e) => setEditUserForm({ ...editUserForm, country_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                >
                  <option value="">No country</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {editingUser.role === 'MASTER_PERSON' ? (
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Assigned projects</label>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                    {projects.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={(editUserForm.master_project_ids || []).includes(p.id)}
                          onChange={() => toggleEditMasterProject(p.id)}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2">
                    <label className="text-slate-700 block mb-1 font-medium">Primary project</label>
                    <select
                      value={editUserForm.project_id}
                      onChange={(e) => setEditUserForm({ ...editUserForm, project_id: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                    >
                      <option value="">None</option>
                      {(editUserForm.master_project_ids || []).map((pid) => {
                        const p = projects.find((x) => x.id === pid);
                        return p ? (
                          <option key={pid} value={pid}>{p.name}</option>
                        ) : null;
                      })}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Project</label>
                  <select
                    value={editUserForm.project_id}
                    onChange={(e) => setEditUserForm({ ...editUserForm, project_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                  >
                    <option value="">No project / global</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-slate-700 block mb-1 font-medium">New password (optional)</label>
                <PasswordField
                  minLength={8}
                  value={editUserForm.password}
                  onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                  inputClassName="p-2.5 rounded-xl border border-slate-300 text-slate-900"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Language</label>
                <select
                  value={editUserForm.language_preference}
                  onChange={(e) => setEditUserForm({ ...editUserForm, language_preference: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                >
                  <option value="en">English</option>
                  <option value="am">Amharic</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={editUserForm.is_active}
                  onChange={(e) => setEditUserForm({ ...editUserForm, is_active: e.target.checked })}
                />
                Account active
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold">Cancel</button>
                <LoadingButton type="submit" loading={savingEdit} loadingLabel="Saving…" className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold">Save</LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create worker (any role) */}
      {showWorkerModal && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" /> Create worker account
            </h3>
            {createdWorkerCreds ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <p className="font-bold">Account created — share credentials securely:</p>
                  <p className="mt-2">Role: {ROLE_LABELS[createdWorkerCreds.role] || createdWorkerCreds.role}</p>
                  <p className="font-mono">Email: {createdWorkerCreds.email}</p>
                  <p className="font-mono">Password: {createdWorkerCreds.password}</p>
                  <p className="mt-1">{createdWorkerCreds.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedWorkerCreds(null);
                    setShowWorkerModal(false);
                  }}
                  className="w-full px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateWorker} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Role</label>
                  <select
                    value={workerForm.role}
                    onChange={(e) => setWorkerForm({ ...workerForm, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Full name</label>
                  <input
                    required
                    value={workerForm.full_name}
                    onChange={(e) => setWorkerForm({ ...workerForm, full_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Email (login)</label>
                  <input
                    type="email"
                    required
                    value={workerForm.email}
                    onChange={(e) => setWorkerForm({ ...workerForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Initial password</label>
                  <PasswordField
                    required
                    minLength={8}
                    value={workerForm.password}
                    onChange={(e) => setWorkerForm({ ...workerForm, password: e.target.value })}
                    inputClassName="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Phone</label>
                  <input
                    value={workerForm.phone_number}
                    onChange={(e) => setWorkerForm({ ...workerForm, phone_number: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Country</label>
                  <select
                    value={workerForm.country_id}
                    onChange={(e) => setWorkerForm({ ...workerForm, country_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  >
                    <option value="">Select country…</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">
                    Project {workerForm.role === 'DRIVER' ? '(required)' : '(optional)'}
                  </label>
                  <select
                    required={workerForm.role === 'DRIVER'}
                    value={workerForm.project_id}
                    onChange={(e) => setWorkerForm({ ...workerForm, project_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  >
                    <option value="">None</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {workerForm.role === 'DRIVER' && (
                  <>
                    <div>
                      <label className="text-slate-700 block mb-1 font-medium">License number *</label>
                      <input
                        required
                        value={workerForm.license_number}
                        onChange={(e) => setWorkerForm({ ...workerForm, license_number: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 block mb-1 font-medium">Shift *</label>
                      <select
                        required
                        value={workerForm.shift_type}
                        onChange={(e) => setWorkerForm({ ...workerForm, shift_type: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                      >
                        {DRIVER_SHIFT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWorkerModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="submit"
                    loading={savingWorker}
                    loadingLabel="Creating…"
                    className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold"
                  >
                    Create worker
                  </LoadingButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Settle Personal Fuel Payment */}
      {showSettleModal && selectedRecovery && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-emerald-500/40 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" /> Confirm Fuel Debt Payment
            </h3>
            <p className="text-xs text-slate-700">
              Staff Member: <strong>{selectedRecovery.staff_name}</strong>
              <br />
              Amount Owed: <strong className="text-emerald-600 text-sm">{selectedRecovery.amount_billed_etb} ETB</strong> ({selectedRecovery.fuel_consumed_liters} Liters consumed over {selectedRecovery.distance_km} km)
            </p>
            <form onSubmit={handleConfirmSettle} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Payment Reference / Receipt Notes</label>
                <input
                  type="text"
                  required
                  value={settleNote}
                  onChange={e => setSettleNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono"
                  placeholder="e.g. Finance Cash Receipt #99281"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Mark as Paid & Settle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Policy */}
      {editingPolicy && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-xl border border-blue-500/40 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              {policyForm.isNew ? 'Create policy' : 'Edit policy'}: {POLICY_ROLE_LABELS[policyForm.role_target] || policyForm.role_target}
            </h3>
            <form onSubmit={handleSavePolicy} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Policy title</label>
                <input
                  type="text"
                  required
                  value={policyForm.title}
                  onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-medium">Policy Terms, Safety Rules & Code of Conduct</label>
                <textarea
                  rows="9"
                  required
                  value={policyForm.content}
                  onChange={e => setPolicyForm({ ...policyForm, content: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-sans leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Save & Publish Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit project */}
      {editingProject && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-brand-600" /> Edit project
            </h3>
            <p className="text-xs text-slate-500 font-mono">{editingProject.code}</p>
            <form onSubmit={handleSaveProjectEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Project name</label>
                <input
                  required
                  value={editProjectForm.name}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Country</label>
                <select
                  required
                  value={editProjectForm.country_id}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, country_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                >
                  <option value="">Select country…</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">City</label>
                <input
                  required
                  value={editProjectForm.city}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, city: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Description</label>
                <textarea
                  rows={3}
                  value={editProjectForm.description}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Master person</label>
                <select
                  value={editProjectForm.master_person_id}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, master_person_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                >
                  <option value="">Unassigned</option>
                  {masterPersons.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={editProjectForm.allow_vehicle_sharing}
                  onChange={(e) =>
                    setEditProjectForm({ ...editProjectForm, allow_vehicle_sharing: e.target.checked })
                  }
                />
                Allow vehicle sharing across sites
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <LoadingButton type="submit" loading={savingEdit} loadingLabel="Saving…" className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold">
                  Save project
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Country */}
      {showCountryModal && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-brand-600" /> Add Country Hub
            </h3>
            <form onSubmit={handleCreateCountry} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Country Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kenya"
                  value={countryForm.name}
                  onChange={e => setCountryForm({ ...countryForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">ISO Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KEN"
                    value={countryForm.code}
                    onChange={e => setCountryForm({ ...countryForm, code: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white uppercase"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Currency</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KES"
                    value={countryForm.currency}
                    onChange={e => setCountryForm({ ...countryForm, currency: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white uppercase"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCountryModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={projectSaving}
                  loadingLabel="Creating country…"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold"
                >
                  Create Country
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Master Person */}
      {showMasterModal && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-brand-600" /> Create Master Person
            </h3>
            {createdMasterCreds ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <p className="font-bold">Account created — share these credentials securely:</p>
                  <p className="mt-2 font-mono">Email: {createdMasterCreds.email}</p>
                  <p className="font-mono">Password: {createdMasterCreds.password}</p>
                  <p className="mt-1 text-emerald-800">{createdMasterCreds.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedMasterCreds(null);
                    setShowMasterModal(false);
                  }}
                  className="w-full px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateMasterPerson} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Full name</label>
                  <input
                    required
                    value={masterForm.full_name}
                    onChange={(e) => setMasterForm({ ...masterForm, full_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Email (login)</label>
                  <input
                    type="email"
                    required
                    value={masterForm.email}
                    onChange={(e) => setMasterForm({ ...masterForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Initial password</label>
                  <PasswordField
                    required
                    minLength={8}
                    value={masterForm.password}
                    onChange={(e) => setMasterForm({ ...masterForm, password: e.target.value })}
                    inputClassName="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Phone</label>
                  <input
                    value={masterForm.phone_number}
                    onChange={(e) => setMasterForm({ ...masterForm, phone_number: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Country</label>
                  <select
                    value={masterForm.country_id}
                    onChange={(e) => setMasterForm({ ...masterForm, country_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  >
                    <option value="">Select country...</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">
                    Assign to project <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={masterForm.project_id}
                    onChange={(e) => setMasterForm({ ...masterForm, project_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                  >
                    <option value="">None — assign later from Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMasterModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="submit"
                    loading={savingMaster}
                    loadingLabel="Creating account…"
                    className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold"
                  >
                    Create account
                  </LoadingButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Assign master to existing project */}
      {showAssignMasterModal && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-sm border border-slate-300 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Assign Master Person</h3>
            <form onSubmit={handleConfirmAssignMaster} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Master person</label>
                <select
                  required
                  value={assignMasterUserId}
                  onChange={(e) => setAssignMasterUserId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                >
                  <option value="">Select...</option>
                  {masterPersons.map((mp) => (
                    <option key={mp.id} value={mp.id}>
                      {mp.full_name} ({mp.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignMasterModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={projectSaving}
                  loadingLabel="Assigning…"
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold"
                >
                  Assign
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Project */}
      {showProjectModal && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-brand-600" /> Create Logistics Project
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Parent Country</label>
                <select
                  required
                  value={projectForm.country_id}
                  onChange={e => setProjectForm({ ...projectForm, country_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                >
                  <option value="">Select country...</option>
                  {countries.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Project A - Addis Health Outreach"
                  value={projectForm.name}
                  onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Project Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ETH-HLTH-A"
                  value={projectForm.code}
                  onChange={e => setProjectForm({ ...projectForm, code: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">City</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Addis Ababa, Bahir Dar"
                  value={projectForm.city}
                  onChange={(e) => setProjectForm({ ...projectForm, city: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Operational Description</label>
                <textarea
                  rows="2"
                  placeholder="Mission scope, regional zones..."
                  value={projectForm.description}
                  onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">
                  Assign Master Person <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <select
                  value={projectForm.master_person_id}
                  onChange={(e) => setProjectForm({ ...projectForm, master_person_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                >
                  <option value="">None — assign later</option>
                  {masterPersons.map((mp) => (
                    <option key={mp.id} value={mp.id}>
                      {mp.full_name} ({mp.email})
                    </option>
                  ))}
                </select>
                {masterPersons.length === 0 && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    No master persons yet. Use &quot;New Master Person&quot; first, or leave unassigned.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sharing"
                  checked={projectForm.allow_vehicle_sharing}
                  onChange={e => setProjectForm({ ...projectForm, allow_vehicle_sharing: e.target.checked })}
                  className="rounded bg-white border-slate-300 text-brand-600 focus:ring-0"
                />
                <label htmlFor="sharing" className="text-slate-700">
                  Allow Vehicle Sharing with other authorized projects
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={projectSaving}
                  loadingLabel="Creating project…"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold"
                >
                  Create Project
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
