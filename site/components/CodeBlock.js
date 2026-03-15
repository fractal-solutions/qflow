const CodeBlock = ({ code }) => {
    const [copyText, setCopyText] = React.useState('Copy');

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy'), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    // Using dangerouslySetInnerHTML to render the code string as HTML
    // This is needed because the code string itself contains HTML tags for syntax highlighting
    const createMarkup = () => {
        return {__html: code};
    };

    return (
        <div className="bg-gray-900 rounded-lg overflow-hidden my-6 border border-cyan-500/20">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-800/50">
                <span className="text-gray-400 text-xs">Code Example</span>
                <button
                    onClick={handleCopy}
                    className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 px-3 py-1 rounded-md text-xs transition-colors"
                >
                    {copyText}
                </button>
            </div>
            <pre className="p-4 text-sm text-white overflow-x-auto">
                <code dangerouslySetInnerHTML={createMarkup()} />
            </pre>
        </div>
    );
};
