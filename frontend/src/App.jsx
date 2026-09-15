import { Routes, Route } from "react-router-dom";
import { NotificationProvider } from "./context/NotificationContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Userpage from "./pages/userpage";
import Adminpage from "./pages/Adminpage";
import Staffpage from "./pages/Staffpage";
import StaffTaskpage from "./pages/StaffTaskpage";
import Taskstatusupdate from "./pages/Taskstatusupdate";
import Recyclerpage from "./pages/Recyclerpage";
import Pickuprequestform from "./pages/Pickuprequestform";
import Wastecomplaintform from "./pages/Wastecomplaintform";
import Addstaffform from "./pages/Addstaffform";
import Addrecycler from "./pages/Addrecycler";
import Residentdirectory from "./pages/Residentdirectory";
import PickupAssignment from "./pages/Pickupassignment";
import Admincomplaints from "./pages/Admincomplaints";
import NotificationsPage from "./pages/NotificationsPage";
import StaffMCFCollection from "./pages/StaffMCFCollection";
import AdminMCFList from "./pages/AdminMCFList";
import AdminMCFDetails from "./pages/AdminMCFDetails";
import PaymentPage from "./pages/PaymentPage";
import AdminPayments from "./pages/AdminPayments";


export default function App() {
  return (
    <NotificationProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Citizen Routes */}
        <Route path="/user" element={<ProtectedRoute allowedRoles={["CITIZEN"]}><Userpage /></ProtectedRoute>} />
        <Route path="/pickupform" element={<ProtectedRoute allowedRoles={["CITIZEN"]}><Pickuprequestform /></ProtectedRoute>} />
        <Route path="/complaintform" element={<ProtectedRoute allowedRoles={["CITIZEN"]}><Wastecomplaintform /></ProtectedRoute>} />
        <Route path="/payment/:pickupId" element={<ProtectedRoute allowedRoles={["CITIZEN"]}><PaymentPage /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Adminpage /></ProtectedRoute>} />
        <Route path="/admincomplaints" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Admincomplaints /></ProtectedRoute>} />
        <Route path="/complaints" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Admincomplaints /></ProtectedRoute>} />
        <Route path="/addstaff" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Addstaffform /></ProtectedRoute>} />
        <Route path="/addrecycler" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Addrecycler /></ProtectedRoute>} />
        <Route path="/resident" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Residentdirectory /></ProtectedRoute>} />
        <Route path="/assign" element={<ProtectedRoute allowedRoles={["ADMIN"]}><PickupAssignment /></ProtectedRoute>} />
        <Route path="/admin/mcf" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminMCFList /></ProtectedRoute>} />
        <Route path="/admin/mcf/details" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminMCFDetails /></ProtectedRoute>} />
        <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminPayments /></ProtectedRoute>} />

        {/* Staff Routes */}
        <Route path="/staff" element={<ProtectedRoute allowedRoles={["STAFF"]}><Staffpage /></ProtectedRoute>} />
        <Route path="/stafftask" element={<ProtectedRoute allowedRoles={["STAFF"]}><StaffTaskpage /></ProtectedRoute>} />
        <Route path="/taskupdate/:id" element={<ProtectedRoute allowedRoles={["STAFF"]}><Taskstatusupdate /></ProtectedRoute>} />
        <Route path="/staff/mcf" element={<ProtectedRoute allowedRoles={["STAFF"]}><StaffMCFCollection /></ProtectedRoute>} />

        {/* Recycler Routes */}
        <Route path="/recycler" element={<ProtectedRoute allowedRoles={["RECYCLER"]}><Recyclerpage /></ProtectedRoute>} />

        {/* Common Authenticated Routes */}
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      </Routes>
    </NotificationProvider>
  );
}