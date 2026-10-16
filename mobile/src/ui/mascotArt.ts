// Mascot "Guaxi" (raccoon) as plain SVG strings: one source for the in-app <Mascot/> (SvgXml) and the PNG export (scripts/export-mascot.mjs).
// Erasable TS only (no enums/namespaces) so node can import it directly.
export type Pose = 'happy' | 'cheer' | 'lift' | 'eat' | 'sleep' | 'sad' | 'head';
export const POSES: Pose[] = ['happy', 'cheer', 'lift', 'eat', 'sleep', 'sad', 'head'];

const FUR = '#A3ADBD', FUR_DK = '#7E8AA0', DARK = '#2F3A4F', LIGHT = '#F4F7FB', TEAL = '#0F9D8A', PINK = '#F59BAA';

const limb = (x1: number, y1: number, x2: number, y2: number) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${FUR_DK}" stroke-width="22" stroke-linecap="round"/>
   <path d="M${x1} ${y1}L${x2} ${y2}" stroke="${FUR}" stroke-width="17" stroke-linecap="round"/>
   <circle cx="${x2}" cy="${y2}" r="11.5" fill="${DARK}"/>`;

const tail = `<path d="M128 168C176 176 198 138 184 104C178 90 164 88 158 100C168 122 156 138 132 140Z" fill="${FUR}"/>
  <path d="M172 92C165 90 160 96 158 100C163 111 163 120 159 128L178 122C182 112 180 100 172 92Z" fill="${DARK}"/>
  <path d="M182 118C186 130 180 146 168 156L146 160C160 154 174 142 182 118Z" fill="${DARK}"/>`;

const body = `<ellipse cx="100" cy="152" rx="47" ry="40" fill="${FUR_DK}"/>
  <ellipse cx="100" cy="149" rx="47" ry="40" fill="${FUR}"/>
  <ellipse cx="100" cy="158" rx="29" ry="29" fill="${LIGHT}"/>
  <ellipse cx="72" cy="188" rx="19" ry="9" fill="${DARK}"/><ellipse cx="128" cy="188" rx="19" ry="9" fill="${DARK}"/>`;

const eyeOpen = (cx: number, look = 0, big = false) =>
  `<circle cx="${cx}" cy="88" r="${big ? 15 : 14}" fill="#fff"/>
   <circle cx="${cx + look}" cy="${big ? 91 : 90}" r="${big ? 9.5 : 8.5}" fill="#1A202C"/>
   <circle cx="${cx + look + 3}" cy="${big ? 87 : 86}" r="3.4" fill="#fff"/><circle cx="${cx + look - 3}" cy="${big ? 95 : 94}" r="1.6" fill="#fff"/>`;
const eyeHappy = (cx: number) => `<path d="M${cx - 12} 92Q${cx} 74 ${cx + 12} 92" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`;
const eyeClosed = (cx: number) => `<path d="M${cx - 12} 86Q${cx} 98 ${cx + 12} 86" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/>`;

const mouthSmile = `<path d="M86 121Q100 134 114 121" fill="none" stroke="${DARK}" stroke-width="4.5" stroke-linecap="round"/>`;
const mouthOpen = `<path d="M84 117Q100 148 116 117Z" fill="${DARK}" stroke="${DARK}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M91 134Q100 126 109 134Q100 143 91 134Z" fill="${PINK}"/>`;
const mouthSmall = `<ellipse cx="100" cy="126" rx="6" ry="4.5" fill="${DARK}"/>`;
const mouthSad = `<path d="M88 128Q100 118 112 128" fill="none" stroke="${DARK}" stroke-width="4.5" stroke-linecap="round"/>`;

const head = (eyes: string, mouth: string, extra = '') => `
  <circle cx="44" cy="42" r="21" fill="${FUR_DK}"/><circle cx="156" cy="42" r="21" fill="${FUR_DK}"/>
  <circle cx="45" cy="45" r="11" fill="${DARK}"/><circle cx="155" cy="45" r="11" fill="${DARK}"/>
  <ellipse cx="100" cy="90" rx="72" ry="56" fill="${FUR_DK}"/>
  <ellipse cx="100" cy="86" rx="72" ry="55" fill="${FUR}"/>
  <path d="M100 32L112 68H88Z" fill="${DARK}" stroke="${DARK}" stroke-width="6" stroke-linejoin="round"/>
  <ellipse cx="66" cy="90" rx="31" ry="23" transform="rotate(-10 66 90)" fill="${DARK}"/>
  <ellipse cx="134" cy="90" rx="31" ry="23" transform="rotate(10 134 90)" fill="${DARK}"/>
  <rect x="80" y="82" width="40" height="14" fill="${DARK}"/>
  <ellipse cx="100" cy="112" rx="36" ry="26" fill="${LIGHT}"/>
  ${eyes}
  <ellipse cx="100" cy="102" rx="10" ry="7" fill="${DARK}"/><ellipse cx="97" cy="100" rx="3.5" ry="2" fill="#fff" opacity=".7"/>
  ${mouth}
  <ellipse cx="42" cy="114" rx="11" ry="7" fill="${PINK}" opacity=".55"/><ellipse cx="158" cy="114" rx="11" ry="7" fill="${PINK}" opacity=".55"/>
  <path d="M30 60Q100 36 170 60L167 74Q100 52 33 74Z" fill="${TEAL}"/>
  <path d="M30 60Q100 36 170 60L169 64Q100 42 31 64Z" fill="#22B8A3"/>
  ${extra}`;

const zzz = `<g fill="none" stroke="${TEAL}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M150 34H168L150 54H168"/><path d="M174 10H186L174 24H186" stroke-width="4"/></g>`;
const tear = `<path d="M58 110Q52 122 58 128Q64 122 58 110Z" fill="#7DD3FC"/>`;
const sadBrows = `<g stroke="${DARK}" stroke-width="5" stroke-linecap="round"><path d="M48 70L80 62"/><path d="M152 70L120 62"/></g>`;

const apple = `<circle cx="146" cy="136" r="16" fill="#EF4444"/><circle cx="141" cy="131" r="5" fill="#fff" opacity=".35"/>
  <path d="M146 120Q146 114 150 111" stroke="#7C4A1E" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M150 116Q160 108 164 116Q156 122 150 116Z" fill="#22C55E"/>`;

const barbell = `<path d="M6 8H194" stroke="#475569" stroke-width="7" stroke-linecap="round"/>
  <rect x="14" y="-6" width="12" height="28" rx="4" fill="${DARK}"/><rect x="174" y="-6" width="12" height="28" rx="4" fill="${DARK}"/>
  <rect x="28" y="-1" width="9" height="18" rx="3" fill="#475569"/><rect x="163" y="-1" width="9" height="18" rx="3" fill="#475569"/>
  <circle cx="26" cy="10" r="11.5" fill="${DARK}"/><circle cx="174" cy="10" r="11.5" fill="${DARK}"/>`;

export function mascotSvg(pose: Pose = 'happy'): string {
  let arms = '', eyes = eyeOpen(66, 1) + eyeOpen(134, -1), mouth = mouthSmile, extra = '', post = '';
  switch (pose) {
    case 'happy': arms = limb(58, 140, 40, 172) + limb(146, 142, 182, 96); break;
    case 'cheer': arms = limb(56, 140, 20, 88) + limb(144, 140, 180, 88); eyes = eyeHappy(66) + eyeHappy(134); mouth = mouthOpen; break;
    case 'lift': arms = limb(60, 140, 26, 10) + limb(140, 140, 174, 10); mouth = mouthOpen; eyes = eyeOpen(66) + eyeOpen(134); post = barbell; break;
    case 'eat': arms = limb(58, 140, 40, 172) + limb(142, 142, 148, 134); mouth = mouthSmall; post = apple; eyes = eyeOpen(66, 3) + eyeOpen(134, 3); break;
    case 'sleep': arms = limb(58, 140, 40, 172) + limb(142, 140, 160, 172); eyes = eyeClosed(66) + eyeClosed(134); mouth = mouthSmall; extra = zzz; break;
    case 'sad': arms = limb(58, 140, 44, 174) + limb(142, 140, 156, 174); eyes = eyeOpen(66, 0, true) + eyeOpen(134, 0, true); mouth = mouthSad; extra = tear + sadBrows; break;
    case 'head': break;
  }
  const h = head(eyes, mouth, extra);
  const vb = pose === 'head' ? '18 18 164 134' : pose === 'lift' ? '0 -8 200 208' : '0 0 200 200';
  const inner = pose === 'head' ? h : tail + arms + body + h + post;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;
}
