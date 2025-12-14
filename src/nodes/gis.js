import { AsyncNode, AsyncFlow } from '../qflow.js';
import { HttpRequestNode } from './index.js'; // For making HTTP requests to APIs

// Internal helper for Google Maps API calls
class GoogleMapsProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://maps.googleapis.com/maps/api";
  }

  async geocode(address) {
    if (!this.apiKey) {
      throw new Error("Google Maps API Key is not configured for GoogleMapsProvider.");
    }
    const url = `${this.baseUrl}/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    const httpRequest = new HttpRequestNode();
    httpRequest.setParams({ url, method: 'GET' });
    const response = await new AsyncFlow(httpRequest).runAsync({});
    const data = response.body;
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng, formattedAddress: data.results[0].formatted_address };
    }
    throw new Error(`Google Geocoding failed: ${data.status || JSON.stringify(data)}`);
  }

  async reverseGeocode(lat, lng) {
    if (!this.apiKey) {
      throw new Error("Google Maps API Key is not configured for GoogleMapsProvider.");
    }
    const url = `${this.baseUrl}/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
    const httpRequest = new HttpRequestNode();
    httpRequest.setParams({ url, method: 'GET' });
    const response = await new AsyncFlow(httpRequest).runAsync({});
    const data = response.body;
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      return { lat: parseFloat(result.geometry.location.lat), lng: parseFloat(result.geometry.location.lng), formattedAddress: result.formatted_address };
    }
    throw new Error(`Google Reverse Geocoding failed: ${data.status || JSON.stringify(data)}`);
  }

  // Add other Google Maps specific methods (directions, etc.) as needed
}

// Internal helper for OpenStreetMap (Nominatim for geocoding)
class OpenStreetMapProvider {
  constructor() {
    this.baseUrl = "https://nominatim.openstreetmap.org";
  }

  async geocode(address) {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const httpRequest = new HttpRequestNode();
    httpRequest.setParams({ url, method: 'GET', headers: { 'User-Agent': 'QFlowGISNode/1.0 (https://github.com/fractal-solutions/qflow)' } }); // Nominatim requires User-Agent
    const response = await new AsyncFlow(httpRequest).runAsync({});
    const data = response.body;
    if (Array.isArray(data) && data.length > 0) {
      const result = data[0];
      return { lat: parseFloat(result.lat), lng: parseFloat(result.lon), formattedAddress: result.display_name };
    }
    throw new Error(`OpenStreetMap Geocoding failed: No results for ${address}`);
  }

  async reverseGeocode(lat, lng) {
    const url = `${this.baseUrl}/reverse?lat=${lat}&lon=${lng}&format=json`;
    const httpRequest = new HttpRequestNode();
    httpRequest.setParams({ url, method: 'GET', headers: { 'User-Agent': 'QFlowGISNode/1.0 (https://github.com/fractal-solutions/qflow)' } }); // Nominatim requires User-Agent
    const response = await new AsyncFlow(httpRequest).runAsync({});
    const data = response.body;
    if (data && data.display_name) {
      return { lat: parseFloat(data.lat), lng: parseFloat(data.lon), formattedAddress: data.display_name };
    }
    throw new Error(`OpenStreetMap Reverse Geocoding failed: No results for ${lat},${lng}`);
  }

  // Add other OpenStreetMap specific methods (e.g., using OSRM for routing if self-hosted or public instance) as needed
}

export class GISNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "gis",
      description: "Performs Geographic Information System (GIS) operations like geocoding and reverse geocoding.",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["geocode", "reverseGeocode"],
            description: "The GIS operation to perform: 'geocode' (address to coordinates) or 'reverseGeocode' (coordinates to address)."
          },
          provider: {
            type: "string",
            enum: ["google", "openstreetmap"],
            default: "openstreetmap",
            description: "The GIS service provider to use. Defaults to 'openstreetmap' (free, open-source)."
          },
          params: {
            type: "object",
            description: "Parameters specific to the operation. For 'geocode', requires { address: string }. For 'reverseGeocode', requires { lat: number, lng: number }."
          }
        },
        required: ["operation", "params"]
      }
    };
  }

  constructor(maxRetries = 3, wait = 1) {
    super(maxRetries, wait);
    this.providers = {
      google: new GoogleMapsProvider(process.env.GOOGLE_MAPS_API_KEY), // API key from env var
      openstreetmap: new OpenStreetMapProvider(),
      // Add other providers here (e.g., mapbox: new MapboxProvider(process.env.MAPBOX_API_KEY))
    };
  }

  async execAsync() {
    const { operation, provider = 'openstreetmap', params } = this.params; // Default to openstreetmap

    if (!operation) {
      throw new Error('GISNode requires an `operation` parameter (e.g., "geocode", "reverseGeocode", "route").');
    }
    if (!this.providers[provider]) {
      throw new Error(`GIS provider '${provider}' not supported or configured.`);
    }

    const currentProvider = this.providers[provider];

    // Dispatch to the appropriate provider method based on operation
    switch (operation) {
      case 'geocode':
        if (!params || !params.address) {
          throw new Error('Geocode operation requires `params.address`.');
        }
        return await currentProvider.geocode(params.address);
      case 'reverseGeocode':
        if (!params || typeof params.lat !== 'number' || typeof params.lng !== 'number') {
          throw new Error('Reverse Geocode operation requires `params.lat` and `params.lng` as numbers.');
        }
        return await currentProvider.reverseGeocode(params.lat, params.lng);
      // Add other operations here
      // case 'route':
      //   return await currentProvider.route(params.origin, params.destination);
      default:
        throw new Error(`Unsupported GIS operation: ${operation}`);
    }
  }
}
