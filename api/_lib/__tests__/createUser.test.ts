import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { createUser, listUsers } from '../auth';
import { __storageTestUtils } from '../storage';

const TEST_EMAIL = 'readonly@example.com';
const TEST_PASSWORD = 'super-secret';
const TEST_DISPLAY_NAME = 'Read Only User';

async function run(): Promise<void> {
  if (!__storageTestUtils) {
    throw new Error('Storage test utilities unavailable');
  }

  delete process.env.DATA_DIR;

  const originalHash = bcrypt.hash;
  bcrypt.hash = async (password: string) => `hashed-${password}`;

  const tempRoot = await mkdtemp(join(tmpdir(), 'crownshield-test-'));
  const readOnlyCandidate = join(tempRoot, 'readonly-marker');
  await writeFile(readOnlyCandidate, '');
  const writableFallback = join(tempRoot, 'writable');

  try {
    __storageTestUtils.setBaseDirectoryCandidates([readOnlyCandidate, writableFallback]);
    __storageTestUtils.resetBaseDirectoryCache();

    const user = await createUser(TEST_EMAIL, TEST_PASSWORD, TEST_DISPLAY_NAME);
    assert.equal(user.email, TEST_EMAIL);
    assert.equal(user.displayName, TEST_DISPLAY_NAME);

    const stored = JSON.parse(
      await readFile(join(writableFallback, 'data/users.json'), 'utf8')
    ) as Array<Record<string, unknown>>;
    assert.equal(stored.length, 1);
    assert.equal(stored[0]?.['email'], TEST_EMAIL);
    assert.equal(stored[0]?.['passwordHash'], `hashed-${TEST_PASSWORD}`);

    const users = await listUsers();
    assert.equal(users.length, 1);
    assert.equal(users[0]?.id, user.id);
  } finally {
    bcrypt.hash = originalHash;
    __storageTestUtils.setBaseDirectoryCandidates(null);
    __storageTestUtils.resetBaseDirectoryCache();
    await rm(tempRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
