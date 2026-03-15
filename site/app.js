const { Navbar, Footer, LandingPage, GettingStartedPage, DocsPage, ExamplesPage } = window;

const App = () => {
    const [hash, setHash] = React.useState(window.location.hash);

    React.useEffect(() => {
        const handleHashChange = () => {
            setHash(window.location.hash);
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        };

        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);
    
    React.useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [hash]);

    const renderPage = () => {
        switch (hash) {
            case '#getting-started':
                return <GettingStartedPage />;
            case '#docs':
                return <DocsPage />;
            case '#examples':
                return <ExamplesPage />;
            case '#home':
            default:
                return <LandingPage />;
        }
    };

    return (
        <div className="relative min-h-screen min-w-0">
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="glow-orb w-[520px] h-[520px] bg-teal-300/40 -top-48 -left-24 float-slow"></div>
                <div className="glow-orb w-[420px] h-[420px] bg-amber-300/30 top-40 -right-20 float-slow"></div>
                <div className="glow-orb w-[360px] h-[360px] bg-emerald-200/30 bottom-10 left-1/3 float-slow"></div>
            </div>
            <Navbar />
            <main className="relative min-w-0">
                {renderPage()}
            </main>
            <Footer />
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
