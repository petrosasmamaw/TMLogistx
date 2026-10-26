import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchRequests,
  fetchRecommendations,
  assignVehicle,
  assignExternal,
  authorizeExternal,
  reassignTrip,
  cancelTripAssignment,
  selectRequest,
  cancelRequest
} from '../store/slices/dispatchSlice.js';
import { fetchLiveFleet, fetchVehicles, fetchDrivers, fetchAccidents } from '../store/slices/fleetSlice.js';
import { fetchCountries, fetchProjects } from '../store/slices/projectSlice.js';
import FleetMap from '../components/FleetMap.jsx';
import useProjectMapFocus from '../hooks/useProjectMapFocus.js';
import { pickProjectForUser } from '../utils/projectMapFocus.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import AdminSectionHeader from '../components/admin/AdminSectionHeader.jsx';
import AdminStatCard from '../components/admin/AdminStatCard.jsx';
import { usePortalNav } from '../context/PortalNavContext.jsx';
import {
  Compass,
  Clock,
  MapPin,
  Navigation,
  Car,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  X,
  Phone,
  User,
  DollarSign,
  Send,
  Zap,
  RotateCcw,
  Sliders,
  XCircle,
  ShieldAlert
} from 'lucide-react';
import {
  countExternalRidesForDashboard,
  matchesExternalRideFilter,
  externalRideStatusLabel,
  isExternalRideRequest
} from '../utils/rideHelpers.js';
import { PROJECT_REQUEST_UPSERT } from '../utils/mergeRequests.js';

export default function MovementView() {
  const { section: activeTab } = usePortalNav();
  const dispatch = useDispatch();
  const { requests, selectedRequest, recommendations, loadingRecs, loading } = useSelector(state => state.dispatch);
  const { liveFleet, liveDrivers, vehicles, drivers, loading: fleetLoading } = useSelector(
    (state) => state.fleet
  );
  const { user } = useSelector((state) => state.auth);
  const { projects = [], countries = [] } = useSelector((state) => state.project);
  const movementProjectId = user?.project_id || user?.projectId || user?.project?.id || null;
  const activeProject = pickProjectForUser(projects, movementProjectId, countries);
  const { mapView: projectMapView } = useProjectMapFocus(activeProject);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [showUberDispatchModal, setShowUberDispatchModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Forms
  const [externalForm, setExternalForm] = useState({
    provider_name: 'RIDE Transportation (Addis)',
    fare_amount: '',
    currency: 'ETB',
    reason: 'Internal fleet fully committed to field mission',
    receipt_url: 'https://placehold.co/600x400/png?text=RIDE+Receipt'
  });

  const [uberDispatchForm, setUberDispatchForm] = useState({
    provider: 'RIDE (8294)',
    driver_name: '',
    driver_phone: '',
    plate_number: '',
    vehicle_model: 'Toyota Vitz / Corolla',
    booking_ref: '',
    notes: 'Coordinator booked taxi due to internal fleet unavailability'
  });

  const [reassignForm, setReassignForm] = useState({
    vehicle_id: '',
    driver_id: '',
    reason: 'Operational schedule adjustment by Movement Manager'
  });

  const [assignForm, setAssignForm] = useState({
    vehicle_id: '',
    driver_id: '',
    notes: ''
  });

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchCountries());
  }, [dispatch]);

  useEffect(() => {
    const onUpsert = (e) => {
      const req = e.detail?.request;
      if (!req?.id) return;
      const code = req.request_code || req.request_number || req.id;
      showToast(`New request ${code} added to the queue`);
    };
    window.addEventListener(PROJECT_REQUEST_UPSERT, onUpsert);
    return () => window.removeEventListener(PROJECT_REQUEST_UPSERT, onUpsert);
  }, []);

  useEffect(() => {
    if (activeTab === 'map') {
      dispatch(fetchLiveFleet());
      const mapInterval = setInterval(() => dispatch(fetchLiveFleet()), 15000);
      return () => clearInterval(mapInterval);
    }
    if (activeTab !== 'dispatch') return undefined;

    if (!requests?.length) {
      dispatch(fetchRequests());
    }
    dispatch(fetchLiveFleet());
    if (!vehicles?.length) dispatch(fetchVehicles());
    if (!drivers?.length) dispatch(fetchDrivers());
    dispatch(fetchAccidents());

    const interval = setInterval(() => {
      dispatch(fetchLiveFleet());
      dispatch(fetchAccidents());
    }, 60000);
    return () => clearInterval(interval);
  }, [dispatch, activeTab, requests.length, vehicles.length, drivers.length]);

  const handleSelectRequest = (req) => {
    dispatch(selectRequest(req));
    if (req.status === 'PENDING') {
      dispatch(fetchRecommendations(req.id));
    }
  };

  const openAssignModal = (prefill) => {
    setAssignForm({
      vehicle_id: prefill?.vehicle?.id || '',
      driver_id: prefill?.driver?.id || '',
      notes: prefill?.driver?.full_name
        ? `Assigned to ${prefill.driver.full_name} / ${prefill.vehicle?.plate_number}`
        : ''
    });
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async (e) => {
    e?.preventDefault?.();
    if (!selectedRequest) return;
    if (!assignForm.vehicle_id || !assignForm.driver_id) {
      alert('Select both a vehicle and a driver.');
      return;
    }
    setAssignSaving(true);
    try {
      await dispatch(assignVehicle({
        request_id: selectedRequest.id,
        vehicle_id: assignForm.vehicle_id,
        driver_id: assignForm.driver_id,
        notes: assignForm.notes || 'Manual assignment by coordinator'
      })).unwrap();

      setShowAssignModal(false);
      showToast('Car and driver assigned to this request.');
      dispatch(fetchRequests({ silent: true }));
      dispatch(fetchLiveFleet());
      dispatch(fetchVehicles());
      dispatch(fetchDrivers());
    } catch (err) {
      alert(`Assignment failed: ${err.message || err}`);
    } finally {
      setAssignSaving(false);
    }
  };

  const availableVehicles = (vehicles || []).filter((v) => v.operational_status === 'AVAILABLE');
  const availableDrivers = (drivers || []).filter((d) => d.availability_status === 'AVAILABLE');

  const openUberDispatch = () => {
    setUberDispatchForm({
      provider: 'RIDE (8294)',
      driver_name: '',
      driver_phone: '',
      plate_number: '',
      vehicle_model: 'Toyota Vitz / Corolla',
      booking_ref: `BK-${Math.floor(10000 + Math.random() * 90000)}`,
      notes: 'Dispatched by Logistics Coordinator'
    });
    setShowUberDispatchModal(true);
  };

  const handleConfirmUberDispatch = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      await dispatch(authorizeExternal({
        request_id: selectedRequest.id,
        provider: uberDispatchForm.provider,
        notes: uberDispatchForm.notes,
        coordinator_booked: true,
        driver_name: uberDispatchForm.driver_name,
        driver_phone: uberDispatchForm.driver_phone,
        plate_number: uberDispatchForm.plate_number,
        vehicle_model: uberDispatchForm.vehicle_model,
        booking_ref: uberDispatchForm.booking_ref
      })).unwrap();

      setShowUberDispatchModal(false);
      showToast(`External ride booked and dispatched to staff mobile app!`);
      dispatch(fetchRequests({ silent: true }));
    } catch (err) {
      alert(`Uber dispatch failed: ${err.message || err}`);
    }
  };

  const openReassignModal = () => {
    if (!selectedRequest || !selectedRequest.assignment) return;
    setReassignForm({
      vehicle_id: selectedRequest.assignment.vehicle?.id || '',
      driver_id: selectedRequest.assignment.driver?.id || '',
      reason: 'Operational re-routing'
    });
    setShowReassignModal(true);
  };

  const handleConfirmReassign = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      await dispatch(reassignTrip({
        request_id: selectedRequest.id,
        vehicle_id: reassignForm.vehicle_id || undefined,
        driver_id: reassignForm.driver_id || undefined,
        reason: reassignForm.reason
      })).unwrap();

      setShowReassignModal(false);
      showToast(`Trip reassigned successfully!`);
      dispatch(fetchRequests({ silent: true }));
      dispatch(fetchLiveFleet());
      dispatch(fetchVehicles());
    } catch (err) {
      alert(`Reassignment failed: ${err.message || err}`);
    }
  };

  const handleCancelAssignment = async () => {
    if (!selectedRequest) return;
    if (!window.confirm('Are you sure you want to cancel this trip assignment? The vehicle and driver will be restored to AVAILABLE.')) return;
    try {
      await dispatch(cancelTripAssignment({
        request_id: selectedRequest.id,
        reason: 'Coordinator cancelled assignment'
      })).unwrap();

      showToast('Assignment cancelled. Vehicle & driver restored to available.');
      dispatch(fetchRequests({ silent: true }));
      dispatch(fetchLiveFleet());
      dispatch(fetchVehicles());
    } catch (err) {
      alert(`Cancel assignment failed: ${err.message || err}`);
    }
  };

  const handleExternalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !externalForm.fare_amount) return;
    try {
      await dispatch(assignExternal({
        request_id: selectedRequest.id,
        ...externalForm
      })).unwrap();

      setShowExternalModal(false);
      showToast(`Alternative transport (${externalForm.provider_name}) confirmed!`);
      dispatch(fetchRequests({ silent: true }));
    } catch (err) {
      alert(`External dispatch failed: ${err.message}`);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'EXTERNAL_AUTHORIZED') return matchesExternalRideFilter(r);
    return r.status === statusFilter;
  });

  if (activeTab === 'map') {
    return (
      <div className="portal-page">
        <AdminSectionHeader
          icon={Car}
          title="Live map"
          subtitle="Vehicle and driver positions for your project. Refreshes every 15 seconds."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
          <AdminStatCard icon={Car} label="Vehicles on map" value={liveFleet.length} tone="blue" />
          <AdminStatCard icon={User} label="Drivers on map" value={liveDrivers.length} tone="purple" />
          <AdminStatCard
            icon={Navigation}
            label="GPS status"
            value={fleetLoading ? '…' : 'Live'}
            tone="emerald"
            hint="Stale if no update &gt; 5 min"
          />
        </div>
        <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-2 border border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 live-pulse inline-block" />
            <span className="font-semibold">Live fleet &amp; driver GPS</span>
            <span className="text-slate-500 hidden sm:inline">
              | Purple = driver, green/blue = vehicle
            </span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(fetchLiveFleet())}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Refresh now
          </button>
        </div>
        {fleetLoading && liveFleet.length === 0 && liveDrivers.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            Loading map positions…
          </div>
        ) : (
          <FleetMap
            vehicles={liveFleet}
            drivers={liveDrivers}
            defaultMapView={projectMapView}
            height="min(58vh, 640px)"
            showCitySearch
          />
        )}
        {!fleetLoading && liveFleet.length === 0 && liveDrivers.length === 0 && (
          <p className="text-xs text-slate-500 text-center">
            No GPS positions yet. Drivers appear after they report location from the mobile app, or when vehicles have
            coordinates on file.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="portal-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-800 flex items-center gap-2 shadow-lg animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-600" /> {toastMessage}
        </div>
      )}

      <AdminSectionHeader
        icon={Compass}
        title="Dispatch console"
        subtitle="Assign cars and drivers to trips (no vehicle or driver registration here — Logistics Coordinator manages fleet)."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <AdminStatCard icon={Clock} label="All requests" value={requests.length} tone="brand" active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} />
        <AdminStatCard icon={Clock} label="Pending" value={requests.filter((r) => r.status === 'PENDING').length} tone="amber" active={statusFilter === 'PENDING'} onClick={() => setStatusFilter('PENDING')} />
        <AdminStatCard icon={Car} label="Assigned" value={requests.filter((r) => r.status === 'ASSIGNED').length} tone="blue" active={statusFilter === 'ASSIGNED'} onClick={() => setStatusFilter('ASSIGNED')} />
        <AdminStatCard icon={Zap} label="Uber / RIDE" value={countExternalRidesForDashboard(requests)} tone="rose" active={statusFilter === 'EXTERNAL_AUTHORIZED'} onClick={() => setStatusFilter('EXTERNAL_AUTHORIZED')} />
        <AdminStatCard icon={Navigation} label="In transit" value={requests.filter((r) => r.status === 'IN_TRANSIT').length} tone="purple" active={statusFilter === 'IN_TRANSIT'} onClick={() => setStatusFilter('IN_TRANSIT')} />
        <AdminStatCard icon={CheckCircle} label="Completed" value={requests.filter((r) => r.status === 'COMPLETED').length} tone="emerald" active={statusFilter === 'COMPLETED'} onClick={() => setStatusFilter('COMPLETED')} />
      </div>

      {/* Main Grid: Inbox on Left, Map & Recommendations on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Movement Requests Inbox (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-600" /> Requests Inbox
            </span>
            <span>{filteredRequests.length} requests</span>
          </div>

          <div className="space-y-2.5 portal-dispatch-inbox overflow-y-auto pr-1">
            {loading && requests.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="glass-panel p-4 rounded-2xl border border-slate-200 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))
            ) : filteredRequests.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl text-center text-xs text-slate-500">
                No requests matching filter "{statusFilter}".
              </div>
            ) : (
              filteredRequests.map(req => {
                const isSelected = selectedRequest?.id === req.id;
                const isPersonal = req.trip_category === 'PERSONAL';

                return (
                  <div
                    key={req.id}
                    onClick={() => handleSelectRequest(req)}
                    className={`glass-panel p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {req.staff?.full_name || 'Staff Member'}
                          </span>
                          {/* Trip Category Badge */}
                          {isPersonal ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              👤 Personal (Fuel Billed)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              🏢 Official
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {req.pickup_address} → {req.destination_address}
                        </p>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        req.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-800 border border-amber-200'
                          : req.status === 'ASSIGNED'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : isExternalRideRequest(req)
                          ? 'bg-indigo-500/20 text-indigo-800 border border-indigo-500/30'
                          : req.status === 'IN_TRANSIT'
                          ? 'bg-emerald-500/20 text-emerald-800 border border-emerald-500/30'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isExternalRideRequest(req) ? externalRideStatusLabel(req) : req.status}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(req.scheduled_pickup_time || req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>{req.passengers_count} passenger(s)</span>
                      <span className="text-brand-600 font-medium flex items-center gap-0.5">
                        Inspect <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Request Inspector & Dispatch Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedRequest ? (
            <div className="space-y-4">
              {/* Request Summary Card */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-300 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedRequest.staff?.full_name || 'Staff Member'}
                      </h3>
                      {selectedRequest.trip_category === 'PERSONAL' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          👤 Personal Trip (Fuel Cost Recoverable)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          🏢 Official Mission
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedRequest.purpose || 'Logistics transportation request'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedRequest.status === 'PENDING' && (
                      <button
                        onClick={openUberDispatch}
                        className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-brand-600/20"
                      >
                        <Zap className="w-3.5 h-3.5" /> Dispatch Uber / RIDE
                      </button>
                    )}
                  </div>
                </div>

                {/* Personal Trip Warning */}
                {selectedRequest.trip_category === 'PERSONAL' && (
                  <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-300 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>
                      <strong>Personal Use Notice:</strong> Fuel consumed will be automatically calculated upon trip completion and billed to this staff member's company liability ledger.
                    </span>
                  </div>
                )}

                {/* Route Pill */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block mb-0.5 font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600" /> Pickup Location
                    </span>
                    <strong className="text-slate-800 font-mono">{selectedRequest.pickup_address}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 font-medium flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-blue-400" /> Destination
                    </span>
                    <strong className="text-slate-800 font-mono">{selectedRequest.destination_address}</strong>
                  </div>
                </div>
              </div>

              {/* Status Notice: Authorized for Uber/RIDE */}
              {isExternalRideRequest(selectedRequest) &&
                ['EXTERNAL_AUTHORIZED', 'IN_TRANSIT'].includes(selectedRequest.status) && (
                <div className="glass-panel p-4 rounded-2xl border border-amber-200 bg-amber-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-700" /> Alternative Transport Dispatched ({selectedRequest.external_provider || 'Uber / RIDE'})
                    </span>
                    <span className="badge-available">Dispatched to Staff</span>
                  </div>
                  {selectedRequest.external_driver_name ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs pt-1 border-t border-amber-200">
                      <div>
                        <span className="text-slate-400 block">Taxi Driver</span>
                        <strong className="text-slate-900">{selectedRequest.external_driver_name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Driver Phone</span>
                        <strong className="text-slate-800 font-mono">{selectedRequest.external_driver_phone || '-'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Taxi Plate</span>
                        <strong className="text-slate-800 font-mono">{selectedRequest.external_vehicle_plate}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Booking Ref</span>
                        <strong className="text-amber-800 font-mono">{selectedRequest.external_booking_ref || '-'}</strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-700">
                      Dispatched to staff member ({selectedRequest.staff?.full_name}). Staff starts the ride on their mobile app and distance is tracked in real-time.
                    </p>
                  )}
                </div>
              )}

              {/* Status Notice: Completed via External Transport */}
              {selectedRequest.status === 'COMPLETED' && selectedRequest.external_cost && (
                <div className="glass-panel p-4 rounded-2xl border border-emerald-500/50 bg-emerald-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Completed via External Transport
                    </span>
                    <span className="badge-completed">Completed</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 block">Service</span>
                      <strong className="text-slate-900">{selectedRequest.external_provider || 'Uber / RIDE'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Traveled Distance</span>
                      <strong className="text-slate-800 font-mono">{selectedRequest.external_distance_km ? `${selectedRequest.external_distance_km} km` : '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Fare Paid</span>
                      <strong className="text-amber-700 font-bold">{selectedRequest.external_cost} {selectedRequest.external_currency || 'ETB'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Already Assigned Details with Reassign & Cancel Buttons */}
              {selectedRequest.status === 'ASSIGNED' && selectedRequest.assignment && (
                <div className="glass-panel p-4 rounded-2xl border border-blue-500/40 bg-blue-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-blue-400" /> Active Trip Assignment
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={openReassignModal}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <RotateCcw className="w-3 h-3" /> Change Car / Driver
                      </button>
                      <button
                        onClick={handleCancelAssignment}
                        className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-rose-500/30 transition-all"
                      >
                        <XCircle className="w-3 h-3" /> Cancel Assignment
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Vehicle</span>
                      <strong className="text-slate-800 font-mono text-sm block">{selectedRequest.assignment.vehicle?.plate_number}</strong>
                      <span className="text-slate-400 text-[11px]">{selectedRequest.assignment.vehicle?.make} {selectedRequest.assignment.vehicle?.model}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Driver</span>
                      <strong className="text-slate-900 text-sm block">{selectedRequest.assignment.driver?.full_name}</strong>
                      <span className="text-slate-400 text-[11px] font-mono">{selectedRequest.assignment.driver?.phone_number || 'Mobile driver'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive Map with Route Pins */}
              <FleetMap
                vehicles={liveFleet}
                drivers={liveDrivers}
                selectedRequest={selectedRequest}
                highlightDriverId={selectedRequest?.assignment?.driver?.id}
                highlightVehicleId={selectedRequest?.assignment?.vehicle?.id}
                defaultMapView={projectMapView}
                height="320px"
                showCitySearch={false}
              />

              {selectedRequest.status === 'PENDING' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openAssignModal()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
                  >
                    <Car className="w-4 h-4" /> Assign car &amp; driver
                  </button>
                  <button
                    type="button"
                    onClick={openUberDispatch}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" /> Book Uber / RIDE
                  </button>
                  <p className="text-[11px] text-slate-500 w-full">
                    Staff ride stays <strong>pending</strong> until you assign a fleet car and driver, or dispatch external taxi.
                  </p>
                </div>
              )}

              {/* Intelligent Vehicle Recommendations */}
              {selectedRequest.status === 'PENDING' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-emerald-600" /> Suggested matches (pick car &amp; driver in Assign)
                    </span>
                    <span className="text-slate-400">
                      {recommendations?.eligibleCount || 0} Eligible Vehicle(s)
                    </span>
                  </div>

                  {loadingRecs ? (
                    <div className="glass-panel p-6 rounded-2xl text-center text-xs text-slate-400">
                      Evaluating fleet positions, operating shifts, and calculating route driving times...
                    </div>
                  ) : recommendations?.eligibleCount === 0 ? (
                    <div className="glass-panel p-6 rounded-2xl text-center space-y-3 border border-amber-200 bg-amber-50">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-bold text-amber-800">
                        No Internal Fleet Vehicles Available for Requested Shift
                      </div>
                      <p className="text-xs text-slate-700 max-w-md mx-auto">
                        Internal vehicles are either busy, in repair/accident, or assigned to conflicting operating shifts. Dispatch Uber / RIDE for this staff member directly.
                      </p>
                      <button
                        onClick={openUberDispatch}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 mx-auto shadow-lg shadow-brand-600/30 transition-all"
                      >
                        <Zap className="w-4 h-4" /> Book & Dispatch Uber / RIDE
                      </button>
                    </div>
                  ) : recommendations?.recommendations?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recommendations.recommendations.map((rec, i) => {
                        const isTop = i === 0 && rec.eligibility.is_eligible;
                        return (
                          <div
                            key={rec.vehicle.id}
                            className={`glass-panel p-4 rounded-2xl border transition-all ${
                              isTop
                                ? 'border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                                : rec.eligibility.is_eligible
                                ? 'border-slate-200 hover:border-slate-300'
                                : 'border-slate-200/40 opacity-50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  {isTop && (
                                    <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider inline-block">
                                      ★ Best Match
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                    {rec.vehicle.shift_type === 'NIGHT_SHIFT' ? '🌙 Night Shift' :
                                     rec.vehicle.shift_type === 'WEEKEND' ? '📅 Weekend Duty' :
                                     rec.vehicle.shift_type === 'ALL_HOURS' ? '⚡ 24/7 All Hours' : '☀️ Normal Day'}
                                  </span>
                                </div>
                                <h5 className="font-bold text-slate-900 text-sm">{rec.vehicle.plate_number}</h5>
                                <p className="text-xs text-slate-400">{rec.vehicle.make} {rec.vehicle.model}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-extrabold text-emerald-600 font-mono">
                                  ~{rec.routing.estimated_driving_duration_mins} mins
                                </div>
                                <div className="text-[10px] text-slate-500">{rec.routing.distance_to_pickup_km} km away</div>
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                              <span className="text-slate-700">
                                Driver: <strong className="text-slate-900">{rec.driver?.full_name || 'Assigned Driver'}</strong>
                              </span>

                              {rec.eligibility.is_eligible ? (
                                <button
                                  type="button"
                                  onClick={() => openAssignModal(rec)}
                                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                                >
                                  Use in Assign <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-rose-400 font-medium truncate max-w-[150px]" title={rec.eligibility.checks?.shiftMismatchReason}>
                                  {rec.eligibility.checks?.shiftMismatchReason || 'Conflict / Busy'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="glass-panel p-6 rounded-2xl text-center text-xs text-amber-800 border border-amber-200">
                      No internal vehicles are registered.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Select a Movement Request</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select any incoming request from the inbox to inspect pickup and destination on the map and view auto-ranked vehicle recommendations.
              </p>
            </div>
          )}
        </div>
      </div>

      {showAssignModal && selectedRequest && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-emerald-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Car className="w-5 h-5 text-emerald-600" /> Assign fleet to request
            </h3>
            <p className="text-xs text-slate-500">
              Choose <strong>one vehicle</strong> and <strong>one driver</strong> for {selectedRequest.request_code || selectedRequest.id}.
            </p>
            <form onSubmit={handleConfirmAssign} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Vehicle *</label>
                <select
                  required
                  value={assignForm.vehicle_id}
                  onChange={(e) => setAssignForm({ ...assignForm, vehicle_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                >
                  <option value="">Select car…</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} — {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Driver *</label>
                <select
                  required
                  value={assignForm.driver_id}
                  onChange={(e) => setAssignForm({ ...assignForm, driver_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                >
                  <option value="">Select driver…</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name || d.user?.full_name || d.id}
                      {d.assigned_vehicle?.plate_number ? ` (${d.assigned_vehicle.plate_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Notes</label>
                <input
                  type="text"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-800"
                  placeholder="Optional dispatch note"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-60"
                >
                  {assignSaving ? 'Assigning…' : 'Confirm assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Coordinator Dispatches Uber / RIDE */}
      {showUberDispatchModal && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-amber-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-700" /> Book & Dispatch External Taxi (Uber / RIDE)
            </h3>
            <p className="text-xs text-slate-400">
              The Coordinator books the taxi directly and inputs details. These details are instantly rendered on the staff mobile app so they know which car is coming!
            </p>
            <form onSubmit={handleConfirmUberDispatch} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Provider</label>
                  <select
                    value={uberDispatchForm.provider}
                    onChange={e => setUberDispatchForm({ ...uberDispatchForm, provider: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white font-medium"
                  >
                    <option value="RIDE (8294)">RIDE (8294)</option>
                    <option value="Feres Taxi">Feres Taxi</option>
                    <option value="Uber Addis">Uber Addis</option>
                    <option value="Taxiye">Taxiye</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Booking / Trip Ref</label>
                  <input
                    type="text"
                    value={uberDispatchForm.booking_ref}
                    onChange={e => setUberDispatchForm({ ...uberDispatchForm, booking_ref: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono"
                    placeholder="e.g. BK-89421"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Taxi Driver Name</label>
                  <input
                    type="text"
                    required
                    value={uberDispatchForm.driver_name}
                    onChange={e => setUberDispatchForm({ ...uberDispatchForm, driver_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                    placeholder="e.g. Dawit Tadesse"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Driver Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={uberDispatchForm.driver_phone}
                    onChange={e => setUberDispatchForm({ ...uberDispatchForm, driver_phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono"
                    placeholder="e.g. +251 91 123 4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Taxi Plate Number</label>
                  <input
                    type="text"
                    required
                    value={uberDispatchForm.plate_number}
                    onChange={e => setUberDispatchForm({ ...uberDispatchForm, plate_number: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono uppercase"
                    placeholder="e.g. AA-2-B44123"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">Car Make & Model</label>
                  <input
                    type="text"
                    value={uberDispatchForm.vehicle_model}
                    onChange={e => setUberDispatchForm({ ...uberDispatchForm, vehicle_model: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                    placeholder="e.g. Toyota Vitz (Silver)"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-medium">Instructions / Notes</label>
                <input
                  type="text"
                  value={uberDispatchForm.notes}
                  onChange={e => setUberDispatchForm({ ...uberDispatchForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUberDispatchModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  Send Taxi to Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reassign Vehicle / Driver */}
      {showReassignModal && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-blue-500/40 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-400" /> Reassign Vehicle or Driver
            </h3>
            <p className="text-xs text-slate-400">
              Change the assigned vehicle, driver, or both without cancelling the trip request.
            </p>
            <form onSubmit={handleConfirmReassign} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Select Vehicle</label>
                <select
                  value={reassignForm.vehicle_id}
                  onChange={e => setReassignForm({ ...reassignForm, vehicle_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono"
                >
                  <option value="">Keep currently assigned vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} — {v.make} {v.model} ({v.operational_status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-medium">Select Driver</label>
                <select
                  value={reassignForm.driver_id}
                  onChange={e => setReassignForm({ ...reassignForm, driver_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white font-medium"
                >
                  <option value="">Keep currently assigned driver</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.availability_status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-medium">Reassignment Reason</label>
                <input
                  type="text"
                  required
                  value={reassignForm.reason}
                  onChange={e => setReassignForm({ ...reassignForm, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
