import type { ImageSourcePropType } from 'react-native';
import type { SkillCategoryId } from '@/lib/rideBetterSkills';

export type SkillPhoto = {
  image: ImageSourcePropType;
  description: string;
  title: string;
  creator: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl?: string;
};

export const SKILL_PHOTOS: Record<SkillCategoryId, SkillPhoto> = {
  'body-position': {
    image: require('../assets/images/ride-better/motocross-corseul.jpg'),
    description: 'Motocross rider navigating a dirt track',
    title: 'Motocross-Corseul-15-08-2007-Teddy-Divet.jpg',
    creator: 'Roar Pettersen',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Motocross-Corseul-15-08-2007-Teddy-Divet.jpg',
    licenseName: 'Public domain',
  },
  'standing-seated': {
    image: require('../assets/images/ride-better/hawkstone-corner.jpg'),
    description: 'Motocross rider leaning through a corner',
    title: 'Hawkstone Park International Motocross 2017 (197201675).jpeg',
    creator: 'Michael Janik',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Hawkstone_Park_International_Motocross_2017_(197201675).jpeg',
    licenseName: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
  'throttle-control': {
    image: require('../assets/images/ride-better/motocross-corseul.jpg'),
    description: 'Motocross rider navigating a dirt track',
    title: 'Motocross-Corseul-15-08-2007-Teddy-Divet.jpg',
    creator: 'Roar Pettersen',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Motocross-Corseul-15-08-2007-Teddy-Divet.jpg',
    licenseName: 'Public domain',
  },
  'braking-control': {
    image: require('../assets/images/ride-better/billy-mackenzie.jpg'),
    description: 'Rider carving through a motocross corner',
    title: 'Billy Mackenzie GB Red Bull FIM Motocross of Nations 2008.jpg',
    creator: 'Mark',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Billy_Mackenzie_GB_Red_Bull_FIM_Motocross_of_Nations_2008.jpg',
    licenseName: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  'shifting-clutch': {
    image: require('../assets/images/ride-better/motocross-corseul.jpg'),
    description: 'Motocross rider navigating a dirt track',
    title: 'Motocross-Corseul-15-08-2007-Teddy-Divet.jpg',
    creator: 'Roar Pettersen',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Motocross-Corseul-15-08-2007-Teddy-Divet.jpg',
    licenseName: 'Public domain',
  },
  cornering: {
    image: require('../assets/images/ride-better/tanel-leok.jpg'),
    description: 'Tanel Leok riding through a motocross corner',
    title: 'Tanel Leok MX1 P3073143-e.jpg',
    creator: 'Mark',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Tanel_Leok_MX1_P3073143-e.jpg',
    licenseName: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  berms: {
    image: require('../assets/images/ride-better/hawkstone-corner.jpg'),
    description: 'Motocross rider leaning into a banked corner',
    title: 'Hawkstone Park International Motocross 2017 (197201675).jpeg',
    creator: 'Michael Janik',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Hawkstone_Park_International_Motocross_2017_(197201675).jpeg',
    licenseName: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
  'flat-turns': {
    image: require('../assets/images/ride-better/billy-mackenzie.jpg'),
    description: 'Rider carving through a motocross corner',
    title: 'Billy Mackenzie GB Red Bull FIM Motocross of Nations 2008.jpg',
    creator: 'Mark',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Billy_Mackenzie_GB_Red_Bull_FIM_Motocross_of_Nations_2008.jpg',
    licenseName: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  ruts: {
    image: require('../assets/images/ride-better/mud-racer.jpg'),
    description: 'Motocross rider on a deeply churned dirt track',
    title: 'Mud racer',
    creator: 'Christian Pichler',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mud_racer.jpg',
    licenseName: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
  },
  whoops: {
    image: require('../assets/images/ride-better/anaheim-supercross.jpg'),
    description: 'Supercross course with a sequence of dirt obstacles',
    title: 'Supercross in Anaheim, CA',
    creator: 'Patrick Woodward from Studio City, USA',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Supercross_in_Anaheim,_CA.jpg',
    licenseName: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  'jumping-landings': {
    image: require('../assets/images/ride-better/yyteri-jump-08.jpg'),
    description: 'Motocross rider airborne above a dirt jump',
    title: 'Motocross in Yyteri 2010 - 8.jpg',
    creator: 'kallerna',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Motocross_in_Yyteri_2010_-_8.jpg',
    licenseName: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  'air-control': {
    image: require('../assets/images/ride-better/stefan-everts.jpg'),
    description: 'Stefan Everts riding airborne in a motocross race',
    title: 'Stefan Everts WM2005.jpg',
    creator: 'RealMerlin',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Stefan_Everts_WM2005.jpg',
    licenseName: 'CC BY-SA 2.0 DE',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/de/deed.en',
  },
  'step-up': {
    image: require('../assets/images/ride-better/yyteri-jump-41.jpg'),
    description: 'Motocross rider jumping on an outdoor track',
    title: 'Motocross in Yyteri 2010 - 41.jpg',
    creator: 'kallerna',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Motocross_in_Yyteri_2010_-_41.jpg',
    licenseName: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  'step-down': {
    image: require('../assets/images/ride-better/motocross-jump-iceland.jpg'),
    description: 'Motocross rider airborne above a dirt jump in Iceland',
    title: 'Motocross jump 2008.jpg',
    creator: 'Dagur Brynjólfsson',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Motocross_jump_2008.jpg',
    licenseName: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
  },
  'jump-combinations': {
    image: require('../assets/images/ride-better/fmx-show.jpg'),
    description: 'Freestyle motocross riders performing an aerial jump',
    title: 'Pokazy FMX.jpg',
    creator: 'Bartek Muszyński',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Pokazy_FMX.jpg',
    licenseName: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  starts: {
    image: require('../assets/images/ride-better/toddington-start.jpg'),
    description: 'Riders launching at the start of a local motocross race',
    title: 'Motocross Start Toddington track.jpg',
    creator: 'Jonathan Benson',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Motocross_Start_Toddington_track.jpg',
    licenseName: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  'hill-climbs': {
    image: require('../assets/images/ride-better/belgium-hillclimb.jpg'),
    description: 'Motorcyclist climbing a steep, rocky hill',
    title: 'Hillclimbing Belgium2010 2.jpg',
    creator: 'Koneco',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hillclimbing_Belgium2010_2.jpg',
    licenseName: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  sand: {
    image: require('../assets/images/ride-better/matthias-walkner-sand.jpg'),
    description: 'Matthias Walkner riding across a sand dune',
    title: 'Matthias Walkner Action (132319763).jpeg',
    creator: 'Markus Berger',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Matthias_Walkner_Action_(132319763).jpeg',
    licenseName: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
  mud: {
    image: require('../assets/images/ride-better/mud-racer.jpg'),
    description: 'Motocross rider on a deeply churned dirt track',
    title: 'Mud racer.jpg',
    creator: 'Christian Pichler',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mud_racer.jpg',
    licenseName: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
  },
  'rocky-terrain': {
    image: require('../assets/images/ride-better/belgium-hillclimb.jpg'),
    description: 'Motorcyclist riding a rocky hill-climb course',
    title: 'Hillclimbing Belgium2010 2.jpg',
    creator: 'Koneco',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hillclimbing_Belgium2010_2.jpg',
    licenseName: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
};
