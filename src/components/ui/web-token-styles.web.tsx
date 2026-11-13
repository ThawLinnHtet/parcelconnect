import { Border, Interaction, Radius, Spacing } from '@/constants/theme';
import { useAppearance } from '@/hooks/use-theme';

/** Bridge tokens to Expo UI's web fallback without a second CSS token table. */
export function WebTokenStyles() {
  const { colors, scheme } = useAppearance();
  return <style>{`
    ::selection { background: ${colors.action}; color: ${colors.onAction}; }
    :root { color-scheme: ${scheme}; }
    [data-testid="appearance-picker"], [data-testid="state-picker"] {
      min-height: ${Interaction.minTarget}px;
      border-color: ${colors.inputOutline};
      border-radius: ${Radius.small}px;
    }
    [data-testid="confirm-availability"], [data-testid="choose-receiver"] {
      min-height: ${Interaction.minTarget}px;
      height: auto !important;
      white-space: normal !important;
      box-shadow: none;
      border-radius: ${Radius.small}px;
    }
    [data-testid="choose-receiver"] { border: ${Border.thin}px solid ${colors.inputOutline}; }
    [data-testid="confirm-availability"]:hover { filter: brightness(0.94); }
    [data-testid="choose-receiver"]:hover { background: ${colors.backgroundSelected}; }
    [data-testid="confirm-availability"]:active, [data-testid="choose-receiver"]:active {
      opacity: ${Interaction.pressedOpacity};
    }
    :is(button, select, a):focus-visible {
      outline: ${Border.focus}px solid ${colors.focus}; outline-offset: ${Spacing.one}px;
    }
    * { scrollbar-color: ${colors.inputOutline} ${colors.background}; }
    @media (prefers-reduced-motion: reduce) {
      [data-testid="confirm-availability"], [data-testid="choose-receiver"] { transition: none; }
    }
  `}</style>;
}
