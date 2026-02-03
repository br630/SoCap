describe('Create Event Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should create event with attendees', async () => {
    // Navigate to events screen
    await element(by.id('events-tab')).tap();

    // Tap create event button
    await element(by.id('create-event-button')).tap();

    // Fill in event details
    await element(by.id('event-title-input')).typeText('Birthday Party');
    await element(by.id('event-date-picker')).tap();
    // Select a date (implementation depends on date picker component)
    
    await element(by.id('event-start-time-input')).typeText('18:00');
    await element(by.id('event-end-time-input')).typeText('22:00');
    await element(by.id('event-location-input')).typeText('123 Main St');

    // Add attendees
    await element(by.id('add-attendees-button')).tap();
    await element(by.text('John Doe')).tap();
    await element(by.text('Jane Smith')).tap();
    await element(by.id('done-button')).tap();

    // Save event
    await element(by.id('save-event-button')).tap();

    // Verify event appears in list
    await waitFor(element(by.text('Birthday Party')))
      .toBeVisible()
      .withTimeout(5000);

    expect(element(by.text('Birthday Party'))).toBeVisible();
  });

  it('should show event details after creation', async () => {
    // Navigate to events
    await element(by.id('events-tab')).tap();

    // Tap on event
    await element(by.text('Birthday Party')).tap();

    // Verify event details
    await expect(element(by.id('event-details-screen'))).toBeVisible();
    await expect(element(by.text('Birthday Party'))).toBeVisible();
    await expect(element(by.text('123 Main St'))).toBeVisible();
  });
});
