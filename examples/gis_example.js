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

  // Example 2: Reverse Geocode coordinates using OpenStreetMap
  console.log('\n--- OpenStreetMap: Reverse Geocoding (48.8584, 2.2945) ---');
  const osmReverseGeocodeNode = new GISNode();
  osmReverseGeocodeNode.setParams({
    operation: 'reverseGeocode',
    provider: 'openstreetmap',
    params: { lat: 48.8584, lng: 2.2945 } // Coordinates for Eiffel Tower
  });

  try {
    const result = await new AsyncFlow(osmReverseGeocodeNode).runAsync({});
    console.log('OpenStreetMap Reverse Geocode Result:', result);
  } catch (error) {
    console.error('OpenStreetMap Reverse Geocode Failed:', error.message);
  }

  // --- Google Maps Provider Examples ---
  // IMPORTANT: For Google Maps examples, you need to set your GOOGLE_MAPS_API_KEY
  // as an environment variable. Get one from Google Cloud Console.

  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('\nWARNING: GOOGLE_MAPS_API_KEY is not set. Skipping Google Maps examples.');
  } else {
    // Example 3: Geocode an address using Google Maps
    console.log('\n--- Google Maps: Geocoding "Times Square, New York" ---');
    const googleGeocodeNode = new GISNode();
    googleGeocodeNode.setParams({
      operation: 'geocode',
      provider: 'google',
      params: { address: 'Times Square, New York' }
    });

    try {
      const result = await new AsyncFlow(googleGeocodeNode).runAsync({});
      console.log('Google Maps Geocode Result:', result);
    } catch (error) {
      console.error('Google Maps Geocode Failed:', error.message);
    }

    // Example 4: Reverse Geocode coordinates using Google Maps
    console.log('\n--- Google Maps: Reverse Geocoding (40.7580, -73.9855) ---');
    const googleReverseGeocodeNode = new GISNode();
    googleReverseGeocodeNode.setParams({
      operation: 'reverseGeocode',
      provider: 'google',
      params: { lat: 40.7580, lng: -73.9855 }
    });

    try {
      const result = await new AsyncFlow(googleReverseGeocodeNode).runAsync({});
      console.log('Google Maps Reverse Geocode Result:', result);
    } catch (error) {
      console.error('Google Maps Reverse Geocode Failed:', error.message);
    }
  }

  console.log('\n--- GISNode Example Finished ---');
})();