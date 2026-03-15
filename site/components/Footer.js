window.Footer = () => {
    return (
        <footer className="mt-24 border-t border-slate-200/60">
            <div className="container mx-auto px-6 py-12">
                <div className="grid gap-8 md:grid-cols-4">
                    <div>
                        <h3 className="text-xl font-display text-ink">qflow</h3>
                        <p className="mt-3 text-sm text-muted">
                            Lightweight workflows and agents for ambitious builders.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-ink uppercase tracking-wide">Product</h4>
                        <div className="mt-3 flex flex-col space-y-2 text-sm text-muted">
                            <a href="#home" className="nav-link">Overview</a>
                            <a href="#getting-started" className="nav-link">Quickstart</a>
                            <a href="#docs" className="nav-link">Docs</a>
                            <a href="#examples" className="nav-link">Examples</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-ink uppercase tracking-wide">Resources</h4>
                        <div className="mt-3 flex flex-col space-y-2 text-sm text-muted">
                            <a href="https://github.com/fractal-code/qflow" target="_blank" rel="noopener noreferrer" className="nav-link">GitHub</a>
                            <a href="#docs" className="nav-link">API Reference</a>
                            <a href="#getting-started" className="nav-link">Examples</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-ink uppercase tracking-wide">License</h4>
                        <p className="mt-3 text-sm text-muted">MIT License</p>
                        <p className="mt-2 text-xs text-muted">&copy; {new Date().getFullYear()} Fractal.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};
