// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PlayingCard } from '../../src/gui/components/PlayingCard';

afterEach(cleanup);

describe('PlayingCard', () => {
  test('renders a face-up Ace of Spades with correct aria label', () => {
    render(<PlayingCard card={{ suit: 'spades', rank: 'A' }} />);
    expect(screen.getByLabelText('A of spades')).toBeInTheDocument();
  });

  test('renders hearts suit symbol', () => {
    render(<PlayingCard card={{ suit: 'hearts', rank: 'K' }} />);
    expect(screen.getByLabelText('K of hearts')).toBeInTheDocument();
  });

  test('renders diamonds suit symbol', () => {
    render(<PlayingCard card={{ suit: 'diamonds', rank: '10' }} />);
    expect(screen.getByLabelText('10 of diamonds')).toBeInTheDocument();
  });

  test('renders clubs suit symbol', () => {
    render(<PlayingCard card={{ suit: 'clubs', rank: '5' }} />);
    expect(screen.getByLabelText('5 of clubs')).toBeInTheDocument();
  });

  test('renders a face-down card with face-down label', () => {
    render(<PlayingCard card={null} />);
    expect(screen.getByLabelText('Face-down card')).toBeInTheDocument();
    // Face-down card should not show any suit symbol
    expect(screen.queryByText('♠')).not.toBeInTheDocument();
    expect(screen.queryByText('♥')).not.toBeInTheDocument();
    expect(screen.queryByText('♦')).not.toBeInTheDocument();
    expect(screen.queryByText('♣')).not.toBeInTheDocument();
  });

  test('renders a 10 card with correct label', () => {
    render(<PlayingCard card={{ suit: 'spades', rank: '10' }} />);
    expect(screen.getByLabelText('10 of spades')).toBeInTheDocument();
  });
});
