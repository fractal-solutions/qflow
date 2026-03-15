const GettingStartedPage = () => {
    const step1Code = `bunx create-qflow@latest my-weather-cli
cd my-weather-cli`;

    const step2Code = `// weather-flow.js
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { HttpRequestNode, UserInputNode } from '@fractal-solutions/qflow/nodes`;

    const step3Code = `// 1. Node to get the city from the user
const getCity = new UserInputNode();
getCity.setParams({
    prompt: 'Enter a city name: '
});

// This node's 'postAsync' will save the user's input into the shared state
getCity.postAsync = async (shared, _, city) => {
    shared.city = city.trim();
    console.log(`Fetching weather for ${shared.city}...`);
    return 'default';
};

    const step4Code = `// 2. Node to call the weather API
const fetchWeather = new HttpRequestNode();

// 'prepAsync' is used to prepare data right before execution.
// Here, we use the city from the shared state to build the API URL.
fetchWeather.prepAsync = async (shared) => {
    if (!shared.city) {
        throw new Error('City not provided!');
    }
    // wttr.in is a great, simple weather API that returns JSON
    fetchWeather.setParams({
        url: `https://wttr.in/${encodeURIComponent(shared.city)}?format=j1`,
        method: 'GET',
    });
};

// 'postAsync' saves the weather data to the shared state
fetchWeather.postAsync = async (shared, _, execRes) => {
    if (execRes.status === 200) {
        shared.weather = execRes.body; // The body is already parsed JSON
    } else {
        throw new Error(`Failed to fetch weather: ${execRes.status}`);
    }
    return 'default';
};

    const step5Code = `// 3. Node to display the result
class DisplayWeatherNode extends AsyncNode {
    async execAsync(prepRes, shared) {
        const weather = shared.weather;
        if (!weather) {
            console.log("Could not retrieve weather data.");
            return;
        }

        const current = weather.current_condition[0];
        const feelsLike = current.FeelsLikeC;
        const temp = current.temp_C;
        const description = current.weatherDesc[0].value;

        console.log(`\n--- Weather in ${shared.city} ---`);
        console.log(`${description}, ${temp}°C (Feels like ${feelsLike}°C)`);
        console.log('---------------------------\n');
    }
}

const displayWeather = new DisplayWeatherNode();`;

    const step6Code = `// 4. Chain the nodes together and create the flow
getCity.next(fetchWeather);
fetchWeather.next(displayWeather);

// 5. Create and run the AsyncFlow
const weatherFlow = new AsyncFlow(getCity);

(async () => {
    try {
        await weatherFlow.runAsync({});
        console.log('Weather check complete!');
    } catch (error) {
        console.error('Flow failed:', error.message);
    }
})();`;

    const step7Code = `node weather-flow.js`;

    return (
        <div className="container mx-auto px-6 py-12 text-left max-w-4xl">
            <h1 className="text-4xl font-bold text-white font-orbitron">Getting Started</h1>
            <p className="mt-4 text-lg text-gray-400">
                Welcome to qflow! Let's build your first project: a simple command-line weather tool. This will introduce you to the core concepts of nodes, flows, and shared state.
            </p>

            <div className="mt-12">
                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron">Step 1: Create a New Project</h2>
                <p className="mt-2 text-gray-400">
                    The easiest way to start is with the `create-qflow` tool, which sets up a new project with all the necessary files.
                </p>
                <CodeBlock code={step1Code} />

                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron mt-8">Step 2: Create Your Flow File</h2>
                <p className="mt-2 text-gray-400">
                    Inside your new project, create a file named `weather-flow.js`. This is where we'll define our workflow. Start by importing the necessary classes.
                </p>
                <CodeBlock code={step2Code} />

                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron mt-8">Step 3: Get User Input</h2>
                <p className="mt-2 text-gray-400">
                    First, we need a node to ask the user for a city. We'll use the built-in `UserInputNode`. After the user enters a city, we use `postAsync` to save the result into the flow's `shared` state object.
                </p>
                <CodeBlock code={step3Code} />

                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron mt-8">Step 4: Fetch the Weather</h2>
                <p className="mt-2 text-gray-400">
                    Next, we'll use the `HttpRequestNode` to call a weather API. We use the `prepAsync` method to dynamically set the URL based on the city we saved in the `shared` state.
                </p>
                <CodeBlock code={step4Code} />

                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron mt-8">Step 5: Display the Result</h2>
                <p className="mt-2 text-gray-400">
                    Now we need a node to present the data to the user. We can create a custom `AsyncNode` for this. It reads the weather data from the `shared` state and prints a formatted message to the console.
                </p>
                <CodeBlock code={step5Code} />

                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron mt-8">Step 6: Assemble and Run the Flow</h2>
                <p className="mt-2 text-gray-400">
                    Finally, we chain our nodes together using `.next()` to define the sequence of operations. We then create an `AsyncFlow`, give it our starting node, and call `runAsync()` to execute the workflow.
                </p>
                <CodeBlock code={step6Code} />

                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron mt-8">Step 7: Run Your Project!</h2>
                <p className="mt-2 text-gray-400">
                    Save all the code into your `weather-flow.js` file and run it from your terminal.
                </p>
                <CodeBlock code={step7Code} />
                <p className="mt-4 text-gray-400">
                    You've just created a complete qflow application! You can see how easy it is to chain different operations, pass data between them, and handle asynchronous tasks. From here, you can explore more complex flows, different nodes, and the powerful agent capabilities.
                </p>
            </div>
        </div>
    );
};