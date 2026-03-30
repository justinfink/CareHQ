export default function Waveform() {
  const bars = [
    { animation: 'waveform-1 0.8s ease-in-out infinite' },
    { animation: 'waveform-2 1.1s ease-in-out infinite' },
    { animation: 'waveform-3 0.7s ease-in-out infinite' },
    { animation: 'waveform-4 1.4s ease-in-out infinite' },
    { animation: 'waveform-5 0.9s ease-in-out infinite' },
  ]

  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="w-[4px] rounded-sm bg-[var(--color-brand-primary)]"
          style={{ animation: bar.animation, height: 8 }}
        />
      ))}
    </div>
  )
}
