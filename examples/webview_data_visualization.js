import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { WebviewNode } from '../src/nodes/webview.js';

async function runWebviewDataVisualization() {
  console.log('--- Running Webview Data Visualization Demo ---');

  // 1. Generate some sample data
  const labels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
  const dataPoints = labels.map(() => Math.floor(Math.random() * 100));

  // 2. Create HTML with embedded Chart.js for visualization
  const htmlContent = `
    <html>
    <head>
      <title>Monthly Sales Data</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        html, body { height: 100%; margin: 0; overflow: hidden; }
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; background-color: #f0f2f5; }
        .chart-container { width: 80%; max-width: 700px; height: 80%; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; flex-direction: column; justify-content: center; align-items: center; }
        h1 { text-align: center; color: #333; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="chart-container">
        <h1>Monthly Sales Overview</h1>
        <canvas id="myChart"></canvas>
      </div>

      <script>
        const ctx = document.getElementById('myChart').getContext('2d');
        const myChart = new Chart(ctx, {
          type: 'bar', // Can be 'bar', 'line', 'pie', 'doughnut', etc.
          data: {
            labels: ${JSON.stringify(labels)},
            datasets: [{
              label: 'Sales',
              data: ${JSON.stringify(dataPoints)},
              backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 206, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)',
                'rgba(255, 159, 64, 0.8)',
                'rgba(199, 199, 199, 0.8)'
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(199, 199, 199, 1)'
              ],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      </script>
    </body>
    </html>
  `;

  // 3. Display this visualization in a WebviewNode
  const dataWebview = new WebviewNode();
  dataWebview.setParams({
    html: htmlContent,
    title: 'Qflow Data Visualization',
    width: 900,
    height: 600,
  });

  const flow = new AsyncFlow(dataWebview);
  await flow.runAsync({});

  console.log('Webview Data Visualization Demo Finished.');
}

runWebviewDataVisualization();
