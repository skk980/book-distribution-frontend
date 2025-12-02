interface TopbarProps {
  onToggleSidebar: () => void;
}

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b bg-white/70 backdrop-blur">
      {/* Left: mobile menu + title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-700 shadow-sm hover:bg-slate-50"
          onClick={onToggleSidebar}
        >
          <span className="sr-only">Open navigation</span>
          {/* simple hamburger icon */}
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <span className="font-semibold text-slate-900 md:hidden">
          Book Distribution
        </span>
        <span className="hidden md:inline text-sm font-semibold text-slate-900">
          Hare Krishna Book Distribution
        </span>
      </div>

      {/* Right: user info */}
      <div className="flex items-center gap-3 text-xs md:text-sm text-slate-600">
        <span className="hidden sm:inline">Logged in as</span>
        <span className="font-medium">Admin</span>
      </div>
    </header>
  );
}
