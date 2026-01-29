import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_USER_EMAIL = 'test@example.com';

async function main() {
  console.log('🌱 Starting database seed...');

  // Create or get test user (idempotent)
  let user = await prisma.user.findUnique({
    where: { email: TEST_USER_EMAIL },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        email: TEST_USER_EMAIL,
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        timezone: 'America/New_York',
        notificationPreferences: {
          email: true,
          push: true,
          sms: false,
        },
        isVerified: true,
        isActive: true,
      },
    });
    console.log('✅ Created test user');
  } else {
    console.log('ℹ️  Test user already exists, skipping creation');
  }

  // Create 10 sample contacts across all tiers (idempotent - find by userId + name)
  const contactData = [
    { name: 'Alice Johnson', tier: 'INNER_CIRCLE', relationshipType: 'FAMILY', importSource: 'MANUAL' as const },
    { name: 'Bob Smith', tier: 'INNER_CIRCLE', relationshipType: 'FRIEND', importSource: 'PHONE' as const },
    { name: 'Charlie Brown', tier: 'CLOSE_FRIENDS', relationshipType: 'FRIEND', importSource: 'SOCIAL' as const },
    { name: 'Diana Prince', tier: 'CLOSE_FRIENDS', relationshipType: 'FRIEND', importSource: 'MANUAL' as const },
    { name: 'Eve Williams', tier: 'FRIENDS', relationshipType: 'FRIEND', importSource: 'PHONE' as const },
    { name: 'Frank Miller', tier: 'FRIENDS', relationshipType: 'COLLEAGUE', importSource: 'SOCIAL' as const },
    { name: 'Grace Lee', tier: 'ACQUAINTANCES', relationshipType: 'COLLEAGUE', importSource: 'MANUAL' as const },
    { name: 'Henry Davis', tier: 'ACQUAINTANCES', relationshipType: 'OTHER', importSource: 'PHONE' as const },
    { name: 'Ivy Chen', tier: 'PROFESSIONAL', relationshipType: 'COLLEAGUE', importSource: 'SOCIAL' as const },
    { name: 'Jack Wilson', tier: 'PROFESSIONAL', relationshipType: 'COLLEAGUE', importSource: 'MANUAL' as const },
  ];

  const contacts = [];
  for (const contactInfo of contactData) {
    let contact = await prisma.contact.findFirst({
      where: {
        userId: user.id,
        name: contactInfo.name,
        isDeleted: false,
      },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          userId: user.id,
          name: contactInfo.name,
          email: `${contactInfo.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          phone: `+1-555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          birthday: new Date(1990 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          importSource: contactInfo.importSource,
        },
      });
    }
    contacts.push(contact);
  }
  console.log(`✅ Created/updated ${contacts.length} contacts`);

  // Create 5 sample relationships (idempotent - uses unique constraint userId + contactId)
  const relationshipData = [
    {
      contactIndex: 0,
      tier: 'INNER_CIRCLE' as const,
      relationshipType: 'FAMILY' as const,
      communicationFrequency: 'WEEKLY' as const,
      healthScore: 95,
      sharedInterests: ['Travel', 'Cooking', 'Movies'],
    },
    {
      contactIndex: 1,
      tier: 'INNER_CIRCLE' as const,
      relationshipType: 'FRIEND' as const,
      communicationFrequency: 'DAILY' as const,
      healthScore: 90,
      sharedInterests: ['Sports', 'Gaming'],
    },
    {
      contactIndex: 2,
      tier: 'CLOSE_FRIENDS' as const,
      relationshipType: 'FRIEND' as const,
      communicationFrequency: 'WEEKLY' as const,
      healthScore: 75,
      sharedInterests: ['Music', 'Art'],
    },
    {
      contactIndex: 3,
      tier: 'FRIENDS' as const,
      relationshipType: 'FRIEND' as const,
      communicationFrequency: 'BIWEEKLY' as const,
      healthScore: 65,
      sharedInterests: ['Reading'],
    },
    {
      contactIndex: 4,
      tier: 'PROFESSIONAL' as const,
      relationshipType: 'COLLEAGUE' as const,
      communicationFrequency: 'MONTHLY' as const,
      healthScore: 55,
      sharedInterests: ['Technology', 'Business'],
    },
  ];

  const relationships = [];
  for (const relData of relationshipData) {
    const contact = contacts[relData.contactIndex];
    const relationship = await prisma.relationship.upsert({
      where: {
        userId_contactId: {
          userId: user.id,
          contactId: contact.id,
        },
      },
      update: {
        tier: relData.tier,
        relationshipType: relData.relationshipType,
        communicationFrequency: relData.communicationFrequency,
        healthScore: relData.healthScore,
        sharedInterests: relData.sharedInterests,
        lastContactDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      },
      create: {
        userId: user.id,
        contactId: contact.id,
        tier: relData.tier,
        relationshipType: relData.relationshipType,
        communicationFrequency: relData.communicationFrequency,
        healthScore: relData.healthScore,
        sharedInterests: relData.sharedInterests,
        importantDates: contact.birthday
          ? [{ type: 'birthday', date: contact.birthday.toISOString() }]
          : [],
        lastContactDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });
    relationships.push(relationship);
  }
  console.log(`✅ Created/updated ${relationships.length} relationships`);

  // Create 3 sample events (idempotent - find by userId + title)
  const now = new Date();
  const eventData = [
    {
      title: 'Summer BBQ Party',
      description: 'Annual summer gathering with friends and family',
      eventType: 'Social',
      date: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      startTime: '14:00',
      endTime: '20:00',
      timezone: 'America/New_York',
      locationName: 'Central Park',
      locationAddress: '123 Park Ave, New York, NY',
      estimatedCost: 500.00,
      budgetTier: 'MODERATE' as const,
      status: 'PLANNING' as const,
    },
    {
      title: 'Birthday Celebration',
      description: 'Celebrating Alice\'s birthday',
      eventType: 'Birthday',
      date: new Date(now.getFullYear(), now.getMonth() + 2, 10),
      startTime: '18:00',
      endTime: '22:00',
      timezone: 'America/New_York',
      locationName: 'The Rooftop Restaurant',
      estimatedCost: 800.00,
      budgetTier: 'PREMIUM' as const,
      status: 'CONFIRMED' as const,
    },
    {
      title: 'Coffee Meetup',
      description: 'Casual coffee catch-up with colleagues',
      eventType: 'Professional',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
      startTime: '10:00',
      endTime: '11:30',
      timezone: 'America/New_York',
      locationName: 'Local Coffee Shop',
      estimatedCost: 30.00,
      budgetTier: 'BUDGET' as const,
      status: 'CONFIRMED' as const,
    },
  ];

  const events = [];
  for (const eventInfo of eventData) {
    let event = await prisma.event.findFirst({
      where: {
        userId: user.id,
        title: eventInfo.title,
      },
    });

    if (!event) {
      event = await prisma.event.create({
        data: {
          userId: user.id,
          ...eventInfo,
        },
      });
    } else {
      // Update existing event
      event = await prisma.event.update({
        where: { id: event.id },
        data: {
          date: eventInfo.date,
          estimatedCost: eventInfo.estimatedCost,
          status: eventInfo.status,
        },
      });
    }
    events.push(event);
  }
  console.log(`✅ Created/updated ${events.length} events`);

  // Add attendees to events (idempotent - find by eventId + contactId)
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const attendeeContacts = contacts.slice(i * 2, (i + 1) * 2); // 2 attendees per event
    
    for (const contact of attendeeContacts) {
      const existingAttendee = await prisma.eventAttendee.findFirst({
        where: {
          eventId: event.id,
          contactId: contact.id,
        },
      });

      if (!existingAttendee) {
        await prisma.eventAttendee.create({
          data: {
            eventId: event.id,
            contactId: contact.id,
            rsvpStatus: i === 0 ? 'CONFIRMED' : 'PENDING',
            rsvpDate: i === 0 ? new Date() : null,
          },
        });
      }
    }
  }
  console.log('✅ Created event attendees');

  // Create 2 savings goals (idempotent - find by userId + name)
  const savingsGoalData = [
    {
      name: 'Summer BBQ Fund',
      targetAmount: 500.00,
      currency: 'USD',
      deadline: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      autoSaveEnabled: true,
      autoSaveAmount: 50.00,
      autoSaveFrequency: 'WEEKLY' as const,
      status: 'ACTIVE' as const,
      eventId: events[0].id,
    },
    {
      name: 'Birthday Party Savings',
      targetAmount: 800.00,
      currency: 'USD',
      deadline: new Date(now.getFullYear(), now.getMonth() + 2, 10),
      autoSaveEnabled: true,
      autoSaveAmount: 100.00,
      autoSaveFrequency: 'WEEKLY' as const,
      status: 'ACTIVE' as const,
      eventId: events[1].id,
    },
  ];

  const savingsGoals = [];
  for (const goalData of savingsGoalData) {
    let goal = await prisma.savingsGoal.findFirst({
      where: {
        userId: user.id,
        name: goalData.name,
      },
    });

    if (!goal) {
      goal = await prisma.savingsGoal.create({
        data: {
          userId: user.id,
          ...goalData,
          currentAmount: 150.00,
        },
      });
    } else {
      // Update existing goal
      goal = await prisma.savingsGoal.update({
        where: { id: goal.id },
        data: {
          targetAmount: goalData.targetAmount,
          currentAmount: 150.00,
          status: goalData.status,
        },
      });
    }
    savingsGoals.push(goal);
  }
  console.log(`✅ Created/updated ${savingsGoals.length} savings goals`);

  // Create sample transactions for savings goals (idempotent - limit to 2 per goal)
  for (const goal of savingsGoals) {
    const existingTransactions = await prisma.transaction.findMany({
      where: { savingsGoalId: goal.id },
    });

    if (existingTransactions.length === 0) {
      await prisma.transaction.create({
        data: {
          savingsGoalId: goal.id,
          amount: 50.00,
          type: 'DEPOSIT',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          description: 'Initial deposit',
        },
      });
      await prisma.transaction.create({
        data: {
          savingsGoalId: goal.id,
          amount: 100.00,
          type: 'AUTO_SAVE',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          description: 'Auto-save contribution',
        },
      });
    }
  }
  console.log('✅ Created sample transactions');

  // Create sample reminders (idempotent - find by userId + title)
  const reminderData = [
    {
      type: 'REACH_OUT' as const,
      title: 'Reach out to Alice',
      message: 'Haven\'t talked to Alice in a while. Send a message to catch up!',
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      status: 'PENDING' as const,
      contactId: contacts[0].id,
    },
    {
      type: 'BIRTHDAY' as const,
      title: 'Bob\'s Birthday',
      message: 'Bob\'s birthday is coming up! Don\'t forget to send a message.',
      scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: 'PENDING' as const,
      contactId: contacts[1].id,
    },
    {
      type: 'EVENT' as const,
      title: 'Summer BBQ Reminder',
      message: 'Summer BBQ Party is coming up. Make sure everything is ready!',
      scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      status: 'PENDING' as const,
      eventId: events[0].id,
    },
    {
      type: 'SAVINGS' as const,
      title: 'Check Savings Progress',
      message: 'Review your savings goals and make sure you\'re on track.',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'PENDING' as const,
    },
    {
      type: 'CUSTOM' as const,
      title: 'Follow up with Charlie',
      message: 'Follow up on the project discussion from last week.',
      scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status: 'PENDING' as const,
      contactId: contacts[2].id,
    },
  ];

  for (const reminderInfo of reminderData) {
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        userId: user.id,
        title: reminderInfo.title,
      },
    });

    if (!existingReminder) {
      await prisma.reminder.create({
        data: {
          userId: user.id,
          ...reminderInfo,
        },
      });
    }
  }
  console.log(`✅ Created/updated ${reminderData.length} reminders`);

  console.log('✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
