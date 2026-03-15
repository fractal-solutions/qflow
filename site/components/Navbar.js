window.Navbar = () => {
    const [open, setOpen] = React.useState(false);
    const [theme, setTheme] = React.useState(() => {
        const existing = document.documentElement.getAttribute('data-theme');
        if (existing) return existing;
        try {
            return localStorage.getItem('qflow-theme') || 'light';
        } catch (e) {
            return 'light';
        }
    });

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('qflow-theme', theme);
        } catch (e) {
            // Ignore storage errors.
        }
    }, [theme]);

    const navLinkClass = "nav-link text-sm font-medium";

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <header className="sticky top-0 z-50">
            <nav className="glass shadow-soft">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <a href="#home" className="text-2xl font-semibold font-display tracking-tight text-ink">
                            qflow
                        </a>
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#home" className={navLinkClass}>Home</a>
                            <a href="#getting-started" className={navLinkClass}>Getting Started</a>
                            <a href="#docs" className={navLinkClass}>Docs</a>
                            <a href="#examples" className={navLinkClass}>Examples</a>
                            <a href="https://github.com/fractal-code/qflow" target="_blank" rel="noopener noreferrer" className={navLinkClass}>GitHub</a>
                        </div>
                        <div className="hidden md:flex items-center space-x-3">
                            <button
                                onClick={toggleTheme}
                                className="px-3 py-2 rounded-full border border-slate-200 text-xs font-semibold text-ink hover:bg-white/70 transition-colors"
                                aria-label="Toggle theme"
                            >
                                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                            </button>
                            <a href="#getting-started" className="px-4 py-2 rounded-full bg-accent text-white text-sm font-medium shadow-soft hover:opacity-90 transition-colors">
                                Start Building
                            </a>
                        </div>
                        <button
                            className="md:hidden text-ink"
                            onClick={() => setOpen(!open)}
                            aria-label="Toggle navigation"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M3 12h18"></path>
                                <path d="M3 18h18"></path>
                            </svg>
                        </button>
                    </div>
                    {open && (
                        <div className="mt-4 flex flex-col space-y-3 md:hidden">
                            <a href="#home" className={navLinkClass} onClick={() => setOpen(false)}>Home</a>
                            <a href="#getting-started" className={navLinkClass} onClick={() => setOpen(false)}>Getting Started</a>
                            <a href="#docs" className={navLinkClass} onClick={() => setOpen(false)}>Docs</a>
                            <a href="#examples" className={navLinkClass} onClick={() => setOpen(false)}>Examples</a>
                            <a href="https://github.com/fractal-code/qflow" target="_blank" rel="noopener noreferrer" className={navLinkClass}>GitHub</a>
                            <button
                                onClick={() => { toggleTheme(); setOpen(false); }}
                                className="px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-ink hover:bg-white/70 transition-colors"
                            >
                                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                            </button>
                            <a href="#getting-started" className="px-4 py-2 rounded-full bg-accent text-white text-sm font-medium shadow-soft text-center" onClick={() => setOpen(false)}>
                                Start Building
                            </a>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
};
