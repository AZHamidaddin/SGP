// tests/AllMovies.test.jsx
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AllMovies from '../src/AllMovies';
import { UserContext } from '../src/UserContext';

// Stub out Navbar and SearchMovies
jest.mock('../src/Navbar',       () => () => <div data-testid="navbar"/>);
jest.mock('../src/SearchMovies', () => () => <div data-testid="search"/>);

describe('AllMovies Component', () => {
  beforeAll(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve([
            { _id: '1', Title: 'Test Movie', 'Image URL': 'img.jpg', Language: 'en' }
          ])
      })
    );
  });

  it('renders loading then movie card', async () => {
    render(
      <MemoryRouter>
        {/* Provide a dummy user so useContext(UserContext) !== undefined */}
        <UserContext.Provider value={{ user: { name: 'Test User', id: '123', isAdmin: false } }}>
          <AllMovies />
        </UserContext.Provider>
      </MemoryRouter>
    );

    // 1) loading screen
    expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();

    // 2) after fetch, the movie title appears
    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });

    // 3) image renders with correct src/alt
    const img = screen.getByRole('img', { name: /Test Movie/i });
    expect(img).toHaveAttribute('src', 'img.jpg');

    // 4) ensure Navbar & SearchMovies stubs are present
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toBeInTheDocument();
  });
});
