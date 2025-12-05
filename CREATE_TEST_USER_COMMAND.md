# Create Test User in Railway Production Database

## Exact Command to Run

```bash
TEST_EMAIL=admin@test.com TEST_PASSWORD=TestPassword123! railway run npm run create-test-user
```

## Alternative: Using Railway Shell

If the above doesn't work, you can also run it interactively:

```bash
railway run bash
# Then inside the Railway shell:
export TEST_EMAIL=admin@test.com
export TEST_PASSWORD=TestPassword123!
npm run create-test-user
```

## What This Does

1. Sets environment variables:
   - `TEST_EMAIL=admin@test.com`
   - `TEST_PASSWORD=TestPassword123!`

2. Runs the script in Railway's environment where it can access the production database

3. Creates/updates a user with:
   - Email: `admin@test.com`
   - Password: `TestPassword123!`
   - Plan: `free`

## Expected Output

```
Creating test user...
Email: admin@test.com
Password: TestPassword123!

✅ Test user created/updated successfully!
   ID: [uuid]
   Email: admin@test.com
   Plan: free
   Created: [timestamp]

You can now login with these credentials.
```

## Troubleshooting

If you get `ENOTFOUND postgres.railway.internal`:
- Make sure you're running the command in Railway's environment (not locally)
- Verify Railway CLI is authenticated: `railway login`
- Verify project is linked: `railway status`
- Try: `railway run --service restocked.new -- npm run create-test-user`

## Login After Creation

Once the user is created, you can login at:
- URL: https://app.restocked.now/login
- Email: `admin@test.com`
- Password: `TestPassword123!`



