const Navbar = () => {
    return (
        <nav className="bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50 border-b border-cyan-500/30">
            <div className="container mx-auto px-6 py-3">
                <div className="flex justify-between items-center">
                    <a href="#" className="text-2xl font-bold text-white font-orbitron">
                        Q<span className="text-cyan-400">flow</span>
                    </a>
                    <div className="hidden md:flex items-center space-x-6">
                        <a href="#" className="text-gray-300 hover:text-cyan-400 transition-colors">Home</a>
                        <a href="#getting-started" className="text-gray-300 hover:text-cyan-400 transition-colors">Getting Started</a>
                        <a href="#docs" className="text-gray-300 hover:text-cyan-400 transition-colors">Docs</a>
                        <a href="https://github.com/fractal-code/qflow" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-github"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.54 2.73c0 5.46 3.3 6.61 6.44 7V19"></path></svg>
                        </a>
                    </div>
                    <div className="md:hidden">
                        {/* Mobile menu button can be added here if needed */}
                    </div>
                </div>
            </div>
        </nav>
    );
};
