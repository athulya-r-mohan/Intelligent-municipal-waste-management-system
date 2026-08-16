import { Routes, Route } from "react-router-dom";

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
import Residentdirectory from "./pages/Residentdirectory"


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/user" element={<Userpage />} />
      <Route path="/admin" element={<Adminpage />} />
      <Route path="/staff" element={<Staffpage />} />
      <Route path="/stafftask" element={<StaffTaskpage />} />
      <Route path="/taskupdate/:id" element={<Taskstatusupdate />} />
      <Route path="/recycler" element={<Recyclerpage />} />
      <Route path="/pickupform" element={<Pickuprequestform />} />
      <Route path="/complaintform" element={<Wastecomplaintform />} />
      <Route path="/addstaff" element={<Addstaffform />} />
      <Route path="/addrecycler" element={<Addrecycler />} />
      <Route path="/resident" element={<Residentdirectory />} />
    </Routes>
  );
}