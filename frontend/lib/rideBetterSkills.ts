import type { Ionicons } from '@expo/vector-icons';

export type Lesson = {
  title: string;
  body: string;
};

export type SkillCategoryId =
  | 'body-position'
  | 'standing-seated'
  | 'throttle-control'
  | 'braking-control'
  | 'shifting-clutch'
  | 'cornering'
  | 'berms'
  | 'flat-turns'
  | 'ruts'
  | 'whoops'
  | 'jumping-landings'
  | 'air-control'
  | 'step-up'
  | 'step-down'
  | 'jump-combinations'
  | 'starts'
  | 'hill-climbs'
  | 'sand'
  | 'mud'
  | 'rocky-terrain';

export type SkillCategory = {
  id: SkillCategoryId;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  overview: string;
  lessons: Lesson[];
  sources: string[];
};

export const SKILL_SOURCES: Record<string, { title: string; url: string }> = {
  msf: {
    title: 'Motorcycle Safety Foundation — DirtBike School training',
    url: 'https://msf-usa.org/start-your-ride/dirtbike-school/',
  },
  body: {
    title: 'MXA Speed Secrets — Body Position & Bike Handling',
    url: 'https://motocrossactionmag.com/speed-secrets-body-position-the-art-of-bike-handling/',
  },
  braking: {
    title: 'MXA Speed Secrets — Effective Braking',
    url: 'https://motocrossactionmag.com/speed-secrets-how-to-master-effective-braking/',
  },
  shifting: {
    title: 'MXA — Things to Know About Shifting',
    url: 'https://motocrossactionmag.com/ten-things-you-need-to-know-about-about-shifting/',
  },
  cornering: {
    title: 'MXA — The Fine Art of Cornering',
    url: 'https://motocrossactionmag.com/the-fine-art-of-cornering/',
  },
  ruts: {
    title: 'MXA — Mastering Deep Ruts in Motocross',
    url: 'https://motocrossactionmag.com/ten-things-about-mastering-deep-ruts/',
  },
  whoops: {
    title: 'MXA — Things to Know About Mastering Whoops',
    url: 'https://motocrossactionmag.com/ten-things-you-need-to-know-about-mastering-whoops/',
  },
  starts: {
    title: 'MXA — Things to Know About Getting the Perfect Start',
    url: 'https://motocrossactionmag.com/ten-things-about-starts/',
  },
  jump: {
    title: 'MXA — How to Jump Like Travis Baker',
    url: 'https://motocrossactionmag.com/video-how-to-jump-like-travis-baker-its-the-landing-thats-the-hard-part/',
  },
  berm: {
    title: 'MXA — James Stewart and Ryan Villopoto on Berms',
    url: 'https://motocrossactionmag.com/see-james-stewart-blow-up-berms-ryan-villopoto-dissect-glen-helen-and-scrubs-galore/',
  },
  sand: {
    title: 'MXA — Stefan Everts Training and Racing Techniques',
    url: 'https://motocrossactionmag.com/mxa-product-test-stefan-everts-mx-training-and-racing-techniques-dvd/',
  },
  mud: {
    title: 'MXA — Setting Up Suspension for Mud',
    url: 'https://motocrossactionmag.com/bare-bones-setting-up-your-suspension-for-mud/',
  },
  startGrates: {
    title: 'MXA — Starting on Metal Grates',
    url: 'https://motocrossactionmag.com/ten-things-you-need-to-know-about-starting-on-metal-grates/',
  },
};

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'body-position',
    title: 'Body Position & Balance',
    subtitle: 'Stay balanced as the bike and terrain change',
    icon: 'body',
    color: '#A6D608',
    overview:
      'Rider posture is dynamic: terrain, braking, acceleration, and turning all move the bike-rider balance point. Pro-level technique is not one fixed pose; it is the ability to stay relaxed, centered, and ready to move while keeping the bike controlled.',
    lessons: [
      {
        title: 'Build a neutral base',
        body:
          'With a coach watching, practice a relaxed standing position on flat, open ground at walking pace. Keep elbows comfortably bent, knees soft, eyes up, and hands light. Let your legs absorb small movements instead of locking your arms or gripping the bars tightly.',
      },
      {
        title: 'Move with the task',
        body:
          'The MXA body-position feature emphasizes that posture changes with terrain and forces. Treat that as a cue to make small, deliberate adjustments: stay mobile, avoid hanging far behind or crowding the bars, and ask an instructor to explain the position that fits your bike and drill.',
      },
      {
        title: 'Try a simple feedback drill',
        body:
          'At a permitted beginner practice area, ride a short, flat loop at a pace where you can stop easily. Ask a coach or trusted observer to check your head and shoulders, relaxed grip, and foot placement. Change one thing at a time; stop if control or comfort declines.',
      },
    ],
    sources: ['msf', 'body'],
  },
  {
    id: 'standing-seated',
    title: 'Standing and Seated Transitions',
    subtitle: 'Change riding positions smoothly and intentionally',
    icon: 'swap-vertical',
    color: '#82B6FF',
    overview:
      'Standing and sitting are tools, not badges of speed. Smooth transitions help a rider adapt to turns, bumps, and straights without sudden weight shifts. Track shape, bike setup, visibility, and rider skill determine when a position change is useful.',
    lessons: [
      {
        title: 'Make transitions gradual',
        body:
          'On level ground and at low speed, practice moving from a relaxed seated posture to standing while keeping your head steady and grip light. Avoid pulling on the bars to lift yourself; use legs and a controlled shift of the hips. Have an instructor check your foot position.',
      },
      {
        title: 'Plan position before the feature',
        body:
          'Look far enough ahead to decide whether you need to sit, stand, or remain neutral before reaching a corner or rough patch. Last-second movement can disturb balance. Choose an easy section with room to slow down and repeat only when the track is clear.',
      },
      {
        title: 'Use posture to absorb, not fight',
        body:
          'A little flex through ankles, knees, and elbows lets the suspension work while you stay connected to the bike. Do not lock your joints or hold one rigid race pose everywhere. Ask a coach to adapt the drill to your height, motorcycle, and the terrain.',
      },
    ],
    sources: ['msf', 'body'],
  },
  {
    id: 'throttle-control',
    title: 'Throttle Control',
    subtitle: 'Practice smooth, measured power inputs',
    icon: 'speedometer',
    color: '#E8B86D',
    overview:
      'Throttle response varies between motorcycles and surfaces. Smooth, predictable inputs make it easier to feel traction and maintain balance; abrupt opening or closing can unsettle the chassis. There is no universal throttle recipe for every obstacle.',
    lessons: [
      {
        title: 'Learn the response of your bike',
        body:
          'With an instructor, use a flat, open practice area to explore gentle acceleration and deceleration at walking pace. Keep your wrist aligned so you can roll the grip without straining. Pay attention to how the engine responds, and stop if the bike surges or you feel tense.',
      },
      {
        title: 'Aim for smoothness before speed',
        body:
          'Repeat short, straight passes using small, progressive changes rather than repeated stabs at the throttle. A coach can watch whether your body stays balanced and whether the rear tire remains composed. Increase complexity only after the same controlled response is repeatable.',
      },
      {
        title: 'Avoid copying an expert’s settings',
        body:
          'Professional riders use equipment, fitness, and track conditions that may be very different from yours. Their footage can help you notice smoothness and timing, but it does not establish a safe speed or input for your motorcycle. Use the manufacturer’s setup guidance and qualified coaching.',
      },
    ],
    sources: ['msf', 'body'],
  },
  {
    id: 'braking-control',
    title: 'Braking Control',
    subtitle: 'Develop measured braking on predictable ground',
    icon: 'hand-left',
    color: '#FF7A86',
    overview:
      'Motocross braking articles from MXA discuss planning braking points and adapting to the surface. For learning, the priority is controlled stopping—not racing deeper into turns. Traction, slope, and posture change quickly, so build the skill at a pace that leaves a clear margin.',
    lessons: [
      {
        title: 'Start with straight-line stops',
        body:
          'On a flat, clear area, have a qualified instructor demonstrate how to apply the controls smoothly on your specific bike. Practice from a low speed with generous run-out. Keep your eyes up, arms relaxed, and motorcycle upright; do not practice emergency stops in traffic or a crowded track.',
      },
      {
        title: 'Notice changing traction',
        body:
          'Loose soil, wet clay, sand, ruts, and slopes all change how the brakes feel. Work on one familiar surface before progressing, and stop if the tire slides or the bike becomes unstable. Do not assume a technique from a dry track transfers to a different surface.',
      },
      {
        title: 'Separate braking and turning as you learn',
        body:
          'A beginner drill is to slow down before a broad, easy turn, then roll through it without abrupt corrections. This builds planning and feel before adding combined inputs. Advanced braking and brake slides should be learned in person with an instructor, never from text alone.',
      },
    ],
    sources: ['msf', 'braking'],
  },
  {
    id: 'shifting-clutch',
    title: 'Shifting & Clutch Use',
    subtitle: 'Coordinate gear changes with smooth control',
    icon: 'settings',
    color: '#B79CFF',
    overview:
      'Gear choice affects engine response, deceleration, and how settled the motorcycle feels. MXA’s shifting guide highlights that motorcycles differ and that rider inputs can influence chassis behavior. Start by learning your own bike’s controls and manufacturer guidance.',
    lessons: [
      {
        title: 'Practice shifts on a straight',
        body:
          'In a permitted open area, ask a coach to guide low-speed upshifts and downshifts on a straight line. Keep both feet secure except for the small movement needed to shift, and keep your eyes ahead. Avoid staring down at the gear lever while moving.',
      },
      {
        title: 'Use the clutch deliberately',
        body:
          'Learn the clutch’s engagement point while stationary and then at walking pace with an instructor. Use small, repeatable movements rather than holding or snapping the lever without a reason. Excessive slipping can overheat and wear the clutch; follow the owner’s manual.',
      },
      {
        title: 'Choose a gear before a feature',
        body:
          'Look ahead and plan a gear that gives predictable response before reaching a corner or rough section. Avoid hurried shifts while the bike is unsettled. Race starts and advanced clutch techniques should be practiced only with a coach, controlled space, and track rules in mind.',
      },
    ],
    sources: ['msf', 'shifting'],
  },
  {
    id: 'cornering',
    title: 'Cornering Fundamentals',
    subtitle: 'See the turn early and build a repeatable line',
    icon: 'navigate',
    color: '#8BD6A7',
    overview:
      'Cornering combines vision, line choice, balance, traction, and speed selection. Professional race lines are shaped by the track and competition; a new rider should prioritize a clear view and a controlled exit rather than copying a pro’s pace or exact body position.',
    lessons: [
      {
        title: 'Walk and observe the turn',
        body:
          'Before practicing, inspect the corner from a safe place. Look for loose soil, ruts, blind exits, crossing traffic, and the safest path around it. Watch the track flow and follow venue direction; never stop on the riding line to plan your approach.',
      },
      {
        title: 'Use vision to plan',
        body:
          'With a coach on a broad beginner turn, practice looking through the turn toward a safe exit instead of fixating on the front tire. Select a conservative line with room to correct. Keep the pace slow enough to stop before the feature if something changes.',
      },
      {
        title: 'Keep inputs calm',
        body:
          'Learn to approach at a manageable speed and avoid abrupt throttle or brake changes while leaned over. Work on one consistent turn at a time before trying tighter lines or faster entries. MXA’s pro-rider features are useful to observe, not a substitute for coached practice.',
      },
    ],
    sources: ['msf', 'cornering', 'body'],
  },
  {
    id: 'berms',
    title: 'Berms',
    subtitle: 'Read the bank and leave room for the exit',
    icon: 'trending-up',
    color: '#A6D608',
    overview:
      'A berm is a built-up bank that can support a turn, but its shape, rutting, and condition change throughout a session. MXA’s pro footage shows how differently elite riders use berms; beginners should first learn to identify a smooth, open line at low speed.',
    lessons: [
      {
        title: 'Check the berm before riding it',
        body:
          'From a safe position, look at its height, firmness, rut depth, approach, and exit visibility. Avoid a berm with a collapsing edge, hidden traffic, or people nearby. Ask the track marshal which direction is in use and whether that feature is appropriate for beginners.',
      },
      {
        title: 'Practice a wide, easy arc',
        body:
          'With coaching, approach a low, broad berm slowly and trace a predictable path that leaves an open exit. Keep your eyes toward the exit and avoid sudden steering or throttle changes. Repeat only while the section is clear and your posture remains relaxed.',
      },
      {
        title: 'Do not chase the fastest line',
        body:
          'A pro may use the berm face, a rut, or a high line depending on race conditions. Those lines can be steep, unpredictable, or occupied. Build confidence on simple terrain first and never stop in a berm or on the landing/exit path.',
      },
    ],
    sources: ['msf', 'berm', 'cornering'],
  },
  {
    id: 'flat-turns',
    title: 'Flat Turns',
    subtitle: 'Manage a turn without a raised bank',
    icon: 'return-down-forward',
    color: '#82B6FF',
    overview:
      'A flat turn provides less physical support than a berm, so traction and balance matter. Surface moisture, loose material, and camber can make the same corner feel different lap to lap. Learn to read conditions and choose a modest line before trying to carry more speed.',
    lessons: [
      {
        title: 'Assess grip and visibility',
        body:
          'Walk or observe the corner safely. Notice dust, loose marbles, polished soil, puddles, and any off-camber slope. Identify a clear exit and a place to slow before entering. If the surface is changing or the exit is blind, select another route or wait.',
      },
      {
        title: 'Practice smooth arcs',
        body:
          'Under instruction, use a wide flat turn at low speed and focus on looking through it, relaxed arms, and gradual steering. Avoid sudden braking or throttle snaps while leaned. Stop if the tires slide or your line carries you toward the edge.',
      },
      {
        title: 'Build consistency before speed',
        body:
          'Repeat the same easy line and ask for feedback on where you look and when you begin turning. Change one variable at a time. Do not rely on a generic “lean more” or “give it more gas” tip; the right response depends on grip and rider level.',
      },
    ],
    sources: ['msf', 'cornering', 'body'],
  },
  {
    id: 'ruts',
    title: 'Ruts',
    subtitle: 'Read rut depth, shape, and exit before committing',
    icon: 'git-branch',
    color: '#E8B86D',
    overview:
      'Ruts can guide the front wheel, but they also constrain steering and vary in depth and shape. MXA’s rut feature discusses looking ahead, smoothness, and balance, and references techniques used by experienced racers. Those advanced cues are not a reason to force a rut beyond your level.',
    lessons: [
      {
        title: 'Choose a beginner-friendly rut',
        body:
          'Observe the rut from outside the track. Look for a shallow, continuous groove with a visible exit and no crossing traffic. Avoid deep, sharp, wet, or abruptly ending ruts until an instructor has assessed them and you have developed basic balance.',
      },
      {
        title: 'Keep your focus ahead',
        body:
          'In a coached low-speed drill, look toward the end of the groove rather than staring at the front wheel. Keep your hands relaxed and maintain a posture that allows the bike to move slightly underneath you. A coach should demonstrate foot placement for your bike and the terrain.',
      },
      {
        title: 'Do not force the line',
        body:
          'If the rut tightens, becomes deeper, or the bike starts to deflect, do not yank the bars or make an abrupt correction. Practice choosing a safer adjacent line and stopping in a designated safe area. Avoid advanced braking or throttle techniques without in-person instruction.',
      },
    ],
    sources: ['msf', 'ruts', 'body'],
  },
  {
    id: 'whoops',
    title: 'Whoops',
    subtitle: 'Understand repeated bumps and when to bypass them',
    icon: 'trail-sign',
    color: '#FF7A86',
    overview:
      'Whoops are repeated bumps with speed-sensitive behavior and high consequences for a mistake. MXA’s professional-rider coverage describes techniques for race-level sections; beginners should treat whoops as an advanced feature and learn first on small, predictable terrain with coaching.',
    lessons: [
      {
        title: 'Inspect from a safe location',
        body:
          'Observe the full section, including its entry, spacing, depth, surface, exit, and visibility. Watch how the section changes as riders pass. Ask a coach or marshal whether there is an approved beginner bypass. Never stand in or near the riding line.',
      },
      {
        title: 'Build fundamentals elsewhere',
        body:
          'Develop standing balance, vision, and smooth control on flat ground and small rollers before attempting whoops. An instructor should select a suitable first exercise and evaluate the bike setup and rider readiness. Do not imitate a pro’s entry speed, gear, or body posture.',
      },
      {
        title: 'Skip the section when unsure',
        body:
          'If the bumps are large, blind, crowded, deteriorating, or beyond your ability, take the bypass or sit out. Do not stop in the approach or exit. A calculator speed estimate does not determine a safe speed for whoops or any track feature.',
      },
    ],
    sources: ['msf', 'whoops'],
  },
  {
    id: 'jumping-landings',
    title: 'Jumping & Landings',
    subtitle: 'Learn feature assessment and progression before airtime',
    icon: 'airplane',
    color: '#B79CFF',
    overview:
      'Jump shape, takeoff condition, speed, suspension, wind, rider position, and landing geometry all affect flight. Even professional coverage stresses how demanding landings are. This guide focuses on preparation and progression; it does not prescribe a speed or guarantee a safe jump.',
    lessons: [
      {
        title: 'Inspect the entire feature',
        body:
          'From a safe place, assess the approach, lip, sight line, landing, and run-out. Check whether other riders can enter the landing zone unseen. Follow track rules and ask a qualified coach or marshal if the feature is suitable for your experience.',
      },
      {
        title: 'Progress from flat-ground skills',
        body:
          'Develop controlled riding, body position, and braking under instruction before using even small jumps. A coach should choose the progression and check that the landing is clear. Do not use calculator results, another rider’s pace, or video to set your speed.',
      },
      {
        title: 'Make the safe choice to roll or bypass',
        body:
          'If you cannot see the landing, the takeoff is damaged, the track is crowded, or you feel tired or unsure, skip it. Do not stop in the approach or landing zone. Learn any in-air response from a qualified instructor in person, not by experimenting over a jump.',
      },
    ],
    sources: ['msf', 'jump', 'body'],
  },
  {
    id: 'air-control',
    title: 'Air Control',
    subtitle: 'Understand bike pitch without guessing at corrections',
    icon: 'move',
    color: '#82B6FF',
    overview:
      'The bike can pitch or rotate in the air, and rider input may affect it. The safe response is highly situation-specific, so a generic throttle-versus-brake instruction can be misleading. Use professional videos as observation and seek direct coaching before attempting jumps.',
    lessons: [
      {
        title: 'Learn the concepts on the ground',
        body:
          'Ask a qualified motocross coach to explain body position, wheel rotation, and pitch while the bike is stationary or on flat ground. Do not test an unfamiliar correction in the air. Your motorcycle, jump shape, and landing situation all affect the outcome.',
      },
      {
        title: 'Watch with a learning goal',
        body:
          'When viewing professional riders, focus on preparation, smooth posture, and consistency rather than trying to copy their mid-air inputs. Elite riders use practiced techniques and controlled tracks. Video cannot tell you whether your own speed, line, or landing is safe.',
      },
      {
        title: 'Keep the progression supervised',
        body:
          'Only practice after a coach confirms readiness and selects an appropriate training feature. Check the landing and surrounding traffic before each pass. If the bike or track feels different, do not try an improvised correction; roll away or stop safely as instructed.',
      },
    ],
    sources: ['msf', 'jump'],
  },
  {
    id: 'step-up',
    title: 'Step-up Jumps',
    subtitle: 'Assess an elevated landing with a coach',
    icon: 'arrow-up-circle',
    color: '#A6D608',
    overview:
      'A step-up landing is higher than its takeoff, which can hide the landing surface and change the required trajectory. A magazine feature or pro video may show the obstacle, but it cannot establish your readiness or a safe approach speed.',
    lessons: [
      {
        title: 'Check sight lines and landing space',
        body:
          'Observe the feature from a protected viewing point. Determine whether the landing is fully visible and whether riders can appear from another line. Ask the venue staff and a qualified coach about the intended route and beginner alternatives.',
      },
      {
        title: 'Build a progression with an instructor',
        body:
          'Develop basic control on flat ground and smaller, familiar features first. A coach should assess the step-up, your bike, and your experience, then decide whether it belongs in your progression. Never add speed because an estimate or another rider suggests it.',
      },
      {
        title: 'Respect the landing zone',
        body:
          'Do not gather, stop, or walk in the approach or landing zone. If the landing is obscured, occupied, or changing, skip the feature. Follow track flags and wait until the course is clear before riding.',
      },
    ],
    sources: ['msf', 'jump'],
  },
  {
    id: 'step-down',
    title: 'Step-down Jumps',
    subtitle: 'Account for a lower landing and changing visibility',
    icon: 'arrow-down-circle',
    color: '#FF7A86',
    overview:
      'A step-down lands lower than the takeoff and can create a longer flight or a visually deceptive gap. The landing may be difficult to see from the approach. Treat it as an advanced feature that requires a track-specific coach assessment.',
    lessons: [
      {
        title: 'Look beyond the lip',
        body:
          'From a safe location, identify the full landing, run-out, surface, and any blind spots. Do not rely on a view from the takeoff alone. Ask the marshal about current conditions, track direction, and any restrictions on the feature.',
      },
      {
        title: 'Do not calculate your way into it',
        body:
          'The app’s jump estimate cannot model every track condition, suspension setting, wind, rider input, or traffic conflict. It is not a launch-speed recommendation. Only a qualified instructor can assess a rider and feature in person.',
      },
      {
        title: 'Choose a conservative alternative',
        body:
          'If the landing is not clear or you have not been coached on this kind of feature, use a marked bypass or sit it out. Never stop in the landing area, and do not follow another rider into a feature without seeing that it is clear.',
      },
    ],
    sources: ['msf', 'jump'],
  },
  {
    id: 'jump-combinations',
    title: 'Doubles & Jump Combinations',
    subtitle: 'Recognize linked features as advanced track hazards',
    icon: 'albums',
    color: '#E8B86D',
    overview:
      'Doubles and linked jump combinations require judging multiple takeoffs and landings with little time to reassess. A missed or obscured landing can create immediate danger for following riders. This topic is about recognition and coaching, not instructions for clearing a gap.',
    lessons: [
      {
        title: 'Read both sides of the combination',
        body:
          'Observe the entry, each takeoff, every landing, and the next section from a safe place. Check whether riders can see one another and whether a bypass exists. Ask a coach or marshal to identify beginner-appropriate options.',
      },
      {
        title: 'Build skills in separate steps',
        body:
          'Work with a qualified instructor on basic control and smaller individual features before considering linked obstacles. The coach should decide when and how to progress based on your ability and current track conditions. Do not infer a gap or speed from a photo.',
      },
      {
        title: 'Never stop between features',
        body:
          'The space between jumps is not a safe place to wait or observe. If the section is crowded, unclear, or beyond your level, stay off the feature and use the designated safe route. Keep spectators and equipment away from landings.',
      },
    ],
    sources: ['msf', 'jump'],
  },
  {
    id: 'starts',
    title: 'Starts',
    subtitle: 'Practice race starts in a designated, controlled area',
    icon: 'flag',
    color: '#8BD6A7',
    overview:
      'Starts combine traction, reaction, balance, clutch, and nearby riders. MXA’s start coverage discusses pro race preparation, but a start gate can be hazardous and equipment differs. Practice only where the venue permits, with supervision and no one in the launch path.',
    lessons: [
      {
        title: 'Learn the gate and rules first',
        body:
          'Ask the track staff how the gate works, where the start area ends, and when practice is allowed. Check for traction changes, ruts, and other riders. Never start in the general riding area or while people are standing ahead or alongside the motorcycle.',
      },
      {
        title: 'Rehearse controls without racing',
        body:
          'With a coach, practice stationary setup and low-speed starts in a clear designated area. Focus on a calm posture and familiar control operation rather than the holeshot. The right gear and clutch setup vary by bike, surface, and rider.',
      },
      {
        title: 'Leave advanced starts to coaching',
        body:
          'Holeshot devices, timing tricks, and high-traction launch techniques are equipment- and rule-dependent. Do not copy a professional’s exact setup from a video. Ask your coach and read the device and motorcycle manuals before using specialized equipment.',
      },
    ],
    sources: ['msf', 'starts', 'startGrates'],
  },
  {
    id: 'hill-climbs',
    title: 'Hill Climbs',
    subtitle: 'Evaluate the slope, surface, and safe exit first',
    icon: 'trending-up',
    color: '#B79CFF',
    overview:
      'A hill can hide the top, loose rocks, drop-offs, other riders, and a safe route down. A climb that is manageable in one direction or surface condition may not be safe later. Do not attempt unknown slopes or follow a rider whose path you cannot see.',
    lessons: [
      {
        title: 'Inspect the full route before moving',
        body:
          'From a safe position, confirm the top and exit are visible, the route is permitted, and no one is descending or crossing. Check the surface for erosion, loose material, and obstacles. If you cannot inspect the whole line, choose another route.',
      },
      {
        title: 'Build control on gentle ground',
        body:
          'Practice gradual starts and stops on mild, open slopes only under qualified instruction. Learn how your motorcycle behaves and how to turn around or stop safely before increasing difficulty. Never practice with people below the bike or in the run-out.',
      },
      {
        title: 'Know when to turn back',
        body:
          'Do not continue if traction, visibility, fatigue, or confidence deteriorates. Avoid stopping where you may slide or block other riders; follow the venue’s guidance for the safest way to exit. If unsure, dismount only when the bike is stable and the area is safe.',
      },
    ],
    sources: ['msf', 'body'],
  },
  {
    id: 'sand',
    title: 'Sand Riding',
    subtitle: 'Expect the surface to move and change your line',
    icon: 'water',
    color: '#E8B86D',
    overview:
      'Sand can rut, shift, and increase rider effort quickly. Professional-rider footage from MXA, including Stefan Everts training material, is useful for observing relaxed movement, but deep sand technique is demanding. Start with a shallow, familiar section and direct coaching.',
    lessons: [
      {
        title: 'Read depth and traffic',
        body:
          'Observe whether the sand is shallow or deep, where it has piled up, and how riders are entering and exiting. Look for hidden hard edges, rocks, and cross-traffic. Pick a short section with generous space and ask a coach if it is appropriate.',
      },
      {
        title: 'Prioritize relaxed control',
        body:
          'In a coached beginner drill, focus on looking ahead, keeping a comfortable grip, and allowing the motorcycle to move without fighting every small wiggle. Use smooth inputs and a manageable pace. Do not chase the speed or posture seen in pro footage.',
      },
      {
        title: 'Adjust the session, not just the technique',
        body:
          'Sand is physically demanding and can hide fatigue. Take breaks, hydrate, and stop if your arms tighten or attention fades. Tire pressure, suspension, and engine setup should follow manufacturer guidance and qualified shop advice—not a universal setting.',
      },
    ],
    sources: ['msf', 'sand', 'body'],
  },
  {
    id: 'mud',
    title: 'Mud & Wet Conditions',
    subtitle: 'Adapt to reduced and unpredictable traction',
    icon: 'rainy',
    color: '#82B6FF',
    overview:
      'Mud changes grip, visibility, braking, and bike weight as it accumulates. MXA’s suspension feature shows that setup considerations are condition-specific, not a single magic adjustment. For many riders, the safest skill is deciding not to ride when conditions exceed their experience.',
    lessons: [
      {
        title: 'Inspect before entering',
        body:
          'Look for standing water, slick clay, deep ruts, hidden holes, and poor visibility. Ask the venue whether the track is open and what direction or sections are closed. Avoid unknown puddles and areas where a fallen rider could be hidden from approaching traffic.',
      },
      {
        title: 'Keep the practice simple',
        body:
          'If the venue is open and an instructor approves, choose a low-speed, broad area and focus on smooth control with room to stop. Traction can disappear suddenly, so avoid abrupt inputs and crowded lines. Stop if the bike begins to pack with mud or feels unstable.',
      },
      {
        title: 'Check equipment after the session',
        body:
          'Mud can add weight and interfere with brakes, controls, cooling, and visibility. Stop in a safe place and inspect the motorcycle before continuing. Follow the owner’s manual for cleaning and maintenance; ask a qualified mechanic about any concern.',
      },
    ],
    sources: ['msf', 'mud'],
  },
  {
    id: 'rocky-terrain',
    title: 'Rocky & Uneven Terrain',
    subtitle: 'Spot loose obstacles and choose a manageable line',
    icon: 'triangle',
    color: '#FF7A86',
    overview:
      'Rocks can deflect wheels, damage tires, and hide sharp edges or holes. Motocross and off-road motorcycles may have very different protection and tire setups. Learn on a permitted, easy route with instruction; do not assume a motocross track setup is suitable for rocky trails.',
    lessons: [
      {
        title: 'Scan the route and escape options',
        body:
          'From a safe position, look for loose and embedded rocks, blind turns, drop-offs, and oncoming riders. Choose a line you can see through, with a safe place to stop. If the route disappears over a rise or around a bend, do not enter blindly.',
      },
      {
        title: 'Practice low-speed balance',
        body:
          'On a legal, beginner-friendly area, ask an instructor to coach slow riding and stopping over small, predictable irregularities. Keep your eyes ahead and avoid grabbing at the controls when a tire deflects. Do not practice near cliffs, traffic, or spectators.',
      },
      {
        title: 'Inspect tires and protection',
        body:
          'Use equipment appropriate to the motorcycle and terrain, as specified by the manufacturer or a qualified shop. Before and after riding, inspect tires, rims, controls, and protective components. Stop if anything is damaged, loose, or handling unexpectedly.',
      },
    ],
    sources: ['msf', 'body'],
  },
];
