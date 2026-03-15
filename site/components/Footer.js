const Footer = () => {
    return (
        <footer className="bg-gray-900/50 border-t border-cyan-500/30 mt-24">
            <div className="container mx-auto px-6 py-8">
                <div className="flex flex-col items-center text-center">
                    <a href="#" className="text-2xl font-bold text-white font-orbitron">
                        Q<span className="text-cyan-400">flow</span>
                    </a>
                    <div className="flex space-x-6 mt-4">
                        <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Home</a>
                        <a href="#getting-started" className="text-gray-400 hover:text-cyan-400 transition-colors">Getting Started</a>
                        <a href="#docs" className="text-gray-400 hover:text-cyan-400 transition-colors">Docs</a>
                        <a href="https://github.com/fractal-code/qflow" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors">GitHub</a>
                    </div>
                    <p className="mt-6 text-gray-500 text-sm">
                        &copy; {new Date().getFullYear()} Fractal. All rights reserved.
                    </p>
                    <p className="mt-2 text-gray-600 text-xs">
                        Released under the MIT License.
                    </p>
                </div>
            </div>
        </footer>
    );
};
