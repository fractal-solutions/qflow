window.CodeBlock = ({ code, title, language }) => {
    const [copyText, setCopyText] = React.useState('Copy');
    const codeRef = React.useRef(null);

    React.useEffect(() => {
        if (codeRef.current && window.Prism) {
            window.Prism.highlightElement(codeRef.current);
        }
    }, [code]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopyText('Copied');
            setTimeout(() => setCopyText('Copy'), 2000);
        }, () => {
            setCopyText('Failed');
            setTimeout(() => setCopyText('Copy'), 2000);
        });
    };

    return (
        <div className="code-block rounded-2xl overflow-hidden shadow-soft">
            <div className="code-header flex items-center justify-between px-4 py-2 border-b border-white/10 text-slate-200">
                <div className="flex items-center space-x-3 text-xs uppercase tracking-wide">
                    <span>{title || 'Code Example'}</span>
                    {language && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-200">{language}</span>}
                </div>
                <button
                    onClick={handleCopy}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20 transition-colors"
                >
                    {copyText}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto">
                <code ref={codeRef} className={`language-${language || 'js'}`}>
                    {code}
                </code>
            </pre>
        </div>
    );
};
