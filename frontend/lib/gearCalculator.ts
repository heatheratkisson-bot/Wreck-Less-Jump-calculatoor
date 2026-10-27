export interface GearSpeedInput {
  engineRpm: number;
  frontSprocketTeeth: number;
  rearSprocketTeeth: number;
  primaryReduction: number;
  gearRatios: number[];
  rearWheelCircumferenceInches: number;
}

export interface GearSpeedResult {
  gear: number;
  overallReduction: number;
  speedMph: number;
  speedKph: number;
}

export function calculateGearSpeeds(input: GearSpeedInput): GearSpeedResult[] {
  const values = [
    input.engineRpm,
    input.frontSprocketTeeth,
    input.rearSprocketTeeth,
    input.primaryReduction,
    input.rearWheelCircumferenceInches,
    ...input.gearRatios,
  ];

  if (
    values.some((value) => !Number.isFinite(value) || value <= 0) ||
    input.gearRatios.length === 0 ||
    !Number.isInteger(input.frontSprocketTeeth) ||
    !Number.isInteger(input.rearSprocketTeeth)
  ) {
    throw new Error('Enter positive sprocket, gear ratio, RPM, and wheel circumference values.');
  }

  const finalDriveRatio = input.rearSprocketTeeth / input.frontSprocketTeeth;
  return input.gearRatios.map((gearRatio, index) => {
    const overallReduction = input.primaryReduction * gearRatio * finalDriveRatio;
    const wheelRpm = input.engineRpm / overallReduction;
    const speedMph = (wheelRpm * input.rearWheelCircumferenceInches * 60) / 63360;

    return {
      gear: index + 1,
      overallReduction,
      speedMph,
      speedKph: speedMph * 1.609344,
    };
  });
}
