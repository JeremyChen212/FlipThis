// All the knobs for the prototype live here. Swap loops, codes or timings
// without touching the components.

export const BPM = 130;
export const KEY_LABEL = 'B MIN';
export const BARS = 16;
/** Source loops repeat every eight bars within the arrangement. */
export const LOOP_BARS = 8;
export const STEPS = 8;
/** Seconds in one bar at the project tempo. */
export const BAR_SECONDS = (60 / BPM) * 4;

export const ROOM_ID = process.env.NEXT_PUBLIC_ROOM_ID || 'demo';
export const BATTLE_NAME = 'Battle 07 · Golden Hour';
export const SAMPLE_FILE_LABEL = 'cloud_rap_vocal_chop.wav';

/** Optional link to the feedback survey, shown at the end. */
export const SURVEY_URL = process.env.NEXT_PUBLIC_SURVEY_URL || '';

/** How many changes a player may make to their partner's beat in Flip Back. */
export const FLIP_EDIT_LIMIT = 3;
/** The sample lane must be used in at least this many bars before submitting. */
export const MIN_SAMPLE_BARS = 2;

export const PHASE_MINUTES: Partial<Record<Phase, number>> = {
  taste: 2,
  studio: 6,
  vote: 3,
  flipback: 3,
  teamup: 2,
};

export type Phase = 'lobby' | 'taste' | 'studio' | 'vote' | 'reveal' | 'flipback' | 'teamup' | 'done';
export const PHASES: Phase[] = ['lobby', 'taste', 'studio', 'vote', 'reveal', 'flipback', 'teamup', 'done'];
export const PHASE_LABELS: Record<Phase, string> = {
  lobby: 'Lobby',
  taste: 'Taste Drop',
  studio: 'Flip',
  vote: 'Vote',
  reveal: 'Reveal',
  flipback: 'Flip Back',
  teamup: 'Team Up',
  done: 'Crews',
};

export type LaneId = 'sample' | 'chords' | 'melody' | 'bass' | 'fx';
export interface LaneDef { id: LaneId; label: string; color: string; tint: string }
export const LANES: LaneDef[] = [
  { id: 'sample', label: 'Sample', color: '#F49A7A', tint: '#FDE5DA' },
  { id: 'chords', label: 'Chords', color: '#8EA6F2', tint: '#E3E9FD' },
  { id: 'melody', label: 'Melody', color: '#B6A4E6', tint: '#EDE7FA' },
  { id: 'bass', label: 'Bass', color: '#7CCB9E', tint: '#DDF2E5' },
  { id: 'fx', label: 'FX', color: '#E6C36A', tint: '#FBF1D6' },
];

export interface LoopDef { id: string; lane: LaneId; name: string; file: string; bank: BankId | 'shared' }

export type BankId = 'peach' | 'sky' | 'mint' | 'lilac';
const L = (id: string, lane: LaneId, name: string, bank: BankId | 'shared'): LoopDef => ({
  id, lane, name, bank, file: `/audio/loops/${id}.wav`,
});

/** Shared by everyone: the battle sample and two variations of it. */
export const SHARED_LOOPS: LoopDef[] = [
  L('shared_vox_chop', 'sample', 'Vocal chop', 'shared'),
  L('shared_vox_reverse', 'sample', 'Chop reversed', 'shared'),
  L('shared_vox_lofi', 'sample', 'Chop lo-fi', 'shared'),
];

export interface BankDef { id: BankId; label: string; color: string; tint: string; loops: LoopDef[] }
export const BANKS: Record<BankId, BankDef> = {
  peach: {
    id: 'peach', label: 'Cloud bank', color: '#F49A7A', tint: '#FDE5DA',
    loops: [
      L('peach_greentea_pad', 'chords', 'Greentea pad', 'peach'),
      L('peach_bell_arp', 'melody', 'Bell arp', 'peach'),
      L('peach_808', 'bass', '808', 'peach'),
      L('peach_vinyl', 'fx', 'Vinyl', 'peach'),
    ],
  },
  sky: {
    id: 'sky', label: 'Keys bank', color: '#8EA6F2', tint: '#E3E9FD',
    loops: [
      L('sky_rhodes', 'chords', 'Rhodes', 'sky'),
      L('sky_pluck_arp', 'melody', 'Pluck arp', 'sky'),
      L('sky_round_bass', 'bass', 'Round bass', 'sky'),
      L('sky_riser', 'fx', 'Riser', 'sky'),
    ],
  },
  mint: {
    id: 'mint', label: 'Strings bank', color: '#7CCB9E', tint: '#DDF2E5',
    loops: [
      L('mint_choir_pad', 'chords', 'Choir pad', 'mint'),
      L('mint_guitar_arp', 'melody', 'Guitar arp', 'mint'),
      L('mint_pulse_bass', 'bass', 'Pulse bass', 'mint'),
      L('mint_reverse_swell', 'fx', 'Reverse swell', 'mint'),
    ],
  },
  lilac: {
    id: 'lilac', label: 'Synth bank', color: '#B6A4E6', tint: '#EDE7FA',
    loops: [
      L('lilac_saw_pad', 'chords', 'Saw pad', 'lilac'),
      L('lilac_lead', 'melody', 'Lead', 'lilac'),
      L('lilac_slide_bass', 'bass', 'Slide bass', 'lilac'),
      L('lilac_downlifter', 'fx', 'Downlifter', 'lilac'),
    ],
  },
};

export const ALL_LOOPS: LoopDef[] = [...SHARED_LOOPS, ...Object.values(BANKS).flatMap((b) => b.loops)];
export const LOOP_BY_ID: Record<string, LoopDef> = Object.fromEntries(ALL_LOOPS.map((l) => [l.id, l]));

export type SlotId = 'p1' | 'p2' | 'p3' | 'p4';
export interface SlotDef { id: SlotId; code: string; bank: BankId; color: string; defaultName: string }
/** The four join codes. Each code is one seat with its own sample bank. */
export const SLOTS: SlotDef[] = [
  { id: 'p1', code: 'PEACH', bank: 'peach', color: '#F49A7A', defaultName: 'Peach' },
  { id: 'p2', code: 'SKY', bank: 'sky', color: '#8EA6F2', defaultName: 'Sky' },
  { id: 'p3', code: 'MINT', bank: 'mint', color: '#7CCB9E', defaultName: 'Mint' },
  { id: 'p4', code: 'LILAC', bank: 'lilac', color: '#B6A4E6', defaultName: 'Lilac' },
];
export const SLOT_BY_ID: Record<SlotId, SlotDef> = Object.fromEntries(SLOTS.map((s) => [s.id, s])) as Record<SlotId, SlotDef>;
/** The facilitator code opens the host panel. */
export const HOST_CODE = process.env.NEXT_PUBLIC_HOST_CODE || 'HOST';

export type KitId = 'boombap' | 'trap' | 'lofi' | 'house';
export type DrumRow = 'kick' | 'snare' | 'hat' | 'clap';
export const DRUM_ROWS: { id: DrumRow; label: string; color: string }[] = [
  { id: 'kick', label: 'Kick', color: '#F49A7A' },
  { id: 'snare', label: 'Snare', color: '#8EA6F2' },
  { id: 'hat', label: 'Hi-hat', color: '#7CCB9E' },
  { id: 'clap', label: 'Clap', color: '#B6A4E6' },
];
export interface KitDef { id: KitId; label: string; groove: Record<DrumRow, number[]> }
export const KITS: KitDef[] = [
  { id: 'boombap', label: 'Boom-bap', groove: { kick: [1,0,0,1,1,0,0,0], snare: [0,0,1,0,0,0,1,0], hat: [1,0,1,0,1,0,1,0], clap: [0,0,0,0,0,0,0,0] } },
  { id: 'trap', label: 'Trap', groove: { kick: [1,0,0,0,0,1,0,0], snare: [0,0,0,0,1,0,0,0], hat: [1,1,1,1,1,1,1,1], clap: [0,0,0,0,1,0,0,0] } },
  { id: 'lofi', label: 'Lo-fi', groove: { kick: [1,0,0,0,1,0,1,0], snare: [0,0,1,0,0,0,1,0], hat: [1,0,1,0,1,0,1,1], clap: [0,0,0,0,0,0,0,0] } },
  { id: 'house', label: 'House', groove: { kick: [1,0,1,0,1,0,1,0], snare: [0,0,0,0,0,0,0,0], hat: [0,1,0,1,0,1,0,1], clap: [0,0,1,0,0,0,1,0] } },
];
export const drumFile = (kit: KitId, row: DrumRow) => `/audio/drums/${kit}_${row}.wav`;

export const VIBE_TAGS = ['chill', 'dark', 'bouncy', 'dreamy', 'hard', 'soulful', 'nostalgic', 'hype'];
