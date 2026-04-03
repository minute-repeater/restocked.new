import postgres from 'postgres';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: tsx --env-file=../../.env seed-admin.ts <email>');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL!);

  const [user] = await sql`
    UPDATE users SET is_admin = true WHERE email = ${email.toLowerCase()} RETURNING id, email
  `;

  if (user) {
    console.log(`Admin granted to ${user.email} (${user.id})`);
  } else {
    console.error(`No user found with email: ${email}`);
  }

  await sql.end();
}

main();
