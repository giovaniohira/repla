import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SText } from 'react-native-svg';
import { c } from '@/theme';

const H = 160, PAD = { l: 38, r: 10, t: 10, b: 22 };

// Line chart with dots. `pts` are ordered; `labels` (same length) are shown under first/last point.
export function LineChart({ pts, labels, color = c.primary, unit = '' }: { pts: number[]; labels: string[]; color?: string; unit?: string }) {
  const [w, setW] = useState(0);
  const n = pts.length;
  if (!n) return null;
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const min = lo === hi ? lo - 1 : lo, max = lo === hi ? hi + 1 : hi;
  const pad = (max - min) * 0.15;
  const y0 = min - pad, y1 = max + pad;
  const X = (i: number) => PAD.l + (n === 1 ? (w - PAD.l - PAD.r) / 2 : (i / (n - 1)) * (w - PAD.l - PAD.r));
  const Y = (v: number) => PAD.t + (1 - (v - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${X(i)},${Y(v)}`).join(' ');
  const fmt = (v: number) => String(Math.round(v * 10) / 10);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {[min, (min + max) / 2, max].map((v, i) => (
            <G key={i}>
              <Line x1={PAD.l} x2={w - PAD.r} y1={Y(v)} y2={Y(v)} stroke={c.line} strokeDasharray="4 4" />
              <SText x={PAD.l - 6} y={Y(v) + 4} fontSize={10} fill={c.faint} textAnchor="end">{fmt(v)}</SText>
            </G>
          ))}
          {n > 1 && <Path d={d} stroke={color} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
          {pts.map((v, i) => <Circle key={i} cx={X(i)} cy={Y(v)} r={n > 20 ? 2.5 : 4} fill={color} />)}
          <SText x={X(0)} y={H - 4} fontSize={10} fill={c.faint} textAnchor="start">{labels[0]}</SText>
          {n > 1 && <SText x={X(n - 1)} y={H - 4} fontSize={10} fill={c.faint} textAnchor="end">{labels[n - 1]}</SText>}
        </Svg>
      )}
      {!!unit && <Text style={{ position: 'absolute', top: -4, right: 0, fontSize: 10, color: c.faint }}>{unit}</Text>}
    </View>
  );
}

// Bar chart with an optional goal line; bars over the goal turn amber.
export function BarChart({ vals, labels, goal, color = c.primary }: { vals: number[]; labels: string[]; goal?: number; color?: string }) {
  const [w, setW] = useState(0);
  const n = vals.length;
  if (!n) return null;
  const max = Math.max(goal ?? 0, ...vals, 1) * 1.1;
  const bw = (w - PAD.l - PAD.r) / n;
  const Y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={H}>
          <SText x={PAD.l - 6} y={PAD.t + 4} fontSize={10} fill={c.faint} textAnchor="end">{Math.round(max)}</SText>
          <SText x={PAD.l - 6} y={H - PAD.b} fontSize={10} fill={c.faint} textAnchor="end">0</SText>
          {vals.map((v, i) => (
            <Rect key={i} x={PAD.l + i * bw + bw * 0.15} width={bw * 0.7} y={Y(v)} height={Math.max(0, H - PAD.b - Y(v))} rx={4}
              fill={goal && v > goal * 1.05 ? c.amber : color} opacity={v ? 1 : 0.25} />
          ))}
          {goal ? <Line x1={PAD.l} x2={w - PAD.r} y1={Y(goal)} y2={Y(goal)} stroke={c.text} strokeDasharray="5 4" strokeWidth={1.5} /> : null}
          {labels.map((l, i) => (n <= 10 || i % Math.ceil(n / 7) === 0) && (
            <SText key={i} x={PAD.l + i * bw + bw / 2} y={H - 6} fontSize={10} fill={c.faint} textAnchor="middle">{l}</SText>
          ))}
        </Svg>
      )}
    </View>
  );
}
