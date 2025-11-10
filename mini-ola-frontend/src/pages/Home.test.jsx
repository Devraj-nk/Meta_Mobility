import { render, screen } from '@testing-library/react';
import Home from './Home';

test('renders Welcome text on Home page', () => {
  render(<Home />);
  expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
});
