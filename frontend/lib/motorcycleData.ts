/**
 * Comprehensive motorcycle database for dirt bikes and dual-sport bikes.
 * Includes torque (ft-lbs), weight (lbs), and acceleration characteristics.
 */

export interface MotorcycleModel {
  id: string;
  brand: string;
  model: string;
  year: number;
  engineCC: number;
  torque_ft_lbs: number;
  weight_lbs: number;
  horsepower: number;
  type: 'Motocross' | 'Enduro' | 'Dual-Sport' | 'Trail';
  description?: string;
}

export const MOTORCYCLE_BRANDS = [
  'Honda',
  'Yamaha',
  'Kawasaki',
  'Suzuki',
  'KTM',
  'Husqvarna',
  'Gas Gas',
  'Beta',
  'Sherco',
  'TM Racing',
];

export const motorcycleDatabase: Record<string, MotorcycleModel[]> = {
  Honda: [
    {
      id: 'honda-crf450r-2024',
      brand: 'Honda',
      model: 'CRF450R',
      year: 2024,
      engineCC: 449,
      torque_ft_lbs: 37.6,
      weight_lbs: 248,
      horsepower: 53.5,
      type: 'Motocross',
      description: 'Professional motocross, proven race heritage',
    },
    {
      id: 'honda-crf250r-2024',
      brand: 'Honda',
      model: 'CRF250R',
      year: 2024,
      engineCC: 249,
      torque_ft_lbs: 19.3,
      weight_lbs: 218,
      horsepower: 28.5,
      type: 'Motocross',
      description: 'Intermediate motocross, lightweight handling',
    },
    {
      id: 'honda-crf125r-2024',
      brand: 'Honda',
      model: 'CRF125R',
      year: 2024,
      engineCC: 125,
      torque_ft_lbs: 8.5,
      weight_lbs: 162,
      horsepower: 11.0,
      type: 'Motocross',
      description: 'Beginner-friendly motocross',
    },
    {
      id: 'honda-xr650l-2024',
      brand: 'Honda',
      model: 'XR650L',
      year: 2024,
      engineCC: 644,
      torque_ft_lbs: 48.0,
      weight_lbs: 352,
      horsepower: 35.0,
      type: 'Dual-Sport',
      description: 'Long-distance dual-sport, street-legal',
    },
    {
      id: 'honda-xr650r-2023',
      brand: 'Honda',
      model: 'XR650R',
      year: 2023,
      engineCC: 644,
      torque_ft_lbs: 50.6,
      weight_lbs: 326,
      horsepower: 52.0,
      type: 'Enduro',
      description: 'High-performance enduro, discontinued model',
    },
  ],
  Yamaha: [
    {
      id: 'yamaha-yzf450-2024',
      brand: 'Yamaha',
      model: 'YZ450F',
      year: 2024,
      engineCC: 449,
      torque_ft_lbs: 37.0,
      weight_lbs: 247,
      horsepower: 55.0,
      type: 'Motocross',
      description: 'Top-tier motocross performer',
    },
    {
      id: 'yamaha-yzf250-2024',
      brand: 'Yamaha',
      model: 'YZ250F',
      year: 2024,
      engineCC: 249,
      torque_ft_lbs: 18.5,
      weight_lbs: 216,
      horsepower: 28.0,
      type: 'Motocross',
      description: 'Agile mid-size motocross',
    },
    {
      id: 'yamaha-wr250r-2024',
      brand: 'Yamaha',
      model: 'WR250R',
      year: 2024,
      engineCC: 250,
      torque_ft_lbs: 17.0,
      weight_lbs: 320,
      horsepower: 21.0,
      type: 'Dual-Sport',
      description: 'Street-legal trail bike',
    },
  ],
  Kawasaki: [
    {
      id: 'kawasaki-kx450-2024',
      brand: 'Kawasaki',
      model: 'KX450',
      year: 2024,
      engineCC: 449,
      torque_ft_lbs: 38.5,
      weight_lbs: 250,
      horsepower: 56.0,
      type: 'Motocross',
      description: 'Aggressive motocross platform',
    },
    {
      id: 'kawasaki-kx250-2024',
      brand: 'Kawasaki',
      model: 'KX250',
      year: 2024,
      engineCC: 249,
      torque_ft_lbs: 19.8,
      weight_lbs: 219,
      horsepower: 30.0,
      type: 'Motocross',
      description: 'Two-stroke mid-size racer',
    },
    {
      id: 'kawasaki-klx230-2024',
      brand: 'Kawasaki',
      model: 'KLX230',
      year: 2024,
      engineCC: 233,
      torque_ft_lbs: 15.6,
      weight_lbs: 358,
      horsepower: 18.7,
      type: 'Dual-Sport',
      description: 'Beginner-friendly dual-sport',
    },
  ],
  Suzuki: [
    {
      id: 'suzuki-rmz450-2024',
      brand: 'Suzuki',
      model: 'RM-Z450',
      year: 2024,
      engineCC: 449,
      torque_ft_lbs: 36.5,
      weight_lbs: 244,
      horsepower: 51.0,
      type: 'Motocross',
      description: 'Reliable four-stroke motocross',
    },
    {
      id: 'suzuki-rmz250-2024',
      brand: 'Suzuki',
      model: 'RM-Z250',
      year: 2024,
      engineCC: 249,
      torque_ft_lbs: 18.8,
      weight_lbs: 215,
      horsepower: 27.5,
      type: 'Motocross',
      description: 'Proven mid-size competition bike',
    },
  ],
  KTM: [
    {
      id: 'ktm-sx450f-2024',
      brand: 'KTM',
      model: 'SX-F 450',
      year: 2024,
      engineCC: 449,
      torque_ft_lbs: 39.2,
      weight_lbs: 238,
      horsepower: 57.0,
      type: 'Motocross',
      description: 'Factory-backed motocross bike',
    },
    {
      id: 'ktm-sx250f-2024',
      brand: 'KTM',
      model: 'SX-F 250',
      year: 2024,
      engineCC: 249,
      torque_ft_lbs: 20.0,
      weight_lbs: 213,
      horsepower: 32.0,
      type: 'Motocross',
      description: 'Lightweight, aggressive handling',
    },
    {
      id: 'ktm-500exc-f-2024',
      brand: 'KTM',
      model: '500 EXC-F',
      year: 2024,
      engineCC: 510,
      torque_ft_lbs: 42.8,
      weight_lbs: 306,
      horsepower: 60.0,
      type: 'Enduro',
      description: 'Extreme enduro performer',
    },
    {
      id: 'ktm-350exc-f-2024',
      brand: 'KTM',
      model: '350 EXC-F',
      year: 2024,
      engineCC: 349,
      torque_ft_lbs: 27.6,
      weight_lbs: 275,
      horsepower: 40.0,
      type: 'Enduro',
      description: 'Mid-size enduro versatility',
    },
  ],
  Husqvarna: [
    {
      id: 'husqvarna-fc450-2024',
      brand: 'Husqvarna',
      model: 'FC 450',
      year: 2024,
      engineCC: 449,
      torque_ft_lbs: 39.0,
      weight_lbs: 239,
      horsepower: 56.5,
      type: 'Motocross',
      description: 'Factory racing platform',
    },
    {
      id: 'husqvarna-fc250-2024',
      brand: 'Husqvarna',
      model: 'FC 250',
      year: 2024,
      engineCC: 249,
      torque_ft_lbs: 20.2,
      weight_lbs: 214,
      horsepower: 32.5,
      type: 'Motocross',
      description: 'Agile mid-weight motocross',
    },
    {
      id: 'husqvarna-fx350-2024',
      brand: 'Husqvarna',
      model: 'FX 350',
      year: 2024,
      engineCC: 349,
      torque_ft_lbs: 28.0,
      weight_lbs: 280,
      horsepower: 40.5,
      type: 'Enduro',
      description: 'Flexible enduro engine',
    },
  ],
  'Gas Gas': [
    {
      id: 'gasgas-ec450f-2024',
      brand: 'Gas Gas',
      model: 'EC 450F',
      year: 2024,
      engineCC: 449,
      torque_ft_lbs: 38.8,
      weight_lbs: 237,
      horsepower: 56.0,
      type: 'Enduro',
      description: 'Spanish-built enduro champion',
    },
    {
      id: 'gasgas-ec250f-2024',
      brand: 'Gas Gas',
      model: 'EC 250F',
      year: 2024,
      engineCC: 249,
      torque_ft_lbs: 19.5,
      weight_lbs: 213,
      horsepower: 30.0,
      type: 'Enduro',
      description: 'Lightweight enduro specialist',
    },
  ],
  Beta: [
    {
      id: 'beta-rr500-2024',
      brand: 'Beta',
      model: 'RR 500',
      year: 2024,
      engineCC: 498,
      torque_ft_lbs: 41.2,
      weight_lbs: 300,
      horsepower: 52.0,
      type: 'Enduro',
      description: 'Italian enduro powerhouse',
    },
    {
      id: 'beta-rr350-2024',
      brand: 'Beta',
      model: 'RR 350',
      year: 2024,
      engineCC: 349,
      torque_ft_lbs: 27.2,
      weight_lbs: 278,
      horsepower: 38.0,
      type: 'Enduro',
      description: 'Mid-size enduro with character',
    },
  ],
  Sherco: [
    {
      id: 'sherco-se510f-2024',
      brand: 'Sherco',
      model: 'SE 510F',
      year: 2024,
      engineCC: 510,
      torque_ft_lbs: 41.5,
      weight_lbs: 295,
      horsepower: 51.0,
      type: 'Enduro',
      description: 'French enduro innovation',
    },
    {
      id: 'sherco-se300f-2024',
      brand: 'Sherco',
      model: 'SE 300F',
      year: 2024,
      engineCC: 299,
      torque_ft_lbs: 22.0,
      weight_lbs: 258,
      horsepower: 34.0,
      type: 'Enduro',
      description: 'Two-stroke enduro machine',
    },
  ],
  'TM Racing': [
    {
      id: 'tm-en450fi-2024',
      brand: 'TM Racing',
      model: 'EN 450FI',
      year: 2024,
      engineCC: 449,
      torque_ft_lbs: 38.5,
      weight_lbs: 242,
      horsepower: 55.0,
      type: 'Enduro',
      description: 'Hand-built Italian enduro',
    },
  ],
};

/**
 * Get all available motorcycle models, optionally filtered by brand
 */
export function getMotorcyclesByBrand(brand?: string): MotorcycleModel[] {
  if (!brand) {
    return Object.values(motorcycleDatabase).flat();
  }
  return motorcycleDatabase[brand] || [];
}

/**
 * Calculate acceleration enhancement based on torque-to-weight ratio
 * Higher ratio = better acceleration off the ramp
 * Returns a multiplier (1.0 = baseline, 1.1 = 10% boost)
 */
export function calculateAccelerationFactor(motorcycle: MotorcycleModel): number {
  // Baseline: 450cc motocross bike (Honda CRF450R)
  const baselineTorque = 37.6;
  const baselineWeight = 248;
  const baselineRatio = baselineTorque / baselineWeight;

  const bikeRatio = motorcycle.torque_ft_lbs / motorcycle.weight_lbs;
  const ratio = bikeRatio / baselineRatio;

  // Cap the multiplier between 0.85 and 1.35 (±15-35% variance)
  return Math.max(0.85, Math.min(1.35, ratio));
}

/**
 * Calculate torque assistance (extra force at launch)
 * Returns additional speed bonus in mph based on torque
 */
export function calculateTorqueBonus(motorcycle: MotorcycleModel): number {
  // Every ft-lb of torque adds ~0.3 mph to required speed (empirical)
  const baselineTorque = 37.6;
  const bonus = (motorcycle.torque_ft_lbs - baselineTorque) * 0.15;
  return Math.max(-2, Math.min(8, bonus)); // Cap between -2 and +8 mph
}

/**
 * Get acceleration characteristics as readable description
 */
export function getAccelerationDescription(factor: number): string {
  if (factor >= 1.25) {
    return 'Exceptional acceleration - high torque-to-weight ratio';
  } else if (factor >= 1.15) {
    return 'Strong acceleration - above average power delivery';
  } else if (factor >= 0.95) {
    return 'Baseline acceleration - standard performance';
  } else if (factor >= 0.85) {
    return 'Moderate acceleration - heavier bike';
  } else {
    return 'Lower acceleration - weight penalty';
  }
}

export interface MotorcycleProfile {
  id: string;
  selected_motorcycle_id: string;
  selected_motorcycle?: MotorcycleModel;
  saved_at: string;
}

export const DEFAULT_MOTORCYCLE: MotorcycleModel = {
  id: 'generic-250cc',
  brand: 'Generic',
  model: '250cc Dirt Bike',
  year: 2024,
  engineCC: 250,
  torque_ft_lbs: 19.0,
  weight_lbs: 220,
  horsepower: 28.0,
  type: 'Motocross',
  description: 'Standard 250cc reference bike',
};
