describe('Registration Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete registration flow', async () => {
    // Navigate to register screen if not already there
    const registerButton = element(by.id('register-button'));
    if (await registerButton.exists()) {
      await registerButton.tap();
    }

    // Fill in registration form
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('Test123!@#');
    await element(by.id('confirm-password-input')).typeText('Test123!@#');
    await element(by.id('first-name-input')).typeText('Test');
    await element(by.id('last-name-input')).typeText('User');

    // Submit registration
    await element(by.id('register-submit-button')).tap();

    // Wait for registration to complete
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);

    // Verify user is logged in
    expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should show validation errors for invalid input', async () => {
    const registerButton = element(by.id('register-button'));
    if (await registerButton.exists()) {
      await registerButton.tap();
    }

    // Try to submit with invalid email
    await element(by.id('email-input')).typeText('invalid-email');
    await element(by.id('register-submit-button')).tap();

    // Should show validation error
    await expect(element(by.text(/valid email/i))).toBeVisible();
  });
});
