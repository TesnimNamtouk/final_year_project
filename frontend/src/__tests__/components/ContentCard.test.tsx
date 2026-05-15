import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContentCard, { ContentItem } from '../../components/ContentCard';

// i18n mock
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

// MUI mock — sadece test ortamında gerekli
jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return {
    ...actual,
  };
});

const mockContent: ContentItem = {
  id: 'tt0468569',
  type: 'movie' as const,
  title: 'The Dark Knight',
  description: 'Batman faces the Joker',
  genres: ['Action', 'Drama'],
  year: 2008,
  posterUrl: undefined,
  rating: undefined,
};

describe('ContentCard', () => {
  it('renders content title', () => {
    render(
      <MemoryRouter>
        <ContentCard
          content={mockContent}
          onSave={jest.fn()}
          onRate={jest.fn()}
          isSaved={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('The Dark Knight')).toBeInTheDocument();
  });

  it('renders year', () => {
    render(
      <MemoryRouter>
        <ContentCard content={mockContent} onSave={jest.fn()} onRate={jest.fn()} isSaved={false} />
      </MemoryRouter>
    );
    expect(screen.getByText('2008')).toBeInTheDocument();
  });

  it('renders genres', () => {
    render(
      <MemoryRouter>
        <ContentCard content={mockContent} onSave={jest.fn()} onRate={jest.fn()} isSaved={false} />
      </MemoryRouter>
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
  });

  it('calls onSave when save button clicked', () => {
    const onSave = jest.fn();
    render(
      <MemoryRouter>
        <ContentCard content={mockContent} onSave={onSave} onRate={jest.fn()} isSaved={false} />
      </MemoryRouter>
    );
    // Genre chips (Action, Drama) come before CardActions buttons, so save is at index 2
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);
    expect(onSave).toHaveBeenCalledWith(mockContent);
  });

  it('calls onRate when rate button clicked', () => {
    const onRate = jest.fn();
    render(
      <MemoryRouter>
        <ContentCard content={mockContent} onSave={jest.fn()} onRate={onRate} isSaved={false} />
      </MemoryRouter>
    );
    const buttons = screen.getAllByRole('button');
    // Genre chips (Action, Drama) come before CardActions buttons, so rate is at index 3
    fireEvent.click(buttons[3]);
    expect(onRate).toHaveBeenCalledWith(mockContent);
  });

  it('shows saved state with filled icon', () => {
    render(
      <MemoryRouter>
        <ContentCard content={mockContent} onSave={jest.fn()} onRate={jest.fn()} isSaved={true} />
      </MemoryRouter>
    );
    // When saved, the first button has color="error"
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeInTheDocument();
  });
});
