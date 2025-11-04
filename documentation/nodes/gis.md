## GISNode

The `GISNode` performs Geographic Information System operations like geocoding and reverse geocoding.

### Parameters

*   `action`: The GIS action to perform.
*   `provider`: The GIS provider to use (OpenStreetMap, Google Maps).
*   `apiKey`: Your Google Maps API key (if using Google Maps provider).
*   `address`: The address to geocode.
*   `latitude`: The latitude for reverse geocoding.
*   `longitude`: The longitude for reverse geocoding.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { GISNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running GISNode Example ---');

  // --- OpenStreetMap Provider Examples ---

  // Example 1: Geocode an address using OpenStreetMap
  console.log('\n--- OpenStreetMap: Geocoding "Eiffel Tower, Paris" ---');
  const osmGeocodeNode = new GISNode();
  osmGeocodeNode.setParams({
    operation: 'geocode',
    provider: 'openstreetmap',
    params: { address: 'Eiffel Tower, Paris' }
  });

  try {
    const result = await new AsyncFlow(osmGeocodeNode).runAsync({});
    console.log('OpenStreetMap Geocode Result:', result);
  } catch (error) {
    console.error('OpenStreetMap Geocode Failed:', error.message);
  }

  console.log('\n--- GISNode Example Finished ---');
})();
```
