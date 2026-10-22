import {
  Check,
  CheckCircle2,
  Loader2,
  Palette,
  Save,
} from 'lucide-react'
import Image from 'next/image'
import { THEMES, type ThemeId } from '@/lib/themes'

export type ThemeSaveState = 'idle' | 'saving' | 'saved' | 'error'

interface ThemePresetSelectorProps {
  selectedTheme: ThemeId
  saveState: ThemeSaveState
  disabled?: boolean
  onSelect: (themeId: ThemeId) => void
  onSave: () => void
}

const SAVE_LABELS: Record<ThemeSaveState, string> = {
  idle: 'Save theme',
  saving: 'Saving',
  saved: 'Saved',
  error: 'Retry save',
}

export function ThemePresetSelector({
  selectedTheme,
  saveState,
  disabled = false,
  onSelect,
  onSave,
}: ThemePresetSelectorProps) {
  return (
    <section
      aria-labelledby="theme-presets-title"
      className="challenge-admin-panel min-w-0 p-3 sm:p-4"
    >
      <div className="mb-3 flex min-h-9 items-center justify-between gap-3 sm:mb-4">
        <h2
          id="theme-presets-title"
          className="challenge-admin-display flex items-center gap-2 text-sm uppercase text-gonga-text sm:text-lg"
        >
          <Palette className="h-5 w-5" aria-hidden="true" />
          Game Engine Presets
        </h2>

        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={onSave}
            disabled={disabled || saveState === 'saving' || saveState === 'saved'}
            className="challenge-admin-focus flex h-9 items-center gap-2 border border-gonga-secondary px-4 text-xs font-black uppercase tracking-wider text-gonga-secondary transition hover:bg-gonga-secondary/10 disabled:cursor-wait disabled:opacity-65"
          >
            {saveState === 'saving' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {SAVE_LABELS[saveState]}
          </button>
          <span
            className={`flex min-w-[5.5rem] items-center gap-1.5 text-xs font-semibold ${
              saveState === 'error' ? 'text-red-400' : 'text-emerald-400'
            }`}
            aria-live="polite"
          >
            {saveState === 'saving' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : saveState === 'error' ? (
              <span aria-hidden="true">!</span>
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            {saveState === 'saving' ? 'Saving' : saveState === 'error' ? 'Restored' : 'Saved'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 md:grid-cols-1 md:gap-2">
        {THEMES.map((preset) => {
          const selected = preset.id === selectedTheme
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={selected}
              aria-label={`Preview ${preset.name}`}
              disabled={disabled}
              onClick={() => onSelect(preset.id)}
              className={`challenge-admin-focus group relative min-w-0 border bg-[#091321]/95 p-1.5 text-left transition duration-200 sm:p-2 md:flex md:min-h-[88px] md:items-center md:gap-4 md:p-1.5 ${
                selected
                  ? 'border-gonga-secondary shadow-[0_0_18px_rgb(var(--gonga-secondary)/0.14)]'
                  : 'border-gonga-border hover:border-gonga-primary/70 hover:bg-gonga-surface-raised'
              } disabled:cursor-wait disabled:opacity-70`}
            >
              <span className="relative block aspect-square w-full shrink-0 overflow-hidden bg-gonga-surface md:h-[76px] md:w-[160px] md:aspect-auto">
                <Image
                  src={preset.assetPath}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 160px, 20vw"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
              </span>

              {selected ? (
                <span className="absolute right-0 top-0 flex h-5 w-5 -translate-y-1/4 translate-x-1/4 items-center justify-center rounded-full bg-gonga-secondary text-[#071018] shadow-[0_0_12px_rgb(var(--gonga-secondary)/0.55)] sm:h-6 sm:w-6 md:right-4 md:top-1/2 md:-translate-y-1/2 md:translate-x-0">
                  <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
                </span>
              ) : null}

              <span className="mt-1.5 block min-w-0 md:mt-0 md:pr-9">
                <span
                  className={`challenge-admin-display block text-center text-[9px] uppercase leading-[1.15] sm:text-[11px] md:text-left md:text-base ${
                    selected ? 'text-gonga-secondary' : 'text-gonga-text'
                  }`}
                >
                  <span className="md:hidden">
                    {preset.mobileName[0]}
                    <br />
                    {preset.mobileName[1]}
                  </span>
                  <span className="hidden md:inline">{preset.name}</span>
                </span>
                <span className="mt-1 hidden text-xs leading-5 text-gonga-muted md:block">
                  {preset.tagline}
                  <br />
                  {preset.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex min-h-11 items-center justify-end text-[10px] font-bold uppercase tracking-wider md:hidden">
        {saveState === 'idle' || saveState === 'error' ? (
          <button
            type="button"
            onClick={onSave}
            disabled={disabled}
            className={`challenge-admin-focus inline-flex min-h-11 items-center gap-2 border px-3 py-2 tracking-wider disabled:cursor-wait disabled:opacity-65 ${
              saveState === 'error'
                ? 'border-red-400 text-red-400'
                : 'border-gonga-secondary text-gonga-secondary'
            }`}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {SAVE_LABELS[saveState]}
          </button>
        ) : (
          <span className="text-gonga-secondary" aria-live="polite">
            {saveState === 'saving' ? 'Saving theme…' : 'Selected & saved'}
          </span>
        )}
      </div>

    </section>
  )
}
