/**
 * Database Seed — Initial Skill Paths
 *
 * Run with: npm run db:seed
 * Creates the initial German learning skill paths.
 * Safe to re-run — checks for existing data before inserting.
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { skillPaths } from './schema';
import { eq } from 'drizzle-orm';

const INITIAL_SKILL_PATHS = [
	{
		name: 'Introduce Yourself',
		icon: '👋',
		description: 'Learn to introduce yourself: your name, age, and where you are from.',
		category: 'greetings',
		difficulty: 'beginner',
		targetLanguage: 'de',
		lessonCount: 4,
		lessonDefinitions: [
			{ title: 'Saying Your Name', icon: '🏷️', topic: 'introduce-name', order: 0 },
			{ title: 'How Old Are You?', icon: '🎂', topic: 'introduce-age', order: 1 },
			{ title: 'Where Are You From?', icon: '🌍', topic: 'introduce-origin', order: 2 },
			{ title: 'Putting It Together', icon: '🎯', topic: 'introduce-combined', order: 3 },
		],
		prerequisites: [],
	},
	{
		name: 'At the Café',
		icon: '☕',
		description: 'Order drinks and snacks, ask prices, and say thank you at a German café.',
		category: 'food',
		difficulty: 'beginner',
		targetLanguage: 'de',
		lessonCount: 4,
		lessonDefinitions: [
			{ title: 'Ordering a Drink', icon: '🥤', topic: 'cafe-ordering', order: 0 },
			{ title: 'Asking the Price', icon: '💰', topic: 'cafe-price', order: 1 },
			{ title: 'Saying Thank You', icon: '🙏', topic: 'cafe-thanks', order: 2 },
			{ title: 'Full Café Visit', icon: '🎯', topic: 'cafe-combined', order: 3 },
		],
		prerequisites: [],
	},
	{
		name: 'My Family',
		icon: '👨‍👩‍👧',
		description: 'Talk about family members and describe your family.',
		category: 'family',
		difficulty: 'beginner',
		targetLanguage: 'de',
		lessonCount: 4,
		lessonDefinitions: [
			{ title: 'Family Members', icon: '👪', topic: 'family-members', order: 0 },
			{ title: 'My Parents', icon: '👫', topic: 'family-parents', order: 1 },
			{ title: 'Brothers & Sisters', icon: '🤝', topic: 'family-siblings', order: 2 },
			{ title: 'Describing Family', icon: '🎯', topic: 'family-combined', order: 3 },
		],
		prerequisites: [],
	},
	{
		name: 'Numbers & Counting',
		icon: '🔢',
		description: 'Count from 1 to 100 and use numbers in everyday situations.',
		category: 'numbers',
		difficulty: 'beginner',
		targetLanguage: 'de',
		lessonCount: 4,
		lessonDefinitions: [
			{ title: '1 to 10', icon: '☝️', topic: 'numbers-1-10', order: 0 },
			{ title: '11 to 20', icon: '✌️', topic: 'numbers-11-20', order: 1 },
			{ title: 'Tens: 20 to 100', icon: '💯', topic: 'numbers-tens', order: 2 },
			{ title: 'Numbers in Context', icon: '🎯', topic: 'numbers-context', order: 3 },
		],
		prerequisites: [],
	},
	{
		name: 'Colours & Shapes',
		icon: '🎨',
		description: 'Learn colours and basic shapes in German.',
		category: 'description',
		difficulty: 'beginner',
		targetLanguage: 'de',
		lessonCount: 4,
		lessonDefinitions: [
			{ title: 'Basic Colours', icon: '🌈', topic: 'colours-basic', order: 0 },
			{ title: 'More Colours', icon: '🖌️', topic: 'colours-more', order: 1 },
			{ title: 'Basic Shapes', icon: '⭕', topic: 'shapes-basic', order: 2 },
			{ title: 'Describing Objects', icon: '🎯', topic: 'colours-shapes-combined', order: 3 },
		],
		prerequisites: [],
	},
];

async function seed() {
	const client = postgres(process.env.DATABASE_URL!);
	const db = drizzle(client);

	console.log('🌱 Seeding skill paths...');

	let inserted = 0;
	let skipped = 0;

	for (const path of INITIAL_SKILL_PATHS) {
		// Check if path with same name + targetLanguage already exists
		const existing = await db
			.select({ id: skillPaths.id })
			.from(skillPaths)
			.where(eq(skillPaths.name, path.name));

		if (existing.length > 0) {
			console.log(`  ⏭️  Skipping "${path.name}" (already exists)`);
			skipped++;
			continue;
		}

		await db.insert(skillPaths).values(path);
		console.log(`  ✅ Inserted "${path.name}" ${path.icon}`);
		inserted++;
	}

	console.log(`\n✅ Seed complete: ${inserted} inserted, ${skipped} skipped`);
	await client.end();
}

seed().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
