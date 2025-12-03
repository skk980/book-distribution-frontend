import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/books", label: "Books" },
  { to: "/distributors", label: "Distributors" },
  { to: "/trips", label: "Distribution Trips" },
  { to: "/active-trips", label: "Active Trips" },
  { to: "/reports", label: "Reports" },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Top Logo Section */}
      <div className="flex flex-col items-center justify-center py-6 border-b border-slate-800 bg-slate-900">
        {/* ISKCON Logo */}
        <div className="w-16 h-16 mb-2">
          {/* Simple clean SVG lotus logo */}
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full text-white"
          >
            <path
              d="M32 4C22 14 20 24 22 30C17 30 12 25 10 18C5 30 10 40 18 44C12 46 10 52 12 58C20 56 26 50 28 44H36C38 50 44 56 52 58C54 52 52 46 46 44C54 40 59 30 54 18C52 25 47 30 42 30C44 24 42 14 32 4Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <h1 className="text-lg font-semibold text-white tracking-wide">
          ISKCON
        </h1>
        <p className="text-xs text-slate-300">Book Distribution</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              [
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white",
              ].join(" ")
            }
            onClick={onNavigate}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
