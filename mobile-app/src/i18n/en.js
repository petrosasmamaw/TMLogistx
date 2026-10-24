// English Localization Dictionary for TMLogistx Mobile

export const en = {
  // App Header & Navigation
  appTitle: "TMLogistx",
  appSubtitle: "Fleet & Movement",
  staffPortal: "Staff Movement Portal",
  driverPortal: "Driver Fleet Console",
  switchLanguage: "አማርኛ",
  quickDemo: "Demo Accounts",
  logout: "Logout",
  welcome: "Welcome back",

  // Roles
  role_STAFF_MEMBER: "Staff Member",
  role_DRIVER: "Fleet Driver",
  role_LOGISTICS_COORDINATOR: "Logistics Coordinator",
  role_MOVEMENT_OFFICER: "Movement Officer",

  // Navigation Tabs
  tabRequest: "Request",
  tabActiveRide: "Active Trip",
  tabHistory: "History",
  tabAssigned: "Assigned Trips",
  tabTripWorkflow: "Trip Stepper",
  tabPerformance: "Performance",

  // Movement Request Form
  requestTitle: "Book Staff Movement",
  requestSubtitle: "Submit a travel request for project transport",
  pickupLocation: "Pickup Location",
  pickupPlaceholder: "e.g., Bole International Airport, Gate 2",
  destination: "Destination",
  destinationPlaceholder: "e.g., UNECA Compound, Menelik II Ave",
  pickupDateTime: "Date & Time",
  pickupTimeLabel: "Departure Schedule",
  passengerCount: "Passengers",
  passengersHelper: "1-12 persons",
  purpose: "Purpose of Movement",
  purposePlaceholder: "e.g., Field mission, VIP delegate escort, Client site audit",
  cargoNotes: "Cargo & Luggage (Optional)",
  cargoPlaceholder: "e.g., 2 large flight boxes, surveying equipment",
  submitRequestBtn: "Submit Movement Request",
  submitting: "Submitting...",
  requestSuccess: "Movement Request Submitted! Movement Officer has been notified.",
  validationError: "Please fill in pickup, destination, and purpose.",

  // Active Ride Screen (Staff)
  activeRideTitle: "Live Ride Status",
  activeRideSubtitle: "Real-time tracking of your assigned vehicle",
  noActiveRide: "No Active Movement Right Now",
  noActiveRideDesc: "You don't have any in-progress trips. Submit a new request to book transportation.",
  assignedVehicle: "Assigned Vehicle",
  driverDetails: "Assigned Driver",
  callDriver: "Call Driver",
  etaLabel: "Estimated Arrival",
  distanceRemaining: "Distance",
  currentProgress: "Trip Pipeline",

  // Trip Statuses (Pipeline)
  status_PENDING: "Pending Dispatch",
  status_APPROVED: "Approved",
  status_ASSIGNED: "Driver Assigned",
  status_ACCEPTED: "Driver Accepted",
  status_REJECTED: "Driver Rejected",
  status_EXTERNAL_AUTHORIZED: "Uber / RIDE Authorized",
  status_HEADING_TO_PICKUP: "En Route to Pickup",
  status_ARRIVED: "Driver Arrived at Pickup",
  status_PASSENGER_PICKED_UP: "Passenger Onboard",
  status_IN_TRANSIT: "In Transit to Destination",
  status_COMPLETED: "Trip Completed",
  status_CANCELLED: "Cancelled",

  // External Transport (Uber / RIDE) Workflow
  uberAuthorizedBadge: "Uber / RIDE Authorized",
  uberAuthorizedNotice: "Movement Controller has authorized you to take an external taxi/ride because internal vehicles were unavailable for your schedule.",
  callUberRide: "Call / Order RIDE Taxi",
  callRide8294: "Dial RIDE Hot-line (8294)",
  startExternalRideBtn: "Start Ride (Depart Now)",
  endExternalRideBtn: "End Ride (Arrived at Destination)",
  rideStartedNotice: "Ride in progress. Coordinates and departure time logged.",
  enterFarePrompt: "Trip Complete! Enter Fare for Reimbursement",
  fareAmountLabel: "Amount Paid (Fare)",
  distanceCalculatedLabel: "Calculated Distance",
  receiptNotesLabel: "Receipt Notes / Reference (Optional)",
  submitExternalRideBtn: "Submit Expense & Complete Trip",

  // Driver Console Screens
  driverConsoleTitle: "Assigned Trips",
  driverConsoleSubtitle: "Daily movement schedule and dispatch tickets",
  noAssignedTrips: "No Assigned Trips",
  noAssignedTripsDesc: "You currently have no pending dispatches. Standby for new assignments.",
  acceptAssignment: "Accept Trip",
  rejectAssignment: "Decline",
  rejectPromptTitle: "Reason for Rejection",
  rejectPlaceholder: "e.g., Vehicle inspection scheduled, road impassable",
  confirmReject: "Confirm Decline",
  cancel: "Cancel",

  // Driver Workflow Stepper Buttons
  stepperHeading: "1. Heading to Pickup",
  stepperArrived: "2. Arrived at Location",
  stepperBoarded: "3. Passenger Onboard & Depart",
  stepperComplete: "4. Complete Trip",
  stepperFinished: "Trip Completed Successfully",
  openNavigation: "Open Navigation (Maps)",

  // Driver trip distance (map / GPS + manual override)
  driveDistanceTitle: "Trip distance (map & GPS)",
  driveDistanceSubtitle: "Start when you begin driving and end at destination. If the map or GPS is wrong, switch to manual entry.",
  driveDistanceStart: "Start drive",
  driveDistanceEnd: "End drive",
  driveDistanceGpsPath: "GPS path",
  driveDistanceMapEstimate: "Map estimate",
  driveDistanceTrackingLive: "Recording route — keep app open while driving",
  driveDistanceManualMode: "Enter distance manually",
  driveDistanceManualHint: "Use when map or GPS is unavailable or incorrect",
  driveDistanceManualPlaceholder: "e.g. 12.5",
  driveDistanceStartedTitle: "Drive started",
  driveDistanceStartedMsg: "Start location saved. Distance is calculated along your route.",
  driveDistanceEndedTitle: "Drive ended",
  driveDistanceEndedMsg: "Review GPS and map distances below, or enter km manually.",
  driveDistanceRequiredTitle: "Distance required",
  driveDistanceRequiredMsg: "Tap Start/End drive or enter distance manually before completing the trip.",
  driveDistanceRecorded: "Distance recorded",

  // Live GPS Simulation
  gpsBroadcaster: "Live Telematics",
  gpsBroadcastingActive: "GPS Active: Broadcasting coordinates",
  gpsIntervalNotice: "Simulated ping every 10 seconds",

  // Incident & Breakdown Modal
  reportIncidentBtn: "Report Breakdown / Incident",
  incidentModalTitle: "Report Trip Incident",
  incidentType: "Incident Type",
  incidentType_BREAKDOWN: "Mechanical / Engine Breakdown",
  incidentType_FLAT_TIRE: "Flat Tire",
  incidentType_ACCIDENT: "Traffic Accident",
  incidentType_TRAFFIC_DELAY: "Severe Traffic / Road Blockage",
  incidentType_OTHER: "Other Issue",
  severity: "Severity Level",
  severity_LOW: "Low (Minor delay)",
  severity_MEDIUM: "Medium (Needs assistance)",
  severity_CRITICAL: "Critical (Vehicle immobilized)",
  incidentDescription: "Incident Notes & Details",
  incidentPlaceholder: "Describe location, vehicle condition, and immediate needs...",
  submitIncident: "Dispatch Incident Alert",

  // History Screen
  historyTitle: "Movement History",
  historySubtitle: "Log of your recent and past trips",
  noHistory: "No past trip records found.",
  tripId: "Trip ID",
  date: "Date",
  project: "Project",

  // Demo User Switcher
  quickSwitchTitle: "Select Demo Profile",
  quickStaffEth: "Amina Al-Mansoor (Staff - Ethiopia)",
  quickStaffKen: "David Mwangi (Staff - Kenya)",
  quickDriverAbebe: "Abebe Bikila (Driver - Land Cruiser)",
  quickDriverJohn: "John Ochieng (Driver - Hilux 4x4)"
};
