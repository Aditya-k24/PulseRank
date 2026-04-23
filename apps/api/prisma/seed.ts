import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ActivityType, SCORE_WEIGHTS } from '../../packages/shared/src';

const prisma = new PrismaClient();

const DEMO_USERS = [
  { username: 'alice', email: 'alice@pulserank.dev' },
  { username: 'bob', email: 'bob@pulserank.dev' },
  { username: 'carol', email: 'carol@pulserank.dev' },
  { username: 'dave', email: 'dave@pulserank.dev' },
  { username: 'eve', email: 'eve@pulserank.dev' },
];

const SAMPLE_ACTIVITY_TYPES: ActivityType[] = [
  ActivityType.POST_CREATED,
  ActivityType.POST_CREATED,
  ActivityType.COMMENT_CREATED,
  ActivityType.REACTION_RECEIVED,
  ActivityType.LOGIN,
];

async function main(): Promise<void> {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 12);

  for (const userData of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
      },
    });

    console.log(`Upserted user: ${user.username} (${user.id})`);

    let totalScore = 0;
    const activities = SAMPLE_ACTIVITY_TYPES;

    for (const activityType of activities) {
      const points = SCORE_WEIGHTS[activityType];
      totalScore += points;

      const event = await prisma.activityEvent.create({
        data: {
          userId: user.id,
          type: activityType,
          points,
          metadata: { seeded: true },
        },
      });

      await prisma.outboxEvent.create({
        data: {
          aggregateType: 'User',
          aggregateId: user.id,
          eventType: activityType,
          payload: {
            eventId: event.id,
            userId: user.id,
            username: user.username,
            type: activityType,
            points,
            metadata: { seeded: true },
          },
        },
      });
    }

    await prisma.userScore.upsert({
      where: { userId: user.id },
      update: { score: { increment: totalScore } },
      create: { userId: user.id, score: totalScore },
    });

    console.log(`Created ${activities.length} activities for ${user.username} (total: ${totalScore} pts)`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
