import { SvgXml } from 'react-native-svg';
import { mascotSvg, type Pose } from './mascotArt';

// Guaxi, the raccoon. pose: happy | cheer | lift | eat | sleep | sad | head (art in mascotArt.ts, PNGs in assets/mascot).
export function Mascot({ size = 72, pose = 'happy' }: { size?: number; pose?: Pose }) {
  return <SvgXml xml={mascotSvg(pose)} width={size} height={size} />;
}
