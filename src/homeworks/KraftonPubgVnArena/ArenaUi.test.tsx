// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CrateCard from './CrateCard';
import Leaderboard from './Leaderboard';
import { createSampleCrates, sampleSquadStandings } from './sampleData';

const NOW = 1_800_000_000_000;
const [liveCrate, upcomingCrate] = createSampleCrates(NOW);

/** Intl puts a (narrow) non-breaking space before ₫; compare with a plain one. */
const plain = (text: string | null) => (text ?? '').replace(/\s/g, ' ');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CrateCard', () => {
  function renderCard(overrides: Partial<Parameters<typeof CrateCard>[0]> = {}) {
    const onClaim = vi.fn();
    const utils = render(
      <CrateCard
        crate={liveCrate}
        stock={liveCrate.stock}
        status="idle"
        isPending={false}
        onClaim={onClaim}
        {...overrides}
      />,
    );
    return { onClaim, ...utils };
  }

  it('shows the crate name, VND price and stock', () => {
    const { container } = renderCard();
    expect(screen.getByRole('heading', { name: liveCrate.name })).toBeTruthy();
    expect(plain(container.textContent)).toContain('49.000 ₫');
    expect(plain(container.textContent)).toContain('120 / 120');
  });

  it('lets a live crate be claimed', () => {
    const { onClaim } = renderCard();
    const button = screen.getByRole('button', { name: 'Claim crate' });

    expect(button.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(button);

    expect(onClaim).toHaveBeenCalledTimes(1);
    expect(onClaim).toHaveBeenCalledWith(liveCrate.id);
  });

  it('is aria-disabled and inert before the drop time', () => {
    const { onClaim } = renderCard({ crate: upcomingCrate, stock: upcomingCrate.stock });
    const button = screen.getByRole('button', { name: 'Not live yet' });

    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(onClaim).not.toHaveBeenCalled();
  });

  it('is aria-disabled, busy and inert while a claim is in flight', () => {
    const { onClaim } = renderCard({ isPending: true, status: 'pending' });
    const button = screen.getByRole('button', { name: 'Claiming…' });

    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button);
    expect(onClaim).not.toHaveBeenCalled();
  });

  it('keeps keyboard focus on the button while it is disabled', () => {
    renderCard({ isPending: true });
    const button = screen.getByRole('button', { name: 'Claiming…' });
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('shows Sold out at zero stock', () => {
    const { onClaim } = renderCard({ stock: 0, status: 'soldOut' });
    const button = screen.getByRole('button', { name: 'Sold out' });

    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(onClaim).not.toHaveBeenCalled();
  });

  describe('messages', () => {
    it('has no alert by default', () => {
      renderCard();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('announces a 409 conflict with role="alert"', () => {
      renderCard({ status: 'conflict' });
      expect(screen.getByRole('alert').textContent).toContain('Someone else claimed it first');
    });

    it('announces an unconfirmed claim with role="alert"', () => {
      renderCard({ status: 'error' });
      expect(screen.getByRole('alert').textContent).toContain('could not confirm');
    });

    it('confirms success without an alert', () => {
      renderCard({ status: 'claimed' });
      expect(screen.getByText('Crate claimed.')).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('countdown', () => {
    it('hides the ticking time from assistive tech and uses a polite <output>', () => {
      const { container } = renderCard({ crate: upcomingCrate, stock: upcomingCrate.stock });

      const output = container.querySelector('output');
      expect(output?.getAttribute('aria-live')).toBe('polite');
      expect(output?.textContent).toBe(
        'VN Series Legendary Crate: About 10 minutes until the airdrop.',
      );

      const time = container.querySelector('.airdrop-countdown__time');
      expect(time?.getAttribute('aria-hidden')).toBe('true');
      expect(time?.textContent).toBe('10:00');
    });

    it('becomes claimable when the drop time passes', () => {
      const soon = { ...upcomingCrate, dropAtEpochMs: NOW + 1_000 };
      const { container } = renderCard({ crate: soon, stock: soon.stock });
      expect(screen.getByRole('button', { name: 'Not live yet' })).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(1_200);
      });

      const button = screen.getByRole('button', { name: 'Claim crate' });
      expect(button.getAttribute('aria-disabled')).toBe('false');
      expect(container.querySelector('.airdrop-countdown__time')?.textContent).toBe('LIVE');
      expect(container.querySelector('output')?.textContent).toContain('The airdrop is live.');
    });
  });
});

describe('Leaderboard', () => {
  const rowNames = () =>
    [...document.querySelectorAll('tbody th[scope="row"]')].map((cell) => cell.textContent);

  it('has a labelled filter input and a labelled sort select', () => {
    render(<Leaderboard standings={sampleSquadStandings} />);
    expect(screen.getByLabelText('Filter squads')).toBeTruthy();
    expect(screen.getByLabelText('Sort by')).toBeTruthy();
  });

  it('renders a real table with column headers scoped to columns', () => {
    render(<Leaderboard standings={sampleSquadStandings} />);

    const table = screen.getByRole('table');
    const headers = [...table.querySelectorAll('thead th')];
    expect(headers).toHaveLength(5);
    headers.forEach((header) => expect(header.getAttribute('scope')).toBe('col'));

    const rowHeaders = [...table.querySelectorAll('tbody th')];
    expect(rowHeaders).toHaveLength(4);
    rowHeaders.forEach((cell) => expect(cell.getAttribute('scope')).toBe('row'));
  });

  it('starts sorted by WWCD', () => {
    render(<Leaderboard standings={sampleSquadStandings} />);
    expect(rowNames()).toEqual(['The Expendables', 'AGG', 'Cerberus Esports', 'Roy Esports']);
    expect(screen.getByRole('status').textContent).toBe(
      'Showing 4 of 4 squads, sorted by WWCD (wins).',
    );
  });

  it.each([
    ['kills', ['Roy Esports', 'The Expendables', 'Cerberus Esports', 'AGG']],
    ['placementPoints', ['Cerberus Esports', 'The Expendables', 'Roy Esports', 'AGG']],
    ['wwcd', ['The Expendables', 'AGG', 'Cerberus Esports', 'Roy Esports']],
  ])('re-sorts when "%s" is selected', (key, expected) => {
    render(<Leaderboard standings={sampleSquadStandings} />);
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: key } });
    expect(rowNames()).toEqual(expected);
  });

  it('filters by name and keeps the squad’s real rank', () => {
    render(<Leaderboard standings={sampleSquadStandings} />);
    fireEvent.change(screen.getByLabelText('Filter squads'), { target: { value: 'ag' } });

    expect(rowNames()).toEqual(['AGG']);
    expect(screen.getByRole('status').textContent).toContain('Showing 1 of 4 squads');
    expect(screen.getAllByRole('row')[1].textContent).toMatch(/^2AGG/);
  });

  it('explains an empty result', () => {
    render(<Leaderboard standings={sampleSquadStandings} />);
    fireEvent.change(screen.getByLabelText('Filter squads'), { target: { value: 'zzz' } });

    expect(screen.getByText('No squads match “zzz”.')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Showing 0 of 4 squads');
  });

  it('puts the active sort in the table caption', () => {
    render(<Leaderboard standings={sampleSquadStandings} />);
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'kills' } });
    expect(screen.getByRole('table').querySelector('caption')?.textContent).toContain('Kills');
  });
});
