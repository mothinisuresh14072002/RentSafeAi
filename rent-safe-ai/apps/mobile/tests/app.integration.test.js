function SessionBoundary({ authenticated }) {
  return authenticated ? 'RentSafe dashboard' : 'Sign in with OTP';
}

describe('mobile authentication boundary', () => {
  it('does not render authenticated content before a session exists', () => {
    expect(SessionBoundary({ authenticated: false })).toBe('Sign in with OTP');
    expect(SessionBoundary({ authenticated: false })).not.toContain('dashboard');
  });
});
