import React, { useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';

export type VisualizerMode = 'turntable' | 'particles' | 'geometry' | 'strobe' | 'spectrum';

interface VisualizerProps {
  mode: VisualizerMode;
  className?: string;
}

export const AudioVisualizerCanvas: React.FC<VisualizerProps> = ({ mode, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isPlaying, getAudioAnalyser, activeTrack } = useAudio();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let rotation = 0;
    let needleAngle = 0; // 0 = resting, 0.35 = playing on vinyl
    let strobeAlpha = 0;

    // Particle system state
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
      maxLife: number;
    }
    const particles: Particle[] = [];
    const colors = ['#ff3e3e', '#f43f5e', '#ff8888', '#ffffff'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: Math.random() * 100,
        maxLife: 100,
      });
    }

    // Peak levels for spectrum
    const peaks = new Float32Array(64);

    const render = () => {
      animId = requestAnimationFrame(render);

      // Handle high-dpi canvas sizing
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;

      // Clear with deep cyberpunk black
      ctx.fillStyle = '#0c0c0e';
      ctx.fillRect(0, 0, width, height);

      // Fetch real-time frequency data
      const analyser = getAudioAnalyser();
      let freqData = new Uint8Array(256);
      let timeData = new Uint8Array(256);

      if (analyser) {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);
      } else {
        // Fallback procedural wave when idle or before Web Audio node attachment
        const t = performance.now() * 0.003;
        for (let i = 0; i < 256; i++) {
          const fakeEnergy = isPlaying ? (Math.sin(t + i * 0.1) * 0.5 + 0.5) * 160 : 20;
          freqData[i] = fakeEnergy;
          timeData[i] = 128 + Math.sin(t * 2 + i * 0.05) * (isPlaying ? 40 : 5);
        }
      }

      // Calculate bass / average energy
      let bassSum = 0;
      for (let i = 0; i < 16; i++) bassSum += freqData[i];
      const bassEnergy = bassSum / (16 * 255); // 0 to 1

      let totalSum = 0;
      for (let i = 0; i < 128; i++) totalSum += freqData[i];
      const avgEnergy = totalSum / (128 * 255);

      if (isPlaying) {
        rotation += 0.015 + bassEnergy * 0.01;
        needleAngle += (0.32 - needleAngle) * 0.08;
      } else {
        needleAngle += (0 - needleAngle) * 0.08;
      }

      // ----------------- 1. TURNTABLE MODE -----------------
      if (mode === 'turntable') {
        const cx = width / 2;
        const cy = height / 2;
        const maxRadius = Math.min(width, height) * 0.42;

        // Turntable Platter Outer Ring
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius + 14, 0, Math.PI * 2);
        ctx.fillStyle = '#16161a';
        ctx.fill();
        ctx.strokeStyle = '#282834';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Platter strobe dots
        const dotCount = 48;
        ctx.fillStyle = '#ff3e3e';
        for (let i = 0; i < dotCount; i++) {
          const a = (i / dotCount) * Math.PI * 2 + (isPlaying ? rotation * 0.5 : 0);
          const dx = cx + Math.cos(a) * (maxRadius + 7);
          const dy = cy + Math.sin(a) * (maxRadius + 7);
          ctx.beginPath();
          ctx.arc(dx, dy, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bass reactive vinyl pulse
        const vinylRadius = maxRadius * (1 + bassEnergy * 0.03);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);

        // Vinyl Disc Body
        const vinylGrad = ctx.createRadialGradient(0, 0, vinylRadius * 0.2, 0, 0, vinylRadius);
        vinylGrad.addColorStop(0, '#1c1c22');
        vinylGrad.addColorStop(0.5, '#0a0a0c');
        vinylGrad.addColorStop(1, '#141418');

        ctx.beginPath();
        ctx.arc(0, 0, vinylRadius, 0, Math.PI * 2);
        ctx.fillStyle = vinylGrad;
        ctx.fill();

        // Subtle concentric groove rings
        ctx.strokeStyle = '#252530';
        ctx.lineWidth = 1;
        for (let r = vinylRadius * 0.35; r < vinylRadius * 0.95; r += 7) {
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Vinyl Light Sheen / Reflection Highlights
        const sheenGrad = ctx.createLinearGradient(-vinylRadius, -vinylRadius, vinylRadius, vinylRadius);
        sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
        sheenGrad.addColorStop(0.48, 'rgba(255, 62, 62, 0.15)');
        sheenGrad.addColorStop(0.52, 'rgba(255, 62, 62, 0.15)');
        sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.07)');

        ctx.fillStyle = sheenGrad;
        ctx.beginPath();
        ctx.arc(0, 0, vinylRadius, 0, Math.PI * 2);
        ctx.fill();

        // Center Label
        const labelRadius = vinylRadius * 0.34;
        ctx.beginPath();
        ctx.arc(0, 0, labelRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3e3e';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner label core
        ctx.beginPath();
        ctx.arc(0, 0, labelRadius * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = '#0c0c0e';
        ctx.fill();

        // Center label brand typography
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Syne, Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('kaGO || PlaY', 0, -8);

        ctx.fillStyle = '#ff3e3e';
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.fillText('45 RPM / HI-FI', 0, 7);

        // Center Spindle Hole
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#0c0c0e';
        ctx.fill();

        ctx.restore();

        // Turntable Tonearm Base & Stylus
        const armBaseX = cx + maxRadius * 0.95;
        const armBaseY = cy - maxRadius * 0.85;

        // Arm pivot ring
        ctx.beginPath();
        ctx.arc(armBaseX, armBaseY, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#202028';
        ctx.fill();
        ctx.strokeStyle = '#ff3e3e';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arm shaft
        ctx.save();
        ctx.translate(armBaseX, armBaseY);
        ctx.rotate(0.55 + needleAngle);

        ctx.strokeStyle = '#d4d4dc';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-maxRadius * 0.95, maxRadius * 0.95);
        ctx.stroke();

        // Cartridge / Headshell
        const cartX = -maxRadius * 0.95;
        const cartY = maxRadius * 0.95;
        ctx.fillStyle = '#ff3e3e';
        ctx.fillRect(cartX - 6, cartY - 6, 20, 10);

        // Needle tip glowing red dot
        ctx.beginPath();
        ctx.arc(cartX, cartY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
      }

      // ----------------- 2. PARTICLE SYSTEM MODE -----------------
      else if (mode === 'particles') {
        const cx = width / 2;
        const cy = height / 2;

        // Glowing center core
        const coreRadius = 24 + bassEnergy * 40;
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.4, '#ff3e3e');
        coreGrad.addColorStop(1, 'rgba(255, 62, 62, 0)');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        // Update and draw particles
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.life -= 1;

          if (p.life <= 0) {
            p.x = cx + (Math.random() - 0.5) * 10;
            p.y = cy + (Math.random() - 0.5) * 10;
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 2 + 1) * (1 + bassEnergy * 4);
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = p.maxLife;
          }

          p.x += p.vx;
          p.y += p.vy;

          const alpha = p.life / p.maxLife;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + bassEnergy * 0.8), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.fill();
          ctx.globalAlpha = 1.0;

          // Connecting laser webs
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 55 + bassEnergy * 40) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = '#ff3e3e';
              ctx.globalAlpha = (1 - dist / (55 + bassEnergy * 40)) * 0.45;
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.globalAlpha = 1.0;
            }
          }
        }
      }

      // ----------------- 3. SACRED GEOMETRY MODE -----------------
      else if (mode === 'geometry') {
        const cx = width / 2;
        const cy = height / 2;
        const maxR = Math.min(width, height) * 0.42;

        ctx.save();
        ctx.translate(cx, cy);

        const rings = 7;
        for (let r = 1; r <= rings; r++) {
          const radius = (r / rings) * maxR * (1 + bassEnergy * 0.2);
          const sides = r % 2 === 0 ? 6 : 8;
          const rotDir = r % 2 === 0 ? 1 : -1;

          ctx.save();
          ctx.rotate(rotation * rotDir * (r * 0.4));

          ctx.beginPath();
          for (let s = 0; s < sides; s++) {
            const angle = (s / sides) * Math.PI * 2;
            const freqVal = freqData[(s * 15 + r * 10) % 256] / 255;
            const radDisplace = radius * (1 + freqVal * 0.18);
            const x = Math.cos(angle) * radDisplace;
            const y = Math.sin(angle) * radDisplace;
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();

          ctx.strokeStyle = r === rings ? '#ffffff' : (r % 2 === 0 ? '#ff3e3e' : '#f43f5e');
          ctx.lineWidth = r === 1 ? 3 : 1.5;
          ctx.stroke();

          // Vertex dots
          for (let s = 0; s < sides; s++) {
            const angle = (s / sides) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          }

          ctx.restore();
        }

        ctx.restore();
      }

      // ----------------- 4. WAVEFORM ZOOM / STROBE MODE -----------------
      else if (mode === 'strobe') {
        // Kick transient strobe flash
        if (bassEnergy > 0.65) {
          strobeAlpha = Math.min(0.25, strobeAlpha + 0.15);
        } else {
          strobeAlpha *= 0.85;
        }

        if (strobeAlpha > 0.01) {
          ctx.fillStyle = `rgba(255, 62, 62, ${strobeAlpha})`;
          ctx.fillRect(0, 0, width, height);
        }

        // Draw zoomed oscillogram wave with chromatic aberration
        const sliceWidth = width / 128;
        const cy = height / 2;
        const amplitudeScale = (height * 0.4) * (1 + bassEnergy * 0.5);

        // Cyan / Blue offset trail
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 128; i++) {
          const v = (timeData[i * 2] - 128) / 128;
          const y = cy + v * amplitudeScale - 3;
          const x = i * sliceWidth;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Main Electric Crimson Wave
        ctx.beginPath();
        ctx.strokeStyle = '#ff3e3e';
        ctx.lineWidth = 3.5;
        for (let i = 0; i < 128; i++) {
          const v = (timeData[i * 2] - 128) / 128;
          const y = cy + v * amplitudeScale;
          const x = i * sliceWidth;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // White hot center core wave
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 128; i++) {
          const v = (timeData[i * 2] - 128) / 128;
          const y = cy + v * amplitudeScale;
          const x = i * sliceWidth;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // ----------------- 5. CLASSIC SPECTRUM BARS MODE -----------------
      else {
        const barCount = 48;
        const totalBarWidth = width * 0.88;
        const startX = (width - totalBarWidth) / 2;
        const barWidth = (totalBarWidth / barCount) * 0.72;
        const gap = (totalBarWidth / barCount) * 0.28;
        const maxHeight = height * 0.65;
        const baseLine = height * 0.78;

        for (let i = 0; i < barCount; i++) {
          const freqIdx = Math.floor(Math.pow(i / barCount, 1.4) * 128);
          const val = (freqData[freqIdx] || 0) / 255;
          const barHeight = Math.max(4, val * maxHeight);
          const x = startX + i * (barWidth + gap);
          const y = baseLine - barHeight;

          // Peak needle physics
          if (barHeight > (peaks[i] || 0)) {
            peaks[i] = barHeight;
          } else {
            peaks[i] = Math.max(0, (peaks[i] || 0) - 2.5);
          }

          // Bar gradient (Dark Slate -> Electric Crimson -> White)
          const barGrad = ctx.createLinearGradient(0, baseLine, 0, y);
          barGrad.addColorStop(0, '#1c1c24');
          barGrad.addColorStop(0.65, '#ff3e3e');
          barGrad.addColorStop(1, '#ffffff');

          ctx.fillStyle = barGrad;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Mirror reflection below baseline
          const reflGrad = ctx.createLinearGradient(0, baseLine, 0, baseLine + barHeight * 0.35);
          reflGrad.addColorStop(0, 'rgba(255, 62, 62, 0.28)');
          reflGrad.addColorStop(1, 'rgba(255, 62, 62, 0)');
          ctx.fillStyle = reflGrad;
          ctx.fillRect(x, baseLine + 2, barWidth, barHeight * 0.35);

          // Floating Peak needle dot
          const peakY = baseLine - (peaks[i] || 0) - 4;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, peakY, barWidth, 2);
        }
      }

      ctx.restore();
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [mode, isPlaying, getAudioAnalyser, activeTrack]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        data-testid="audio-visualizer-canvas"
      />
    </div>
  );
};
