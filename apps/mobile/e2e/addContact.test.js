describe('Add Contact Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should add a new contact and set relationship tier', async () => {
    // Assume user is logged in - navigate to contacts screen
    await element(by.id('contacts-tab')).tap();

    // Tap add contact button
    await element(by.id('add-contact-button')).tap();

    // Fill in contact form
    await element(by.id('contact-name-input')).typeText('John Doe');
    await element(by.id('contact-phone-input')).typeText('+1234567890');
    await element(by.id('contact-email-input')).typeText('john@example.com');

    // Select relationship tier
    await element(by.id('tier-selector')).tap();
    await element(by.text('Close Friends')).tap();

    // Save contact
    await element(by.id('save-contact-button')).tap();

    // Verify contact appears in list
    await waitFor(element(by.text('John Doe')))
      .toBeVisible()
      .withTimeout(5000);

    expect(element(by.text('John Doe'))).toBeVisible();
  });

  it('should show contact details after adding', async () => {
    // Navigate to contacts
    await element(by.id('contacts-tab')).tap();

    // Tap on a contact
    await element(by.text('John Doe')).tap();

    // Verify contact details screen
    await expect(element(by.id('contact-details-screen'))).toBeVisible();
    await expect(element(by.text('John Doe'))).toBeVisible();
    await expect(element(by.text('+1234567890'))).toBeVisible();
  });
});
