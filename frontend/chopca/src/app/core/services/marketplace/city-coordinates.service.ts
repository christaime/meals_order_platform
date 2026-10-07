import { Injectable } from '@angular/core';

/**
 * Static coordinates for the main Cameroonian cities.
 *
 * Keyed by *normalized* city name — lowercase, accent-stripped,
 * whitespace-collapsed. The backend sends UUIDs for city ids, which
 * vary between environments; names are the stable key.
 *
 * Both the location form and the location selector use this service
 * to center the Google map when a city is picked.
 */
@Injectable({ providedIn: 'root' })
export class CityCoordinatesService {

  private static readonly COORDINATES: Record<string, google.maps.LatLngLiteral> = {
    // ─── Major cities ────────────────────────────────────────
    'douala':      { lat: 4.0511, lng: 9.7679 },
    'yaounde':     { lat: 3.8480, lng: 11.5021 },
    'bafoussam':   { lat: 5.4781, lng: 10.4172 },
    'bamenda':     { lat: 5.9597, lng: 10.1459 },
    'garoua':      { lat: 9.3017, lng: 13.3921 },
    'maroua':      { lat: 10.5956, lng: 14.3247 },
    'ngaoundere':  { lat: 7.3167, lng: 13.5833 },
    'bertoua':     { lat: 4.5772, lng: 13.6846 },
    'buea':        { lat: 4.1559, lng: 9.2410 },
    'limbe':       { lat: 4.0186, lng: 9.2146 },
    'kribi':       { lat: 2.9372, lng: 9.9100 },
    'ebolowa':     { lat: 2.9000, lng: 11.1500 },
    'edea':        { lat: 3.8000, lng: 10.1333 },
    'kumba':       { lat: 4.6363, lng: 9.4469 },
    'nkongsamba':  { lat: 4.9547, lng: 9.9404 },
    'foumban':     { lat: 5.7266, lng: 10.9000 },
    'sangmelima':  { lat: 2.9333, lng: 11.9833 },
    'dschang':     { lat: 5.4500, lng: 10.0667 },
    'mbalmayo':    { lat: 3.5167, lng: 11.5000 },
    'wum':         { lat: 6.3833, lng: 10.0667 },
    'bafang':      { lat: 5.1500, lng: 10.1833 },
    'mbouda':      { lat: 5.6333, lng: 10.2500 },
    'bangangte':   { lat: 5.1500, lng: 10.5167 },
    'meiganga':    { lat: 6.5167, lng: 14.3000 },
    'batouri':     { lat: 4.4333, lng: 14.3667 },
    'yagoua':      { lat: 10.3428, lng: 15.2406 },
    'kousseri':    { lat: 12.0769, lng: 15.0306 },
    'mora':        { lat: 11.0464, lng: 14.1400 },
    'tiko':        { lat: 4.0750, lng: 9.3600 },
    'muyuka':      { lat: 4.2900, lng: 9.4100 },
    'ekondo-titi': { lat: 4.6000, lng: 8.9833 },
  };

  /** Default fallback (Yaoundé — political capital). */
  private static readonly DEFAULT: google.maps.LatLngLiteral =
    { lat: 3.8480, lng: 11.5021 };

  /**
   * Look up coordinates by city name. Always returns a coordinate —
   * never null — so the map never "doesn't move" when a city is
   * selected.
   */
  getCoordinates(cityName: string | null | undefined): google.maps.LatLngLiteral {
    const key = CityCoordinatesService.normalize(cityName);
    return CityCoordinatesService.COORDINATES[key] ?? CityCoordinatesService.DEFAULT;
  }

  /** Lowercase, strip diacritics, trim, collapse whitespace. */
  private static normalize(name: string | null | undefined): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }
}
