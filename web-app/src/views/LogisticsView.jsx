import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchLiveFleet,
  fetchVehicles,
  fetchDrivers,
  fetchSchedules,
  fetchExpenses,
  fetchExpenseSummary,
  createVehicle,
  updateVehicle,
  fetchAccidents,
  updateAccident,
  recordExpense
} from '../store/slices/fleetSlice.js';
import { fetchProjects } from '../store/slices/projectSlice.js';
import FleetMap from '../components/FleetMap.jsx';
import {
  Truck,
  Car,
  Users,
  Calendar,
  DollarSign,
  Plus,
  Wrench,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
  FolderKanban,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { usePortalNav } from '../context/PortalNavContext.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';
import LoadingButton from '../components/ui/LoadingButton.jsx';
import AdminSectionHeader from '../components/admin/AdminSectionHeader.jsx';
import AdminStatCard from '../components/admin/AdminStatCard.jsx';
import FleetWorkersPanel from '../components/logistics/FleetWorkersPanel.jsx';
import ProjectTripsPanel from '../components/trips/ProjectTripsPanel.jsx';
import { apiRequest } from '../api/client.js';
import {
  DRIVER_SHIFT_OPTIONS,
  driverShiftLabel,
  normalizeDriverShiftType
} from '../constants/driverShifts.js';

const LOGISTICS_SECTION_META = {
  map: { title: 'Live map', subtitle: 'Real-time fleet GPS and telemetry.', icon: Car },
  rides: { title: 'Trips', subtitle: 'All movement requests for your project (same view as master person).', icon: Car },
  vehicles: { title: 'Fleet inventory', subtitle: 'Register cars — day, night, or weekend shift.', icon: Truck },
  workers: { title: 'Staff & drivers', subtitle: 'Create mobile logins for staff and drivers.', icon: Users },
  accidents: { title: 'Accidents & safety', subtitle: 'Incident records and follow-up.', icon: AlertTriangle },
  drivers: { title: 'Driver shifts', subtitle: 'Edit driver working hours.', icon: Users },
  expenses: { title: 'Expenses', subtitle: 'Fuel and maintenance spend.', icon: DollarSign }
};

export default function LogisticsView() {
  const dispatch = useDispatch();
  const { liveFleet, liveDrivers, vehicles, drivers, schedules, expenses, expenseSummary, accidents = [], loading, saving: fleetSaving } = useSelector(state => state.fleet);
  const [workerCounts, setWorkerCounts] = useState({ staff: 0, drivers: 0, total: 0 });
  const [savingDriverShift, setSavingDriverShift] = useState(false);
  const [savingVehicleShift, setSavingVehicleShift] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const { projects = [] } = useSelector(state => state.project);
  const { user } = useSelector((state) => state.auth);
  const { section: activeTab } = usePortalNav();
  const sectionMeta = LOGISTICS_SECTION_META[activeTab] || LOGISTICS_SECTION_META.map;
  const coordinatorProjectId =
    user?.project_id || user?.projectId || user?.project?.id || null;

  // Modals
  const [showVehModal, setShowVehModal] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [shiftModalVeh, setShiftModalVeh] = useState(null);
  const [shiftModalDriver, setShiftModalDriver] = useState(null);
  const [driverShiftForm, setDriverShiftForm] = useState({ shift_type: 'NORMAL_DAY' });
  const [statusModalVeh, setStatusModalVeh] = useState(null);
  const [projectModalVeh, setProjectModalVeh] = useState(null);

  // Forms
  const [vehForm, setVehForm] = useState({
    plate_number: '',
    make: 'Toyota',
    model: 'Hilux Double Cabin',
    year: 2024,
    capacity: 5,
    fuel_type: 'Diesel',
    odometer_km: 12000,
    shift_type: 'NORMAL_DAY',
    shift_start_time: '08:00',
    shift_end_time: '18:00',
    is_weekend_eligible: false
  });

  const [expForm, setExpForm] = useState({
    vehicle_id: '',
    expense_type: 'FUEL',
    amount: '',
    currency: 'ETB',
    odometer_reading: '',
    description: '',
    receipt_url: 'https://placehold.co/600x400/png?text=Fuel+Receipt'
  });

  const [shiftForm, setShiftForm] = useState({
    shift_type: 'NORMAL_DAY',
    shift_start_time: '08:00',
    shift_end_time: '18:00',
    is_weekend_eligible: false
  });

  const [statusForm, setStatusForm] = useState({
    operational_status: 'AVAILABLE'
  });

  const [projectForm, setProjectForm] = useState({
    project_id: ''
  });

  useEffect(() => {
    dispatch(fetchLiveFleet());
    dispatch(fetchVehicles());
    dispatch(fetchDrivers());
    dispatch(fetchSchedules());
    dispatch(fetchExpenses());
    dispatch(fetchExpenseSummary());
    dispatch(fetchAccidents());
    dispatch(fetchProjects());

    // Auto-refresh live fleet every 15 seconds
    const interval = setInterval(() => {
      dispatch(fetchLiveFleet());
      dispatch(fetchAccidents());
    }, 15000);
    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    if (activeTab === 'drivers') {
      dispatch(fetchDrivers());
    }
  }, [activeTab, dispatch]);

  const handleCreateVeh = async (e) => {
    e.preventDefault();
    if (!vehForm.plate_number || !vehForm.make || fleetSaving) return;
    try {
      await dispatch(
        createVehicle({
          ...vehForm,
          ...(coordinatorProjectId ? { project_id: coordinatorProjectId } : {})
        })
      ).unwrap();
    } catch (err) {
      alert(err?.message || 'Could not register vehicle');
      return;
    }
    setShowVehModal(false);
    setVehForm({
      plate_number: '',
      make: 'Toyota',
      model: 'Hilux Double Cabin',
      year: 2024,
      capacity: 5,
      fuel_type: 'Diesel',
      odometer_km: 12000,
      shift_type: 'NORMAL_DAY',
      shift_start_time: '08:00',
      shift_end_time: '18:00',
      is_weekend_eligible: false
    });
    dispatch(fetchLiveFleet());
    dispatch(fetchVehicles());
  };

  const handleRecordExp = async (e) => {
    e.preventDefault();
    if (!expForm.vehicle_id || !expForm.amount || savingExpense) return;
    setSavingExpense(true);
    try {
      await dispatch(recordExpense(expForm)).unwrap();
    } catch (err) {
      alert(err?.message || 'Could not save expense');
      setSavingExpense(false);
      return;
    }
    setSavingExpense(false);
    setShowExpModal(false);
    setExpForm({ vehicle_id: '', expense_type: 'FUEL', amount: '', currency: 'ETB', odometer_reading: '', description: '', receipt_url: 'https://placehold.co/600x400/png?text=Fuel+Receipt' });
    dispatch(fetchExpenses());
    dispatch(fetchExpenseSummary());
    dispatch(fetchVehicles());
  };

  const openShiftModal = (veh) => {
    setShiftModalVeh(veh);
    setShiftForm({
      shift_type: veh.shift_type || 'NORMAL_DAY',
      shift_start_time: veh.shift_start_time || '08:00',
      shift_end_time: veh.shift_end_time || '18:00',
      is_weekend_eligible: !!veh.is_weekend_eligible
    });
  };

  const handleSaveShift = async (e) => {
    e.preventDefault();
    if (!shiftModalVeh || savingVehicleShift) return;
    setSavingVehicleShift(true);
    try {
      await dispatch(updateVehicle({ id: shiftModalVeh.id, data: shiftForm })).unwrap();
      setShiftModalVeh(null);
      dispatch(fetchVehicles());
    } catch (err) {
      alert(err?.message || 'Could not save vehicle shift');
    } finally {
      setSavingVehicleShift(false);
    }
  };

  const openStatusModal = (veh) => {
    setStatusModalVeh(veh);
    setStatusForm({
      operational_status: veh.operational_status || 'AVAILABLE'
    });
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!statusModalVeh) return;
    await dispatch(updateVehicle({ id: statusModalVeh.id, data: statusForm }));
    setStatusModalVeh(null);
    dispatch(fetchVehicles());
    dispatch(fetchLiveFleet());
  };

  const openProjectModal = (veh) => {
    setProjectModalVeh(veh);
    setProjectForm({
      project_id: veh.project_id || (projects[0]?.id || '')
    });
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!projectModalVeh) return;
    await dispatch(updateVehicle({ id: projectModalVeh.id, data: { project_id: projectForm.project_id } }));
    setProjectModalVeh(null);
    dispatch(fetchVehicles());
  };

  const handleUpdateAccidentStatus = async (accidentId, newStatus) => {
    await dispatch(updateAccident({ id: accidentId, data: { status: newStatus } }));
    dispatch(fetchAccidents());
    dispatch(fetchVehicles());
  };

  const availableCount = vehicles.filter(v => v.operational_status === 'AVAILABLE').length;
  const busyCount = vehicles.filter(v => v.operational_status === 'BUSY').length;
  const maintenanceCount = vehicles.filter(v => v.operational_status === 'MAINTENANCE' || v.operational_status === 'IN_REPAIR').length;
  const accidentCount = vehicles.filter(v => v.operational_status === 'IN_ACCIDENT').length;

  const openDriverShiftModal = (driver) => {
    setShiftModalDriver(driver);
    setDriverShiftForm({
      shift_type: normalizeDriverShiftType(driver.shift_type)
    });
  };

  const handleSaveDriverShift = async (e) => {
    e.preventDefault();
    if (!shiftModalDriver || savingDriverShift) return;
    setSavingDriverShift(true);
    try {
      await apiRequest(`/drivers/${shiftModalDriver.id}`, {
        method: 'PATCH',
        body: { shift_type: driverShiftForm.shift_type }
      });
      setShiftModalDriver(null);
      dispatch(fetchDrivers());
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingDriverShift(false);
    }
  };

  return (
    <div className="portal-page">
      <AdminSectionHeader
        icon={sectionMeta.icon}
        title={sectionMeta.title}
        subtitle={sectionMeta.subtitle}
        actions={
          activeTab === 'rides' ? null : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExpModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <DollarSign className="w-4 h-4 text-emerald-600" /> Record expense
              </button>
              <button
                type="button"
                onClick={() => setShowVehModal(true)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Register vehicle
              </button>
            </div>
          )
        }
      />

      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AdminStatCard icon={Car} label="Available" value={availableCount} tone="emerald" />
          <AdminStatCard icon={Truck} label="In transit" value={busyCount} tone="blue" />
          <AdminStatCard icon={Wrench} label="Maintenance" value={maintenanceCount} tone="amber" />
          <AdminStatCard icon={AlertTriangle} label="Accidents" value={accidentCount || accidents.length} tone="rose" />
        </div>
      )}
      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
          <AdminStatCard icon={Users} label="Staff" value={workerCounts.staff} tone="brand" />
          <AdminStatCard icon={Users} label="Drivers" value={workerCounts.drivers} tone="emerald" />
          <AdminStatCard icon={Users} label="Total workers" value={workerCounts.total} tone="blue" />
        </div>
      )}
      {activeTab === 'drivers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
          <AdminStatCard icon={Users} label="Drivers on roster" value={drivers.length} tone="brand" />
        </div>
      )}
      {activeTab === 'accidents' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
          <AdminStatCard icon={AlertTriangle} label="Incident records" value={accidents.length} tone="rose" />
        </div>
      )}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
          <AdminStatCard icon={DollarSign} label="Expense entries" value={expenses.length} tone="amber" />
        </div>
      )}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
          <AdminStatCard icon={Car} label="Live fleet signals" value={liveFleet.length} tone="blue" />
          <AdminStatCard icon={Car} label="Drivers on map" value={liveDrivers.length} tone="purple" />
        </div>
      )}

      {activeTab === 'rides' && <ProjectTripsPanel projectId={coordinatorProjectId} />}

      {activeTab !== 'rides' && loading && vehicles.length === 0 ? (
        <TableSkeleton rows={10} cols={6} />
      ) : null}

      {/* Tab 1: Live Fleet Map */}
      {activeTab === 'map' && activeTab !== 'rides' && !(loading && vehicles.length === 0) && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 live-pulse inline-block"></span>
              <span className="font-semibold text-white">Live Vehicle GPS Broadcast Feed</span>
              <span className="text-slate-500">| Stale location detector active (&gt; 5 mins)</span>
            </div>
            <span className="text-xs font-mono text-slate-400">Auto-refresh: 15s</span>
          </div>

          <FleetMap vehicles={liveFleet} drivers={liveDrivers} height="min(52vh, 520px)" showCitySearch />
        </div>
      )}

      {/* Tab 2: Vehicles Directory & Dynamic Controls */}
      {activeTab === 'vehicles' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-400" /> Project Fleet Roster & Operational Shift Controls
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dynamic assignment: Change vehicle shifts, update availability (accident/repair), or reassign project on demand.
              </p>
            </div>
            <span className="text-xs text-slate-400">{vehicles.length} Vehicles</span>
          </div>
          <div className="portal-table-scroll overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead className="bg-slate-50 text-slate-400 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Plate Number</th>
                  <th className="p-3.5">Make & Model</th>
                  <th className="p-3.5">Project</th>
                  <th className="p-3.5">Shift Duty</th>
                  <th className="p-3.5">Odometer</th>
                  <th className="p-3.5">Driver Allocation</th>
                  <th className="p-3.5">Availability Status</th>
                  <th className="p-3.5 text-right">Operational Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-700">
                {vehicles.map(v => {
                  const proj = projects.find(p => p.id === v.project_id);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900 font-mono">{v.plate_number}</td>
                      <td className="p-3.5 font-semibold text-slate-200">
                        {v.make} {v.model} ({v.year})
                        <div className="text-[10px] text-slate-500 font-normal">{v.capacity} seats • {v.fuel_type}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                          {proj ? proj.name : (v.project_id || 'General Fleet')}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {v.shift_type === 'NIGHT_SHIFT' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            🌙 Night Shift ({v.shift_start_time || '18:00'} - {v.shift_end_time || '06:00'})
                          </span>
                        ) : v.shift_type === 'WEEKEND' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                            📅 Weekend Duty (Sat-Sun)
                          </span>
                        ) : v.shift_type === 'ALL_HOURS' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            ⚡ 24/7 All Hours
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            ☀️ Normal Day ({v.shift_start_time || '08:00'} - {v.shift_end_time || '18:00'})
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-brand-600">{v.odometer_km?.toLocaleString()} km</td>
                      <td className="p-3.5">
                        {v.driver ? (
                          <div>
                            <span className="text-emerald-600 font-medium block">{v.driver.full_name}</span>
                            <span className="text-[10px] text-slate-500">Trip Assigned</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Dynamic Pool (Per Trip)</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {v.operational_status === 'AVAILABLE' ? (
                          <span className="badge-available">Available</span>
                        ) : v.operational_status === 'BUSY' ? (
                          <span className="badge-busy">On Trip</span>
                        ) : v.operational_status === 'IN_ACCIDENT' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> In Accident
                          </span>
                        ) : v.operational_status === 'IN_REPAIR' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> In Repair Garage
                          </span>
                        ) : v.operational_status === 'MAINTENANCE' ? (
                          <span className="badge-maintenance">Maintenance</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-300">
                            {v.operational_status}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openShiftModal(v)}
                            title="Change Operating Shift"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-700 text-blue-400 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all border border-slate-300"
                          >
                            <Clock className="w-3 h-3" /> Shift
                          </button>
                          <button
                            onClick={() => openStatusModal(v)}
                            title="Update Availability (Accident / Repair / Available)"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-700 text-amber-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all border border-slate-300"
                          >
                            <Sliders className="w-3 h-3" /> Status
                          </button>
                          <button
                            onClick={() => openProjectModal(v)}
                            title="Reassign to another Project"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-700 text-purple-400 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all border border-slate-300"
                          >
                            <FolderKanban className="w-3 h-3" /> Project
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Accident & Safety Records */}
      {activeTab === 'accidents' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl flex items-center justify-between border border-rose-500/30 bg-rose-950/10">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Driver Incident & Fleet Accident Reports
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Driver-reported field accidents with GPS coordinates, damage notes, and vehicle repair lifecycle.
              </p>
            </div>
            <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2.5 py-1 rounded-xl border border-rose-500/30">
              {accidents.length} Incident(s) Logged
            </span>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
            {accidents.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-semibold text-white">No Accident Reports on Record</p>
                <p className="text-slate-500">Fleet safety compliance is currently at 100% with zero open incident reports.</p>
              </div>
            ) : (
              <div className="portal-table-scroll overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[900px]">
                  <thead className="bg-slate-50 text-slate-400 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Date & Time</th>
                      <th className="p-3.5">Vehicle</th>
                      <th className="p-3.5">Reporting Driver</th>
                      <th className="p-3.5">Severity</th>
                      <th className="p-3.5">Location</th>
                      <th className="p-3.5">Description & Police Report</th>
                      <th className="p-3.5">Accident Status</th>
                      <th className="p-3.5 text-right">Lifecycle Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-700">
                    {accidents.map(acc => (
                      <tr key={acc.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono text-slate-400">
                          {new Date(acc.created_at || acc.accident_time).toLocaleString()}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 font-mono">{acc.vehicle_plate || acc.vehicle_id}</td>
                        <td className="p-3.5 text-slate-200">{acc.driver_name || 'Driver'}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            acc.severity === 'CRITICAL' || acc.severity === 'SEVERE'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : acc.severity === 'MODERATE'
                              ? 'bg-amber-500/20 text-amber-700 border border-amber-200'
                              : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          }`}>
                            {acc.severity}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="truncate max-w-xs">{acc.location_description || `${acc.latitude}, ${acc.longitude}`}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <p className="max-w-xs truncate text-white">{acc.description}</p>
                          {acc.police_report_number && (
                            <span className="text-[10px] text-slate-400 font-mono">Police: #{acc.police_report_number}</span>
                          )}
                          {acc.third_party_involved && (
                            <span className="ml-1 text-[10px] text-amber-700 font-semibold">• Third Party</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            acc.status === 'RESOLVED' || acc.status === 'CLOSED'
                              ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                              : acc.status === 'IN_REPAIR'
                              ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {acc.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {acc.status !== 'IN_REPAIR' && acc.status !== 'RESOLVED' && (
                              <button
                                onClick={() => handleUpdateAccidentStatus(acc.id, 'IN_REPAIR')}
                                className="px-2 py-1 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 rounded text-[10px] font-semibold border border-orange-500/30"
                              >
                                Send to Repair
                              </button>
                            )}
                            {acc.status !== 'RESOLVED' && (
                              <button
                                onClick={() => handleUpdateAccidentStatus(acc.id, 'RESOLVED')}
                                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-800 rounded text-[10px] font-semibold border border-emerald-500/30"
                              >
                                Resolve & Restore
                              </button>
                            )}
                          </div>
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

      {activeTab === 'workers' && (
        <FleetWorkersPanel
          onCountsChange={setWorkerCounts}
          onDriversChanged={() => dispatch(fetchDrivers())}
        />
      )}

      {/* Tab: Driver shift hours */}
      {activeTab === 'drivers' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" /> Driver Management Roster (Dynamic Trip Allocation)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Drivers are assigned per movement request rather than permanently locked to a single car.
              </p>
            </div>
            <span className="text-xs text-slate-400">{drivers.length} Drivers</span>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Driver Name</th>
                <th className="p-3.5">License Number</th>
                <th className="p-3.5">Shift</th>
                <th className="p-3.5">Current Trip Vehicle</th>
                <th className="p-3.5">Rating</th>
                <th className="p-3.5">Trips Completed</th>
                <th className="p-3.5">Availability</th>
                <th className="p-3.5 text-right">Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-700">
              {drivers.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-900">{d.full_name}</td>
                  <td className="p-3.5 font-mono text-slate-400">{d.license_number}</td>
                  <td className="p-3.5 font-semibold text-slate-800">{driverShiftLabel(d.shift_type)}</td>
                  <td className="p-3.5 font-bold text-brand-600 font-mono">
                    {d.assigned_vehicle ? d.assigned_vehicle.plate_number : 'Dynamic Pool (Available)'}
                  </td>
                  <td className="p-3.5 text-amber-700 font-bold">★ {d.rating}</td>
                  <td className="p-3.5 font-bold">{d.total_trips_completed}</td>
                  <td className="p-3.5">
                    <span className={d.availability_status === 'AVAILABLE' ? 'badge-available' : 'badge-busy'}>
                      {d.availability_status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => openDriverShiftModal(d)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg"
                    >
                      Edit shift
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Fuel & Maintenance Expense Log
              </h2>
              <span className="text-xs text-slate-400">
                Total Spending: <strong className="text-slate-900">{expenseSummary?.totalSpent?.toLocaleString()} ETB</strong>
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Vehicle</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Odometer</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-700">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-slate-900 font-mono">{e.vehicle_plate}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        e.expense_type === 'FUEL' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                      }`}>
                        {e.expense_type}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">{e.amount?.toLocaleString()} {e.currency}</td>
                    <td className="p-3.5 font-mono text-slate-400">{e.odometer_reading ? `${e.odometer_reading} km` : '-'}</td>
                    <td className="p-3.5 truncate max-w-xs">{e.description}</td>
                    <td className="p-3.5 text-slate-500">{e.expense_date}</td>
                    <td className="p-3.5">
                      {e.receipt_url ? (
                        <a href={e.receipt_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline font-medium">View</a>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {shiftModalDriver && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveDriverShift} className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">Driver shift — {shiftModalDriver.full_name}</h3>
            <div>
              <label className="text-slate-700 block mb-1 font-medium">Shift</label>
              <select
                value={driverShiftForm.shift_type}
                onChange={(e) => setDriverShiftForm({ shift_type: e.target.value })}
                className="w-full p-2.5 rounded-xl border"
              >
                {DRIVER_SHIFT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={savingDriverShift} onClick={() => setShiftModalDriver(null)} className="px-4 py-2 rounded-xl bg-slate-100 disabled:opacity-50">Cancel</button>
              <LoadingButton type="submit" loading={savingDriverShift} loadingLabel="Saving…" className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold">Save shift</LoadingButton>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Change Vehicle Shift */}
      {shiftModalVeh && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" /> Change Operational Shift: {shiftModalVeh.plate_number}
            </h3>
            <form onSubmit={handleSaveShift} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Shift Type</label>
                <select
                  value={shiftForm.shift_type}
                  onChange={e => {
                    const val = e.target.value;
                    let start = '08:00';
                    let end = '18:00';
                    let weekend = false;
                    if (val === 'NIGHT_SHIFT') {
                      start = '18:00';
                      end = '06:00';
                      weekend = true;
                    } else if (val === 'WEEKEND') {
                      start = '08:00';
                      end = '20:00';
                      weekend = true;
                    } else if (val === 'ALL_HOURS') {
                      start = '00:00';
                      end = '23:59';
                      weekend = true;
                    }
                    setShiftForm({
                      shift_type: val,
                      shift_start_time: start,
                      shift_end_time: end,
                      is_weekend_eligible: weekend
                    });
                  }}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white font-medium"
                >
                  <option value="NORMAL_DAY">☀️ Day shift (08:00 - 18:00)</option>
                  <option value="NIGHT_SHIFT">🌙 Night shift (18:00 - 06:00)</option>
                  <option value="WEEKEND">📅 Weekend shift (08:00 - 20:00)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Start Time</label>
                  <input
                    type="time"
                    value={shiftForm.shift_start_time}
                    onChange={e => setShiftForm({ ...shiftForm, shift_start_time: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">End Time</label>
                  <input
                    type="time"
                    value={shiftForm.shift_end_time}
                    onChange={e => setShiftForm({ ...shiftForm, shift_end_time: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="weekendEligible"
                  checked={shiftForm.is_weekend_eligible}
                  onChange={e => setShiftForm({ ...shiftForm, is_weekend_eligible: e.target.checked })}
                  className="rounded bg-white border-slate-300 text-blue-500"
                />
                <label htmlFor="weekendEligible" className="text-slate-700 text-xs">
                  Eligible for Weekend Callout Missions
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShiftModalVeh(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={savingVehicleShift}
                  loadingLabel="Saving…"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Save shift
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Operational Status */}
      {statusModalVeh && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-700" /> Update Availability: {statusModalVeh.plate_number}
            </h3>
            <p className="text-xs text-slate-400">
              Change the operational state when a vehicle is sent for repair, involved in an accident, or returned to service.
            </p>
            <form onSubmit={handleSaveStatus} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Operational Status</label>
                <select
                  value={statusForm.operational_status}
                  onChange={e => setStatusForm({ operational_status: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white font-medium"
                >
                  <option value="AVAILABLE">✅ AVAILABLE (Ready for Dispatch)</option>
                  <option value="IN_ACCIDENT">🚨 IN_ACCIDENT (Grounded for Incident Analysis)</option>
                  <option value="IN_REPAIR">🔧 IN_REPAIR (In Garage for Body/Engine Work)</option>
                  <option value="MAINTENANCE">⚙️ MAINTENANCE (Routine Service/Oil Change)</option>
                  <option value="BUSY">🚗 BUSY (Active Trip)</option>
                  <option value="OUT_OF_SERVICE">⛔ OUT_OF_SERVICE (Decommissioned)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalVeh(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                >
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reassign Vehicle Project */}
      {projectModalVeh && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-purple-400" /> Reassign Project: {projectModalVeh.plate_number}
            </h3>
            <p className="text-xs text-slate-400">
              Transfer this vehicle to another project to fulfill operational requirements.
            </p>
            <form onSubmit={handleSaveProject} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Target Project</label>
                <select
                  value={projectForm.project_id}
                  onChange={e => setProjectForm({ project_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white font-medium"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectModalVeh(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                >
                  Reassign Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Vehicle */}
      {showVehModal && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-400" /> Register Vehicle
            </h3>
            <form onSubmit={handleCreateVeh} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Plate Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ET-3-A99887"
                  value={vehForm.plate_number}
                  onChange={e => setVehForm({ ...vehForm, plate_number: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Make</label>
                  <input
                    type="text"
                    required
                    value={vehForm.make}
                    onChange={e => setVehForm({ ...vehForm, make: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Model</label>
                  <input
                    type="text"
                    required
                    value={vehForm.model}
                    onChange={e => setVehForm({ ...vehForm, model: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Year</label>
                  <input
                    type="number"
                    value={vehForm.year}
                    onChange={e => setVehForm({ ...vehForm, year: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Capacity</label>
                  <input
                    type="number"
                    value={vehForm.capacity}
                    onChange={e => setVehForm({ ...vehForm, capacity: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Fuel</label>
                  <select
                    value={vehForm.fuel_type}
                    onChange={e => setVehForm({ ...vehForm, fuel_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Assigned Operational Shift</label>
                <select
                  value={vehForm.shift_type}
                  onChange={e => {
                    const val = e.target.value;
                    let start = '08:00';
                    let end = '18:00';
                    let weekend = false;
                    if (val === 'NIGHT_SHIFT') {
                      start = '18:00';
                      end = '06:00';
                      weekend = true;
                    } else if (val === 'WEEKEND') {
                      start = '08:00';
                      end = '20:00';
                      weekend = true;
                    } else if (val === 'ALL_HOURS') {
                      start = '00:00';
                      end = '23:59';
                      weekend = true;
                    }
                    setVehForm({
                      ...vehForm,
                      shift_type: val,
                      shift_start_time: start,
                      shift_end_time: end,
                      is_weekend_eligible: weekend
                    });
                  }}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white font-medium"
                >
                  <option value="NORMAL_DAY">☀️ Normal Working Day (08:00 - 18:00 Mon-Fri)</option>
                  <option value="NIGHT_SHIFT">🌙 Night Shift (18:00 - 06:00 Daily)</option>
                  <option value="WEEKEND">📅 Weekend Duty (Sat - Sun, 08:00 - 20:00)</option>
                  <option value="ALL_HOURS">⚡ 24/7 All Hours (On-Call Fleet)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Current Odometer (km)</label>
                <input
                  type="number"
                  value={vehForm.odometer_km}
                  onChange={e => setVehForm({ ...vehForm, odometer_km: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVehModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={fleetSaving}
                  loadingLabel="Registering…"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Register
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Expense */}
      {showExpModal && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" /> Record Vehicle Expense
            </h3>
            <form onSubmit={handleRecordExp} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Vehicle</label>
                <select
                  required
                  value={expForm.vehicle_id}
                  onChange={e => setExpForm({ ...expForm, vehicle_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono"
                >
                  <option value="">Select vehicle...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.plate_number} ({v.model})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Expense Type</label>
                  <select
                    value={expForm.expense_type}
                    onChange={e => setExpForm({ ...expForm, expense_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white font-semibold"
                  >
                    <option value="FUEL">Fuel</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="REPAIR">Repair</option>
                    <option value="INSURANCE">Insurance</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Amount (ETB)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5200"
                    value={expForm.amount}
                    onChange={e => setExpForm({ ...expForm, amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Odometer Reading (Syncs live km)</label>
                <input
                  type="number"
                  placeholder="e.g. 34500"
                  value={expForm.odometer_reading}
                  onChange={e => setExpForm({ ...expForm, odometer_reading: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Description</label>
                <input
                  type="text"
                  placeholder="e.g. TotalEnergies 65L Diesel fuel receipt"
                  value={expForm.description}
                  onChange={e => setExpForm({ ...expForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={savingExpense || fleetSaving}
                  loadingLabel="Saving…"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Save expense
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
