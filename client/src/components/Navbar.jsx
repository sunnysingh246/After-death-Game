import { Shield } from "lucide-react";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="brand">
        <Shield size={26} />
        <span>AFTER DEATH</span>
      </div>

      <div className="nav-status">
        <span className="status-dot"></span>
        CIVILIZATION NETWORK
      </div>

      <div className="commander">
        <div className="avatar">C</div>
        <div>
          <strong>Commander</strong>
          <p>Survivor · Level 1</p>
        </div>
      </div>
    </header>
  );
}